import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Repeat, RotateCcw, Crown, Award, Home } from 'lucide-react';
import { GameSettings, Player } from '../types';
import { playResultSound } from '../utils/sounds';

interface GameResultModalProps {
  winner: 'X' | 'O' | 'draw' | null;
  playerSymbol: Player;
  onPlayAgain: () => void;
  onClose: () => void;
  onBackToMenu: () => void;
  settings: GameSettings;
  isAIInfinityMode?: boolean;
}

export const GameResultModal = ({ 
  winner, 
  playerSymbol, 
  onPlayAgain, 
  onClose, 
  onBackToMenu,
  settings,
  isAIInfinityMode = false
}: GameResultModalProps) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const isWinner = winner === playerSymbol;
  const isDraw = winner === 'draw';
  
  useEffect(() => {
    if (winner) {
      // Play appropriate sound
      if (settings.soundEnabled) {
        playResultSound(winner === 'draw' ? 'draw' : 'win');
      }
      
      // Show confetti for win
      if (winner !== 'draw' && settings.showAnimations) {
        setShowConfetti(true);
        const timer = setTimeout(() => setShowConfetti(false), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [winner, settings.soundEnabled, settings.showAnimations]);

  if (!winner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 ${settings.darkMode ? 'dark' : ''}`}
      >
        {/* Confetti animation for winner */}
        {showConfetti && isWinner && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 100 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: Math.random() * window.innerWidth,
                  y: -20,
                  rotate: 0,
                  opacity: 1
                }}
                animate={{ 
                  y: window.innerHeight + 50,
                  rotate: Math.random() * 360,
                  opacity: [1, 1, 0.8, 0]
                }}
                transition={{ 
                  duration: Math.random() * 2.5 + 1.5,
                  ease: "linear",
                  delay: Math.random() * 0.8
                }}
                className={`absolute w-${Math.floor(Math.random() * 3) + 2} h-${Math.floor(Math.random() * 3) + 2} rounded-${Math.random() > 0.5 ? 'full' : 'none'}`}
                style={{ 
                  backgroundColor: [
                    '#FFD700', '#FF6B6B', '#4CAF50', '#2196F3', '#9C27B0', '#FF9800'
                  ][Math.floor(Math.random() * 6)],
                  width: `${Math.random() * 10 + 5}px`,
                  height: `${Math.random() * 10 + 5}px`
                }}
              />
            ))}
          </div>
        )}

        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25 }}
          className={`bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full relative shadow-2xl border-4 ${
            isDraw 
              ? 'border-amber-500 dark:border-amber-400' 
              : isWinner 
                ? 'border-emerald-500 dark:border-emerald-400' 
                : 'border-red-500 dark:border-red-400'
          }`}
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>

          <div className="flex flex-col items-center justify-center text-center mb-6">
            <motion.div
              className="mb-4 relative"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 15, stiffness: 200 }}
            >
              {isDraw ? (
                <div className="w-20 h-20 flex items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-300">
                  <motion.div
                    animate={{ rotate: [-10, 10, -10] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <Award className="w-10 h-10" />
                  </motion.div>
                </div>
              ) : isWinner ? (
                <div className="w-20 h-20 flex items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300">
                  <motion.div
                    animate={{ y: [-3, 3, -3], rotate: [0, 10, 0, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <Trophy className="w-10 h-10" />
                  </motion.div>
                </div>
              ) : (
                <div className="w-20 h-20 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <X className="w-10 h-10" />
                  </motion.div>
                </div>
              )}
              
              {/* Animated circles for decoration */}
              {settings.showAnimations && (
                <>
                  <motion.div 
                    className={`absolute -z-10 rounded-full ${
                      isDraw 
                        ? 'bg-amber-200/30 dark:bg-amber-700/30' 
                        : isWinner 
                          ? 'bg-emerald-200/30 dark:bg-emerald-700/30' 
                          : 'bg-red-200/30 dark:bg-red-700/30'
                    }`}
                    initial={{ scale: 0 }}
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ repeat: Infinity, duration: 3, repeatDelay: 0.5 }}
                    style={{ width: '100%', height: '100%', top: 0, left: 0 }}
                  />
                  <motion.div 
                    className={`absolute -z-10 rounded-full ${
                      isDraw 
                        ? 'bg-amber-200/20 dark:bg-amber-700/20' 
                        : isWinner 
                          ? 'bg-emerald-200/20 dark:bg-emerald-700/20' 
                          : 'bg-red-200/20 dark:bg-red-700/20'
                    }`}
                    initial={{ scale: 0 }}
                    animate={{ scale: [1, 2, 1] }}
                    transition={{ repeat: Infinity, duration: 4, repeatDelay: 0.2 }}
                    style={{ width: '100%', height: '100%', top: 0, left: 0 }}
                  />
                </>
              )}
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`text-3xl font-bold mb-2 ${
                isDraw 
                  ? 'text-amber-600 dark:text-amber-400' 
                  : isWinner 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-red-600 dark:text-red-400'
              }`}
            >
              {isDraw 
                ? "It's a Draw!" 
                : isWinner 
                  ? "You Win!" 
                  : "You Lose!"}
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-gray-600 dark:text-gray-300 mb-6"
            >
              {isDraw 
                ? "Both players played well! It's a tie." 
                : isWinner 
                  ? "Congratulations! You've won the match." 
                  : "Better luck next time!"}
            </motion.p>

            <div className="grid grid-cols-2 gap-4 w-full">
              {!isAIInfinityMode && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  onClick={onPlayAgain}
                  className="py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 shadow-md"
                >
                  <Repeat className="w-4 h-4" /> 
                  Play Again
                </motion.button>
              )}
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                onClick={onBackToMenu}
                className={`py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 shadow-md ${isAIInfinityMode ? 'col-span-2' : ''}`}
              >
                <Home className="w-4 h-4" />
                Main Menu
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}; 