import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense, lazy } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, Users, Wifi, ArrowLeft, Globe, Settings as SettingsIcon } from 'lucide-react';
import { Board } from './components/Board';
import { DifficultyModal } from './components/DifficultyModal';
import { RoomModal } from './components/RoomModal';
import RandomMatchModal from './components/RandomMatchModal';
import { SettingsModal } from './components/SettingsModal';
import { GameResultModal } from './components/GameResultModal';
import { checkWinner, getAIMove } from './utils/gameLogic';
import { GameState, GameMode, Player, Difficulty, RoomStatus, GameSettings, GameType, BoardSize, BoardState, MoveInfo } from './types';
import socket from './utils/socket';
import { initializeAudio, playMoveSound, playResultSound, playClickSound, setSoundEnabled } from './utils/sounds';
import { ErrorBoundary } from './components/ErrorBoundary';
import { 
  getThemeClasses, 
  debounce, 
  getBoardClasses, 
  getBoardSizeFromType, 
  getBoardSizeFromLength,
  initializeUltimateBoard,
  checkUltimateWinner, 
  makeUltimateMove
} from './utils/gameLogic';
import { TutorialPage } from './components/TutorialPage';
import { UltimateBoard } from './components/UltimateBoard';
import { LargeBoard } from './components/LargeBoard';
import { processInfinityMove, removeFadingSymbols, getNextFadingSymbols } from './utils/infinityMode';

const initialGameState: GameState = {
  board: Array(9).fill(null),
  currentPlayer: 'X',
  winner: null,
  winningLine: null,
  theme: 'blue',
  showConfetti: false,
  gameType: 'normal',
  boardSize: '3x3',
  gameResult: null
};

const initialSettings: GameSettings = {
  theme: 'blue',
  darkMode: false,
  soundEnabled: true,
  volume: 80,
  showAnimations: true,
  animationSpeed: 'medium',
  showHints: true,
  hapticFeedback: false,
  showTimer: false,
  difficulty: 'medium',
  boardSize: '3x3',
  boardStyle: 'classic',
  symbolStyle: 'classic',
  soundPack: 'arcade',
  backgroundMusic: false
};

// Reusable Settings Button Component
const SettingsButton = ({ onClick, className = "" }: { onClick: () => void; className?: string }) => (
  <motion.button
    className={`p-2 ${className || 'bg-white/80 dark:bg-gray-700 text-gray-700 dark:text-white shadow-md hover:bg-white dark:hover:bg-gray-600'} backdrop-blur-sm rounded-full`}
    whileHover={{ scale: 1.1, rotate: 45 }}
    whileTap={{ scale: 0.9, rotate: 0 }}
    onClick={onClick}
    aria-label="Settings"
  >
    <SettingsIcon className="w-5 h-5" />
  </motion.button>
);

