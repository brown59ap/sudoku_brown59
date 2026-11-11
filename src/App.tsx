import { useState, useEffect, useCallback, useRef } from 'react';

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
type CellValue = number | null;
type Board = CellValue[][];
type Notes = Set<number>[][];

const GRID_SIZE = 9;
const BOX_SIZE = 3;

// ===== Sudoku Generator =====
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isValidPlacement(board: Board, row: number, col: number, num: number): boolean {
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

function solveSudoku(board: Board): boolean {
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

function generateSolution(): Board {
  const board: Board = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
  solveSudoku(board);
  return board;
}

function countSolutions(board: Board, limit: number = 2): number {
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

function generatePuzzle(difficulty: Difficulty): { puzzle: Board; solution: Board } {
  const solution = generateSolution();
  const puzzle: Board = solution.map(row => [...row]);

  const cellsToRemove: Record<Difficulty, number> = {
    easy: 35,
    medium: 45,
    hard: 52,
    expert: 58,
  };

  let toRemove = cellsToRemove[difficulty];
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

// ===== Timer Hook =====
function useTimer(isRunning: boolean) {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const reset = () => setSeconds(0);

  const format = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return { seconds, formatted: format(seconds), reset };
}

// ===== Main App =====
export default function App() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [puzzle, setPuzzle] = useState<Board>([]);
  const [solution, setSolution] = useState<Board>([]);
  const [board, setBoard] = useState<Board>([]);
  const [initial, setInitial] = useState<boolean[][]>([]);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [isComplete, setIsComplete] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [notesMode, setNotesMode] = useState(false);
  const [notes, setNotes] = useState<Notes>([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const { formatted, reset: resetTimer } = useTimer(isPlaying && !isComplete);

  const startNewGame = useCallback((diff: Difficulty) => {
    setIsGenerating(true);
    setTimeout(() => {
      const { puzzle: p, solution: s } = generatePuzzle(diff);
      setPuzzle(p);
      setSolution(s);
      setBoard(p.map(row => [...row]));
      setInitial(p.map(row => row.map(cell => cell !== null)));
      setSelectedCell(null);
      setErrors(new Set());
      setIsComplete(false);
      setIsPlaying(true);
      setNotesMode(false);
      setHintsUsed(0);
      setNotes(
        Array.from({ length: 9 }, () =>
          Array.from({ length: 9 }, () => new Set<number>())
        )
      );
      resetTimer();
      setIsGenerating(false);
    }, 50);
  }, [resetTimer]);

  useEffect(() => {
    startNewGame(difficulty);
  }, []);

  const checkCompletion = useCallback((b: Board) => {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (b[r][c] !== solution[r][c]) return false;
      }
    }
    return true;
  }, [solution]);

  const placeNumber = useCallback((num: number) => {
    if (!selectedCell || isComplete) return;
    const [r, c] = selectedCell;
    if (initial[r][c]) return;

    if (notesMode) {
      const newNotes = notes.map(row => row.map(s => new Set(s)));
      if (newNotes[r][c].has(num)) {
        newNotes[r][c].delete(num);
      } else {
        newNotes[r][c].add(num);
      }
      setNotes(newNotes);
    } else {
      const newBoard = board.map(row => [...row]);
      newBoard[r][c] = num;
      setBoard(newBoard);

      const newNotes = notes.map(row => row.map(s => new Set(s)));
      newNotes[r][c].clear();
      setNotes(newNotes);

      if (num !== solution[r][c]) {
        const newErrors = new Set(errors);
        newErrors.add(`${r}-${c}`);
        setErrors(newErrors);
      } else {
        const newErrors = new Set(errors);
        newErrors.delete(`${r}-${c}`);
        setErrors(newErrors);

        // Remove notes for this number from same row/col/box
        const updatedNotes = notes.map(row => row.map(s => new Set(s)));
        for (let i = 0; i < 9; i++) {
          updatedNotes[r][i].delete(num);
          updatedNotes[i][c].delete(num);
        }
        const boxR = Math.floor(r / 3) * 3;
        const boxC = Math.floor(c / 3) * 3;
        for (let dr = 0; dr < 3; dr++) {
          for (let dc = 0; dc < 3; dc++) {
            updatedNotes[boxR + dr][boxC + dc].delete(num);
          }
        }
        setNotes(updatedNotes);

        if (checkCompletion(newBoard)) {
          setIsComplete(true);
          setIsPlaying(false);
        }
      }
    }
  }, [selectedCell, isComplete, initial, notesMode, board, notes, errors, solution, checkCompletion]);

  const eraseCell = useCallback(() => {
    if (!selectedCell || isComplete) return;
    const [r, c] = selectedCell;
    if (initial[r][c]) return;

    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = null;
    setBoard(newBoard);

    const newErrors = new Set(errors);
    newErrors.delete(`${r}-${c}`);
    setErrors(newErrors);

    const newNotes = notes.map(row => row.map(s => new Set(s)));
    newNotes[r][c].clear();
    setNotes(newNotes);
  }, [selectedCell, isComplete, initial, board, errors, notes]);

  const giveHint = useCallback(() => {
    if (!selectedCell || isComplete) return;
    const [r, c] = selectedCell;
    if (initial[r][c]) return;

    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = solution[r][c];
    setBoard(newBoard);

    const newErrors = new Set(errors);
    newErrors.delete(`${r}-${c}`);
    setErrors(newErrors);

    const newNotes = notes.map(row => row.map(s => new Set(s)));
    newNotes[r][c].clear();
    setNotes(newNotes);

    setHintsUsed(h => h + 1);

    if (checkCompletion(newBoard)) {
      setIsComplete(true);
      setIsPlaying(false);
    }
  }, [selectedCell, isComplete, initial, board, solution, errors, notes, checkCompletion]);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isComplete) return;

      if (e.key >= '1' && e.key <= '9') {
        placeNumber(parseInt(e.key));
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        eraseCell();
      } else if (e.key === 'ArrowUp' && selectedCell) {
        const [r, c] = selectedCell;
        if (r > 0) setSelectedCell([r - 1, c]);
      } else if (e.key === 'ArrowDown' && selectedCell) {
        const [r, c] = selectedCell;
        if (r < 8) setSelectedCell([r + 1, c]);
      } else if (e.key === 'ArrowLeft' && selectedCell) {
        const [r, c] = selectedCell;
        if (c > 0) setSelectedCell([r, c - 1]);
      } else if (e.key === 'ArrowRight' && selectedCell) {
        const [r, c] = selectedCell;
        if (c < 8) setSelectedCell([r, c + 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [placeNumber, eraseCell, selectedCell, isComplete]);

  const getCellClasses = (r: number, c: number): string => {
    const classes: string[] = [
      'w-full aspect-square flex items-center justify-center cursor-pointer select-none transition-all duration-150 relative',
      'text-lg sm:text-xl md:text-2xl font-semibold',
    ];

    // Borders for 3x3 boxes
    if (c % 3 === 0 && c !== 0) classes.push('border-l-2 border-l-gray-800');
    if (r % 3 === 0 && r !== 0) classes.push('border-t-2 border-t-gray-800');

    const isSelected = selectedCell && selectedCell[0] === r && selectedCell[1] === c;
    const isRelated = selectedCell && (
      selectedCell[0] === r ||
      selectedCell[1] === c ||
      (Math.floor(selectedCell[0] / 3) === Math.floor(r / 3) &&
       Math.floor(selectedCell[1] / 3) === Math.floor(c / 3))
    );
    const isError = errors.has(`${r}-${c}`);
    const isInitialCell = initial[r]?.[c];
    const selectedValue = selectedCell ? board[selectedCell[0]][selectedCell[1]] : null;
    const isSameValue = selectedValue !== null && board[r][c] === selectedValue;

    if (isSelected) {
      classes.push('bg-blue-200');
    } else if (isSameValue && board[r][c] !== null) {
      classes.push('bg-blue-100');
    } else if (isRelated) {
      classes.push('bg-blue-50');
    } else {
      classes.push('bg-white');
    }

    if (isError) {
      classes.push('text-red-500');
    } else if (isInitialCell) {
      classes.push('text-gray-900');
    } else {
      classes.push('text-blue-600');
    }

    return classes.join(' ');
  };

  const getNumberCount = (num: number): number => {
    let count = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r]?.[c] === num) count++;
      }
    }
    return count;
  };

  const difficultyLabels: Record<Difficulty, string> = {
    easy: 'Легко',
    medium: 'Средне',
    hard: 'Сложно',
    expert: 'Эксперт',
  };

  if (board.length === 0 || isGenerating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Генерация головоломки...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="w-full max-w-lg mb-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-3xl font-bold text-gray-800">🧩 Судоку</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm">
              {difficultyLabels[difficulty]}
            </span>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm mb-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">⏱</span>
            <span className="font-mono text-lg font-semibold text-gray-700">{formatted}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">💡</span>
            <span className="font-semibold text-gray-700">{hintsUsed}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">❌</span>
            <span className="font-semibold text-gray-700">{errors.size}</span>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="bg-white rounded-2xl shadow-lg p-3 sm:p-4 mb-4 border-2 border-gray-800">
        <div className="grid grid-cols-9 border border-gray-300">
          {board.map((row, r) =>
            row.map((cell, c) => (
              <div
                key={`${r}-${c}`}
                className={getCellClasses(r, c)}
                onClick={() => setSelectedCell([r, c])}
              >
                {cell !== null ? (
                  <span>{cell}</span>
                ) : notes[r]?.[c]?.size > 0 ? (
                  <div className="grid grid-cols-3 w-full h-full p-0.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                      <span
                        key={n}
                        className="flex items-center justify-center text-[8px] sm:text-[10px] text-gray-400 font-normal"
                      >
                        {notes[r][c].has(n) ? n : ''}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Number pad */}
      <div className="w-full max-w-lg mb-4">
        <div className="grid grid-cols-9 gap-1.5 sm:gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
            const count = getNumberCount(num);
            const isDone = count >= 9;
            return (
              <button
                key={num}
                onClick={() => placeNumber(num)}
                disabled={isDone}
                className={`
                  aspect-square rounded-xl font-bold text-xl sm:text-2xl transition-all duration-150
                  ${isDone
                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    : 'bg-white text-blue-600 hover:bg-blue-50 active:bg-blue-100 shadow-sm hover:shadow-md'
                  }
                `}
              >
                {num}
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="w-full max-w-lg">
        <div className="grid grid-cols-5 gap-2 mb-4">
          <button
            onClick={() => setNotesMode(!notesMode)}
            className={`flex flex-col items-center py-2.5 px-1 rounded-xl font-medium text-xs sm:text-sm transition-all ${
              notesMode
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50 shadow-sm'
            }`}
          >
            <span className="text-lg mb-0.5">✏️</span>
            Заметки
          </button>
          <button
            onClick={eraseCell}
            className="flex flex-col items-center py-2.5 px-1 rounded-xl font-medium text-xs sm:text-sm bg-white text-gray-600 hover:bg-gray-50 shadow-sm transition-all"
          >
            <span className="text-lg mb-0.5">🧹</span>
            Стереть
          </button>
          <button
            onClick={giveHint}
            className="flex flex-col items-center py-2.5 px-1 rounded-xl font-medium text-xs sm:text-sm bg-white text-gray-600 hover:bg-gray-50 shadow-sm transition-all"
          >
            <span className="text-lg mb-0.5">💡</span>
            Подсказка
          </button>
          <button
            onClick={() => startNewGame(difficulty)}
            className="flex flex-col items-center py-2.5 px-1 rounded-xl font-medium text-xs sm:text-sm bg-white text-gray-600 hover:bg-gray-50 shadow-sm transition-all"
          >
            <span className="text-lg mb-0.5">🔄</span>
            Новая
          </button>
          <div className="flex flex-col">
            <select
              value={difficulty}
              onChange={(e) => {
                const d = e.target.value as Difficulty;
                setDifficulty(d);
                startNewGame(d);
              }}
              className="flex-1 rounded-xl font-medium text-xs sm:text-sm bg-white text-gray-600 shadow-sm border-0 cursor-pointer text-center appearance-none"
            >
              <option value="easy">Легко</option>
              <option value="medium">Средне</option>
              <option value="hard">Сложно</option>
              <option value="expert">Эксперт</option>
            </select>
          </div>
        </div>
      </div>

      {/* Completion modal */}
      {isComplete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-bounce-in">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Поздравляем!</h2>
            <p className="text-gray-600 mb-1">Вы решили судоку!</p>
            <div className="flex justify-center gap-4 my-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{formatted}</p>
                <p className="text-xs text-gray-500">Время</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{hintsUsed}</p>
                <p className="text-xs text-gray-500">Подсказки</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{errors.size}</p>
                <p className="text-xs text-gray-500">Ошибки</p>
              </div>
            </div>
            <button
              onClick={() => startNewGame(difficulty)}
              className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors shadow-md"
            >
              Новая игра
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="mt-4 text-xs text-gray-400">
        Используйте клавиши 1-9 для ввода • Стрелки для навигации • Backspace для стирания
      </p>
    </div>
  );
}
