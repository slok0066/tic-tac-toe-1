import { useEffect, useState } from 'react';
import socket from '../utils/socket';
import { GameState } from '../types';
import '../styles/RandomMatchModal.css';

interface RandomMatchModalProps {
  onClose: () => void;
  onGameStart: (gameState: GameState) => void;
}

const RandomMatchModal = ({ onClose, onGameStart }: RandomMatchModalProps) => {
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleWaitingForMatch = () => {
      setIsSearching(true);
    };

    const handleGameStart = (gameState: GameState) => {
      console.log('Random match found:', gameState);
      onGameStart(gameState);
    };
    
    const handleError = (errorMsg: string) => {
      setError(errorMsg);
      setIsSearching(false);
    };

    // Set up event listeners
    socket.on('waiting_for_match', handleWaitingForMatch);
    socket.on('game_start', handleGameStart);
    socket.on('error', handleError);

    return () => {
      // Clean up event listeners
      socket.off('waiting_for_match', handleWaitingForMatch);
      socket.off('game_start', handleGameStart);
      socket.off('error', handleError);
      
      // Cancel matchmaking if the modal is closed while searching
      if (isSearching) {
        socket.emit('cancel_random_match');
      }
    };
  }, [onGameStart, isSearching]);

  const handleFindMatch = () => {
    setError(null);
    socket.emit('random_match');
  };

  const handleCancel = () => {
    if (isSearching) {
      socket.emit('cancel_random_match');
    }
    setIsSearching(false);
    onClose();
  };

  return (
    <div className="random-match-modal">
      <div className="modal-content">
        <h2>Random Matchmaking</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        {!isSearching ? (
          <div className="modal-actions">
            <button onClick={handleFindMatch} className="find-match-btn">
              Find Match
            </button>
            <button onClick={handleCancel} className="cancel-btn">
              Cancel
            </button>
          </div>
        ) : (
          <div className="searching-container">
            <div className="spinner"></div>
            <p>Looking for an opponent...</p>
            <button onClick={handleCancel} className="cancel-btn">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RandomMatchModal;