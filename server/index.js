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
  
  // Join an existing room
  socket.on('join_room', (data) => {
    try {
      console.log(`Player ${socket.id} attempting to join room:`, data);
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
        console.log(`Room ${roomCode} is full, players:`, room.players);
        socket.emit('error', 'Room is full');
        return;
      }
      
      // Add the player to the room
      room.players.push({ id: socket.id, symbol: 'O' });
      socket.join(roomCode);
      // Track this player's room
      playerToRoom.set(socket.id, roomCode);
      
      console.log(`Player ${socket.id} joined room ${roomCode}`);
      
      // Find the X player (creator of the room)
      const xPlayer = room.players.find(p => p.symbol === 'X');
      
      // Notify the joining player (O)
      socket.emit('game_start', {
        roomCode,
        isPlayerX: false,
        playerSymbol: 'O',
        players: room.players,
        currentTurn: room.currentTurn
      });
      
      // Notify the other player (X) that someone joined
      if (xPlayer) {
        const xPlayerSocket = io.sockets.sockets.get(xPlayer.id);
        if (xPlayerSocket) {
          xPlayerSocket.emit('game_start', {
            roomCode,
            isPlayerX: true,
            playerSymbol: 'X',
            players: room.players,
            currentTurn: room.currentTurn
          });
        }
      }
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', 'Failed to join room');
    }
  });
  
  // Make a move
  socket.on('make_move', (data) => {
    try {
      console.log(`Received move from ${socket.id}:`, data);
      const { position, symbol, board } = data;
      
      // Find which room this socket is in
      const roomCode = playerToRoom.get(socket.id);
      
      if (!roomCode) {
        console.error("Player not in a room:", socket.id);
        socket.emit('error', 'Not in any room');
        return;
      }
      
      const room = rooms.get(roomCode);
      if (!room) {
        console.error("Room not found:", roomCode);
        socket.emit('error', 'Room not found');
        return;
      }
      
      const player = room.players.find(p => p.id === socket.id);
      if (!player) {
        console.error("Player not found in room:", socket.id, room.players);
        socket.emit('error', 'Player not found in room');
        return;
      }
      
      // Validate that it's the player's turn
      if (room.currentTurn !== player.symbol) {
        console.error("Not player's turn:", socket.id, room.currentTurn, player.symbol);
        socket.emit('error', 'Not your turn');
        return;
      }
      
      // Update the board
      if (position >= 0 && position < 9 && room.board[position] === null) {
        room.board[position] = player.symbol;
        
        // Update the current turn
        room.currentTurn = player.symbol === 'X' ? 'O' : 'X';
        room.lastMoveTime = Date.now();
        
        // Check for win or draw
        let winner = null;
        let gameOver = false;
        
        // Check rows
        for (let i = 0; i < 9; i += 3) {
          if (room.board[i] && room.board[i] === room.board[i + 1] && room.board[i] === room.board[i + 2]) {
            winner = room.board[i];
            gameOver = true;
            break;
          }
        }
        
        // Check columns
        if (!gameOver) {
          for (let i = 0; i < 3; i++) {
            if (room.board[i] && room.board[i] === room.board[i + 3] && room.board[i] === room.board[i + 6]) {
              winner = room.board[i];
              gameOver = true;
              break;
            }
          }
        }
        
        // Check diagonals
        if (!gameOver) {
          if (room.board[0] && room.board[0] === room.board[4] && room.board[0] === room.board[8]) {
            winner = room.board[0];
            gameOver = true;
          } else if (room.board[2] && room.board[2] === room.board[4] && room.board[2] === room.board[6]) {
            winner = room.board[2];
            gameOver = true;
          }
        }
        
        // Check for draw
        if (!gameOver && !room.board.includes(null)) {
          winner = 'draw';
          gameOver = true;
        }
        
        // Broadcast the move to all clients in the room
        io.to(roomCode).emit('move_made', {
          position,
          symbol: player.symbol,
          board: room.board,
          currentTurn: room.currentTurn
        });
        
        // If the game is over, broadcast the result
        if (gameOver) {
          io.to(roomCode).emit('game_over', { winner });
          console.log(`Game over in room ${roomCode}: ${winner}`);
        }
        
        console.log(`Move made in room ${roomCode}: ${player.symbol} at position ${position}`);
      } else {
        socket.emit('error', 'Invalid move');
      }
    } catch (error) {
      console.error("Error processing move:", error);
      socket.emit('error', 'Failed to process move');
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
            currentTurn: 'X'
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
          currentTurn: 'X'
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