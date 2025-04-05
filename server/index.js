import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { nanoid } from 'nanoid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? '*' // Allow all origins in production for easier testing
      : ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST"],
    credentials: true
  },
  // Optimize Socket.IO for mobile performance
  pingInterval: 5000,
  pingTimeout: 8000,
  transports: ["websocket"],
  maxHttpBufferSize: 1e6, // 1MB
  httpCompression: true
});

const PORT = process.env.PORT || 3001;

// In production, serve the built React app
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React app
  const distPath = path.resolve(__dirname, '../dist');
  app.use(express.static(distPath));
  
  // For any route that doesn't match an API route, send the index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Root route for health checks
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// Serve a simple HTML page for the root route
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Tic Tac Toe Server</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          h1 { color: #333; }
          .container { max-width: 600px; margin: 0 auto; }
          .status { padding: 20px; background: #f5f5f5; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Tic Tac Toe Server</h1>
          <div class="status">
            <p>Socket.IO server is running!</p>
            <p>Server time: ${new Date().toISOString()}</p>
          </div>
          <p>This is the WebSocket server for the Tic Tac Toe game. Connect to this server from your game client.</p>
        </div>
      </body>
    </html>
  `);
});

// Test route for client connectivity
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Game state
const rooms = new Map();
const waitingPlayers = [];

// Optimize memory usage by indexing players by socket ID
const playerToRoom = new Map();

// Helper function to leave a room
const leaveRoom = (socket, roomCode) => {
  const room = rooms.get(roomCode);
  if (room) {
    // Notify the other player
    socket.to(roomCode).emit('player_left');
    
    // Clean up the room if both players have left
    const remainingPlayers = room.players.filter(p => p.id !== socket.id);
    if (remainingPlayers.length === 0) {
      rooms.delete(roomCode);
      console.log(`Room ${roomCode} deleted`);
    } else {
      // Update the room with remaining player
      rooms.set(roomCode, {
        ...room,
        players: remainingPlayers
      });
    }
    
    // Leave the socket.io room
    socket.leave(roomCode);
    console.log(`Player ${socket.id} left room ${roomCode}`);
  }
};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Create a new room
  socket.on('create_room', (data = {}) => {
    try {
      // Generate a room code if one wasn't provided
      const roomCode = data?.roomCode || nanoid(6).toUpperCase();
      console.log(`Creating room with code: ${roomCode}`);
      
      rooms.set(roomCode, {
        players: [{ id: socket.id, symbol: 'X' }],
        currentTurn: 'X',
        board: Array(9).fill(null),
      });
      
      socket.join(roomCode);
      // Track which room this player is in for faster lookups
      playerToRoom.set(socket.id, roomCode);
      
      // Important: Send back the room code to the client
      socket.emit('room_created', { roomCode });
      console.log(`Room created: ${roomCode}`);
    } catch (error) {
      console.error('Error creating room:', error);
      socket.emit('error', 'Failed to create room');
    }
  });
  
  // Join an existing room
  socket.on('join_room', (data) => {
    try {
      const roomCode = data?.roomCode;
      
      if (!roomCode) {
        socket.emit('error', 'Room code is required');
        return;
      }
      
      const room = rooms.get(roomCode);
      
      if (!room) {
        socket.emit('error', 'Room not found');
        return;
      }
      
      if (room.players.length >= 2) {
        socket.emit('error', 'Room is full');
        return;
      }
      
      // Add the player to the room
      room.players.push({ id: socket.id, symbol: 'O' });
      socket.join(roomCode);
      // Track this player's room
      playerToRoom.set(socket.id, roomCode);
      
      // Notify both players that the game is starting
      io.to(roomCode).emit('game_start', {
        roomCode,
        isPlayerX: false,
        players: room.players.map(p => ({ id: p.id, symbol: p.symbol })),
        currentTurn: room.currentTurn
      });
      
      console.log(`Player ${socket.id} joined room ${roomCode}`);
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', 'Failed to join room');
    }
  });
  
  // Make a move
  socket.on('make_move', (data) => {
    const { position, symbol, board } = data;
    const roomCode = Array.from(socket.rooms)[1]; // The second room is the game room
    
    if (!roomCode) {
      socket.emit('error', 'Not in any room');
      return;
    }
    
    const room = rooms.get(roomCode);
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }
    
    const player = room.players.find(p => p.id === socket.id);
    if (!player) {
      socket.emit('error', 'Player not found in room');
      return;
    }
    
    // Validate that it's the player's turn
    if (room.currentTurn !== player.symbol) {
      socket.emit('error', 'Not your turn');
      return;
    }
    
    // Update the board
    if (position >= 0 && position < 9 && room.board[position] === null) {
      room.board[position] = player.symbol;
      room.currentTurn = player.symbol === 'X' ? 'O' : 'X';
      
      // Broadcast the move to all clients in the room
      io.to(roomCode).emit('move_made', {
        position,
        symbol: player.symbol,
        board: room.board,
        currentTurn: room.currentTurn
      });
      
      console.log(`Move made in room ${roomCode}: ${player.symbol} at position ${position}`);
    }
  });
  
  // Find a random match
  socket.on('find_random_match', () => {
    try {
      if (waitingPlayers.includes(socket.id)) return;
      
      if (waitingPlayers.length > 0) {
        const opponentId = waitingPlayers.shift();
        const roomCode = nanoid(6).toUpperCase();
        
        rooms.set(roomCode, {
          players: [
            { id: opponentId, symbol: 'X' },
            { id: socket.id, symbol: 'O' }
          ],
          currentTurn: 'X',
          board: Array(9).fill(null),
        });
        
        socket.join(roomCode);
        const opponentSocket = io.sockets.sockets.get(opponentId);
        if (opponentSocket) {
          opponentSocket.join(roomCode);
        }
        
        const room = rooms.get(roomCode);
        
        // Send different isPlayerX values to each player
        socket.emit('match_found', {
          roomCode,
          isPlayerX: false, // This player is O
          players: room.players,
          currentTurn: room.currentTurn
        });
        
        if (opponentSocket) {
          opponentSocket.emit('match_found', {
            roomCode,
            isPlayerX: true, // Opponent is X
            players: room.players,
            currentTurn: room.currentTurn
          });
        }
        
        console.log(`Random match created: ${roomCode} - ${opponentId}(X) vs ${socket.id}(O)`);
      } else {
        waitingPlayers.push(socket.id);
        socket.emit('waiting_for_match');
        console.log(`Player ${socket.id} is waiting for a match`);
      }
    } catch (error) {
      console.error('Error in random match:', error);
      socket.emit('error', 'Failed to create match');
    }
  });
  
  // Cancel match finding
  socket.on('cancel_random_match', () => {
    const index = waitingPlayers.indexOf(socket.id);
    if (index !== -1) {
      waitingPlayers.splice(index, 1);
      console.log(`Player ${socket.id} canceled matchmaking`);
    }
  });
  
  // Leave room
  socket.on('leave_room', () => {
    // Find what room this socket is in
    const rooms = Array.from(socket.rooms);
    // First room is always the socket ID room
    if (rooms.length > 1) {
      const roomCode = rooms[1];
      leaveRoom(socket, roomCode);
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    try {
      console.log(`User disconnected: ${socket.id}`);
      
      // Remove from waiting queue if present
      const index = waitingPlayers.indexOf(socket.id);
      if (index !== -1) {
        waitingPlayers.splice(index, 1);
      }
      
      // Use the player index to find the room more efficiently
      const roomCode = playerToRoom.get(socket.id);
      if (roomCode) {
        leaveRoom(socket, roomCode);
        playerToRoom.delete(socket.id);
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 