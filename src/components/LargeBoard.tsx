import { memo } from 'react';
import { motion } from 'framer-motion';
import { Circle, X } from 'lucide-react';
import { BoardState, Player, Theme, GameSettings, BoardSize } from '../types';
import { getThemeClasses } from '../utils/theme';

interface LargeBoardProps {
  board: BoardState;
  onCellClick: (index: number) => void;
  currentPlayer: Player;
  winningLine: number[] | null;
  disabled: boolean;
  winner: Player | 'draw' | null;
  theme: Theme;
  settings: GameSettings;
  boardSize: BoardSize;
}

// Memoize the board component to prevent unnecessary re-renders
export const LargeBoard = memo(({ 
  board, 
  onCellClick, 
  currentPlayer, 
  winningLine, 
  disabled, 
  winner,
  theme,
  settings,
  boardSize
}: LargeBoardProps) => {
  const xColor = getThemeClasses(theme, 'xColor');
  const oColor = getThemeClasses(theme, 'oColor');
  const boardBg = settings.darkMode ? 'bg-gray-700' : getThemeClasses(theme, 'boardBg');
  
  // Check if we're likely on a low-end device
  const isLowEndDevice = window.navigator.hardwareConcurrency 
    ? window.navigator.hardwareConcurrency <= 4
    : true; // Assume low-end if we can't detect

  // Animation settings - automatically disable on low-end devices
  const showAnimations = settings.showAnimations && !isLowEndDevice;
  const showHints = settings.showHints && !isLowEndDevice;
  
  // Animation speed based on settings
  const getAnimationDuration = () => {
    if (isLowEndDevice) return 0.2; // Always fast on low-end devices
    
    switch (settings.animationSpeed) {
      case 'slow': return 0.8;
      case 'fast': return 0.3;
      default: return 0.5;
    }
  };
  
  const cellBgClass = settings.darkMode 
    ? 'from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600' 
    : 'from-white to-gray-50 hover:from-gray-50 hover:to-gray-100';
    
  const winningCellClass = settings.darkMode
    ? 'from-green-700 to-green-800 ring-2 ring-green-500 shadow-green-900'
    : 'from-green-100 to-green-200 ring-2 ring-green-400 shadow-green-300';
  
  const gridSize = boardSize === '4x4' ? 'grid-cols-4' : 'grid-cols-5';
  const cellSize = boardSize === '4x4' ? 'h-16 w-16 sm:h-20 sm:w-20' : 'h-12 w-12 sm:h-16 sm:w-16';
  const iconSize = boardSize === '4x4' ? 'w-10 h-10' : 'w-8 h-8';
  
  // Different winning combinations based on board size
  const getWinningLines = () => {
    if (boardSize === '4x4') {
      return [
        // Rows
        [0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15],
        // Columns
        [0, 4, 8, 12], [1, 5, 9, 13], [2, 6, 10, 14], [3, 7, 11, 15],
        // Diagonals
        [0, 5, 10, 15], [3, 6, 9, 12]
      ];
    } else { // 5x5
      return [
        // Rows
        [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [20, 21, 22, 23, 24],
        // Columns
        [0, 5, 10, 15, 20], [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], [4, 9, 14, 19, 24],
        // Diagonals
        [0, 6, 12, 18, 24], [4, 8, 12, 16, 20]
      ];
    }
  };
  
  return (
    <div className="relative perspective-1000">
      <motion.div 
        className={`grid ${gridSize} gap-2 sm:gap-3 p-4 rounded-xl ${boardBg} shadow-xl transform-style-3d`}
        initial={{ rotateX: showAnimations ? 15 : 0 }}
        animate={{ rotateX: 0 }}
        transition={{ 
          duration: getAnimationDuration(), 
          type: isLowEndDevice ? "tween" : "spring", 
          damping: 20 
        }}
      >
        {board.map((cell, index) => (
          <motion.button
            key={index}
            className={`${cellSize} bg-gradient-to-br ${cellBgClass} rounded-lg shadow-md flex items-center justify-center
              ${disabled ? 'cursor-not-allowed' : ''}
              ${winningLine?.includes(index) ? winningCellClass : ''}
              transition-all duration-200`}
            onClick={() => onCellClick(index)}
            disabled={cell !== null || disabled}
            whileHover={cell === null && !disabled && showAnimations ? { 
              scale: 1.03, 
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
              y: -2 
            } : {}}
            whileTap={cell === null && !disabled && showAnimations ? { 
              scale: 0.97, 
              y: 0 
            } : {}}
            layout
            transition={{ 
              type: isLowEndDevice ? "tween" : "spring", 
              stiffness: settings.animationSpeed === 'fast' ? 600 : 
                         settings.animationSpeed === 'medium' ? 500 : 400, 
              damping: 30 
            }}
          >
            {cell && (
              <motion.div
                initial={showAnimations ? { scale: 0, rotate: -180 } : { scale: 1 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ 
                  type: isLowEndDevice ? "tween" : "spring", 
                  stiffness: isLowEndDevice ? undefined : 300, 
                  damping: isLowEndDevice ? undefined : 20, 
                  duration: getAnimationDuration() 
                }}
                className="w-full h-full flex items-center justify-center"
              >
                {cell === 'X' ? (
                  <motion.div
                    initial={showAnimations ? { pathLength: 0, opacity: 0 } : { pathLength: 1, opacity: 1 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ 
                      duration: getAnimationDuration(), 
                      ease: "easeInOut" 
                    }}
                  >
                    <X className={`${iconSize} ${xColor}`} strokeWidth={3} />
                  </motion.div>
                ) : (
                  <motion.div
                    initial={showAnimations ? { opacity: 0, scale: 0 } : { opacity: 1, scale: 1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ 
                      duration: getAnimationDuration() * 0.6, 
                      ease: "easeOut" 
                    }}
                  >
                    <Circle className={`${iconSize} ${oColor}`} strokeWidth={3} />
                  </motion.div>
                )}
              </motion.div>
            )}
            {!cell && !disabled && showHints && (
              <motion.div
                className="opacity-0 hover:opacity-40"
                whileHover={{ opacity: 0.4 }}
              >
                {currentPlayer === 'X' ? (
                  <X className={`${iconSize} ${xColor} opacity-40`} strokeWidth={2} />
                ) : (
                  <Circle className={`${iconSize} ${oColor} opacity-40`} strokeWidth={2} />
                )}
              </motion.div>
            )}
          </motion.button>
        ))}
      </motion.div>
      
      {/* Show winner overlay when game is complete */}
      {winner && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm rounded-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className={`bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl text-center max-w-xs mx-auto`}
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", damping: 20 }}
          >
            <h2 className="text-2xl font-bold mb-3">
              {winner === 'draw' 
                ? 'Game Draw!' 
                : `Player ${winner} Wins!`}
            </h2>
            <div className="text-7xl my-4">
              {winner === 'draw' 
                ? '🤝' 
                : winner === 'X' ? '❌' : '⭕'}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}); 