import { io, Socket } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents } from "../types";

// Improved error handling for production
const getServerUrl = (): string => {
  try {
    const isProd = import.meta.env.MODE === "production";
    console.log("Environment mode:", import.meta.env.MODE);
    
    let serverUrl: string;
    
    if (isProd) {
      // In production, use the deployed server URL
      serverUrl = "https://tic-tac-toe-1-3xvx.onrender.com";
      console.log("Using production server URL:", serverUrl);
    } else {
      // In development, use localhost
      serverUrl = "http://localhost:3001";
      console.log("Using development server URL:", serverUrl);
    }
    
    return serverUrl;
  } catch (error) {
    console.error("Error determining server URL:", error);
    // Fallback to production URL if there's an error
    return "https://tic-tac-toe-1-3xvx.onrender.com";
  }
};

// Create a dummy socket that logs operations instead of failing
const createDummySocket = (): Socket<ServerToClientEvents, ClientToServerEvents> => {
  console.warn("Using dummy socket due to connection failure");
  
  const dummyEmit = (event: string, ...args: any[]) => {
    console.log(`[Dummy Socket] Emit "${event}" with args:`, args);
    return true;
  };
  
  return {
    id: "dummy-socket-id",
    connected: false,
    disconnected: true,
    active: false,
    io: null as any,
    nsp: "",
    auth: {},
    volatile: { emit: dummyEmit } as any,
    timeout: () => ({ emit: dummyEmit } as any),
    connect: () => ({ emit: dummyEmit } as any),
    disconnect: () => {},
    close: () => {},
    emit: dummyEmit,
    on: (event: string, callback: Function) => {
      console.log(`[Dummy Socket] Registered listener for "${event}"`);
      return {} as any;
    },
    once: (event: string, callback: Function) => {
      console.log(`[Dummy Socket] Registered one-time listener for "${event}"`);
      return {} as any;
    },
    off: () => ({}),
    listeners: () => [],
    hasListeners: () => false,
    onAny: () => ({}),
    prependAny: () => ({}),
    offAny: () => ({}),
    listenersAny: () => [],
    compress: () => ({}),
    connect_error: null as any,
    emitWithAck: () => Promise.resolve({}),
    onAnyOutgoing: () => ({}),
    prependAnyOutgoing: () => ({}),
    offAnyOutgoing: () => ({}),
    listenersAnyOutgoing: () => []
  } as Socket<ServerToClientEvents, ClientToServerEvents>;
};

// Initialize socket with retry mechanism
let socket: Socket<ServerToClientEvents, ClientToServerEvents>;

const initializeSocket = (): Socket<ServerToClientEvents, ClientToServerEvents> => {
  try {
    console.log("Initializing socket connection...");
    const serverUrl = getServerUrl();
    
    // Optimized socket settings for better mobile performance
    socket = io(serverUrl, {
      reconnectionAttempts: 5,
      reconnectionDelay: 500,
      timeout: 8000,
      transports: ["websocket"], // Prioritize websocket only for better performance
      forceNew: false,
      multiplex: true,
      upgrade: true,
      rememberUpgrade: true,
      pingInterval: 5000, // More frequent pings on mobile
      pingTimeout: 8000
    });
    
    // Log connection events
    socket.on("connect", () => {
      console.log("Socket connected successfully with ID:", socket.id);
    });
    
    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });
    
    socket.io.on("reconnect_attempt", (attempt) => {
      console.log(`Socket reconnection attempt ${attempt}`);
    });
    
    socket.io.on("reconnect_failed", () => {
      console.error("Socket reconnection failed after all attempts");
    });
    
    return socket;
  } catch (error) {
    console.error("Fatal error initializing socket:", error);
    // Return a dummy socket that won't crash the app
    return createDummySocket();
  }
};

// Initialize the socket once
if (!globalThis.socket) {
  console.log("Creating new socket instance");
  globalThis.socket = initializeSocket();
} else {
  console.log("Reusing existing socket instance");
}

// Export the socket instance
const socketInstance = globalThis.socket as Socket<ServerToClientEvents, ClientToServerEvents>;
export default socketInstance;

// Helper functions using the socket instance
export const createRoom = (roomCode: string = ''): Promise<string> => {
  socketInstance.emit('create_room', { roomCode });
  return new Promise<string>((resolve) => {
    socketInstance.once('room_created', (data) => {
      console.log('Room created with code:', data.roomCode);
      resolve(data.roomCode);
    });
  });
};

export const joinRoom = (roomCode: string) => {
  socketInstance.emit('join_room', { roomCode });
};

export const findRandomMatch = () => {
  socketInstance.emit('find_random_match');
};

export const cancelRandomMatch = () => {
  socketInstance.emit('cancel_random_match');
};

export const leaveRoom = () => {
  socketInstance.emit('leave_room');
};

export const makeMove = (position: number, symbol: string, board: any[]) => {
  socketInstance.emit('make_move', { position, symbol, board });
};

// Utility function to disconnect and clean up socket
export const disconnectSocket = () => {
  socketInstance.disconnect();
  console.log("Socket disconnected");
};