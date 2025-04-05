import { io } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from "../types";

// Create socket connection to server
const serverUrl = process.env.NODE_ENV === 'production' 
  ? window.location.origin // Production: use same origin as the app
  : 'http://localhost:3001'; // Development: connect to local server

const socket = io(serverUrl);

// Function to create a new room
export const createRoom = (roomCode?: string) => {
  socket.emit('create_room', { roomCode });
};

// Function to join a room
export const joinRoom = (roomCode: string) => {
  socket.emit('join_room', { roomCode });
};

// Function to find a random match
export const findRandomMatch = () => {
  socket.emit('random_match');
};

// Function to cancel random match finding
export const cancelRandomMatch = () => {
  socket.emit('cancel_random_match');
};

// Function to make a move
export const makeMove = (index: number) => {
  socket.emit('make_move', { index });
};

// Function to request a rematch
export const requestRematch = () => {
  socket.emit('request_rematch');
};

// Function to leave the current room
export const leaveRoom = () => {
  socket.emit('leave_room');
};

export default socket;