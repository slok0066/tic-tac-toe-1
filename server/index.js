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

// Keep track of rooms and players
const rooms = new Map();
const playerToRoom = new Map();
let waitingPlayer = null; // Player waiting for a random match

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
      
      // Send back the room code to the client
      socket.emit('room_created', { roomCode });
      
      // Also send a "waiting for opponent" notification
      socket.emit('game_start', {
        roomCode,
        isPlayerX: true,
        playerSymbol: 'X',
        players: [{ id: socket.id, symbol: 'X' }],
        currentTurn: 'X',
        status: 'waiting'
      });
      
      console.log(`Room created: ${roomCode}`);
    } catch (error) {
      console.error('Error creating room:', error);
      socket.emit('error', 'Failed to create room');
    }
  });
  
  // Join a room
  socket.on('join_room', (data) => {
    try {
      const { roomCode } = data;
      console.log(`Player ${socket.id} attempting to join room: ${roomCode}`);
      
      if (!roomCode) {
        socket.emit('error', 'Room code is required');
        return;
      }
      
      // Check if the room exists
      if (!rooms.has(roomCode)) {
        socket.emit('error', 'Room not found');
        return;
      }
      
      const room = rooms.get(roomCode);
      
      // Check if the room is already full (2 players max)
      if (room.players.length >= 2) {
        socket.emit('error', 'Room is full');
        return;
      }
      
      // First player is always X, so joining player is O
      const joiningPlayerSymbol = 'O';
      const existingPlayer = room.players[0];
      
      // Add the player to the room
      room.players.push({ id: socket.id, symbol: joiningPlayerSymbol });
      socket.join(roomCode);
      playerToRoom.set(socket.id, roomCode);
      
      // Notify the joining player they're in the game
      socket.emit('game_start', {
        roomCode,
        isPlayerX: false,
        playerSymbol: joiningPlayerSymbol,
        players: room.players,
        currentTurn: room.currentTurn,
        status: 'playing'
      });
      
      // Notify the existing player that someone joined
      const existingSocket = io.sockets.sockets.get(existingPlayer.id);
      if (existingSocket) {
        existingSocket.emit('game_start', {
          roomCode,
          isPlayerX: true,
          playerSymbol: existingPlayer.symbol,
          players: room.players,
          currentTurn: room.currentTurn,
          status: 'playing'
        });
      }
      
      console.log(`Player ${socket.id} joined room: ${roomCode}`);
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', 'Failed to join room');
    }
  });
  
  // Handle moves
  socket.on('make_move', (data) => {
    try {
      const { position, symbol } = data;
      console.log(`Player ${socket.id} making move at position ${position} with symbol ${symbol}`);
      
      // Check if player is in a room
      const roomCode = playerToRoom.get(socket.id);
      if (!roomCode) {
        socket.emit('error', 'Not in a room');
        return;
      }
      
      const room = rooms.get(roomCode);
      if (!room) {
        socket.emit('error', 'Room not found');
        return;
      }
      
      // Verify the player is in this room
      const player = room.players.find(p => p.id === socket.id);
      if (!player) {
        socket.emit('error', 'Not a player in this room');
        return;
      }
      
      // Verify it's the player's turn
      if (room.currentTurn !== player.symbol) {
        socket.emit('error', 'Not your turn');
        return;
      }
      
      // Verify the move is valid
      if (position < 0 || position >= room.board.length || room.board[position] !== null) {
        socket.emit('error', 'Invalid move');
        return;
      }
      
      // Make the move
      room.board[position] = symbol;
      room.lastMoveTime = Date.now();
      
      // Toggle turn
      room.currentTurn = room.currentTurn === 'X' ? 'O' : 'X';
      
      // Notify the other player
      const opponent = room.players.find(p => p.id !== socket.id);
      if (opponent) {
        const opponentSocket = io.sockets.sockets.get(opponent.id);
        if (opponentSocket) {
          opponentSocket.emit('move_made', {
            position,
            symbol,
            board: room.board
          });
        }
      }
    } catch (error) {
      console.error('Error making move:', error);
      socket.emit('error', 'Failed to make move');
    }
  });
  
  // Random matchmaking
  socket.on('random_match', () => {
    try {
      console.log(`Player ${socket.id} looking for a random match`);
      
      // Check if there's a player waiting already
      if (waitingPlayer && waitingPlayer !== socket.id) {
        console.log(`Matching ${socket.id} with waiting player ${waitingPlayer}`);
        
        // Generate a room code for these two players
        const roomCode = nanoid(6).toUpperCase();
        
        // Create the room with both players
        rooms.set(roomCode, {
          players: [
            { id: waitingPlayer, symbol: 'X' },
            { id: socket.id, symbol: 'O' }
          ],
          currentTurn: 'X',
          board: Array(9).fill(null),
          lastMoveTime: Date.now()
        });
        
        // Add both players to the room
        const waitingSocket = io.sockets.sockets.get(waitingPlayer);
        if (waitingSocket) {
          waitingSocket.join(roomCode);
          playerToRoom.set(waitingPlayer, roomCode);
          
          // Notify the first player they're X
          waitingSocket.emit('game_start', {
            roomCode,
            isPlayerX: true,
            playerSymbol: 'X',
            players: [
              { id: waitingPlayer, symbol: 'X' },
              { id: socket.id, symbol: 'O' }
            ],
            currentTurn: 'X',
            status: 'playing'
          });
        }
        
        socket.join(roomCode);
        playerToRoom.set(socket.id, roomCode);
        
        // Notify the second player they're O
        socket.emit('game_start', {
          roomCode,
          isPlayerX: false,
          playerSymbol: 'O',
          players: [
            { id: waitingPlayer, symbol: 'X' },
            { id: socket.id, symbol: 'O' }
          ],
          currentTurn: 'X',
          status: 'playing'
        });
        
        // Clear the waiting player
        waitingPlayer = null;
        
        console.log(`Random match created in room: ${roomCode}`);
      } else {
        // No other player waiting, so this player will wait
        waitingPlayer = socket.id;
        socket.emit('waiting_for_match');
        console.log(`Player ${socket.id} is now waiting for a match`);
      }
    } catch (error) {
      console.error('Error in random match:', error);
      socket.emit('error', 'Failed to create random match');
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
      
      // Clear waiting player if this was the one waiting
      if (waitingPlayer === socket.id) {
        waitingPlayer = null;
        console.log(`Waiting player ${socket.id} disconnected`);
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

  // Cancel random match finding
  socket.on('cancel_random_match', () => {
    try {
      console.log(`Player ${socket.id} canceling random match`);
      
      // If this player is the waiting player, clear it
      if (waitingPlayer === socket.id) {
        waitingPlayer = null;
        console.log(`Cleared waiting player ${socket.id}`);
      }
    } catch (error) {
      console.error('Error canceling random match:', error);
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