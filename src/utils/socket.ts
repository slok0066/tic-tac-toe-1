import { io } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from "../types";

// Log connection attempt
console.log('Attempting to connect to socket server...');

// Create socket connection to server
const serverUrl = import.meta.env.MODE === 'production' 
  ? 'https://tic-tac-toe-1-1-loqk.onrender.com' // Use the production server URL
  : 'http://localhost:3001'; // Development: connect to local server

console.log('Socket server URL:', serverUrl);

// More verbose connection settings for debugging
const socket = io(serverUrl, {
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  timeout: 10000,
  transports: ['websocket', 'polling'],
  autoConnect: true
});

// Add connection event listeners
socket.on('connect', () => {
  console.log('Socket connected successfully with ID:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
});

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected, reason:', reason);
});

// Function to create a new room
export const createRoom = (roomCode?: string) => {
  console.log('Requesting room creation with code:', roomCode || 'auto-generated');
  socket.emit('create_room', roomCode ? { roomCode } : {});
};

// Function to join a room
export const joinRoom = (roomCode: string) => {
  console.log('Requesting to join room:', roomCode);
  socket.emit('join_room', { roomCode });
};

// Function to find a random match
export const findRandomMatch = () => {
  console.log('Requesting random match');
  socket.emit('random_match');
};

// Function to cancel random match finding
export const cancelRandomMatch = () => {
  console.log('Cancelling random match request');
  socket.emit('cancel_random_match');
};

// Function to make a move
export const makeMove = (index: number, symbol: string) => {
  console.log('Making move at position:', index, 'with symbol:', symbol);
  socket.emit('make_move', { position: index, symbol });
};

// Function to request a rematch
export const requestRematch = () => {
  console.log('Requesting rematch');
  socket.emit('request_rematch');
};

// Function to leave the current room
export const leaveRoom = () => {
  console.log('Leaving current room');
  socket.emit('leave_room');
};

export default socket;