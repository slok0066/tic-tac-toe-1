import { useEffect } from 'react';
import { BoardState, GameState, MoveInfo } from '../types';
import { removeFadingSymbols } from '../utils/infinityMode';

type InfinityModeHandlerProps = {
  gameState: GameState;
  isInfinityMode: boolean;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  playResultSound: (result: 'win' | 'draw') => void;
};

/**
 * A component that handles the fading symbol effect for Infinity Mode
 * This is implemented as a component to avoid adding more complexity to App.tsx
 */
export const InfinityModeHandler: React.FC<InfinityModeHandlerProps> = ({
  gameState,
  isInfinityMode,
  setGameState,
  playResultSound
}) => {
  // Effect to handle removal of fading symbols after a delay
  useEffect(() => {
    if (!isInfinityMode || !gameState.fadingSymbols || gameState.fadingSymbols.length === 0) {
      return;
    }
    
    // Set a timeout to remove the fading symbols after a delay
    const timeout = setTimeout(() => {
      // Use our utility function to remove the fading symbols
      const { 
        board: updatedBoard, 
        moveHistory: updatedMoveHistory, 
        winner, 
        winningLine 
      } = removeFadingSymbols(
        gameState.board,
        gameState.moveHistory || [],
        gameState.fadingSymbols || [],
        gameState.boardSize
      );
      
      // Update the game state with the symbols removed
      if (winner) {
        // Play the appropriate sound effect
        playResultSound(winner === 'draw' ? 'draw' : 'win');
        
        setGameState(prev => ({
          ...prev,
          board: updatedBoard,
          moveHistory: updatedMoveHistory,
          fadingSymbols: [],
          winner,
          winningLine,
          showConfetti: winner !== 'draw'
        }));
      } else {
        setGameState(prev => ({
          ...prev,
          board: updatedBoard,
          moveHistory: updatedMoveHistory,
          fadingSymbols: []
        }));
      }
    }, 1500); // Delay for 1.5 seconds to show the visual effect
    
    // Clean up timeout on unmount or when fadingSymbols changes
    return () => clearTimeout(timeout);
  }, [
    gameState.fadingSymbols, 
    isInfinityMode, 
    gameState.board, 
    gameState.moveHistory, 
    gameState.boardSize,
    setGameState,
    playResultSound
  ]);
  
  // This component doesn't render anything
  return null;
};

export default InfinityModeHandler; 