// ===== Sudoku core logic (extracted from App.tsx for unit testing) =====

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type CellValue = number | null;
export type Board = CellValue[][];
export type Notes = Set<number>[][];

export const GRID_SIZE = 9;
export const BOX_SIZE = 3;

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function isValidPlacement(board: Board, row: number, col: number, num: number): boolean {
  for (let c = 0; c < GRID_SIZE; c++) {
    if (c !== col && board[row][c] === num) return false;
  }
  for (let r = 0; r < GRID_SIZE; r++) {
    if (r !== row && board[r][col] === num) return false;
  }
  const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const boxCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
  for (let r = boxRow; r < boxRow + BOX_SIZE; r++) {
    for (let c = boxCol; c < boxCol + BOX_SIZE; c++) {
      if (r !== row && c !== col && board[r][c] === num) return false;
    }
  }
  return true;
}

export function solveSudoku(board: Board): boolean {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (board[r][c] === null) {
        const nums = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const num of nums) {
          if (isValidPlacement(board, r, c, num)) {
            board[r][c] = num;
            if (solveSudoku(board)) return true;
            board[r][c] = null;
          }
        }
        return false;
      }
    }
  }
  return true;
}

export function generateSolution(): Board {
  const board: Board = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
  solveSudoku(board);
  return board;
}

export function countSolutions(board: Board, limit: number = 2): number {
  let count = 0;
  function solve(b: Board): boolean {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (b[r][c] === null) {
          for (let num = 1; num <= 9; num++) {
            if (isValidPlacement(b, r, c, num)) {
              b[r][c] = num;
              if (solve(b)) return true;
              b[r][c] = null;
            }
          }
          return false;
        }
      }
    }
    count++;
    return count >= limit;
  }
  const copy = board.map(row => [...row]);
  solve(copy);
  return count;
}

export function createEmptyNotes(): Notes {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => new Set<number>())
  );
}

export function cellsToRemoveForDifficulty(difficulty: Difficulty): number {
  const cellsToRemove: Record<Difficulty, number> = {
    easy: 35,
    medium: 45,
    hard: 52,
    expert: 58,
  };
  return cellsToRemove[difficulty];
}

export function generatePuzzle(difficulty: Difficulty): { puzzle: Board; solution: Board } {
  const solution = generateSolution();
  const puzzle: Board = solution.map(row => [...row]);

  let toRemove = cellsToRemoveForDifficulty(difficulty);
  const positions = shuffleArray(
    Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9] as [number, number])
  );

  for (const [r, c] of positions) {
    if (toRemove <= 0) break;
    const backup = puzzle[r][c];
    puzzle[r][c] = null;
    if (countSolutions(puzzle) === 1) {
      toRemove--;
    } else {
      puzzle[r][c] = backup;
    }
  }

  return { puzzle, solution };
}

export function isBoardComplete(board: Board, solution: Board): boolean {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (board[r][c] !== solution[r][c]) return false;
    }
  }
  return true;
}

export function countNumberOnBoard(board: Board, num: number): number {
  let count = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (board[r]?.[c] === num) count++;
    }
  }
  return count;
}

export function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}
