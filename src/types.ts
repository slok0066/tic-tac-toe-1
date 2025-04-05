export type Player = 'X' | 'O';
export type BoardState = (Player | null)[];
export type GameMode = 'ai' | 'friend' | 'online' | 'random';
export type GameType = 'normal' | 'infinity';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'god';
export type RoomStatus = 'creating' | 'joining' | 'waiting' | 'playing' | 'ended' | 'searching';
export type Theme = 'blue' | 'purple' | 'green' | 'pink' | 'orange' | 'red' | 'teal' | 'yellow' | 'dark' | 'neon';
export type AnimationSpeed = 'slow' | 'medium' | 'fast';
export type BoardSize = '3x3' | '4x4' | '5x5' | 'ultimate';
export type BoardStyle = 'classic' | 'modern' | 'minimal' | 'retro' | 'gradient';
export type SymbolStyle = 'classic' | 'emoji' | 'animals' | 'shapes' | 'planets';
export type SoundPack = 'arcade';

// For custom symbols
export interface PlayerSymbols {
  x: string;
  o: string;
}

// For tracking moves in Infinity mode
export interface MoveInfo {
  player: Player;
  index: number;
  timestamp: number;
}

// Symbol styles
export const SYMBOL_OPTIONS: Record<SymbolStyle, PlayerSymbols> = {
  classic: { x: 'X', o: 'O' },
  emoji: { x: '❌', o: '⭕' },
  animals: { x: '🐶', o: '🐱' },
  shapes: { x: '🔶', o: '🔵' },
  planets: { x: '🪐', o: '🌕' }
};

// For ultimate tic-tac-toe
export interface UltimateBoard {
  boards: BoardState[];
  activeBoard: number | null;
  winners: (Player | 'draw' | null)[];
}

export interface GameState {
  board: BoardState;
  currentPlayer: Player;
  winner: Player | 'draw' | null;
  winningLine: number[] | null;
  difficulty?: Difficulty;
  roomCode?: string;
  playerSymbol?: Player;
  roomStatus?: RoomStatus;
  theme: Theme;
  showConfetti: boolean;
  // Game type
  gameType: GameType;
  // For ultimate tic-tac-toe
  ultimateBoard?: UltimateBoard;
  // Current board size
  boardSize?: BoardSize;
  // Custom styling options
  boardStyle?: BoardStyle;
  symbolStyle?: SymbolStyle;
  customSymbols?: PlayerSymbols;
  // For infinity mode
  moveHistory?: MoveInfo[];
  fadingSymbols?: number[];
  // Game result for online mode
  gameResult?: Player | 'draw' | null;
}

export interface GameSettings {
  darkMode: boolean;
  theme: Theme;
  soundEnabled: boolean;
  volume: number;
  hapticFeedback: boolean;
  showAnimations: boolean;
  animationSpeed: 'slow' | 'medium' | 'fast';
  showHints: boolean;
  showTimer: boolean;
  difficulty: Difficulty;
  boardSize: BoardSize;
  boardStyle: BoardStyle;
  symbolStyle: SymbolStyle;
  soundPack: SoundPack;
  backgroundMusic: boolean;
}

export const defaultSettings: GameSettings = {
  darkMode: false,
  theme: 'blue',
  soundEnabled: true,
  volume: 70,
  hapticFeedback: true,
  showAnimations: true,
  animationSpeed: 'medium',
  showHints: true,
  showTimer: true,
  difficulty: 'medium',
  boardSize: '3x3',
  boardStyle: 'classic',
  symbolStyle: 'classic',
  soundPack: 'arcade',
  backgroundMusic: false,
};