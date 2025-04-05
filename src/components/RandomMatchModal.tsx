import { useState, useEffect, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import socket, { findRandomMatch, cancelRandomMatch } from '../utils/socket';

interface RandomMatchModalProps {
  onMatchFound: (roomCode: string, isPlayerX: boolean) => void;
  onClose: () => void;
}

// Use memo to prevent unnecessary re-renders
export const RandomMatchModal = memo(({ onMatchFound, onClose }: RandomMatchModalProps) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState(0);

  // Memoize callbacks to prevent recreation on every render
  const handleMatchFound = useCallback((data: { roomCode: string; isPlayerX: boolean }) => {
    onMatchFound(data.roomCode, data.isPlayerX);
  }, [onMatchFound]);

  const handleWaiting = useCallback(() => {
    setIsSearching(true);
  }, []);

  useEffect(() => {
    let timer: number | undefined;
    if (isSearching) {
      timer = window.setInterval(() => {
        setSearchTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isSearching]);

  useEffect(() => {
    // Listen for match found event
    socket.on('match_found', handleMatchFound);
    
    // Listen for waiting status
    socket.on('waiting_for_match', handleWaiting);
    
    return () => {
      socket.off('match_found', handleMatchFound);
      socket.off('waiting_for_match', handleWaiting);
    };
  }, [handleMatchFound, handleWaiting]);
  
  const handleStartSearch = useCallback(() => {
    findRandomMatch();
    // Start searching immediately without waiting for server response
    setIsSearching(true);
  }, []);
  
  const handleCancelSearch = useCallback(() => {
    if (isSearching) {
      cancelRandomMatch();
      setIsSearching(false);
      setSearchTime(0);
    }
  }, [isSearching]);

  // Simplified animation for better performance
  const modalAnimation = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 }
  };

  const contentAnimation = {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 },
    transition: { duration: 0.15 }
  };

  // Custom spinner animation
  const spinnerAnimation = {
    animate: { 
      rotate: 360,
      transition: { 
        duration: 1.5,
        repeat: Infinity,
        ease: "linear"
      }
    }
  };

  return (
    <motion.div
      {...modalAnimation}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <motion.div
        {...contentAnimation}
        className="bg-white rounded-2xl p-6 max-w-md w-full relative"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Find Random Opponent</h2>
        
        {isSearching ? (
          <div className="text-center py-8">
            <div className="flex justify-center mb-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="w-12 h-12 text-blue-500" />
              </motion.div>
            </div>
            <p className="text-gray-700 mb-2">Searching for opponent...</p>
            <p className="text-gray-500 mb-6">Time elapsed: {searchTime}s</p>
            <button
              onClick={handleCancelSearch}
              className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-gray-700 font-medium"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-600 mb-6">
              Find a random opponent to play against.
            </p>
            <button
              onClick={handleStartSearch}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl text-white font-semibold hover:from-blue-600 hover:to-blue-700 shadow-md"
            >
              Find Opponent
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
});