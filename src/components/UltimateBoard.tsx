import { memo } from 'react';
import { motion } from 'framer-motion';
import { Circle, X } from 'lucide-react';
import { BoardState, Player, Theme, GameSettings, UltimateBoard as UltimateBoardType } from '../types';
import { getThemeClasses } from '../utils/theme';

interface UltimateBoardProps {
  ultimateBoard: UltimateBoardType;
  onCellClick: (boardIndex: number, cellIndex: number) => void;
  currentPlayer: Player;
  disabled: boolean;
  winner: Player | 'draw' | null;
  theme: Theme;
  settings: GameSettings;
}

// Helper component for rendering mini boards
const MiniBoard = ({ 
  board, 
  boardIndex, 
  onCellClick, 
  winner, 
  isActive, 
  isWon,
  theme,
  settings,
  currentPlayer
}: { 
  board: BoardState;
  boardIndex: number;
  onCellClick: (boardIndex: number, cellIndex: number) => void;
  winner: Player | 'draw' | null;
  isActive: boolean;
  isWon: boolean;
  theme: Theme;
  settings: GameSettings;
  currentPlayer: Player;
}) => {
  const xColor = getThemeClasses(theme, 'xColor');
  const oColor = getThemeClasses(theme, 'oColor');
  
  const getBoardStyles = () => {
    if (isWon && winner === 'X') return 'ring-blue-500 ring-4 bg-blue-100 dark:bg-blue-900/30';
    if (isWon && winner === 'O') return 'ring-red-500 ring-4 bg-red-100 dark:bg-red-900/30';
    if (isWon && winner === 'draw') return 'ring-yellow-500 ring-4 bg-yellow-100 dark:bg-yellow-900/30';
    if (isActive) return 'ring-green-500 ring-4 shadow-lg'; 
    return '';
  };

  return (
    <motion.div 
      className={`grid grid-cols-3 gap-1 p-1 sm:p-2 rounded-lg overflow-hidden ${getBoardStyles()} ${
        settings.darkMode ? 'bg-gray-800' : 'bg-white'
      } ${isActive ? 'shadow-lg' : 'shadow'}`}
      animate={{ scale: isActive ? 1.02 : 1 }}
      transition={{ duration: 0.2 }}
    >
      {board.map((cell, cellIndex) => (
        <motion.button
          key={cellIndex}
          className={`h-6 w-6 sm:h-10 sm:w-10 rounded-sm sm:rounded flex items-center justify-center
            ${settings.darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}
            ${isActive && !isWon ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'}`}
          onClick={() => isActive && !isWon && onCellClick(boardIndex, cellIndex)}
          disabled={!isActive || isWon || cell !== null}
          whileHover={isActive && !isWon && cell === null ? { scale: 1.1 } : {}}
          whileTap={isActive && !isWon && cell === null ? { scale: 0.95 } : {}}
        >
          {cell === 'X' && (
            <X className={`w-4 h-4 sm:w-6 sm:h-6 ${xColor}`} strokeWidth={3} />
          )}
          {cell === 'O' && (
            <Circle className={`w-4 h-4 sm:w-6 sm:h-6 ${oColor}`} strokeWidth={3} />
          )}
          {!cell && isActive && !isWon && settings.showHints && (
            <div className={`w-2 h-2 rounded-full opacity-30 ${
              currentPlayer === 'X' ? xColor : oColor
            }`} />
          )}
        </motion.button>
      ))}
    </motion.div>
  );
};

// Memoize the UltimateBoard component to prevent unnecessary re-renders
export const UltimateBoard = memo(({ 
  ultimateBoard, 
  onCellClick, 
  currentPlayer, 
  disabled, 
  winner,
  theme,
  settings
}: UltimateBoardProps) => {
  const { boards, activeBoard, winners } = ultimateBoard;
  
  // Animation settings based on device capability
  const isLowEndDevice = window.navigator.hardwareConcurrency 
    ? window.navigator.hardwareConcurrency <= 4
    : true;
  
  const showAnimations = settings.showAnimations && !isLowEndDevice;
  const getAnimationDuration = () => {
    if (isLowEndDevice) return 0.2;
    switch (settings.animationSpeed) {
      case 'slow': return 0.8;
      case 'fast': return 0.3;
      default: return 0.5;
    }
  };
  
  const getMainBoardBg = () => {
    if (settings.darkMode) return 'bg-gray-900';
    return getThemeClasses(theme, 'boardBg');
  };
  
  return (
    <motion.div 
      className={`grid grid-cols-3 gap-3 p-4 rounded-xl ${getMainBoardBg()} shadow-xl`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ 
        duration: getAnimationDuration(), 
        type: isLowEndDevice ? "tween" : "spring", 
        damping: 20 
      }}
    >
      {Array(9).fill(null).map((_, boardIndex) => (
        <MiniBoard
          key={boardIndex}
          board={boards[boardIndex]}
          boardIndex={boardIndex}
          onCellClick={onCellClick}
          winner={winners[boardIndex]}
          isActive={activeBoard === boardIndex || activeBoard === null}
          isWon={winners[boardIndex] !== null}
          theme={theme}
          settings={settings}
          currentPlayer={currentPlayer}
        />
      ))}
      
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
    </motion.div>
  );
}); 