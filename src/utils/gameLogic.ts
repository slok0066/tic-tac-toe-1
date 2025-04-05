import { BoardState, Player, Difficulty, BoardSize, UltimateBoard } from '../types';

// Standard 3x3 winning combinations
export const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6] // Diagonals
];

// 4x4 winning combinations
export const WINNING_COMBINATIONS_4X4 = [
  // Rows
  [0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15],
  // Columns
  [0, 4, 8, 12], [1, 5, 9, 13], [2, 6, 10, 14], [3, 7, 11, 15],
  // Diagonals
  [0, 5, 10, 15], [3, 6, 9, 12]
];

// 5x5 winning combinations
export const WINNING_COMBINATIONS_5X5 = [
  // Rows
  [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [20, 21, 22, 23, 24],
  // Columns
  [0, 5, 10, 15, 20], [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], [4, 9, 14, 19, 24],
  // Diagonals
  [0, 6, 12, 18, 24], [4, 8, 12, 16, 20]
];

// Get the appropriate winning combinations based on board size
export const getWinningCombinations = (boardSize: BoardSize): number[][] => {
  switch (boardSize) {
    case '3x3':
      return WINNING_COMBINATIONS;
    case '4x4':
      return WINNING_COMBINATIONS_4X4;
    case '5x5':
      return WINNING_COMBINATIONS_5X5;
    case 'ultimate':
      return WINNING_COMBINATIONS; // Ultimate uses 3x3 for each mini-board and the meta-board
    default:
      return WINNING_COMBINATIONS;
  }
};

// Get board size based on the length of the board array
export const getBoardSizeFromLength = (length: number): BoardSize => {
  switch (length) {
    case 9:
      return '3x3';
    case 16:
      return '4x4';
    case 25:
      return '5x5';
    default:
      return '3x3';
  }
};

export const checkWinner = (board: BoardState, boardSize: BoardSize = '3x3'): { winner: Player | 'draw' | null; line: number[] | null } => {
  const combinations = getWinningCombinations(boardSize);
  
  for (const combo of combinations) {
    const [first, ...rest] = combo;
    if (board[first] && rest.every(pos => board[pos] === board[first])) {
      return { winner: board[first], line: combo };
    }
  }

  if (board.every(cell => cell !== null)) {
    return { winner: 'draw', line: null };
  }

  return { winner: null, line: null };
};

// Initialize an Ultimate Tic-Tac-Toe board
export const initializeUltimateBoard = (): UltimateBoard => {
  return {
    boards: Array(9).fill(null).map(() => Array(9).fill(null)),
    activeBoard: null, // Initially, any board can be played
    winners: Array(9).fill(null)
  };
};

// Check winner for Ultimate Tic-Tac-Toe
export const checkUltimateWinner = (ultimateBoard: UltimateBoard): { winner: Player | 'draw' | null; line: number[] | null } => {
  const metaBoard = ultimateBoard.winners;
  
  // Check if there's a winner at the meta level
  for (const combo of WINNING_COMBINATIONS) {
    const [a, b, c] = combo;
    if (metaBoard[a] && metaBoard[a] !== 'draw' && metaBoard[a] === metaBoard[b] && metaBoard[a] === metaBoard[c]) {
      return { winner: metaBoard[a], line: combo };
    }
  }
  
  // Check for a draw at the meta level
  if (metaBoard.every(result => result !== null)) {
    return { winner: 'draw', line: null };
  }
  
  return { winner: null, line: null };
};

// Make a move in Ultimate Tic-Tac-Toe
export const makeUltimateMove = (
  ultimateBoard: UltimateBoard,
  boardIndex: number,
  cellIndex: number,
  player: Player
): { newBoard: UltimateBoard; validMove: boolean } => {
  // Check if the move is valid (correct board and empty cell)
  if (
    (ultimateBoard.activeBoard !== null && ultimateBoard.activeBoard !== boardIndex) ||
    ultimateBoard.winners[boardIndex] !== null ||
    ultimateBoard.boards[boardIndex][cellIndex] !== null
  ) {
    return { newBoard: ultimateBoard, validMove: false };
  }
  
  // Create a copy of the board
  const newBoards = [...ultimateBoard.boards];
  const board = [...newBoards[boardIndex]];
  board[cellIndex] = player;
  newBoards[boardIndex] = board;
  
  // Check if this move creates a winner in the current mini-board
  const { winner } = checkWinner(board, '3x3');
  const newWinners = [...ultimateBoard.winners];
  if (winner) {
    newWinners[boardIndex] = winner;
  }
  
  // Determine the next active board
  let nextActiveBoard = cellIndex;
  
  // If the next board is already won or full, the next player can choose any board
  if (newWinners[nextActiveBoard] !== null) {
    nextActiveBoard = null;
  }
  
  return {
    newBoard: {
      boards: newBoards,
      winners: newWinners,
      activeBoard: nextActiveBoard
    },
    validMove: true
  };
};

// Minimax algorithm with alpha-beta pruning for efficiency
const minimax = (
  board: BoardState, 
  depth: number, 
  isMaximizing: boolean, 
  alpha: number = -Infinity, 
  beta: number = Infinity,
  boardSize: BoardSize = '3x3'
): number => {
  const { winner } = checkWinner(board, boardSize);
  
  if (winner === 'O') return 10 - depth;
  if (winner === 'X') return depth - 10;
  if (winner === 'draw') return 0;

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (let i = 0; i < board.length; i++) {
      if (board[i] === null) {
        board[i] = 'O';
        const evalScore = minimax(board, depth + 1, false, alpha, beta, boardSize);
        board[i] = null;
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (let i = 0; i < board.length; i++) {
      if (board[i] === null) {
        board[i] = 'X';
        const evalScore = minimax(board, depth + 1, true, alpha, beta, boardSize);
        board[i] = null;
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
    }
    return minEval;
  }
};

export const getAIMove = (board: BoardState, difficulty: Difficulty, boardSize: BoardSize = '3x3'): number => {
  const availableMoves = board.reduce<number[]>((acc, cell, index) => {
    if (cell === null) acc.push(index);
    return acc;
  }, []);

  // If no moves available, return -1 (invalid move)
  if (availableMoves.length === 0) return -1;

  // Easy: Random moves
  if (difficulty === 'easy') {
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
  }

  // Medium: Mix of smart and random moves
  if (difficulty === 'medium') {
    if (Math.random() > 0.7) {
      return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }
  }

  // For Medium, Hard & God: Try to win or block
  for (const move of availableMoves) {
    // Check if AI can win
    const testBoard = [...board];
    testBoard[move] = 'O';
    if (checkWinner(testBoard, boardSize).winner === 'O') {
      return move;
    }

    // Check if need to block player
    testBoard[move] = 'X';
    if (checkWinner(testBoard, boardSize).winner === 'X') {
      return move;
    }
  }

  // God: Perfect play using minimax with no randomness
  if (difficulty === 'god') {
    let bestScore = -Infinity;
    let bestMove = availableMoves[0];

    for (const move of availableMoves) {
      const testBoard = [...board];
      testBoard[move] = 'O';
      const score = minimax(testBoard, 0, false, -Infinity, Infinity, boardSize);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    return bestMove;
  }

  // Hard: Use minimax but occasionally make non-optimal moves
  if (difficulty === 'hard') {
    // 80% of the time, play optimally
    if (Math.random() < 0.8) {
      let bestScore = -Infinity;
      let bestMove = availableMoves[0];

      for (const move of availableMoves) {
        const testBoard = [...board];
        testBoard[move] = 'O';
        const score = minimax(testBoard, 0, false, -Infinity, Infinity, boardSize);
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
      return bestMove;
    }
  }

  // If center is available, take it
  const centerIndex = boardSize === '3x3' ? 4 : 
                     boardSize === '4x4' ? 5 : // Use 5 (near center) for 4x4 
                     boardSize === '5x5' ? 12 : 4; // Center is 12 in 5x5
                     
  if (board[centerIndex] === null) return centerIndex;

  // Otherwise, choose random corner or side
  return availableMoves[Math.floor(Math.random() * availableMoves.length)];
};

// Add utility functions for theme and board classes
export const getThemeClasses = (theme: string, type: string): string => {
  const themes: Record<string, Record<string, string>> = {
    blue: {
      primary: 'from-blue-500 to-blue-600',
      secondary: 'from-blue-400 to-blue-500',
      bg: 'bg-gradient-to-br from-blue-100 to-blue-50',
      gradient: 'from-blue-500 to-indigo-600',
      accent: 'text-blue-500',
      border: 'border-blue-500'
    },
    green: {
      primary: 'from-green-500 to-green-600',
      secondary: 'from-green-400 to-green-500',
      bg: 'bg-gradient-to-br from-green-100 to-green-50',
      gradient: 'from-green-500 to-teal-600',
      accent: 'text-green-500',
      border: 'border-green-500'
    },
    purple: {
      primary: 'from-purple-500 to-purple-600',
      secondary: 'from-purple-400 to-purple-500',
      bg: 'bg-gradient-to-br from-purple-100 to-purple-50',
      gradient: 'from-purple-500 to-pink-600',
      accent: 'text-purple-500',
      border: 'border-purple-500'
    },
    red: {
      primary: 'from-red-500 to-red-600',
      secondary: 'from-red-400 to-red-500',
      bg: 'bg-gradient-to-br from-red-100 to-red-50',
      gradient: 'from-red-500 to-orange-600',
      accent: 'text-red-500',
      border: 'border-red-500'
    }
  };

  return themes[theme]?.[type] || themes.blue[type];
};

export const getBoardClasses = (boardStyle: string): string => {
  const styles: Record<string, string> = {
    classic: 'bg-white/90 dark:bg-gray-800/90 shadow-md',
    glass: 'bg-white/40 dark:bg-gray-800/40 backdrop-blur shadow-lg border border-white/20 dark:border-gray-700/20',
    solid: 'bg-white dark:bg-gray-800 shadow-xl',
    neon: 'bg-gray-900/90 border-2 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
  };

  return styles[boardStyle] || styles.classic;
};

export const getBoardSizeFromType = (gameType: string): BoardSize => {
  if (gameType === 'ultimate') return 'ultimate';
  return '3x3'; // Default for normal and infinity modes
};

// Utility for debouncing function calls
export const debounce = <F extends (...args: any[]) => any>(
  func: F,
  waitFor: number
): ((...args: Parameters<F>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): void => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
};