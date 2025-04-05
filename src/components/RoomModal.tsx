import { useState, useCallback, memo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Copy, Sparkles, Check } from 'lucide-react';
import { createRoom, joinRoom } from '../utils/socket';
import socket from '../utils/socket';

interface RoomModalProps {
  onCreateRoom: (roomCode: string) => void;
  onJoinRoom: (roomCode: string) => void;
  onClose: () => void;
}

// Use memo to prevent unnecessary re-renders
export const RoomModal = memo(({ onCreateRoom, onJoinRoom, onClose }: RoomModalProps) => {
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [roomCode, setRoomCode] = useState<string>('');
  const [createdRoomCode, setCreatedRoomCode] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Add useEffect to listen for socket errors
  useEffect(() => {
    const handleSocketError = (errorMsg: string) => {
      console.error('Socket error:', errorMsg);
      setError(errorMsg || 'Connection error. Please try again.');
      setIsLoading(false);
    };
    
    const handleRoomCreated = (data: { roomCode: string }) => {
      console.log('Room created event with code:', data.roomCode);
      setCreatedRoomCode(data.roomCode);
      setMode('create');
      setIsLoading(false);
      
      // Notify the parent component
      onCreateRoom(data.roomCode);
    };
    
    socket.on('error', handleSocketError);
    socket.on('room_created', handleRoomCreated);
    
    return () => {
      socket.off('error', handleSocketError);
      socket.off('room_created', handleRoomCreated);
    };
  }, []);

  const handleCreateRoom = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      // Generate a room code directly
      const randomCode = Array(6).fill(0)
        .map(() => String.fromCharCode(65 + Math.floor(Math.random() * 26)))
        .join('');
      
      console.log('Created room with code:', randomCode);
      setCreatedRoomCode(randomCode);
      setMode('create');
      
      // Send the room creation request to the server and notify parent
      createRoom(randomCode);
      
      // Listen for room_created event to confirm
      const handleRoomCreated = (data: { roomCode: string }) => {
        console.log('Server confirmed room creation:', data.roomCode);
        setIsLoading(false);
        // Notify parent after server confirmation
        onCreateRoom(data.roomCode);
        // Remove this one-time listener
        socket.off('room_created', handleRoomCreated);
      };
      
      socket.once('room_created', handleRoomCreated);
      
      // Set a timeout in case server doesn't respond
      setTimeout(() => {
        setIsLoading(false);
        // Notify parent anyway if server didn't respond in time
        if (socket.hasListeners('room_created')) {
          socket.off('room_created', handleRoomCreated);
          onCreateRoom(randomCode);
        }
      }, 2000);
    } catch (err) {
      console.error('Room creation error:', err);
      setError('Failed to create room. Please try again.');
      setIsLoading(false);
    }
  }, [onCreateRoom]);

  // Enhanced join room function
  const handleJoinRoom = useCallback(() => {
    if (!roomCode || roomCode.length < 6) {
      setError('Please enter a valid room code');
      return;
    }
    
    setError(null);
    setIsLoading(true);
    
    try {
      // Listen for game_start event to confirm room joined successfully
      const handleGameStart = () => {
        console.log('Successfully joined room');
        setIsLoading(false);
        // Notify parent after server confirmation
        onJoinRoom(roomCode);
      };
      
      // Listen for error event
      const handleError = (errorMsg: string) => {
        console.error('Room join error:', errorMsg);
        setError(errorMsg || 'Failed to join room');
        setIsLoading(false);
        // Remove listeners
        socket.off('game_start', handleGameStart);
        socket.off('error', handleError);
      };
      
      socket.once('game_start', handleGameStart);
      socket.once('error', handleError);
      
      // Send join room request
      joinRoom(roomCode);
      
      // Set a timeout in case server doesn't respond
      setTimeout(() => {
        if (socket.hasListeners('game_start')) {
          socket.off('game_start', handleGameStart);
          socket.off('error', handleError);
          setIsLoading(false);
          setError('Connection timeout. Please try again.');
        }
      }, 5000);
    } catch (err) {
      console.error('Room join error:', err);
      setError('Failed to join room. Please try again.');
      setIsLoading(false);
    }
  }, [roomCode, onJoinRoom]);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(createdRoomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [createdRoomCode]);

  const setModeMenu = useCallback(() => setMode('menu'), []);
  const setModeJoin = useCallback(() => setMode('join'), []);

  const handleRoomCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRoomCode(e.target.value.toUpperCase());
  }, []);

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

  if (mode === 'menu') {
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
          
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Play Online</h2>
          
          <div className="space-y-4">
            <button
              className="w-full p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center text-white font-semibold hover:from-blue-600 hover:to-blue-700"
              onClick={handleCreateRoom}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center w-full">
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Creating...
                </div>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  <span>Create New Room</span>
                </>
              )}
            </button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>
            <button
              className="w-full p-4 bg-white border-2 border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50"
              onClick={setModeJoin}
            >
              Join Existing Room
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  if (mode === 'create') {
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
          
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Room Created</h2>
          
          <p className="text-gray-600 mb-4">
            Share this code with a friend to play together:
          </p>
          
          <div className="flex items-center mb-6">
            <div className="bg-gray-100 px-4 py-3 rounded-l-lg font-mono text-lg flex-grow text-center font-semibold">
              {createdRoomCode}
            </div>
            <button 
              onClick={copyToClipboard}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-r-lg"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          
          <p className="text-gray-600 text-sm">
            Waiting for opponent to join...
          </p>
        </motion.div>
      </motion.div>
    );
  }

  if (mode === 'join') {
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
          
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Join a Room</h2>
          
          <p className="text-gray-600 mb-4">
            Enter the room code provided by your friend:
          </p>
          
          <div className="mb-4">
            <input
              type="text"
              maxLength={6}
              value={roomCode}
              onChange={handleRoomCodeChange}
              placeholder="ENTER CODE"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg font-mono text-center text-lg uppercase focus:border-blue-500 focus:outline-none"
            />
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>
          
          <div className="flex justify-between">
            <button
              className="px-4 py-2 bg-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-300"
              onClick={setModeMenu}
              disabled={isLoading}
            >
              Back
            </button>
            <button
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg text-white font-medium hover:from-blue-600 hover:to-blue-700"
              onClick={handleJoinRoom}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  <span>Joining...</span>
                </div>
              ) : (
                "Join"
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return null;
});