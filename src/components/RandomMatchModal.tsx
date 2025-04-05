import { useEffect, useState } from 'react';
import socket, { findRandomMatch, cancelRandomMatch } from '../utils/socket';
import '../styles/RandomMatchModal.css';

interface RandomMatchModalProps {
  onClose: () => void;
}

const RandomMatchModal = ({ onClose }: RandomMatchModalProps) => {
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTime, setSearchTime] = useState(0);

  // Send match request immediately when modal opens
  useEffect(() => {
    setSearching(true);
    console.log("Sending random match request");
    findRandomMatch();
    
    // Set up timer to show search time
    const timer = setInterval(() => {
      setSearchTime(prev => prev + 1);
    }, 1000);
    
    return () => {
      console.log("Cleaning up random match request");
      cancelRandomMatch();
      clearInterval(timer);
    };
  }, []);
  
  // Listen for socket errors
  useEffect(() => {
    const handleError = (errorMsg: string) => {
      console.error("Match error:", errorMsg);
      setError(errorMsg);
      setSearching(false);
    };
    
    socket.on('error', handleError);
    
    return () => {
      socket.off('error', handleError);
    };
  }, []);

  const handleCancel = () => {
    console.log("Cancelling match search");
    cancelRandomMatch();
    onClose();
  };

  return (
    <div className="random-match-modal">
      <div className="modal-content">
        <h2>Finding Opponent...</h2>
        
        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError(null)} className="retry-btn">
              Try Again
            </button>
          </div>
        )}
        
        {!error && (
          <div className="searching-container">
            <div className="spinner"></div>
            <p>Looking for an opponent...</p>
            <p className="search-time">Time elapsed: {searchTime}s</p>
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