import { describe, it, expect } from 'vitest';
import {
  type Board,
  shuffleArray,
  isValidPlacement,
  solveSudoku,
  generateSolution,
  countSolutions,
  generatePuzzle,
  isBoardComplete,
  countNumberOnBoard,
  createEmptyNotes,
  cellsToRemoveForDifficulty,
  formatTime,
  GRID_SIZE,
} from '../sudoku';

// Полностью решённая доска (валидное судоку)
const solvedBoard: Board = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 6, 8, 1, 7, 9],
];

function emptyBoard(): Board {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
}

function cloneBoard(b: Board): Board {
  return b.map(row => [...row]);
}

describe('shuffleArray', () => {
  it('returns a new array with the same elements', () => {
    const input = [1, 2, 3, 4, 5];
    const output = shuffleArray(input);
    expect(output).not.toBe(input);
    expect([...output].sort((a, b) => a - b)).toEqual(input);
  });

  it('does not mutate the original array', () => {
    const input = [1, 2, 3];
    shuffleArray(input);
    expect(input).toEqual([1, 2, 3]);
  });

  it('handles empty and single-element arrays', () => {
    expect(shuffleArray([])).toEqual([]);
    expect(shuffleArray([42])).toEqual([42]);
  });
});

describe('isValidPlacement', () => {
  it('accepts a valid number for a cell in a solved board', () => {
    // В клетке (0,0) стоит 5; в строке/столбце/блоке нет другого 5 -> размещение допустимо
    expect(isValidPlacement(solvedBoard, 0, 0, 5)).toBe(true);
  });

  it('rejects a duplicate in the same row', () => {
    // В строке 0 уже есть 5 (колонка 0), ставим 5 в (0,1)
    expect(isValidPlacement(solvedBoard, 0, 1, 5)).toBe(false);
  });

  it('rejects a duplicate in the same column', () => {
    // В колонке 0 есть 6 (строка 1), ставим 6 в (0,0)
    expect(isValidPlacement(solvedBoard, 0, 0, 6)).toBe(false);
  });

  it('rejects a duplicate in the same 3x3 box', () => {
    // В блоке верхний-средний есть 7 в (0,4), ставим 7 в (0,3)
    expect(isValidPlacement(solvedBoard, 0, 3, 7)).toBe(false);
  });

  it('ignores the value already present in the target cell itself', () => {
    const board = emptyBoard();
    board[4][4] = 9;
    expect(isValidPlacement(board, 4, 4, 9)).toBe(true);
  });

  it('allows any number on an empty board', () => {
    const board = emptyBoard();
    expect(isValidPlacement(board, 0, 0, 1)).toBe(true);
    expect(isValidPlacement(board, 8, 8, 9)).toBe(true);
  });
});

describe('solveSudoku', () => {
  it('solves a classic puzzle', () => {
    const puzzle: Board = [
      [5, 3, null, null, 7, null, null, null, null],
      [6, null, null, 1, 9, 5, null, null, null],
      [null, 9, 8, null, null, null, null, 6, null],
      [8, null, null, null, 6, null, null, null, 3],
      [4, null, null, 8, null, 3, null, null, 1],
      [7, null, null, null, 2, null, null, null, 6],
      [null, 6, null, null, null, null, 2, 8, null],
      [null, null, null, 4, 1, 9, null, null, 5],
      [null, null, null, null, 8, null, null, 7, 9],
    ];
    expect(solveSudoku(puzzle)).toBe(true);
    for (const row of puzzle) {
      expect([...(row as number[])].sort().join('')).toBe('123456789');
    }
    for (let c = 0; c < 9; c++) {
      const col = puzzle.map(r => r[c]) as number[];
      expect([...col].sort().join('')).toBe('123456789');
    }
  });

  it('returns true immediately for a completed board', () => {
    const board = cloneBoard(solvedBoard);
    expect(solveSudoku(board)).toBe(true);
    expect(board).toEqual(solvedBoard);
  });

  it('returns false for an unsolvable board', () => {
    const bad: Board = emptyBoard();
    bad[0] = [null, 1, 2, 3, 4, 5, 6, 7, 8];
    // В (0,0) подходит только 9, но 9 стоит в колонке 0 ниже -> решения нет
    bad[1][0] = 9;
    expect(solveSudoku(bad)).toBe(false);
  });
});