// Game Timer Component
const GameTimer = ({ enabled, darkMode, startTime }: { enabled: boolean; darkMode: boolean; startTime: Date | null }) => {
  const [seconds, setSeconds] = useState(0);
  
  useEffect(() => {
    if (enabled && startTime) {
      const interval = setInterval(() => {
        const elapsedSeconds = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
        setSeconds(elapsedSeconds);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [enabled, startTime]);
  
  // Reset seconds when startTime changes
  useEffect(() => {
    if (startTime) {
      setSeconds(0);
    }
  }, [startTime]);
  
  if (!enabled || !startTime) return null;
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`absolute top-0 right-0 m-2 px-3 py-1 rounded-full text-sm font-mono 
        ${darkMode ? 'bg-gray-800 text-white' : 'bg-white/80 text-gray-800'} shadow-md`}
    >
      {String(minutes).padStart(2, '0')}:{String(remainingSeconds).padStart(2, '0')}
    </motion.div>
  );
};

// Add a mobile detection utility
const isMobileDevice = () => {
  return (
    typeof window !== 'undefined' && 
    (window.innerWidth < 768 || 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
  );
};

// Utility to detect low-end devices
const isLowEndDevice = () => {
  // Check hardware concurrency (number of CPU cores)
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) {
    return true;
  }
  
  // Check if device memory API is available
  if ((navigator as any).deviceMemory && (navigator as any).deviceMemory <= 4) {
    return true;
  }
  
  // Check user agent for low-end device indicators
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('android') && !ua.includes('chrome')) {
    return true; // Non-Chrome Android is often low-end
  }
  
  return false;
};

// Define the lazy components with proper types
const LazyBoard = lazy(() => Promise.resolve({ default: Board }));
const LazyGameResultModal = lazy(() => Promise.resolve({ default: GameResultModal }));
const LazySettingsModal = lazy(() => Promise.resolve({ default: SettingsModal }));
const LazyTutorialPage = lazy(() => Promise.resolve({ default: TutorialPage }));

function App() {
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [settings, setSettings] = useState<GameSettings>(initialSettings);
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showRandomMatchModal, setShowRandomMatchModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showGameTypeModal, setShowGameTypeModal] = useState(false);
  const [showSymbolSelectionModal, setShowSymbolSelectionModal] = useState(false);
  const [pendingGameMode, setPendingGameMode] = useState<GameMode | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');
  const [selectedPlayerSymbol, setSelectedPlayerSymbol] = useState<'X' | 'O'>('X');
  const [gameStartTime, setGameStartTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedGameType, setSelectedGameType] = useState<GameType>('normal');
  const [showTutorial, setShowTutorial] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  // For Ultimate Tic-Tac-Toe
  const [ultimateBoard, setUltimateBoard] = useState(initializeUltimateBoard());

  // Reduce the number of background elements for low-end devices
  const bgElementCount = isLowEndDevice() ? 2 : 5;

  // Add a state to track if we're on a mobile device
  const [isMobile, setIsMobile] = useState(false);
  
  // Check for mobile device on mount
  useEffect(() => {
    setIsMobile(isMobileDevice());
    
    // Add resize listener to update mobile status
    const handleResize = () => {
      setIsMobile(isMobileDevice());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Update settings to reduce animations on mobile
  useEffect(() => {
    if (isMobile) {
      setSettings(prev => ({
        ...prev,
        animationSpeed: 'fast',
        confettiAmount: 'low'
      }));
    }
  }, [isMobile]);
  
  // Create a loading fallback for lazy components
  const LazyLoadingFallback = () => (
    <div className="flex items-center justify-center w-full h-full min-h-[200px]">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  // Initialize socket connection and audio when app loads
  useEffect(() => {
    try {
      // Socket is already initialized via the import
      console.log("App: Socket already initialized", socket.id);
      // Connect if not already connected
      if (!socket.connected) {
        socket.connect();
      }
      
      initializeAudio();
      
      return () => {
        // Clean up socket listeners
        socket.off();
      };
    } catch (err) {
      console.error("Failed to initialize app:", err);
      setError("Failed to initialize application. Please refresh the page.");
    }
  }, []);

  // Monitor for AI turns in Infinity mode
  useEffect(() => {
    // Skip if not in AI mode or not Infinity game type
    if (gameMode !== 'ai' || gameState.gameType !== 'infinity' || gameState.winner) {
      return;
    }

    // Skip if playerSymbol or aiSymbol is not defined yet
    if (!gameState.playerSymbol || !gameState.aiSymbol) {
      console.log("Symbols not defined yet, skipping AI turn");
      return;
    }

    // If it's the AI's turn, make a move
    if (gameState.currentPlayer === gameState.aiSymbol) {
      console.log("AI's turn detected in useEffect for Infinity mode", gameState.aiSymbol);
      
      // Add a small delay to simulate thinking
      const timeoutId = setTimeout(() => {
        // Get current state
        const currentBoard = [...gameState.board];
        const currentMoveHistory = [...(gameState.moveHistory || [])];
        const aiSymbol = gameState.aiSymbol as Player;
        const playerSymbol = gameState.playerSymbol as Player;
        
        // Check if any available moves
        const availableIndices = currentBoard.map((cell, idx) => cell === null ? idx : -1).filter(idx => idx !== -1);
        if (availableIndices.length === 0) {
          console.log("No available moves for AI");
          return;
        }
        
        // Get AI move
        const aiDifficulty = gameState.difficulty || 'medium';
        console.log(`AI thinking with difficulty ${aiDifficulty}`);
        const aiIndex = getAIMove(currentBoard, aiDifficulty, gameState.boardSize || '3x3');
        console.log(`AI chose move at index ${aiIndex}`);
        
        if (aiIndex >= 0 && currentBoard[aiIndex] === null) {
          // Process move for infinity mode
          const { board: aiUpdatedBoard, moveHistory: aiUpdatedMoveHistory, nextFadingSymbols } = 
            processInfinityMove(currentBoard, aiIndex, aiSymbol, currentMoveHistory);
          
          // Play move sound
          playMoveSound(aiSymbol);
          
          // Check for winner
          const { winner, line } = checkWinner(aiUpdatedBoard, gameState.boardSize);
          
          if (winner) {
            // Play win sound
            setTimeout(() => {
              playResultSound(winner === 'draw' ? 'draw' : 'win');
            }, 300);
            
            // Update state with winner
            setGameState(prev => ({
              ...prev,
              board: aiUpdatedBoard,
              moveHistory: aiUpdatedMoveHistory,
              winner,
              winningLine: line,
              showConfetti: winner !== 'draw',
              nextFadingSymbols
            }));
          } else {
            // Update state and switch to player's turn
            setGameState(prev => ({
              ...prev,
              board: aiUpdatedBoard, 
              moveHistory: aiUpdatedMoveHistory,
              currentPlayer: playerSymbol,
              nextFadingSymbols
            }));
          }
        } else {
          console.log("AI couldn't find a valid move");
          // If no valid move, switch back to player
          setGameState(prev => ({
            ...prev,
            currentPlayer: playerSymbol
          }));
        }
      }, 1000);
      
      // Clean up timeout if component unmounts
      return () => clearTimeout(timeoutId);
    }
  }, [gameMode, gameState.gameType, gameState.currentPlayer, gameState.aiSymbol, 
      gameState.board, gameState.moveHistory, gameState.winner, gameState.difficulty, 
      gameState.boardSize, gameState.playerSymbol, playMoveSound, playResultSound]);

  // Update sound enabled state when settings change
  useEffect(() => {
    try {
      setSoundEnabled(settings.soundEnabled);
    } catch (err) {
      console.error("Failed to update sound settings:", err);
    }
  }, [settings.soundEnabled]);

  // Subscribe to socket events for online play
  useEffect(() => {
    try {
      if (gameMode === 'online' || gameMode === 'random' || pendingGameMode === 'online' || pendingGameMode === 'random') {
        console.log("Setting up socket event listeners");

        // Handle when opponent makes a move
        const handleOpponentMove = (data: any) => {
          console.log("Opponent made move", data);
          setGameState(prev => {
            const newBoard = [...prev.board];
            newBoard[data.position] = data.symbol;
            
            // After opponent move, it's the current player's turn
            const newCurrentPlayer = prev.playerSymbol || 'X';
              
            return {
              ...prev,
              board: newBoard,
              currentPlayer: newCurrentPlayer // Now it's our turn
            };
          });

          // Play move sound
          if (settings.soundEnabled) {
            import('./utils/sounds').then(sounds => {
              sounds.playMoveSound(data.symbol as Player);
            });
          }
        };

        // When a player leaves the room
        const handlePlayerLeft = () => {
            setGameState(prev => ({
              ...prev,
              roomStatus: 'ended'
            }));

          // Show notification
          setToastMessage("Opponent left the game");
          setShowToast(true);
        };
        
        // Handle game start events (for both random matches and room joining)
        const handleGameStart = (data: any) => {
          console.log("Game start event received:", data);
          
          // Determine if this is a waiting event or actual game start
          const isWaiting = data.status === 'waiting';
          const gameMode = pendingGameMode === 'random' ? 'random' : 'online';
          
          if (isWaiting) {
            console.log("Waiting for opponent to join");
            // Start game in waiting mode
            startGame(gameMode, {
              roomCode: data.roomCode,
              playerSymbol: data.playerSymbol || (data.isPlayerX ? 'X' : 'O'),
              roomStatus: 'waiting',
              gameType: selectedGameType
            });
          } else {
            // Close any modals that might be open
            setShowRoomModal(false);
            setShowRandomMatchModal(false);
            
            // Start game with the received information
            startGame(gameMode, {
              roomCode: data.roomCode,
              playerSymbol: data.playerSymbol || (data.isPlayerX ? 'X' : 'O'),
              roomStatus: 'playing',
              gameType: selectedGameType
            });
            
            // Play sound to indicate game has started
            if (settings.soundEnabled) {
              playClickSound();
            }
          }
          
          // Reset pending mode
          setPendingGameMode(null);
        };

        socket.on('move_made', handleOpponentMove);
        socket.on('game_start', handleGameStart);
        socket.on('player_left', handlePlayerLeft);
        
        socket.on('error', (error: string) => {
          console.error("Socket error:", error);
          setError(error);
        });
        
        return () => {
          // Clean up socket listeners when unmounting
          socket.off('move_made', handleOpponentMove);
          socket.off('game_start', handleGameStart);
          socket.off('player_left', handlePlayerLeft);
          socket.off('error');
        };
      }
      } catch (err) {
        console.error("Failed to subscribe to socket events:", err);
    }
  }, [gameMode, pendingGameMode, settings.soundEnabled, selectedGameType]);

  // Cleanup when leaving a room
  useEffect(() => {
    return () => {
      if (gameState.roomCode) {
        socket.emit('leave_room');
      }
    };
  }, [gameState.roomCode]);

  // Determine if board size can be selected for the current game mode
  const isBoardSizeSelectable = gameMode === 'ai' || gameMode === 'friend' || !gameMode;
  
  // Initialize the game based on selected board size
  const initializeGame = useCallback((boardSize: BoardSize = settings.boardSize) => {
    let initialBoard: BoardState;
    
    switch (boardSize) {
      case '4x4':
        initialBoard = Array(16).fill(null);
        break;
      case '5x5':
        initialBoard = Array(25).fill(null);
        break;
      case 'ultimate':
        setUltimateBoard(initializeUltimateBoard());
        initialBoard = Array(9).fill(null);
        break;
      default:
        initialBoard = Array(9).fill(null);
    }
    
    setGameState({
      ...initialGameState,
      board: initialBoard,
      theme: settings.theme,
      boardSize,
      symbolStyle: settings.symbolStyle,
      boardStyle: settings.boardStyle,
      moveHistory: gameState.gameType === 'infinity' ? [] : undefined,
      fadingSymbols: gameState.gameType === 'infinity' ? [] : undefined
    });
    
    setGameStartTime(new Date());
  }, [settings.theme, settings.symbolStyle, settings.boardStyle, gameState.gameType]);
  
  // Helper function to check if the current game type is infinity
  const isInfinityMode = () => gameState.gameType === 'infinity';

  // Handle cell click for Ultimate Tic-Tac-Toe
  const handleUltimateCellClick = (boardIndex: number, cellIndex: number) => {
    if (gameState.winner || (gameMode === 'online' && gameState.playerSymbol !== gameState.currentPlayer)) {
      return;
    }

    // Make the move
    const { newBoard, validMove } = makeUltimateMove(
      ultimateBoard,
      boardIndex,
      cellIndex,
      gameState.currentPlayer
    );
    
    if (!validMove) return;
    
    // Play move sound
    playMoveSound(gameState.currentPlayer);
    
    // Update the board state
    setUltimateBoard(newBoard);
    
    // Check if there's a winner at the meta-board level
    const { winner } = checkUltimateWinner(newBoard);
    
    if (winner) {
      // Play result sound
      setTimeout(() => {
        playResultSound(winner === 'draw' ? 'draw' : 'win');
      }, 300);
    
    setGameState(prev => ({
      ...prev,
      winner,
        winningLine: null, // Meta winning line not tracked in the same way
        showConfetti: winner !== 'draw'
      }));
      return;
    }
    
    // Switch player
    setGameState(prev => ({
      ...prev,
      currentPlayer: prev.currentPlayer === 'X' ? 'O' : 'X'
    }));
    
    // If playing against AI, make the AI move
    if (gameMode === 'ai' && gameState.currentPlayer === 'X') {
      // AI move logic for Ultimate would go here
      // This is complex and would require a separate implementation
    }
  };

  const handleCellClick = (index: number) => {
    // Check if the cell is already filled or game is over
    if (gameState.board[index] !== null || gameState.winner) {
      return;
    }
    
    // For online games, check if it's the player's turn
    if ((gameMode === 'online' || gameMode === 'random') && 
        gameState.playerSymbol !== gameState.currentPlayer) {
      console.log("Not your turn");
      return;
    }
    
    // For AI mode, ensure player can only play when it's their turn
    if (gameMode === 'ai' && gameState.playerSymbol !== gameState.currentPlayer) {
      console.log("Not your turn - AI is thinking");
      return;
    }

    // Handle based on game mode
    const player = gameState.currentPlayer;
    
    // Make a copy of the board
    const boardCopy = [...gameState.board];
    
    // Update the board with the player's move
    boardCopy[index] = player;

    // Play move sound
    playMoveSound(player);
    
    // For Infinity mode, track move history and manage symbol removal
    if (isInfinityMode()) {
      console.log("Processing player move in Infinity mode");
      
      // Process the move using our utility function - symbols are now removed immediately
      const { board: updatedBoard, moveHistory: updatedMoveHistory, nextFadingSymbols } = 
        processInfinityMove(boardCopy, index, player, gameState.moveHistory || []);
      
      // Check for a winner with the updated board state (after old symbols are removed)
      const { winner, line } = checkWinner(updatedBoard, gameState.boardSize);
      
      if (winner) {
        // Play win/draw sound
        setTimeout(() => {
          playResultSound(winner === 'draw' ? 'draw' : 'win');
        }, 300);
        
        setGameState(prev => ({
          ...prev,
          board: updatedBoard,
          winner,
          winningLine: line,
          showConfetti: winner !== 'draw',
          moveHistory: updatedMoveHistory,
          nextFadingSymbols
        }));
        return;
      }
      
      // For AI mode in Infinity, update state and let the useEffect handle AI's turn
      if (gameMode === 'ai') {
        const aiSymbol = gameState.aiSymbol as Player;
        
        // Update game state with the new move and set to AI's turn
        setGameState(prev => ({
          ...prev,
          board: updatedBoard,
          moveHistory: updatedMoveHistory,
          currentPlayer: aiSymbol, // Set to AI's turn
          nextFadingSymbols
        }));
        
        // The useEffect will handle the AI's move
        return;
      }
      
      // For non-AI mode in Infinity, just update the state
      setGameState(prev => ({
        ...prev,
        board: updatedBoard,
        moveHistory: updatedMoveHistory,
        currentPlayer: prev.currentPlayer === 'X' ? 'O' : 'X',
        nextFadingSymbols
      }));
      
      return;
    }
    
    // Handle AI mode (normal game)
    else if (gameMode === 'ai') {
      // Get the player and AI symbols
      const playerSymbol = gameState.playerSymbol as Player;
      const aiSymbol = gameState.aiSymbol as Player;
      
      // Check for a winner after player's move
      const { winner, line } = checkWinner(boardCopy, gameState.boardSize);
      
      if (winner) {
        // Play win/draw sound
        setTimeout(() => {
          playResultSound(winner === 'draw' ? 'draw' : 'win');
        }, 300);
        
        setGameState(prev => ({
          ...prev,
          board: boardCopy,
          winner,
          winningLine: line,
          showConfetti: winner !== 'draw'
        }));
        return;
      }
      
      // Update the game state with player's move and set AI as current player
      setGameState(prev => ({
        ...prev,
        board: boardCopy,
        currentPlayer: aiSymbol
      }));
      
      // Schedule AI's move
      setTimeout(() => {
        console.log("AI turn in Normal mode");
        // Get a fresh copy of the current board state
        setGameState(prevState => {
          const currentBoard = [...prevState.board];
          
          // Get the AI move using the configured difficulty
          const aiDifficulty = prevState.difficulty || 'medium';
          console.log(`Getting AI move with difficulty: ${aiDifficulty}`);
          const aiIndex = getAIMove(currentBoard, aiDifficulty, prevState.boardSize || '3x3');
          console.log("AI selected move at index:", aiIndex);
          
          if (aiIndex >= 0 && currentBoard[aiIndex] === null) {
            // Make AI move
            currentBoard[aiIndex] = aiSymbol;
            
            // Play the AI move sound
            playMoveSound(aiSymbol);
            
            // Check if the AI won
            const { winner: aiWinner, line: aiWinLine } = checkWinner(currentBoard, prevState.boardSize);
            
            if (aiWinner) {
              // Small delay to ensure sound plays after the move sound
              setTimeout(() => {
                playResultSound(aiWinner === 'draw' ? 'draw' : 'win');
              }, 300);
              
              return {
                ...prevState,
                board: currentBoard,
                winner: aiWinner,
                winningLine: aiWinLine,
                showConfetti: aiWinner !== 'draw'
              };
            } else {
              console.log("AI normal move completed, switching back to player turn");
              return {
                ...prevState,
                board: currentBoard,
                currentPlayer: playerSymbol
              };
            }
          }
          // If AI couldn't make a move, keep it player's turn
          return prevState;
        });
      }, 700);
      
      return;
    }
    
    // For non-AI modes
    else {
      // Check for a winner
      const { winner, line } = checkWinner(boardCopy, gameState.boardSize);
      
      if (winner) {
        // Small delay to ensure sound plays after the move sound
        setTimeout(() => {
          playResultSound(winner === 'draw' ? 'draw' : 'win');
        }, 300);
        
        setGameState(prev => ({
          ...prev,
          board: boardCopy,
          winner,
          winningLine: line,
          showConfetti: winner !== 'draw'
        }));
        
        return;
      }
      
      // Update game state
      setGameState(prev => ({
        ...prev,
        board: boardCopy,
        currentPlayer: prev.currentPlayer === 'X' ? 'O' : 'X'
      }));
      
      // Handle online game by sending move to server
      if (gameMode === 'online' || gameMode === 'random') {
        // Only send the move if it's our turn
        if (gameState.currentPlayer === gameState.playerSymbol) {
          console.log('Sending move to server - position:', index, 'symbol:', gameState.playerSymbol);
          
          import('./utils/socket').then(socket => {
            socket.makeMove(index, gameState.playerSymbol as string, gameState.currentPlayer);
          });
        } else {
          console.log('Not your turn');
        }
      }
    }
  };

  const handleGameTypeSelect = (type: GameType) => {
    setSelectedGameType(type);
    
    // Close the game type modal
    setShowGameTypeModal(false);
    
    if (settings.soundEnabled) {
      playClickSound();
    }
    
    if (pendingGameMode === 'random') {
      // For random mode, directly find a match
      socket.emit('random_match');
      setShowRandomMatchModal(true);
    } else if (pendingGameMode === 'online') {
      // For online mode, show the room modal
      setShowRoomModal(true);
    } else if (pendingGameMode === 'ai') {
      // For AI mode, start game with selected difficulty, game type and player symbol
      startGame('ai', { 
        difficulty: selectedDifficulty,
        gameType: type,
        playerSymbol: selectedPlayerSymbol,
        moveHistory: type === 'infinity' ? [] : undefined,
        fadingSymbols: type === 'infinity' ? [] : undefined,
        nextFadingSymbols: type === 'infinity' ? [] : undefined
      });
      setPendingGameMode(null);
    } else {
      // For friend mode
      startGame(pendingGameMode as GameMode, { gameType: type });
      setPendingGameMode(null);
    }
  };
    
  // A type-safe utility function to check if a gameType is 'infinity'
  const isInfinityGameType = (type: GameType): boolean => {
    return type === 'infinity';
  };

  // Then use it in the resetGame function:
  const resetGame = (gameType = gameState.gameType) => {
    console.log("Resetting game with type:", gameType, "mode:", gameMode);
    playClickSound();
    
    // Preserve the current game settings
    const preserveSettings = {
      difficulty: gameState.difficulty,
      playerSymbol: gameState.playerSymbol,
      aiSymbol: gameState.aiSymbol,
      boardSize: gameState.boardSize,
      theme: gameState.theme,
      boardStyle: gameState.boardStyle,
      symbolStyle: gameState.symbolStyle
    };
    
    // Create a new empty board
    let newBoard: BoardState;
    
    // Determine board size and create appropriate board
    switch (preserveSettings.boardSize) {
      case '4x4':
        newBoard = Array(16).fill(null);
        break;
      case '5x5':
        newBoard = Array(25).fill(null);
        break;
      case 'ultimate':
        setUltimateBoard(initializeUltimateBoard());
        newBoard = Array(9).fill(null);
        break;
      default:
        newBoard = Array(9).fill(null);
    }
    
    // For AI mode, determine if AI should go first
    let initialPlayer: Player = 'X';
    let aiTurn = false;
    
    if (gameMode === 'ai') {
      const playerSymbol = preserveSettings.playerSymbol || 'X';
      const aiSymbol = preserveSettings.aiSymbol || 'O';
      aiTurn = playerSymbol === 'O'; // AI goes first if player is O
      initialPlayer = aiTurn ? 'X' : 'O';
      
      console.log(`Reset: Player=${playerSymbol}, AI=${aiSymbol}, AI first=${aiTurn}`);
    }
    
    // Reset timer
    setGameStartTime(new Date());
    
    // Update game state with fresh board and reset winner
    setGameState({
      ...initialGameState,
      board: newBoard,
      currentPlayer: initialPlayer,
      theme: preserveSettings.theme,
      boardStyle: preserveSettings.boardStyle,
      symbolStyle: preserveSettings.symbolStyle,
      gameType: gameType,
      moveHistory: gameType === 'infinity' ? [] : undefined,
      fadingSymbols: gameType === 'infinity' ? [] : undefined,
      nextFadingSymbols: gameType === 'infinity' ? [] : undefined,
      // Keep AI-specific settings
      difficulty: preserveSettings.difficulty,
      playerSymbol: preserveSettings.playerSymbol,
      aiSymbol: preserveSettings.aiSymbol,
      boardSize: preserveSettings.boardSize
    });
    
    // For AI mode, handle first move if needed
    if (gameMode === 'ai' && aiTurn) {
      console.log("AI should make first move after reset");
      
      // Small delay to allow state update to complete
      setTimeout(() => {
        // AI makes first move as X
        const difficulty = preserveSettings.difficulty || 'medium';
        console.log(`AI making first move with difficulty ${difficulty}`);
        const aiMove = getAIMove(newBoard, difficulty, preserveSettings.boardSize || '3x3');
        
        if (aiMove !== -1) {
          console.log(`AI will place at index ${aiMove}`);
          
          // Process differently based on game type
          if (gameType === 'infinity') {
            // For infinity mode, use processInfinityMove with completely fresh history
            const { board: aiUpdatedBoard, moveHistory: aiUpdatedMoveHistory, nextFadingSymbols } = 
              processInfinityMove(newBoard, aiMove, 'X', []);
            
            // Play move sound
            playMoveSound('X');
            
            // Update game state
            setGameState(prev => ({
              ...prev,
              board: aiUpdatedBoard,
              moveHistory: aiUpdatedMoveHistory,
              nextFadingSymbols,
              currentPlayer: 'O'  // Now it's player's turn
            }));
          } else {
            // Regular mode
            const boardCopy = [...newBoard];
            boardCopy[aiMove] = 'X';
            playMoveSound('X');
            
            setGameState(prev => ({
              ...prev,
              board: boardCopy,
              currentPlayer: 'O'
            }));
          }
        }
      }, 800);
    }
  };

  const startGame = (mode: GameMode, options: any = {}) => {
    // Game mode is AI, Friend, or Online
    setGameMode(mode);
    
    // Get the board size and prepare initial board
    const boardSize = options.boardSize || settings.boardSize;
    let initialBoard: BoardState;
    
    // Determine board size and create appropriate board
    switch (boardSize) {
      case '4x4':
        initialBoard = Array(16).fill(null);
        break;
      case '5x5':
        initialBoard = Array(25).fill(null);
        break;
      case 'ultimate':
        // For ultimate, set up the meta board
        initialBoard = Array(9).fill(null);
        break;
      default:
        // Default 3x3 board
        initialBoard = Array(9).fill(null);
    }
    
    // For AI mode, determine player symbols
    let initialPlayer: Player = 'X';
    let playerSymbol: Player = options.playerSymbol || selectedPlayerSymbol;
    let aiSymbol: Player = playerSymbol === 'X' ? 'O' : 'X';
    
    // Log the AI game initialization
    if (mode === 'ai') {
      console.log(`Starting AI game: player=${playerSymbol}, AI=${aiSymbol}, difficulty=${options.difficulty || selectedDifficulty}, gameType=${options.gameType || 'normal'}`);
    }
    
    // Create the updated game state
    const updatedGameState: Partial<GameState> = {
      board: initialBoard,
      currentPlayer: initialPlayer,
      winner: null,
      winningLine: null,
      theme: settings.theme,
      showConfetti: false,
      gameType: options.gameType || 'normal',
      boardSize,
      boardStyle: settings.boardStyle,
      symbolStyle: settings.symbolStyle,
      moveHistory: options.gameType === 'infinity' ? [] : undefined,
      fadingSymbols: options.gameType === 'infinity' ? [] : undefined,
      nextFadingSymbols: options.gameType === 'infinity' ? [] : undefined
    };
    
    // Add mode-specific properties
    if (mode === 'ai') {
      updatedGameState.difficulty = options.difficulty || selectedDifficulty;
      updatedGameState.playerSymbol = playerSymbol;
      updatedGameState.aiSymbol = aiSymbol;
    } else if (mode === 'online' || mode === 'random') {
      updatedGameState.roomCode = options.roomCode;
      updatedGameState.roomStatus = options.roomStatus || 'playing';
      updatedGameState.playerSymbol = options.playerSymbol === 'O' ? 'O' : 'X';
    }
    
    // Update the game state
    setGameState(prev => ({
      ...prev,
      ...updatedGameState
    }));
    
    // Start the game timer
    setGameStartTime(new Date());
    
    // For AI mode, let AI make first move if player is O
    if (mode === 'ai' && selectedPlayerSymbol === 'O') {
      setTimeout(() => {
        // AI will make the first move (as X)
        const difficulty = options.difficulty || selectedDifficulty;
        const aiMove = getAIMove(initialBoard, difficulty, boardSize);
        console.log("AI making first move at index:", aiMove);
        
        if (aiMove !== -1) {
          // Check if this is infinity mode
          if (options.gameType === 'infinity') {
            // For infinity mode, use processInfinityMove
            const { board: aiUpdatedBoard, moveHistory: aiUpdatedMoveHistory, nextFadingSymbols } = 
              processInfinityMove(initialBoard, aiMove, 'X', []);
            
            // Play the AI move sound
            playMoveSound('X');
            
            setGameState(prev => ({
              ...prev,
              board: aiUpdatedBoard,
              moveHistory: aiUpdatedMoveHistory,
              nextFadingSymbols,
              currentPlayer: 'O'  // Now it's player's turn
            }));
          } else {
            // Make AI move directly for normal mode
            const boardCopy = [...initialBoard];
            boardCopy[aiMove] = 'X';
            
            // Play the AI move sound
            playMoveSound('X');
            
            setGameState(prev => ({
              ...prev,
              board: boardCopy,
              currentPlayer: 'O'  // Now it's player's turn
            }));
          }
        }
      }, 500);
    }
  };

  // Add a helper function to initialize audio on user interaction
  const initializeAudioOnInteraction = useCallback(() => {
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    // Resume the audio context if it's suspended
    if (context.state === 'suspended') {
      context.resume();
    }
    
    // Initialize our game audio
    initializeAudio();
    
    // If background music is enabled, play it
    if (settings.backgroundMusic && settings.soundEnabled) {
      import('./utils/sounds').then(sounds => {
        sounds.playBackgroundMusic();
      });
    }
  }, [settings.backgroundMusic, settings.soundEnabled]);

  // Use this function in user interaction handlers
  useEffect(() => {
    // Add event listeners to initialize audio on first user interaction
    const handleInteraction = () => {
      initializeAudioOnInteraction();
      
      // Remove the event listeners after first interaction
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
    
    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);
    document.addEventListener('keydown', handleInteraction);
    
    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, [initializeAudioOnInteraction]);

  // Update button click handlers to initialize audio
  const handleGameModeSelect = (mode: GameMode) => {
    initializeAudioOnInteraction();
    if (settings.soundEnabled) {
      playClickSound();
    }
    
    // Set the pending game mode
    setPendingGameMode(mode);
    
    // Show appropriate modal based on the selected mode
    if (mode === 'ai') {
      setShowDifficultyModal(true);
    } else if (mode === 'friend') {
      // For friend mode, go directly to game type selection
      setShowGameTypeModal(true);
    } else if (mode === 'online') {
      // For online mode, go directly to room selection
      setShowRoomModal(true);
    } else if (mode === 'random') {
      // For random mode, show random match modal
      setShowRandomMatchModal(true);
    }
  };

  const handleDifficultySelect = (difficulty: Difficulty) => {
    if (settings.soundEnabled) {
      playClickSound();
    }
    setSelectedDifficulty(difficulty);
    setShowDifficultyModal(false);
    
    // Randomly select player symbol (50/50 chance)
    const randomSymbol = Math.random() > 0.5 ? 'X' : 'O';
    setSelectedPlayerSymbol(randomSymbol as 'X' | 'O');
    
    // Show toast notification about assigned symbol
    setToastMessage(`You'll play as ${randomSymbol}. ${randomSymbol === 'X' ? 'You go first!' : 'AI goes first!'}`);
    setShowToast(true);
    
    // After selecting difficulty, go directly to game type selection
    setShowGameTypeModal(true);
  };

  // Add a new function to handle symbol selection
  const handleSymbolSelect = (playerSymbol: 'X' | 'O') => {
    if (settings.soundEnabled) {
      playClickSound();
    }
    setSelectedPlayerSymbol(playerSymbol);
    setShowSymbolSelectionModal(false);
    
    // After selecting symbol, show game type modal
    setShowGameTypeModal(true);
  };

  const handleCreateRoom = (roomCode: string) => {
    console.log("Room created with code:", roomCode);
    // Set game mode and start game immediately
    startGame('online', {
      roomCode,
      playerSymbol: 'X',
      roomStatus: 'waiting',
      gameType: selectedGameType
    });
    setShowRoomModal(false);
    setPendingGameMode(null);
  };

  const handleJoinRoom = (roomCode: string) => {
    console.log("Joining room with code:", roomCode);
    // Set game mode and start game immediately
    startGame('online', {
      roomCode,
      playerSymbol: 'O',
      roomStatus: 'playing',
      gameType: selectedGameType
    });
    setShowRoomModal(false);
    setPendingGameMode(null);
  };

  const handleRandomMatch = () => {
    // Initialize audio and play click sound
    initializeAudioOnInteraction();
    if (settings.soundEnabled) {
      playClickSound();
    }
    
    // Set the game to random mode and show the searching modal
    setPendingGameMode('random');
    setSelectedGameType('normal');
    setShowRandomMatchModal(true);
    
    // The RandomMatchModal will handle the actual random_match event
    // and game will be started when we get the game_start event from server
  };

  const handleSaveSettings = (newSettings: GameSettings) => {
    // Initialize audio if needed
    initializeAudio();
    playClickSound();
    setSettings(newSettings);
    setGameState(prev => ({
      ...prev,
      theme: newSettings.theme
    }));

    // Apply dark mode changes
    if (newSettings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const getGameStatus = () => {
    if (gameState.winner === 'draw') return "It's a draw!";
    if (gameState.winner) return `${gameState.winner} wins!`;
    if (gameState.roomStatus === 'waiting') return "Waiting for opponent...";
    if (gameState.roomStatus === 'playing') return "Playing game...";
    if (gameState.roomStatus === 'ended') return "Opponent left the game";
    return `${gameState.currentPlayer}'s turn`;
  };

  const handleBackToMenu = () => {
    playClickSound();
    // Clean up any ongoing games or connections
    if (gameState.roomCode) {
      socket.emit('leave_room');
    }
    setGameMode(null);
    setGameState({...initialGameState, theme: settings.theme});
  };

  // Effect to handle fading symbols in Infinity mode
  useEffect(() => {
    // Only run for Infinity mode when there are fading symbols
    if (!isInfinityMode() || !gameState.fadingSymbols || gameState.fadingSymbols.length === 0) {
      return;
    }
    
    console.log("Fading symbols effect running for:", gameState.fadingSymbols);
    
    // Set a timeout to remove the fading symbols after showing the visual effect
    const timeout = setTimeout(() => {
      setGameState(prev => {
        // Create copies of the board and move history
        const newBoard = [...prev.board];
        const newMoveHistory = [...(prev.moveHistory || [])];
        
        // Process each fading symbol
        prev.fadingSymbols?.forEach(index => {
          // Get the player who placed this symbol
          const player = newBoard[index];
          
          if (player) {
            // Remove the symbol from the board
            newBoard[index] = null;
            
            // Remove this move from the history
            const filteredHistory = newMoveHistory.filter(
              move => !(move.index === index && move.player === player)
            );
            
            // Update move history
            newMoveHistory.length = 0;
            newMoveHistory.push(...filteredHistory);
            
            console.log(`Removed symbol at index ${index} for player ${player}`);
          }
        });
        
        // Check if removing the symbols resulted in a win or draw
        const { winner, line } = checkWinner(newBoard, prev.boardSize);
        
        if (winner) {
          // Play the appropriate sound effect
          playResultSound(winner === 'draw' ? 'draw' : 'win');
          
          return {
            ...prev,
            board: newBoard,
            moveHistory: newMoveHistory,
            fadingSymbols: [],
            winner,
            winningLine: line,
            showConfetti: winner !== 'draw'
          };
        }
        
        // Return updated state with fading symbols cleared
        return {
          ...prev,
          board: newBoard,
          moveHistory: newMoveHistory,
          fadingSymbols: []
        };
      });
    }, 1500); // Delay for 1.5 seconds to show the visual effect
    
    // Clean up timeout on unmount or when fadingSymbols changes
    return () => clearTimeout(timeout);
  }, [gameState.fadingSymbols]);

  // Update the handleOpenTutorial function to ensure it works properly
  const handleOpenTutorial = () => {
    console.log("handleOpenTutorial called");
    // Reset any game state or modal that might interfere
    setShowSettingsModal(false);
    setShowDifficultyModal(false);
    setShowGameTypeModal(false);
    setShowRoomModal(false);
    setShowRandomMatchModal(false);
    
    // Play sound if enabled
    if (settings.soundEnabled) {
      playClickSound();
    }
    
    // Set showTutorial state
    setShowTutorial(true);
  };

  // Dynamic classes based on dark mode setting
  const backgroundClass = settings.darkMode
    ? "bg-gradient-to-br from-gray-900 to-gray-800" 
    : getThemeClasses(settings.theme, 'bg');
    
  const contentBgClass = settings.darkMode 
    ? "bg-gray-800/90 text-white" 
    : "bg-white/90";
    
  const buttonBgClass = settings.darkMode 
    ? "bg-gray-700 hover:bg-gray-600 text-white" 
    : "bg-white/80 text-gray-600 hover:text-gray-800";

  const primaryClass = getThemeClasses(settings.theme, 'primary');
  const secondaryClass = getThemeClasses(settings.theme, 'secondary');
  const gradientClass = getThemeClasses(settings.theme, 'gradient');

  // Add a useEffect to reinitialize the game when the board size changes
  useEffect(() => {
    if (isBoardSizeSelectable && gameMode) {
      // Only reinitialize if the board size changed and we're in a game
      if (gameState.boardSize !== settings.boardSize) {
        initializeGame(settings.boardSize);
      }
    }
  }, [settings.boardSize, gameMode]);

  // Update sound pack when settings change
  useEffect(() => {
    try {
      if (settings.soundEnabled) {
        // Initialize audio context if needed
        initializeAudio().then(() => {
          // Import dynamically to avoid circular dependencies
          import('./utils/sounds').then(sounds => {
            sounds.setSoundPack(settings.soundPack);
            sounds.setVolume(settings.volume);
            
            // Make sure background music plays if enabled
            if (settings.backgroundMusic) {
              sounds.playBackgroundMusic();
            } else {
              sounds.stopBackgroundMusic();
            }
          });
        });
      }
    } catch (err) {
      console.error("Failed to update sound settings:", err);
    }
  }, [settings.soundEnabled, settings.soundPack, settings.volume, settings.backgroundMusic]);

  // When app is first mounted, apply dark mode
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Load saved settings from localStorage
    const savedSettings = localStorage.getItem('ticTacToeSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({
          ...prev,
          ...parsed
        }));
      } catch (e) {
        console.error('Failed to parse saved settings', e);
      }
    }
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('ticTacToeSettings', JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }, [settings]);

  // Also update the condition at the top of the component to make sure tutorial takes precedence
  if (showTutorial) {
    console.log("Rendering tutorial page");
    return (
      <ErrorBoundary
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl shadow-lg text-center max-w-md">
              <h2 className="text-xl font-bold mb-4">Something went wrong</h2>
              <p className="mb-6">We couldn't load the tutorial. Please try again.</p>
              <button 
                className="px-6 py-2 bg-white text-blue-600 rounded-lg font-medium"
                onClick={() => setShowTutorial(false)}
              >
                Back to Game
              </button>
            </div>
          </div>
        }
      >
        <Suspense fallback={<LazyLoadingFallback />}>
          <LazyTutorialPage onClose={() => setShowTutorial(false)} darkMode={settings.darkMode} />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // Error Handling UI
  if (error) {
    return (
      <div className={`min-h-screen ${backgroundClass} flex items-center justify-center p-4`}>
        <div className="bg-white/90 backdrop-blur-sm p-8 rounded-xl shadow-xl max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-5 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Refresh Application
          </button>
        </div>
      </div>
    );
  }

  if (!gameMode) {
    return (
      <ErrorBoundary
        fallback={
          <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            <div className="bg-white/10 backdrop-blur-md p-8 rounded-xl shadow-xl max-w-md w-full">
              <h1 className="text-2xl font-bold mb-4">Oops! Something went wrong</h1>
              <p className="mb-6">We encountered an error while loading the game. Please try the following:</p>
              <ul className="list-disc pl-5 mb-6">
                <li className="mb-2">Refresh the page</li>
                <li className="mb-2">Clear your browser cache</li>
                <li className="mb-2">Try a different browser</li>
                <li>If the problem persists, please try again later</li>
              </ul>
              <button 
                onClick={() => window.location.reload()} 
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        }
      >
        <div className={`min-h-screen ${backgroundClass} flex items-center justify-center p-4 relative overflow-hidden`}>
          {/* Subtle animated background for the game board - reduced for mobile */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: bgElementCount }).map((_, i) => (
              <motion.div
                key={i}
                className={`absolute rounded-full ${settings.darkMode ? 'bg-gray-600' : 'bg-white'} opacity-10`}
                initial={{
                  x: `${Math.random() * 100}vw`,
                  y: `${Math.random() * 100}vh`,
                  scale: Math.random() * 0.5 + 0.5,
                }}
                animate={settings.showAnimations && !isLowEndDevice() ? {
                  y: [`${Math.random() * 100}vh`, `${Math.random() * 100}vh`],
                  x: [`${Math.random() * 100}vw`, `${Math.random() * 100}vw`],
                } : {}}
                transition={{
                  duration: Math.random() * 20 + 10,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
                style={{
                  width: `${Math.random() * 100 + 50}px`,
                  height: `${Math.random() * 100 + 50}px`,
                  filter: 'blur(8px)',
                }}
              />
            ))}
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: isLowEndDevice() ? 10 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${contentBgClass} backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-white/50 relative`}
            transition={{ 
              duration: settings.animationSpeed === 'slow' ? 0.7 : 
                        settings.animationSpeed === 'medium' ? 0.5 : 0.3 
            }}
          >
            <div className="absolute top-4 right-4">
              <SettingsButton 
                onClick={() => setShowSettingsModal(true)} 
                className={`${settings.darkMode ? 'bg-gray-700/80 text-gray-200 hover:bg-gray-600 hover:text-white' : 'bg-white/80 text-gray-700 hover:bg-white hover:text-gray-900'} shadow-lg`}
              />
            </div>
            
            <motion.h1 
              className={`text-4xl sm:text-5xl font-bold mb-8 ${
                settings.darkMode ? 
                  'text-white' : 
                  `bg-gradient-to-r ${gradientClass} text-transparent bg-clip-text`
              }`}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: isLowEndDevice() ? "tween" : "spring", 
                stiffness: settings.animationSpeed === 'slow' ? 200 : 
                          settings.animationSpeed === 'medium' ? 300 : 400, 
                damping: 20,
                duration: isLowEndDevice() ? 0.3 : undefined
              }}
            >
              Tic Tac Toe
            </motion.h1>
            
            <div className="space-y-4">
              <motion.button
                whileHover={settings.showAnimations && !isLowEndDevice() ? 
                  { scale: 1.03, x: 3, boxShadow: "0 15px 20px -5px rgba(0, 0, 0, 0.1), 0 8px 8px -5px rgba(0, 0, 0, 0.04)" } : 
                  { scale: 1 }
                }
                whileTap={{ scale: settings.showAnimations ? 0.97 : 1 }}
                transition={{ 
                  duration: settings.animationSpeed === 'slow' ? 0.3 : 
                            settings.animationSpeed === 'medium' ? 0.2 : 0.1
                }}
                className="w-72 p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg flex items-center justify-center space-x-3 text-white hover:from-blue-600 hover:to-blue-700 transform transition-all"
                onClick={() => handleGameModeSelect('friend')}
              >
                <Users className="w-6 h-6" />
                <span className="font-semibold text-lg">Play with Friend</span>
              </motion.button>
              
              <motion.button
                whileHover={settings.showAnimations && !isLowEndDevice() ? 
                  { scale: 1.03, x: 3, boxShadow: "0 15px 20px -5px rgba(0, 0, 0, 0.1), 0 8px 8px -5px rgba(0, 0, 0, 0.04)" } : 
                  { scale: 1 }
                }
                whileTap={{ scale: settings.showAnimations ? 0.97 : 1 }}
                transition={{ 
                  duration: settings.animationSpeed === 'slow' ? 0.3 : 
                            settings.animationSpeed === 'medium' ? 0.2 : 0.1
                }}
                className="w-72 p-4 bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl shadow-lg flex items-center justify-center space-x-3 text-white hover:from-teal-600 hover:to-teal-700 transform transition-all"
                onClick={() => {
                  setPendingGameMode('friend');
                  startGame('friend', { gameType: 'infinity' });
                }}
              >
                <span className="text-xl mr-1">♾️</span>
                <span className="font-semibold text-lg">Infinity Mode</span>
              </motion.button>
              
              <motion.button
                whileHover={settings.showAnimations && !isLowEndDevice() ? 
                  { scale: 1.03, x: 3, boxShadow: "0 15px 20px -5px rgba(0, 0, 0, 0.1), 0 8px 8px -5px rgba(0, 0, 0, 0.04)" } : 
                  { scale: 1 }
                }
                whileTap={{ scale: settings.showAnimations ? 0.97 : 1 }}
                transition={{ 
                  duration: settings.animationSpeed === 'slow' ? 0.3 : 
                            settings.animationSpeed === 'medium' ? 0.2 : 0.1
                }}
                className="w-72 p-4 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-lg flex items-center justify-center space-x-3 text-white hover:from-purple-600 hover:to-purple-700 transform transition-all"
                onClick={() => handleGameModeSelect('ai')}
              >
                <Gamepad2 className="w-6 h-6" />
                <span className="font-semibold text-lg">Play with AI</span>
              </motion.button>
              
              <motion.button
                whileHover={settings.showAnimations && !isLowEndDevice() ? 
                  { scale: 1.03, x: 3, boxShadow: "0 15px 20px -5px rgba(0, 0, 0, 0.1), 0 8px 8px -5px rgba(0, 0, 0, 0.04)" } : 
                  { scale: 1 }
                }
                whileTap={{ scale: settings.showAnimations ? 0.97 : 1 }}
                transition={{ 
                  duration: settings.animationSpeed === 'slow' ? 0.3 : 
                            settings.animationSpeed === 'medium' ? 0.2 : 0.1
                }}
                className="w-72 p-4 bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl shadow-lg flex items-center justify-center space-x-3 text-white hover:from-pink-600 hover:to-pink-700 transform transition-all"
                onClick={() => handleGameModeSelect('online')}
              >
                <Wifi className="w-6 h-6" />
                <span className="font-semibold text-lg">Create/Join Room</span>
              </motion.button>
              
              <motion.button
                whileHover={settings.showAnimations && !isLowEndDevice() ? 
                  { scale: 1.03, x: 3, boxShadow: "0 15px 20px -5px rgba(0, 0, 0, 0.1), 0 8px 8px -5px rgba(0, 0, 0, 0.04)" } : 
                  { scale: 1 }
                }
                whileTap={{ scale: settings.showAnimations ? 0.97 : 1 }}
                transition={{ 
                  duration: settings.animationSpeed === 'slow' ? 0.3 : 
                            settings.animationSpeed === 'medium' ? 0.2 : 0.1
                }}
                className="w-72 p-4 bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg flex items-center justify-center space-x-3 text-white hover:from-green-600 hover:to-green-700 transform transition-all"
                onClick={() => handleGameModeSelect('random')}
              >
                <Globe className="w-6 h-6" />
                <span className="font-semibold text-lg">Random Match</span>
              </motion.button>

              <motion.button
                whileHover={settings.showAnimations && !isLowEndDevice() ? 
                  { scale: 1.03, x: 3, boxShadow: "0 15px 20px -5px rgba(0, 0, 0, 0.1), 0 8px 8px -5px rgba(0, 0, 0, 0.04)" } : 
                  { scale: 1 }
                }
                whileTap={{ scale: settings.showAnimations ? 0.97 : 1 }}
                transition={{ 
                  duration: settings.animationSpeed === 'slow' ? 0.3 : 
                            settings.animationSpeed === 'medium' ? 0.2 : 0.1
                }}
                className="w-72 p-4 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl shadow-lg flex items-center justify-center space-x-3 text-white hover:from-amber-600 hover:to-amber-700 transform transition-all"
                onClick={() => handleOpenTutorial()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="font-semibold text-lg">Game Tutorial</span>
              </motion.button>
            </div>

            {/* Tutorial link */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-6 text-center"
            >
              <motion.button
                onClick={() => handleOpenTutorial()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`py-2 px-4 rounded-lg ${
                  settings.darkMode 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                } font-medium flex items-center justify-center mx-auto`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                How to Play (Tutorial)
              </motion.button>
            </motion.div>
          </motion.div>

          <AnimatePresence>
            {showDifficultyModal && (
              <DifficultyModal
                onSelect={handleDifficultySelect}
                onClose={() => {
                  setShowDifficultyModal(false);
                  setPendingGameMode(null);
                }}
              />
            )}
            {showSymbolSelectionModal && (
              <SymbolSelectionModal
                onSelect={handleSymbolSelect}
                onClose={() => {
                  setShowSymbolSelectionModal(false);
                  setPendingGameMode(null);
                }}
                darkMode={settings.darkMode}
              />
            )}
            {showRoomModal && (
              <RoomModal
                onCreateRoom={handleCreateRoom}
                onJoinRoom={handleJoinRoom}
                onClose={() => {
                  setShowRoomModal(false);
                  setPendingGameMode(null);
                }}
              />
            )}
            {showRandomMatchModal && (
              <RandomMatchModal
                onClose={() => {
                  setShowRandomMatchModal(false);
                  setPendingGameMode(null);
                }}
              />
            )}
            {showSettingsModal && (
              <Suspense fallback={<LazyLoadingFallback />}>
                <LazySettingsModal
                settings={settings}
                onSave={handleSaveSettings}
                  onClose={() => {
                    setShowSettingsModal(false);
                    playClickSound();
                  }}
              />
              </Suspense>
            )}
            {showGameTypeModal && (
              <GameTypeModal
                onSelect={handleGameTypeSelect}
                onClose={() => {
                  setShowGameTypeModal(false);
                  setPendingGameMode(null);
                }}
                darkMode={settings.darkMode}
              />
            )}
          </AnimatePresence>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-500 to-purple-600 text-white">
          <div className="bg-white/10 backdrop-blur-md p-8 rounded-xl shadow-xl max-w-md w-full">
            <h1 className="text-2xl font-bold mb-4">Oops! Something went wrong</h1>
            <p className="mb-6">We encountered an error while loading the game. Please try the following:</p>
            <ul className="list-disc pl-5 mb-6">
              <li className="mb-2">Refresh the page</li>
              <li className="mb-2">Clear your browser cache</li>
              <li className="mb-2">Try a different browser</li>
              <li>If the problem persists, please try again later</li>
            </ul>
            <button 
              onClick={() => window.location.reload()} 
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      }
    >
      <div className={`min-h-screen ${backgroundClass} flex items-center justify-center p-4 relative overflow-hidden`}>
        {/* Subtle animated background for the game board */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={i}
              className={`absolute rounded-full ${settings.darkMode ? 'bg-gray-600' : 'bg-white'} opacity-10`}
              initial={{
                x: `${Math.random() * 100}vw`,
                y: `${Math.random() * 100}vh`,
                scale: Math.random() * 0.5 + 0.5,
              }}
              animate={{
                y: [`${Math.random() * 100}vh`, `${Math.random() * 100}vh`],
                x: [`${Math.random() * 100}vw`, `${Math.random() * 100}vw`],
              }}
              transition={{
                duration: Math.random() * 20 + 10,
                repeat: Infinity,
                repeatType: "reverse",
              }}
              style={{
                width: `${Math.random() * 100 + 50}px`,
                height: `${Math.random() * 100 + 50}px`,
                filter: 'blur(8px)',
              }}
            />
          ))}
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${contentBgClass} backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-white/50 relative`}
          transition={{ 
            duration: settings.animationSpeed === 'slow' ? 0.7 : 
                      settings.animationSpeed === 'medium' ? 0.5 : 0.3 
          }}
        >
          {settings.showTimer && <GameTimer enabled={!!gameMode} darkMode={settings.darkMode} startTime={gameStartTime} />}
          
          <div className="text-center mb-6 relative h-10">
            <div className="absolute left-0 h-10 w-10 flex items-center justify-center">
            <motion.button
                whileHover={{ scale: settings.showAnimations ? 1.1 : 1 }}
                whileTap={{ scale: settings.showAnimations ? 0.9 : 1 }}
                className={`${buttonBgClass} p-2 rounded-full shadow-md`}
                onClick={handleBackToMenu}
              >
                <ArrowLeft className="w-5 h-5" />
            </motion.button>
            </div>
            
            <div className="absolute right-0 h-10 w-10 flex items-center justify-center">
              <SettingsButton 
                onClick={() => setShowSettingsModal(true)} 
                className={buttonBgClass}
              />
            </div>
            
            <div className="inline-block">
              <motion.h1 
                className={`text-3xl font-bold ${settings.darkMode ? 'text-white' : `bg-gradient-to-r ${gradientClass} text-transparent bg-clip-text`} mb-2`}
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
              Tic Tac Toe
              </motion.h1>
            </div>
          </div>
          
          <div className="text-center mb-4">
            {gameMode === 'ai' && (
              <motion.p 
                className={`text-lg ${settings.darkMode ? 'text-gray-300' : 'text-gray-600'}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                AI Difficulty: <span className={`font-semibold ${gameState.difficulty === 'god' ? 'text-red-500' : ''}`}>{gameState.difficulty}</span>
                {gameMode === 'ai' && gameState.currentPlayer === gameState.aiSymbol && !gameState.winner && (
                  <span className="ml-2 inline-flex items-center text-blue-500">
                    <span className="animate-pulse mr-1">●</span> AI thinking...
                  </span>
                )}
              </motion.p>
            )}
            {gameMode === 'online' && gameState.roomCode && (
              <motion.p 
                className={`text-lg ${settings.darkMode ? 'text-gray-300' : 'text-gray-600'}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Room: <span className="font-mono font-semibold">{gameState.roomCode}</span>
                {gameState.playerSymbol && <span className="ml-2">(You: {gameState.playerSymbol})</span>}
              </motion.p>
            )}
              <motion.p 
                className={`text-lg ${settings.darkMode ? 'text-gray-300' : 'text-gray-600'}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              >
              {getGameStatus()}
              </motion.p>
          </div>

          {/* Display infinity mode banner */}
          {isInfinityMode() && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-teal-100 dark:bg-teal-800/50 text-teal-800 dark:text-teal-200 rounded-lg p-3 text-center mb-4 shadow-md"
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-xl">♾️</span>
                <span className="font-semibold">INFINITY MODE</span>
          </div>
              <p className="text-sm">Each player can have max 3 symbols. Your oldest symbol will fade when it's about to be replaced.</p>
            </motion.div>
          )}

          {/* Game area */}
          <div className="flex-1 flex items-center justify-center relative">
            {gameState.boardSize === 'ultimate' && gameMode ? (
              <UltimateBoard
                ultimateBoard={ultimateBoard}
                onCellClick={handleUltimateCellClick}
                currentPlayer={gameState.currentPlayer}
                disabled={!!gameState.winner || (gameMode === 'online' && gameState.playerSymbol !== gameState.currentPlayer)}
                winner={gameState.winner}
                theme={gameState.theme}
                settings={settings}
              />
            ) : (gameState.boardSize === '4x4' || gameState.boardSize === '5x5') && gameMode ? (
              <LargeBoard
                board={gameState.board}
                onCellClick={handleCellClick}
                currentPlayer={gameState.currentPlayer}
                winningLine={gameState.winningLine}
                disabled={!!gameState.winner || (gameMode === 'online' && gameState.playerSymbol !== gameState.currentPlayer) 
                        || (gameMode === 'ai' && gameState.currentPlayer !== gameState.playerSymbol)}
                winner={gameState.winner}
                theme={gameState.theme}
                settings={settings}
                boardSize={gameState.boardSize}
              />
            ) : (
              <Suspense fallback={<LazyLoadingFallback />}>
                <LazyBoard
                  board={gameState.board}
                  onCellClick={handleCellClick}
                  currentPlayer={gameState.currentPlayer}
                  winningLine={gameState.winningLine}
                  disabled={!!gameState.winner || (gameMode === 'online' && gameState.playerSymbol !== gameState.currentPlayer)
                          || (gameMode === 'ai' && gameState.currentPlayer !== gameState.playerSymbol)}
                  winner={gameState.winner}
                  theme={gameState.theme}
                  settings={settings}
                  fadingSymbols={gameState.fadingSymbols}
                  nextFadingSymbols={gameState.nextFadingSymbols}
                  animationSpeed={isMobile ? 'fast' : settings.animationSpeed}
                />
              </Suspense>
            )}
          </div>

          <motion.div 
            className="mt-6 flex justify-center space-x-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <motion.button
              whileHover={{ scale: settings.showAnimations ? 1.05 : 1, y: -2 }}
              whileTap={{ scale: settings.showAnimations ? 0.95 : 1, y: 0 }}
              className={`px-6 py-2 bg-gradient-to-r ${primaryClass} rounded-lg text-white hover:from-blue-600 hover:to-blue-700 font-semibold shadow-md`}
              onClick={() => resetGame()}
            >
              New Game
            </motion.button>
            
            {gameMode === 'friend' && (
              <motion.button
                whileHover={{ scale: settings.showAnimations ? 1.05 : 1, y: -2 }}
                whileTap={{ scale: settings.showAnimations ? 0.95 : 1, y: 0 }}
                className={`px-6 py-2 ${
                  isInfinityMode() 
                    ? 'bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700' 
                    : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
                } rounded-lg text-white font-semibold shadow-md flex items-center gap-2`}
                onClick={() => {
                  const newGameType = isInfinityMode() ? 'normal' : 'infinity';
                  resetGame(newGameType);
                }}
              >
                <span className="text-sm">
                  {isInfinityMode() ? 'Switch to Normal' : 'Switch to Infinity'}
                </span>
                {isInfinityMode() ? '🔄' : '♾️'}
              </motion.button>
            )}
          </motion.div>

          {/* Replay Button */}
          {gameState.winner && (
            <motion.div 
              className="mt-6 flex justify-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
            >
              <motion.button
                onClick={() => {
                  console.log("Play again clicked");
                  
                  // Force a complete reset of the game state
                  const currentGameType = gameState.gameType;
                  const currentDifficulty = gameState.difficulty;
                  const currentPlayerSymbol = gameState.playerSymbol;
                  const currentAiSymbol = gameState.aiSymbol;
                  const currentBoardSize = gameState.boardSize;
                  
                  // Set to initial state first
                  setGameState({
                    ...initialGameState,
                    theme: settings.theme,
                    boardStyle: settings.boardStyle,
                    symbolStyle: settings.symbolStyle,
                    gameType: currentGameType,
                    difficulty: currentDifficulty,
                    playerSymbol: currentPlayerSymbol,
                    aiSymbol: currentAiSymbol,
                    boardSize: currentBoardSize,
                    moveHistory: currentGameType === 'infinity' ? [] : undefined,
                    fadingSymbols: currentGameType === 'infinity' ? [] : undefined,
                    nextFadingSymbols: currentGameType === 'infinity' ? [] : undefined
                  });
                  
                  // Then restart the game after a short delay
                  setTimeout(() => {
                    resetGame(currentGameType);
                  }, 50);
                  
                  // Play click sound
                  playClickSound();
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`py-2 px-6 rounded-lg flex items-center justify-center font-medium shadow-md ${
                  gameState.winner === 'X' 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : gameState.winner === 'O'
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Play Again
              </motion.button>
            </motion.div>
          )}
        </motion.div>
        
        <AnimatePresence>
          {showSettingsModal && (
            <Suspense fallback={<LazyLoadingFallback />}>
              <LazySettingsModal
              settings={settings}
              onSave={handleSaveSettings}
                onClose={() => {
                  setShowSettingsModal(false);
                  playClickSound();
                }}
              />
            </Suspense>
          )}
        </AnimatePresence>

        {/* Game result modal for all game modes */}
        <AnimatePresence>
          {gameState.winner && (
            <Suspense fallback={<LazyLoadingFallback />}>
              <LazyGameResultModal
                winner={gameState.winner}
                playerSymbol={gameState.playerSymbol || (gameMode === 'ai' ? 'X' : 'X')}
                onPlayAgain={resetGame}
                onClose={() => setGameState(prev => ({ ...prev, winner: null }))}
                onBackToMenu={handleBackToMenu}
                settings={settings}
              />
            </Suspense>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showToast && (
            <Toast 
              message={toastMessage} 
              show={showToast} 
              onClose={() => setShowToast(false)}
              darkMode={settings.darkMode}
            />
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}

// Game Type Selection Modal
const GameTypeModal = ({ 
  onSelect, 
  onClose,
  darkMode = false
}: { 
  onSelect: (type: GameType) => void; 
  onClose: () => void;
  darkMode?: boolean;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-2xl p-6 shadow-xl max-w-sm w-full`}
      >
        <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Select Game Type
        </h2>

        <div className="space-y-4">
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect('normal')}
            className={`w-full p-4 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-xl flex items-center justify-between`}
          >
            <div className="flex items-center">
              <span className="text-2xl mr-3">🎮</span>
              <div className="text-left">
                <div className="font-semibold">Normal Mode</div>
                <div className="text-xs text-blue-100">Classic Tic Tac Toe</div>
              </div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect('infinity')}
            className={`w-full p-4 ${darkMode ? 'bg-teal-600 hover:bg-teal-700' : 'bg-teal-500 hover:bg-teal-600'} text-white rounded-xl flex items-center justify-between`}
          >
            <div className="flex items-center">
              <span className="text-2xl mr-3">♾️</span>
              <div className="text-left">
                <div className="font-semibold">Infinity Mode</div>
                <div className="text-xs text-teal-100">3 symbols max per player</div>
              </div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </motion.button>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className={`mt-6 px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} font-medium text-center w-full`}
        >
          Cancel
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

// Symbol Selection Modal for AI mode
const SymbolSelectionModal = ({ 
  onSelect, 
  onClose,
  darkMode = false
}: { 
  onSelect: (symbol: 'X' | 'O') => void; 
  onClose: () => void;
  darkMode?: boolean;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-2xl p-6 shadow-xl max-w-sm w-full`}
      >
        <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Choose Your Symbol
        </h2>

        <div className="space-y-4">
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect('X')}
            className={`w-full p-4 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-xl flex items-center justify-between`}
          >
            <div className="flex items-center">
              <span className="text-3xl font-bold mr-3">X</span>
              <div className="text-left">
                <div className="font-semibold">Play as X</div>
                <div className="text-xs text-blue-100">You go first</div>
              </div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect('O')}
            className={`w-full p-4 ${darkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'} text-white rounded-xl flex items-center justify-between`}
          >
            <div className="flex items-center">
              <span className="text-3xl font-bold mr-3">O</span>
              <div className="text-left">
                <div className="font-semibold">Play as O</div>
                <div className="text-xs text-green-100">AI goes first</div>
              </div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </motion.button>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className={`mt-6 px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} font-medium text-center w-full`}
        >
          Cancel
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

// Toast notification component
const Toast = ({ message, show, onClose, darkMode = false }: { 
  message: string; 
  show: boolean; 
  onClose: () => void;
  darkMode?: boolean;
}) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50"
    >
      <div className={`px-6 py-3 rounded-lg shadow-lg ${
        darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
      } flex items-center gap-3 max-w-xs sm:max-w-md`}>
        <div className="flex-1">{message}</div>
        <button 
          onClick={onClose}
          className={`p-1 rounded-full ${
            darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
};

export default App;