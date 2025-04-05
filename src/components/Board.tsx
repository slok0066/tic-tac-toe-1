import { memo } from 'react';
import { motion } from 'framer-motion';
import { Circle, X } from 'lucide-react';
import { BoardState, Player, Theme, GameSettings, SYMBOL_OPTIONS } from '../types';
import { getThemeClasses, getBoardStyleClasses } from '../utils/theme';

interface BoardProps {
  board: BoardState;
  onCellClick: (index: number) => void;
  currentPlayer: Player;
  winningLine: number[] | null;
  disabled: boolean;
  winner: Player | 'draw' | null;
  theme: Theme;
  settings: GameSettings;
  fadingSymbols?: number[]; // Added for Infinity mode
}

// Memoize the board component to prevent unnecessary re-renders
export const Board = memo(({ 
  board, 
  onCellClick, 
  currentPlayer, 
  winningLine, 
  disabled, 
  winner,
  theme,
  settings,
  fadingSymbols = [] // Default to empty array
}: BoardProps) => {
  const xColor = getThemeClasses(theme, 'xColor');
  const oColor = getThemeClasses(theme, 'oColor');
  const boardBg = settings.darkMode ? 'bg-gray-700' : getThemeClasses(theme, 'boardBg');
  const boardStyleClasses = getBoardStyleClasses(settings.boardStyle, settings.darkMode);
  const symbols = SYMBOL_OPTIONS[settings.symbolStyle];
  
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
    
  const resultBoxClass = settings.darkMode
    ? 'bg-gray-800 text-white'
    : 'bg-white text-gray-800';
  
  // Function to calculate line coordinates for each winning combination
  const getLineCoordinates = (winningLine: number[] | null) => {
    if (!winningLine || winningLine.length !== 3) return null;
    
    // Map winning combinations to line coordinates
    const coordinates = {
      // Rows
      '0,1,2': { x1: "10%", y1: "16.7%", x2: "90%", y2: "16.7%" },
      '3,4,5': { x1: "10%", y1: "50%",   x2: "90%", y2: "50%" },
      '6,7,8': { x1: "10%", y1: "83.3%", x2: "90%", y2: "83.3%" },
      
      // Columns
      '0,3,6': { x1: "16.7%", y1: "10%", x2: "16.7%", y2: "90%" },
      '1,4,7': { x1: "50%",   y1: "10%", x2: "50%",   y2: "90%" },
      '2,5,8': { x1: "83.3%", y1: "10%", x2: "83.3%", y2: "90%" },
      
      // Diagonals
      '0,4,8': { x1: "10%", y1: "10%", x2: "90%", y2: "90%" },
      '2,4,6': { x1: "90%", y1: "10%", x2: "10%", y2: "90%" }
    };
    
    const key = winningLine.join(',');
    return coordinates[key as keyof typeof coordinates] || null;
  };

  // Determine if a cell belongs to the current player
  const isCellForCurrentPlayer = (index: number): boolean => {
    return board[index] === currentPlayer;
  };

  // Render custom symbols or use default Lucide icons
  const renderSymbol = (player: Player, isHint = false, isFading = false) => {
    const isClassic = settings.symbolStyle === 'classic';
    
    if (player === 'X') {
      if (isClassic) {
        return (
          <X 
            className={`w-12 h-12 ${xColor} ${isHint ? 'opacity-30' : ''} ${isFading ? 'opacity-70' : ''}`} 
            strokeWidth={isHint ? 2 : 3} 
          />
        );
      } else {
        return (
          <span className={`text-4xl ${xColor} ${isHint ? 'opacity-30' : ''} ${isFading ? 'opacity-70' : ''}`}>
            {symbols.x}
          </span>
        );
      }
    } else {
      if (isClassic) {
        return (
          <Circle 
            className={`w-12 h-12 ${oColor} ${isHint ? 'opacity-30' : ''} ${isFading ? 'opacity-70' : ''}`} 
            strokeWidth={isHint ? 2 : 3} 
          />
        );
      } else {
        return (
          <span className={`text-4xl ${oColor} ${isHint ? 'opacity-30' : ''} ${isFading ? 'opacity-70' : ''}`}>
            {symbols.o}
          </span>
        );
      }
    }
  };
  
  return (
    <div className="relative perspective-1000">
      <motion.div 
        className={`grid grid-cols-3 gap-3 p-4 rounded-xl ${boardBg} ${boardStyleClasses} shadow-xl transform-style-3d`}
        initial={{ rotateX: showAnimations ? 15 : 0 }}
        animate={{ rotateX: 0 }}
        transition={{ 
          duration: getAnimationDuration(), 
          type: isLowEndDevice ? "tween" : "spring", 
          damping: 20 
        }}
      >
        {board.map((cell, index) => {
          // Check if this cell should show fading effect (only when it's the player's turn and it's their symbol)
          const shouldShowFading = fadingSymbols.includes(index) && isCellForCurrentPlayer(index);
          
          return (
            <motion.button
              key={index}
              className={`h-24 w-24 bg-gradient-to-br ${cellBgClass} rounded-xl shadow-md flex items-center justify-center
                ${disabled ? 'cursor-not-allowed' : ''}
                ${winningLine?.includes(index) ? winningCellClass : ''}
                ${shouldShowFading ? 'ring-2 ring-red-500' : ''}
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
                  initial={showAnimations ? { scale: 0, rotate: -180, opacity: 0 } : { scale: 1 }}
                  animate={{ 
                    scale: 1, 
                    rotate: 0,
                    opacity: shouldShowFading ? [1, 0.7, 1] : 1
                  }}
                  transition={{ 
                    type: isLowEndDevice ? "tween" : "spring", 
                    stiffness: isLowEndDevice ? undefined : 500, 
                    damping: isLowEndDevice ? undefined : 15, 
                    duration: getAnimationDuration() * 0.8,
                    opacity: shouldShowFading ? {
                      repeat: Infinity,
                      duration: 1.5
                    } : undefined
                  }}
                  className="w-full h-full flex items-center justify-center relative"
                >
                  {renderSymbol(cell, false, shouldShowFading)}
                  
                  {/* Fading symbol indicator - Only show when it's the player's turn and it's their symbol */}
                  {shouldShowFading && (
                    <motion.div 
                      className="absolute inset-0 flex items-center justify-center backdrop-blur-[2px] bg-red-500/20 rounded-xl"
                      animate={{
                        opacity: [0.7, 1, 0.7]
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 2
                      }}
                    >
                      <span className="text-xs text-red-600 dark:text-red-400 bg-white/70 dark:bg-black/50 px-1 py-1 rounded shadow-md">
                        Will be removed
                      </span>
                    </motion.div>
                  )}
                </motion.div>
              )}
              {!cell && !disabled && showHints && !isLowEndDevice && (
                <motion.div
                  className="opacity-0 hover:opacity-40"
                  initial={false}
                  animate={{ 
                    scale: [0.8, 1, 0.8], 
                    opacity: [0, 0.3, 0] 
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    repeatType: "loop", 
                    duration: settings.animationSpeed === 'slow' ? 3 : 
                               settings.animationSpeed === 'medium' ? 2 : 1.5, 
                    ease: "easeInOut" 
                  }}
                >
                  {renderSymbol(currentPlayer, true)}
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </motion.div>
      
      {winner && (
        <motion.div
          initial={showAnimations ? { scale: 0.9, opacity: 0 } : { scale: 1, opacity: 1 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: getAnimationDuration() }}
          className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-xl z-10"
        >
          <motion.div
            initial={showAnimations ? { y: -10, opacity: 0 } : { y: 0, opacity: 1 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ 
              type: isLowEndDevice ? "tween" : "spring", 
              stiffness: isLowEndDevice ? undefined : 300, 
              damping: isLowEndDevice ? undefined : 20, 
              duration: getAnimationDuration() 
            }}
            className={`${resultBoxClass} px-8 py-6 rounded-xl shadow-lg border-4 ${
              winner === 'draw' 
                ? 'border-amber-500 dark:border-amber-400' 
                : winner === 'X' 
                  ? 'border-blue-500 dark:border-blue-400' 
                  : 'border-red-500 dark:border-red-400'
            }`}
          >
            {/* Animated confetti elements for win celebration */}
            {winner !== 'draw' && showAnimations && !isLowEndDevice && (
              <>
                {Array.from({ length: 30 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className={`absolute w-2 h-2 ${
                      Math.random() > 0.5 
                        ? (winner === 'X' ? 'bg-blue-500' : 'bg-red-500') 
                        : 'bg-yellow-400'
                    } rounded-full`}
                    initial={{ 
                      x: 0, 
                      y: 0, 
                      scale: 0,
                      opacity: 0 
                    }}
                    animate={{ 
                      x: (Math.random() - 0.5) * 200, 
                      y: (Math.random() - 0.5) * 200,
                      rotate: Math.random() * 360,
                      scale: Math.random() * 1.5 + 0.5,
                      opacity: [0, 1, 0]
                    }}
                    transition={{ 
                      duration: Math.random() * 2 + 1,
                      delay: Math.random() * 0.3,
                      ease: "easeOut" 
                    }}
                  />
                ))}
              </>
            )}

            <motion.div 
              className="relative text-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              {winner === 'draw' ? (
                <>
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 flex justify-center">
                    <motion.div
                      animate={{ rotate: [-10, 10, -10] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="text-4xl"
                    >
                      🤝
                    </motion.div>
                  </div>
                  <motion.h2 
                    className={`text-3xl font-bold ${
                      settings.darkMode ? 'text-white' : `bg-gradient-to-r from-amber-500 to-yellow-500 text-transparent bg-clip-text`
                    }`}
                    animate={showAnimations && !isLowEndDevice ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                    transition={{ 
                      duration: settings.animationSpeed === 'slow' ? 2 : 
                                 settings.animationSpeed === 'medium' ? 1.5 : 1, 
                      repeat: Infinity, 
                      repeatType: "loop" 
                    }}
                  >
                    It's a Draw!
                  </motion.h2>
                  <p className="mt-2 text-gray-500 dark:text-gray-300">Good game! Try again?</p>
                </>
              ) : (
                <>
                  <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 flex justify-center">
                    <motion.div
                      animate={{ y: [-3, 3, -3], rotate: [0, 5, 0, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="text-4xl"
                    >
                      👑
                    </motion.div>
                  </div>
                  <motion.h2 
                    className={`text-3xl font-bold ${
                      settings.darkMode ? 'text-white' : winner === 'X' 
                        ? `bg-gradient-to-r from-blue-500 to-indigo-500 text-transparent bg-clip-text`
                        : `bg-gradient-to-r from-red-500 to-pink-500 text-transparent bg-clip-text`
                    }`}
                    animate={showAnimations && !isLowEndDevice ? { 
                      scale: [1, 1.1, 1],
                      y: [0, -5, 0] 
                    } : { scale: 1 }}
                    transition={{ 
                      duration: settings.animationSpeed === 'slow' ? 2 : 
                                 settings.animationSpeed === 'medium' ? 1.5 : 1, 
                      repeat: Infinity, 
                      repeatType: "loop" 
                    }}
                  >
                    <span className="flex items-center gap-3 justify-center">
                      <motion.span className="inline-block">{symbols[winner.toLowerCase() as 'x' | 'o']}</motion.span>
                      <motion.span
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        Wins!
                      </motion.span>
                    </span>
                  </motion.h2>
                  <p className="mt-2 text-gray-500 dark:text-gray-300">
                    Congratulations! 
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className={winner === 'X' ? "text-blue-500" : "text-red-500"}
                    > {symbols[winner.toLowerCase() as 'x' | 'o']} </motion.span> 
                    is the champion!
                  </p>
                </>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
      
      {/* Add winning line animation */}
      {winningLine && getLineCoordinates(winningLine) && showAnimations && (
        <svg 
          className="absolute inset-0 z-20 pointer-events-none" 
          width="100%" 
          height="100%"
        >
          <motion.line
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ 
              duration: settings.animationSpeed === 'slow' ? 1 : 
                         settings.animationSpeed === 'medium' ? 0.7 : 0.5, 
              ease: "easeInOut"
            }}
            x1={getLineCoordinates(winningLine)?.x1}
            y1={getLineCoordinates(winningLine)?.y1}
            x2={getLineCoordinates(winningLine)?.x2}
            y2={getLineCoordinates(winningLine)?.y2}
            stroke={settings.darkMode ? "#10B981" : "#059669"}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="1"
            strokeDashoffset="1"
          />
        </svg>
      )}
    </div>
  );
});