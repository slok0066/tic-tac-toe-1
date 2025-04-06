import { BoardState, Player, MoveInfo } from '../types';
import { checkWinner } from './gameLogic';

/**
 * Process a move in Infinity Mode
 * @param board Current board state
 * @param index Cell index where the move was made
 * @param player Current player
 * @param moveHistory Previous move history
 * @returns Object with updated board, move history, and fading symbols
 */
export const processInfinityMove = (
  board: BoardState,
  index: number,
  player: Player,
  moveHistory: MoveInfo[] = []
): {
  board: BoardState;
  moveHistory: MoveInfo[];
  fadingSymbols: number[];
  nextFadingSymbols: number[];
} => {
  // Create a fresh copy of the board and moveHistory
  const boardCopy = [...board];
  const cleanMoveHistory = Array.isArray(moveHistory) ? [...moveHistory] : [];
  
  console.log(`Processing move for ${player} at index ${index}. Moves in history: ${cleanMoveHistory.length}`);
  
  // Update the board with the player's move
  boardCopy[index] = player;
  
  // Add the current move to the history
  const newMove: MoveInfo = {
    player,
    index,
    timestamp: Date.now()
  };
  
  // Add this move to history
  const newMoveHistory = [...cleanMoveHistory, newMove];
  
  // Filter the moves by the current player
  const playerMoves = newMoveHistory.filter(move => move.player === player);
  console.log(`${player} now has ${playerMoves.length} moves in total`);
  
  // Check if player will have more than 3 symbols on the board
  let fadingSymbols: number[] = [];
  
  // If this is the 4th symbol, remove the oldest one
  if (playerMoves.length > 3) {
    // Sort moves by timestamp to find the oldest
    playerMoves.sort((a, b) => a.timestamp - b.timestamp);
    const oldestMove = playerMoves[0];
    console.log(`Removing oldest ${player} move at index ${oldestMove.index}`);
    
    // Mark for fading
    fadingSymbols = [oldestMove.index];
    
    // Remove from board
    boardCopy[oldestMove.index] = null;
    
    // Remove the oldest move from history
    const filteredHistory = newMoveHistory.filter(
      move => !(move.player === player && move.index === oldestMove.index && move.timestamp === oldestMove.timestamp)
    );
    
    // Replace the move history
    newMoveHistory.length = 0;
    filteredHistory.forEach(move => newMoveHistory.push(move));
  }
  
  // Calculate which symbols will fade on the next move (for the next player)
  const nextPlayer = player === 'X' ? 'O' : 'X';
  const nextPlayerMoves = newMoveHistory.filter(move => move.player === nextPlayer);
  
  let nextFadingSymbols: number[] = [];
  if (nextPlayerMoves.length >= 3) {
    // Sort by timestamp to find what would be removed next
    nextPlayerMoves.sort((a, b) => a.timestamp - b.timestamp);
    nextFadingSymbols = [nextPlayerMoves[0].index];
  }
  
  return {
    board: boardCopy,
    moveHistory: newMoveHistory,
    fadingSymbols,
    nextFadingSymbols
  };
};

/**
 * Remove fading symbols from the board
 * @param board Current board state
 * @param moveHistory Current move history
 * @param fadingSymbols Indices of symbols to remove
 * @param boardSize Board size
 * @returns Object with updated board, move history, and winner information
 */
export const removeFadingSymbols = (
  board: BoardState,
  moveHistory: MoveInfo[] = [],
  fadingSymbols: number[] = [],
  boardSize: string
): {
  board: BoardState;
  moveHistory: MoveInfo[];
  winner: Player | 'draw' | null;
  winningLine: number[] | null;
} => {
  // Create copies of the board and move history
  const newBoard = [...board];
  const newMoveHistory = [...moveHistory];
  
  // Remove each fading symbol
  fadingSymbols.forEach(index => {
    // Get the player who placed this symbol
    const player = newBoard[index];
    
    if (player) {
      // Remove the symbol from the board
      newBoard[index] = null;
      
      // Remove this move from the history
      const filteredHistory = newMoveHistory.filter(
        move => !(move.index === index && move.player === player)
      );
      
      // Update move history
      newMoveHistory.length = 0;
      newMoveHistory.push(...filteredHistory);
    }
  });
  
  // Check if removing symbols resulted in a win or draw
  const { winner, line } = checkWinner(newBoard, boardSize);
  
  return {
    board: newBoard,
    moveHistory: newMoveHistory,
    winner,
    winningLine: line
  };
};

/**
 * Check if a player has symbols that would be removed in their next move
 * @param moveHistory Current move history
 * @param player Current player
 * @returns Array of indices of symbols that would be removed next
 */
export const getNextFadingSymbols = (moveHistory: MoveInfo[], playerToCheck: Player): number[] => {
  // Filter moves by the player we're checking
  const playerMoves = moveHistory.filter(move => move.player === playerToCheck);
  
  // If the player has 3 or more symbols, the oldest one will fade next
  if (playerMoves.length >= 3) {
    // Sort by timestamp (oldest first)
    playerMoves.sort((a, b) => a.timestamp - b.timestamp);
    // The oldest symbol will fade next
    return [playerMoves[0].index];
  }
  
  // If the player has fewer than 3 symbols, nothing will fade
  return [];
}; 