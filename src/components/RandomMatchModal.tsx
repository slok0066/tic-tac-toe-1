import { useEffect } from 'react';
import socket from '../utils/socket';
import '../styles/RandomMatchModal.css';

interface RandomMatchModalProps {
  onClose: () => void;
}

const RandomMatchModal = ({ onClose }: RandomMatchModalProps) => {
  useEffect(() => {
    // Immediately request a random match when the component mounts
    console.log("Requesting random match");
    socket.emit('random_match');
    
    return () => {
      // Clean up on unmount - cancel matchmaking if the modal is closed
      console.log("Cancelling random match");
      socket.emit('cancel_random_match');
    };
  }, []);

  const handleCancel = () => {
    socket.emit('cancel_random_match');
    onClose();
  };

  return (
    <div className="random-match-modal">
      <div className="modal-content">
        <h2>Finding Opponent...</h2>
        
        <div className="searching-container">
          <div className="spinner"></div>
          <p>Looking for an opponent...</p>
          <button onClick={handleCancel} className="cancel-btn">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default RandomMatchModal;