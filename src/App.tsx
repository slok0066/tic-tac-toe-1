import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense, lazy } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, Users, Wifi, ArrowLeft, Globe, Settings as SettingsIcon, X } from 'lucide-react';
import { Board } from './components/Board';
import { DifficultyModal } from './components/DifficultyModal';
import { RoomModal } from './components/RoomModal';
import { RandomMatchModal } from './components/RandomMatchModal';
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
  const [pendingGameMode, setPendingGameMode] = useState<GameMode | null>(null);
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
      if (gameMode === 'online' || gameMode === 'random') {
        console.log("Setting up socket event listeners");

        // Handle when opponent makes a move
        const handleOpponentMove = (data: any) => {
          console.log("Opponent made move", data);
          setGameState(prev => {
            const newBoard = [...prev.board];
            newBoard[data.position] = data.symbol;
            
            // Properly determine the current player - it should be the player's symbol after opponent's move
            const newCurrentPlayer: Player = prev.playerSymbol === 'X' ? 'X' : 'O';

            return {
              ...prev,
              board: newBoard,
              currentPlayer: newCurrentPlayer // Ensure this is typed as Player
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

        socket.on('move_made', handleOpponentMove);
        
        socket.on('game_start', (data: any) => {
          console.log("Game started with data:", data);
          
          // Determine the player symbol from the data
          let playerSymbol: Player;
          if (data.playerSymbol) {
            // If explicitly specified, use it
            playerSymbol = data.playerSymbol as Player;
          } else if (data.isPlayerX !== undefined) {
            // If isPlayerX flag is provided, use it
            playerSymbol = data.isPlayerX ? 'X' : 'O';
          } else if (data.players && data.players.length > 0) {
            // Find this player's socket.id in the players array
            const player = data.players.find((p: any) => p.id === socket.id);
            playerSymbol = player ? player.symbol as Player : 'X';
          } else {
            // Default to X if nothing else is available
            playerSymbol = 'X';
          }
          
          // Update game state with all the necessary information
          setGameState(prev => ({
            ...prev,
            roomCode: data.roomCode,
            playerSymbol: playerSymbol,
            roomStatus: 'playing',
            currentPlayer: data.currentTurn || 'X', // X always goes first if not specified
            board: Array(9).fill(null) // Reset the board
          }));
          
          // Play a sound to indicate the game is starting
          if (settings.soundEnabled) {
            playClickSound();
          }
        });
        
        socket.on('player_left', handlePlayerLeft);
        
        socket.on('error', (error: string) => {
          console.error("Socket error:", error);
          setError(error);
        });

        return () => {
          // Clean up socket listeners when unmounting
          socket.off('move_made', handleOpponentMove);
          socket.off('game_start');
          socket.off('player_left', handlePlayerLeft);
          socket.off('error');
        };
      }
    } catch (err) {
      console.error("Failed to subscribe to socket events:", err);
    }
  }, [gameMode]);

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
    // Make a copy of the board
    const boardCopy = [...gameState.board];
    
    // Check if the cell is already filled or game is over
    if (boardCopy[index] !== null || gameState.winner) {
      return;
    }

    // Handle based on game mode
    const player = gameState.currentPlayer;
    
    // Update the board with the player's move
    boardCopy[index] = player;

    // Play move sound
    playMoveSound(player);
    
    // For Infinity mode, track move history and manage symbol removal
    if (isInfinityMode()) {
      // Create a copy of the current move history or initialize if it doesn't exist
      const moveHistory = [...(gameState.moveHistory || [])];
      
      // Add the current move to the history
      const newMove: MoveInfo = {
        player,
        index,
      timestamp: Date.now()
    };
      
      // Filter moves by the current player
      const playerMoves = moveHistory.filter(move => move.player === player);
      
      // Check if player will have more than 3 symbols on the board
      let fadingSymbols = [...(gameState.fadingSymbols || [])];
      let newMoveHistory = [...moveHistory, newMove];
      
      // If player already has 3 symbols, remove the oldest one
      if (playerMoves.length >= 3) {
        // Sort by timestamp to find the oldest
        playerMoves.sort((a, b) => a.timestamp - b.timestamp);
        const oldestMove = playerMoves[0];
        
        // Remove the symbol from the board
        boardCopy[oldestMove.index] = null;
        
        // Remove the oldest move from the history
        newMoveHistory = newMoveHistory.filter(
          m => !(m.player === oldestMove.player && m.index === oldestMove.index)
        );
        
        // Remove from fading symbols if it was there
        fadingSymbols = fadingSymbols.filter(idx => idx !== oldestMove.index);
      } 
      // If player will have exactly 3 symbols, mark next player's oldest for removal
      else if (playerMoves.length === 2) {
        // Get next player
        const nextPlayer = player === 'X' ? 'O' : 'X';
        
        // Find moves by the next player
        const nextPlayerMoves = moveHistory.filter(move => move.player === nextPlayer);
        
        // If next player has 3 symbols, mark the oldest for fading
        if (nextPlayerMoves.length >= 3) {
          nextPlayerMoves.sort((a, b) => a.timestamp - b.timestamp);
          const oldestNextPlayerMove = nextPlayerMoves[0];
          fadingSymbols = [oldestNextPlayerMove.index];
        }
      }
      
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
          showConfetti: winner !== 'draw',
          moveHistory: newMoveHistory,
          fadingSymbols
        }));
        return;
      }
      
      // Update game state
      setGameState(prev => ({
        ...prev,
        board: boardCopy,
        currentPlayer: prev.currentPlayer === 'X' ? 'O' : 'X',
        moveHistory: newMoveHistory,
        fadingSymbols
      }));
      
      return;
    }
    
    // Normal game mode logic continues from here
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
    
    // Handle AI move with delay
    if (gameMode === 'ai' && player === 'X') {
      setTimeout(() => {
        // Get a fresh copy of the board at this point
        const boardAfterPlayerMove = [...boardCopy];
        
        // Get the AI move
        const aiIndex = getAIMove(boardAfterPlayerMove, gameState.difficulty || 'medium', gameState.boardSize || '3x3');
        
        if (aiIndex >= 0 && boardAfterPlayerMove[aiIndex] === null) {
          boardAfterPlayerMove[aiIndex] = 'O';
          
          // Play the AI move sound
          playMoveSound('O');
          
          // For Infinity mode, handle the AI move history
          if (isInfinityMode()) {
            setGameState(prev => {
              // Create a copy of the current move history
              const moveHistory = [...(prev.moveHistory || [])];
              
              // Add the AI move
              const newMove: MoveInfo = {
                player: 'O',
                index: aiIndex,
                timestamp: Date.now()
              };
              
              // Filter AI moves
              const aiMoves = moveHistory.filter(move => move.player === 'O');
              
              // Check if AI will have more than 3 symbols
              let fadingSymbols = [...(prev.fadingSymbols || [])];
              let newMoveHistory = [...moveHistory, newMove];
              
              // If AI already has 3 symbols, remove the oldest
              if (aiMoves.length >= 3) {
                // Find the oldest AI move
                aiMoves.sort((a, b) => a.timestamp - b.timestamp);
                const oldestMove = aiMoves[0];
                
                // Remove the symbol
                boardAfterPlayerMove[oldestMove.index] = null;
                
                // Remove from history
                newMoveHistory = newMoveHistory.filter(
                  m => !(m.player === oldestMove.player && m.index === oldestMove.index)
                );
                
                // Remove from fading symbols
                fadingSymbols = fadingSymbols.filter(idx => idx !== oldestMove.index);
              }
              // If AI will have exactly 3 symbols, mark player's oldest for removal
              else if (aiMoves.length === 2) {
                // Find player moves
                const playerMoves = moveHistory.filter(move => move.player === 'X');
                
                // If player has 3 symbols, mark the oldest for fading
                if (playerMoves.length >= 3) {
                  playerMoves.sort((a, b) => a.timestamp - b.timestamp);
                  const oldestPlayerMove = playerMoves[0];
                  fadingSymbols = [oldestPlayerMove.index];
                }
              }
              
              // Check if the AI won
              const { winner, line } = checkWinner(boardAfterPlayerMove, prev.boardSize);
              
              if (winner) {
                // Small delay to ensure sound plays after the move sound
                setTimeout(() => {
                  playResultSound(winner === 'draw' ? 'draw' : 'win');
                }, 300);
                
                return {
                  ...prev,
                  board: boardAfterPlayerMove,
      winner,
      winningLine: line,
                  showConfetti: winner !== 'draw',
      moveHistory: newMoveHistory,
                  fadingSymbols
                };
              }
              
              return {
                ...prev,
                board: boardAfterPlayerMove,
                currentPlayer: 'X',
                moveHistory: newMoveHistory,
                fadingSymbols
              };
            });
            
            return;
          }
          
          // Normal AI game logic continues
          // Check if the AI won
          const { winner, line } = checkWinner(boardAfterPlayerMove, gameState.boardSize);
          
          if (winner) {
            // Small delay to ensure sound plays after the move sound
            setTimeout(() => {
              playResultSound(winner === 'draw' ? 'draw' : 'win');
            }, 300);
            
            setGameState(prev => ({
              ...prev,
              board: boardAfterPlayerMove,
              winner,
              winningLine: line,
              showConfetti: winner !== 'draw'
            }));
          } else {
            setGameState(prev => ({
              ...prev,
              board: boardAfterPlayerMove,
              currentPlayer: 'X'
            }));
          }
        }
      }, 500); // Delay AI move for UX
    }
    
    // Handle online game by sending move to server
    if (gameMode === 'online') {
      const moveData = {
        position: index,
        symbol: gameState.playerSymbol,
        board: [...gameState.board]
      };
      
      socket.emit('make_move', moveData);
    }
  };

  const handleGameTypeSelect = (gameType: GameType) => {
    setSelectedGameType(gameType);
    setShowGameTypeModal(false);
    
    // Reset the game with the new game type
    setGameState(prev => ({
      ...initialGameState,
      theme: settings.theme,
      gameType
    }));
    
    // Show appropriate modal based on the game mode
    const mode = pendingGameMode as GameMode;
    if (mode === 'ai') {
      setShowDifficultyModal(true);
    } else if (mode === 'online') {
      setShowRoomModal(true);
    } else if (mode === 'random') {
      setShowRandomMatchModal(true);
    } else {
      // For friend mode, start directly
      startGame(mode, { gameType });
    }
  };
    
  // A type-safe utility function to check if a gameType is 'infinity'
  const isInfinityGameType = (type: GameType): boolean => {
    return type === 'infinity';
  };

  // Then use it in the resetGame function:
  const resetGame = (gameType = gameState.gameType) => {
    playClickSound();
    
    // Reset timer if needed
    if (settings.showTimer) {
      setGameStartTime(new Date());
    }
    
    setGameState(prev => ({
      ...initialGameState,
      difficulty: prev.difficulty,
      roomCode: prev.roomCode,
      playerSymbol: prev.playerSymbol,
      roomStatus: prev.roomStatus,
      theme: settings.theme,
      gameType,
      moveHistory: isInfinityGameType(gameType) ? [] : undefined,
      fadingSymbols: isInfinityGameType(gameType) ? [] : undefined
    }));
  };

  const startGame = (mode: GameMode, options: any = {}) => {
    try {
      const { difficulty, roomCode, playerSymbol, roomStatus, gameType = 'normal' } = options;
      
      // Reset any previous game state
      resetGame(gameType);
      
      // Update game mode state
      setGameMode(mode);
      
      // For AI mode, set the difficulty
      if (mode === 'ai' && difficulty) {
        setGameState(prev => ({
          ...prev,
          difficulty,
          symbolStyle: settings.symbolStyle,
          boardStyle: settings.boardStyle
        }));
      }
      
      // For online/friend modes, handle room setup
      if ((mode === 'online' || mode === 'random') && roomCode) {
        setGameState(prev => ({
          ...prev,
          roomCode,
          playerSymbol: playerSymbol || 'X',
          roomStatus: roomStatus || 'waiting',
          symbolStyle: settings.symbolStyle,
          boardStyle: settings.boardStyle
        }));
      }
      
      // Set start time for timer
      setGameStartTime(new Date());
      
      console.log(`${mode} game started:`, options);
    } catch (error) {
      console.error("Error starting game:", error);
      setError("Failed to start game. Please try again.");
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
    // Initialize audio on first user interaction
    initializeAudioOnInteraction();
    playClickSound();
    
    // For all modes, show game type selection first
    setPendingGameMode(mode);
    setShowGameTypeModal(true);
  };

  const handleDifficultySelect = (difficulty: Difficulty) => {
    playClickSound();
    startGame(pendingGameMode as GameMode, { difficulty });
    setShowDifficultyModal(false);
    setPendingGameMode(null);
  };

  const handleCreateRoom = (roomCode: string) => {
    playClickSound();
    socket.emit('create_room', { roomCode });
    startGame(pendingGameMode as GameMode, { 
      roomCode, 
      roomStatus: 'waiting',
      playerSymbol: 'X' 
    });
    setShowRoomModal(false);
    setPendingGameMode(null);
  };

  const handleJoinRoom = (roomCode: string) => {
    playClickSound();
    socket.emit('join_room', { roomCode });
    startGame(pendingGameMode as GameMode, { 
      roomCode, 
      roomStatus: 'joining',
      playerSymbol: 'O' 
    });
    setShowRoomModal(false);
    setPendingGameMode(null);
  };

  const handleRandomMatch = (roomCode: string, isPlayerX: boolean) => {
    playClickSound();
    startGame(pendingGameMode as GameMode, { 
      roomCode, 
      roomStatus: 'playing',
      playerSymbol: isPlayerX ? 'X' : 'O' 
    });
    setShowRandomMatchModal(false);
    setPendingGameMode(null);
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
    if (gameState.roomStatus === 'joining') return "Joining game...";
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
                onMatchFound={handleRandomMatch}
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
    <div className={`min-h-screen w-full ${backgroundClass}`}>
      {/* Add the Toast component at the bottom of the app */}
      <Toast 
        message={toastMessage} 
        show={showToast} 
        onClose={() => setShowToast(false)} 
      />
      
      {/* Rest of the App */}
      <div className="relative w-full min-h-screen flex flex-col">
        {/* Game header with status and back button */}
        <div className="flex items-center justify-between p-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBackToMenu}
            className={`${buttonBgClass} px-4 py-2 rounded-xl shadow-md flex items-center space-x-2`}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Menu</span>
          </motion.button>
          
          <div className={`text-center px-4 py-2 rounded-xl ${settings.darkMode ? 'bg-gray-700 text-white' : 'bg-white/90 text-gray-800'} shadow-md`}>
            <span className="font-medium">{getGameStatus()}</span>
          </div>
          
          <SettingsButton 
            onClick={() => setShowSettingsModal(true)} 
          />
        </div>
        
        {/* Game board area */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="relative">
            {/* Timer overlay */}
            <GameTimer 
              enabled={settings.showTimer} 
              darkMode={settings.darkMode}
              startTime={gameStartTime} 
            />
            
            {/* Render the appropriate board based on game type */}
            {gameState.boardSize === 'ultimate' ? (
              <UltimateBoard 
                board={ultimateBoard}
                onCellClick={handleUltimateCellClick}
                currentPlayer={gameState.currentPlayer}
                boardTheme={settings.theme}
                symbolStyle={settings.symbolStyle}
                darkMode={settings.darkMode}
                animationSpeed={settings.animationSpeed}
              />
            ) : isLowEndDevice() || gameState.boardSize === '3x3' ? (
              <ErrorBoundary>
                <Suspense fallback={<LazyLoadingFallback />}>
                  <LazyBoard 
                    board={gameState.board}
                    onCellClick={handleCellClick}
                    winningLine={gameState.winningLine}
                    currentPlayer={gameState.currentPlayer}
                    boardTheme={settings.theme}
                    symbolStyle={settings.symbolStyle}
                    boardStyle={settings.boardStyle}
                    boardSize={gameState.boardSize}
                    showHints={settings.showHints}
                    animationSpeed={settings.animationSpeed}
                    isPlayerTurn={(gameMode !== 'online' || gameState.playerSymbol === gameState.currentPlayer)}
                    darkMode={settings.darkMode}
                    fadingSymbols={gameState.fadingSymbols}
                  />
                </Suspense>
              </ErrorBoundary>
            ) : (
              <LargeBoard 
                board={gameState.board}
                onCellClick={handleCellClick}
                winningLine={gameState.winningLine}
                currentPlayer={gameState.currentPlayer}
                boardTheme={settings.theme}
                symbolStyle={settings.symbolStyle}
                boardStyle={settings.boardStyle}
                boardSize={gameState.boardSize}
                showHints={settings.showHints}
                animationSpeed={settings.animationSpeed}
                isPlayerTurn={(gameMode !== 'online' || gameState.playerSymbol === gameState.currentPlayer)}
                darkMode={settings.darkMode}
                fadingSymbols={gameState.fadingSymbols}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {gameState.winner && (
          <Suspense fallback={<LazyLoadingFallback />}>
            <LazyGameResultModal
              winner={gameState.winner}
              onPlayAgain={resetGame}
              onMainMenu={handleBackToMenu}
              darkMode={settings.darkMode}
              showConfetti={gameState.showConfetti && settings.showAnimations}
              isLowEndDevice={isLowEndDevice()}
              theme={settings.theme}
              gameType={gameState.gameType}
            />
          </Suspense>
        )}
        {showSettingsModal && (
          <Suspense fallback={<LazyLoadingFallback />}>
            <LazySettingsModal
              settings={settings}
              onSave={handleSaveSettings}
              onClose={() => setShowSettingsModal(false)}
              isBoardSizeSelectable={isBoardSizeSelectable}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
}

// Toast Component
function Toast({ message, show, onClose }: { message: string, show: boolean, onClose: () => void }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 left-0 right-0 mx-auto w-max max-w-sm bg-gray-800 text-white px-6 py-3 rounded-xl shadow-lg z-50 flex items-center"
        >
          <span>{message}</span>
          <button 
            onClick={onClose}
            className="ml-3 text-gray-300 hover:text-white"
          >
            <X size={18} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Game Type Modal component
interface GameTypeModalProps {
  onSelect: (gameType: GameType) => void;
  onClose: () => void;
  darkMode: boolean;
}

function GameTypeModal({ onSelect, onClose, darkMode }: GameTypeModalProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-2xl p-6 shadow-xl max-w-md w-full`}
      >
        <h2 className="text-2xl font-bold mb-4">Select Game Type</h2>
        
        <div className="space-y-3 mb-6">
          <button
            onClick={() => onSelect('normal')}
            className={`w-full p-3 rounded-xl ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-100 hover:bg-blue-200'} text-left`}
          >
            <span className="font-semibold block">Normal</span>
            <span className={`text-sm ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>Classic tic-tac-toe. First to get 3 in a row wins.</span>
          </button>
          
          <button
            onClick={() => onSelect('ultimate')}
            className={`w-full p-3 rounded-xl ${darkMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-100 hover:bg-purple-200'} text-left`}
          >
            <span className="font-semibold block">Ultimate Tic-Tac-Toe</span>
            <span className={`text-sm ${darkMode ? 'text-purple-200' : 'text-purple-700'}`}>Strategic nested boards. Win smaller boards to claim spaces on the main board.</span>
          </button>
          
          <button
            onClick={() => onSelect('infinity')}
            className={`w-full p-3 rounded-xl ${darkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-100 hover:bg-green-200'} text-left`}
          >
            <span className="font-semibold block">Infinity Mode</span>
            <span className={`text-sm ${darkMode ? 'text-green-200' : 'text-green-700'}`}>Each player can only have 3 marks on the board. Oldest mark is removed when placing a 4th.</span>
          </button>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default App;