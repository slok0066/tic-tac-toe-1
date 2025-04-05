import React from 'react';
import { motion } from 'framer-motion';
import { UltimateBoard as UltimateBoardType, Player, GameSettings } from '../types';
import { X, Circle } from 'lucide-react';

interface UltimateBoardProps {
  ultimateBoard: UltimateBoardType;
  onCellClick: (boardIndex: number, cellIndex: number) => void;
  currentPlayer: Player;
  disabled: boolean;
  winner: Player | 'draw' | null;
  theme: string;
  settings: GameSettings;
}

export const UltimateBoard: React.FC<UltimateBoardProps> = ({
  ultimateBoard,
  onCellClick,
  currentPlayer,
  disabled,
  winner,
  theme,
  settings
}) => {
  // Function to render a cell within a mini-board
  const renderCell = (boardIndex: number, cellIndex: number) => {
    const cellValue = ultimateBoard.boards[boardIndex][cellIndex];
    const isCellActive = 
      ultimateBoard.activeBoard === null || 
      ultimateBoard.activeBoard === boardIndex;
    const isBoardCompleted = ultimateBoard.winners[boardIndex] !== null;
    
    return (
      <motion.div
        key={cellIndex}
        whileHover={{ 
          scale: !disabled && isCellActive && !isBoardCompleted && cellValue === null ? 1.05 : 1 
        }}
        className={`aspect-square flex items-center justify-center relative 
          ${!disabled && isCellActive && !isBoardCompleted && cellValue === null 
            ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' 
            : 'cursor-default'} 
          transition-colors rounded`}
        onClick={() => {
          if (!disabled && isCellActive && !isBoardCompleted && cellValue === null) {
            onCellClick(boardIndex, cellIndex);
          }
        }}
      >
        {cellValue === 'X' && (
          <X 
            className={`w-full h-full p-1 ${
              theme === 'blue' ? 'text-blue-500' :
              theme === 'green' ? 'text-green-500' :
              theme === 'purple' ? 'text-purple-500' :
              'text-red-500'
            }`} 
          />
        )}
        {cellValue === 'O' && (
          <Circle 
            className={`w-full h-full p-1 ${
              theme === 'blue' ? 'text-red-500' :
              theme === 'green' ? 'text-orange-500' :
              theme === 'purple' ? 'text-pink-500' :
              'text-blue-500'
            }`} 
          />
        )}
      </motion.div>
    );
  };

  // Function to render a mini-board
  const renderBoard = (boardIndex: number) => {
    const boardWinner = ultimateBoard.winners[boardIndex];
    const isActive = 
      ultimateBoard.activeBoard === null || 
      ultimateBoard.activeBoard === boardIndex;
    
    return (
      <motion.div
        key={boardIndex}
        className={`aspect-square p-1 sm:p-2 rounded
          ${isActive && !boardWinner ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-800'}
          ${boardWinner === 'X' ? 'bg-blue-200 dark:bg-blue-900/40' : 
            boardWinner === 'O' ? 'bg-red-200 dark:bg-red-900/40' : 
            boardWinner === 'draw' ? 'bg-gray-200 dark:bg-gray-700' : ''}
          relative
        `}
      >
        <div className="grid grid-cols-3 gap-1 w-full h-full">
          {[...Array(9)].map((_, cellIndex) => renderCell(boardIndex, cellIndex))}
        </div>
        
        {boardWinner && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-gray-900/60 rounded backdrop-blur-sm">
            {boardWinner === 'X' && <X className="w-2/3 h-2/3 text-blue-500" />}
            {boardWinner === 'O' && <Circle className="w-2/3 h-2/3 text-red-500" />}
            {boardWinner === 'draw' && <div className="text-2xl font-bold text-gray-500">Draw</div>}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="relative max-w-md w-full mx-auto">
      <div className="grid grid-cols-3 gap-2 p-2 sm:p-4 bg-white/80 dark:bg-gray-800/80 rounded-2xl shadow-lg backdrop-blur-sm w-full">
        {[...Array(9)].map((_, boardIndex) => renderBoard(boardIndex))}
      </div>
      
      {winner && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-2xl"
        >
          <div className="bg-white dark:bg-gray-800 px-6 py-4 rounded-xl shadow-lg text-center">
            {winner === 'X' && (
              <div className="flex items-center justify-center space-x-2">
                <X className="w-8 h-8 text-blue-500" />
                <span className="text-xl font-bold">Wins!</span>
              </div>
            )}
            {winner === 'O' && (
              <div className="flex items-center justify-center space-x-2">
                <Circle className="w-8 h-8 text-red-500" />
                <span className="text-xl font-bold">Wins!</span>
              </div>
            )}
            {winner === 'draw' && (
              <div className="text-xl font-bold">It's a Draw!</div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}; 