describe('generateSolution', () => {
  it('produces a fully filled valid board', () => {
    const solution = generateSolution();
    expect(solution).toHaveLength(9);
    for (let r = 0; r < 9; r++) {
      expect(solution[r]).toHaveLength(9);
      expect([...(solution[r] as number[])].sort().join('')).toBe('123456789');
    }
    for (let c = 0; c < 9; c++) {
      const col = solution.map(row => row[c]) as number[];
      expect([...col].sort().join('')).toBe('123456789');
    }
    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        const box: number[] = [];
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            box.push(solution[br * 3 + r][bc * 3 + c] as number);
          }
        }
        expect([...box].sort().join('')).toBe('123456789');
      }
    }
  });
});

describe('countSolutions', () => {
  it('counts exactly one solution for a full valid board', () => {
    expect(countSolutions(solvedBoard)).toBe(1);
  });

  it('returns limit (2) for a board with multiple solutions', () => {
    const board = emptyBoard();
    expect(countSolutions(board, 2)).toBe(2);
  });

  it('returns 0 for an unsolvable board', () => {
    const board = emptyBoard();
    board[0] = [null, 1, 2, 3, 4, 5, 6, 7, 8];
    board[1][0] = 9;
    expect(countSolutions(board)).toBe(0);
  });

  it('does not mutate the input board', () => {
    const puzzle: Board = cloneBoard(solvedBoard);
    puzzle[0][0] = null;
    const before = cloneBoard(puzzle);
    countSolutions(puzzle);
    expect(puzzle).toEqual(before);
  });
});

describe('cellsToRemoveForDifficulty', () => {
  it('maps difficulties to expected cell counts', () => {
    expect(cellsToRemoveForDifficulty('easy')).toBe(35);
    expect(cellsToRemoveForDifficulty('medium')).toBe(45);
    expect(cellsToRemoveForDifficulty('hard')).toBe(52);
    expect(cellsToRemoveForDifficulty('expert')).toBe(58);
  });
});

describe('generatePuzzle', () => {
  it('generates an easy puzzle with unique solution and exact clue count', () => {
    const { puzzle, solution } = generatePuzzle('easy');
    expect(puzzle).toHaveLength(9);
    expect(solution).toHaveLength(9);

    const clues = puzzle.flat().filter(v => v !== null).length;
    expect(81 - clues).toBe(cellsToRemoveForDifficulty('easy'));

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (puzzle[r][c] !== null) expect(puzzle[r][c]).toBe(solution[r][c]);
      }
    }

    expect(countSolutions(puzzle, 2)).toBe(1);
  }, 30000);
});

describe('isBoardComplete', () => {
  it('returns true when board equals solution', () => {
    expect(isBoardComplete(solvedBoard, solvedBoard)).toBe(true);
  });

  it('returns false when a single cell differs', () => {
    const board = cloneBoard(solvedBoard);
    board[4][4] = 1; // было 5
    expect(isBoardComplete(board, solvedBoard)).toBe(false);
  });

  it('returns false when a cell is empty', () => {
    const board = cloneBoard(solvedBoard);
    board[0][0] = null;
    expect(isBoardComplete(board, solvedBoard)).toBe(false);
  });
});

describe('countNumberOnBoard', () => {
  it('counts occurrences of a number', () => {
    const board = emptyBoard();
    board[0][0] = 7;
    board[3][5] = 7;
    board[8][8] = 7;
    expect(countNumberOnBoard(board, 7)).toBe(3);
    expect(countNumberOnBoard(board, 1)).toBe(0);
  });

  it('counts nine of each digit on a solved board', () => {
    for (let n = 1; n <= 9; n++) {
      expect(countNumberOnBoard(solvedBoard, n)).toBe(9);
    }
  });

  it('tolerates an empty board array', () => {
    expect(countNumberOnBoard([], 5)).toBe(0);
  });
});

describe('createEmptyNotes', () => {
  it('creates a 9x9 grid of empty sets', () => {
    const notes = createEmptyNotes();
    expect(notes).toHaveLength(9);
    for (const row of notes) {
      expect(row).toHaveLength(9);
      for (const s of row) {
        expect(s).toBeInstanceOf(Set);
        expect(s.size).toBe(0);
      }
    }
  });

  it('sets are independent copies', () => {
    const notes = createEmptyNotes();
    notes[0][0].add(5);
    expect(notes[0][1].has(5)).toBe(false);
    expect(notes[1][0].has(5)).toBe(false);
  });
});

describe('formatTime', () => {
  it.each([
    [0, '00:00'],
    [5, '00:05'],
    [59, '00:59'],
    [60, '01:00'],
    [65, '01:05'],
    [600, '10:00'],
    [3599, '59:59'],
    [3661, '61:01'],
  ])('formats %i seconds as %s', (seconds, expected) => {
    expect(formatTime(seconds)).toBe(expected);
  });
});
