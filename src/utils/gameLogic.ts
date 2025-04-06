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
export const getWinningCombinations = (boardSize: number | BoardSize): number[][] => {
  // Convert BoardSize to number if needed
  const size = typeof boardSize === 'string' ? getBoardSizeNumeric(boardSize) : boardSize;
  
  const combinations: number[][] = [];
  
  // Rows
  for (let i = 0; i < size; i++) {
    const row: number[] = [];
    for (let j = 0; j < size; j++) {
      row.push(i * size + j);
    }
    combinations.push(row);
  }
  
  // Columns
  for (let j = 0; j < size; j++) {
    const col: number[] = [];
    for (let i = 0; i < size; i++) {
      col.push(i * size + j);
    }
    combinations.push(col);
  }
  
  // Diagonals
  const diagonal1: number[] = [];
  const diagonal2: number[] = [];
  for (let i = 0; i < size; i++) {
    diagonal1.push(i * size + i);
    diagonal2.push(i * size + (size - 1 - i));
  }
  combinations.push(diagonal1);
  combinations.push(diagonal2);
  
  return combinations;
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

// AI move function
export const getAIMove = (board: BoardState, difficulty: Difficulty, boardSize: BoardSize): number => {
  console.log(`Getting AI move with difficulty: ${difficulty}, board size: ${boardSize}`);
  
  // Count available cells
  const availableCells = board.map((cell, index) => cell === null ? index : -1).filter(index => index !== -1);
  
  if (availableCells.length === 0) {
    return -1; // No available moves
  }
  
  // For 'easy' difficulty, just choose a random empty cell
  if (difficulty === 'easy') {
    const randomIndex = Math.floor(Math.random() * availableCells.length);
    return availableCells[randomIndex];
  }
  
  const sizeNum = getBoardSizeNumeric(boardSize);
  
  // For medium difficulty and above, try to find a winning move
  if (difficulty === 'medium' || difficulty === 'hard' || difficulty === 'god') {
    // Try each available cell to see if there's a winning move
    for (const cellIndex of availableCells) {
      const boardCopy = [...board];
      boardCopy[cellIndex] = 'O'; // Assume AI is O
      
      if (checkForWin(boardCopy, 'O', sizeNum)) {
        console.log(`AI found winning move at ${cellIndex}`);
        return cellIndex; // Found a winning move
      }
    }
    
    // No winning move found, try to block opponent's winning move
    for (const cellIndex of availableCells) {
      const boardCopy = [...board];
      boardCopy[cellIndex] = 'X'; // Assume player is X
      
      if (checkForWin(boardCopy, 'X', sizeNum)) {
        console.log(`AI blocking player's winning move at ${cellIndex}`);
        return cellIndex; // Block opponent's winning move
      }
    }
  }
  
  // For hard and god difficulties, use more advanced strategies
  if (difficulty === 'hard' || difficulty === 'god') {
    // For standard 3x3 board
    if (sizeNum === 3) {
      // Take center if available
      if (board[4] === null) {
        console.log("AI taking center position");
        return 4;
      }
      
      // Take corners if available
      const corners = [0, 2, 6, 8].filter(corner => board[corner] === null);
      if (corners.length > 0) {
        const cornerIndex = Math.floor(Math.random() * corners.length);
        console.log(`AI taking corner at ${corners[cornerIndex]}`);
        return corners[cornerIndex];
      }
      
      // Take sides
      const sides = [1, 3, 5, 7].filter(side => board[side] === null);
      if (sides.length > 0) {
        const sideIndex = Math.floor(Math.random() * sides.length);
        console.log(`AI taking side at ${sides[sideIndex]}`);
        return sides[sideIndex];
      }
    }
    
    // For larger boards or when central strategy doesn't apply
    // Look for fork opportunities (2 potential winning lines)
    if (difficulty === 'god') {
      for (const cellIndex of availableCells) {
        const boardCopy = [...board];
        boardCopy[cellIndex] = 'O';
        
        // Check if this move creates two winning lines
        if (countPotentialWinningLines(boardCopy, 'O', sizeNum) >= 2) {
          console.log(`AI found fork opportunity at ${cellIndex}`);
          return cellIndex;
        }
      }
      
      // Block opponent's fork opportunities
      for (const cellIndex of availableCells) {
        const boardCopy = [...board];
        boardCopy[cellIndex] = 'X';
        
        if (countPotentialWinningLines(boardCopy, 'X', sizeNum) >= 2) {
          console.log(`AI blocking opponent's fork at ${cellIndex}`);
          return cellIndex;
        }
      }
    }
  }
  
  // If no strategic move found, choose a random empty cell
  // But give higher weight to strategic positions (center, corners) for medium+ difficulty
  if ((difficulty === 'medium' || difficulty === 'hard' || difficulty === 'god') && sizeNum === 3) {
    // Weighted random selection - center and corners have higher probability
    const weights = availableCells.map(index => {
      if (index === 4) return 5; // Center has highest weight
      if ([0, 2, 6, 8].includes(index)) return 3; // Corners have medium weight
      return 1; // Sides have lowest weight
    });
    
    const weightedIndex = weightedRandomSelection(availableCells, weights);
    console.log(`AI chose weighted random move at ${weightedIndex}`);
    return weightedIndex;
  }
  
  // Truly random move (for easy difficulty or as fallback)
  const randomIndex = Math.floor(Math.random() * availableCells.length);
  console.log(`AI chose random move at ${availableCells[randomIndex]}`);
  return availableCells[randomIndex];
};

// Helper function for weighted random selection
const weightedRandomSelection = (items: number[], weights: number[]): number => {
  if (items.length === 0) return -1; // Handle empty array case
  
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }
  
  // If we somehow get here, just return the first item
  return items[0];
};

// Helper function to count possible winning lines for a player
const countPotentialWinningLines = (board: BoardState, player: Player, boardSize: number): number => {
  let count = 0;
  
  // Generate winning combinations based on board size
  const winningCombinations = getWinningCombinations(boardSize);
  
  for (const combination of winningCombinations) {
    const line = combination.map(index => board[index]);
    
    // Count lines where all cells are either player's symbol or empty
    // And at least one cell is the player's symbol
    if (line.every(cell => cell === player || cell === null) && 
        line.some(cell => cell === player)) {
      count++;
    }
  }
  
  return count;
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

// Helper function to get numeric board size from BoardSize type
const getBoardSizeNumeric = (boardSize: BoardSize): number => {
  switch (boardSize) {
    case '3x3': return 3;
    case '4x4': return 4;
    case '5x5': return 5;
    case 'ultimate': return 3; // Ultimate uses 3x3 meta-board
    default: return 3;
  }
};

// Helper function to check if a player has a winning move on the board
const checkForWin = (board: BoardState, player: Player, boardSize: number): boolean => {
  // Get winning combinations based on board size
  const winningCombinations = getWinningCombinations(boardSize);
  
  // Check each winning combination
  for (const combination of winningCombinations) {
    const line = combination.map(index => board[index]);
    
    // Check if all cells in this line are the player's symbol
    if (line.every(cell => cell === player)) {
      return true;
    }
  }
  
  return false;
};