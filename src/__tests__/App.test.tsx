import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import App from '../App';

// Детерминированная доска: фиксированное решение; из головоломки удалены клетки (0,0) и (0,1).
vi.mock('../sudoku', async () => {
  const actual = await vi.importActual<typeof import('../sudoku')>('../sudoku');
  const solution: import('../sudoku').Board = [
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
  const puzzle = solution.map(row => [...row]);
  puzzle[0][0] = null;
  puzzle[0][1] = null;
  return { ...actual, generatePuzzle: () => ({ puzzle, solution }) };
});

async function renderGame() {
  render(<App />);
  // Дождаться завершения генерации (setTimeout 50ms в startNewGame)
  await act(async () => {
    vi.advanceTimersByTime(100);
  });
}

function boardCells(): HTMLElement[] {
  return Array.from(document.querySelectorAll('.grid.grid-cols-9 > div')) as HTMLElement[];
}

function cellAt(r: number, c: number): HTMLElement {
  return boardCells()[r * 9 + c];
}

function numberButton(n: number): HTMLButtonElement {
  const pad = screen.getAllByRole('button').filter(
    b => (b.textContent ?? '').trim() === String(n)
  );
  return pad[0] as HTMLButtonElement;
}

function clickControl(label: string): void {
  const btn = screen.getAllByRole('button').find(b => b.textContent?.includes(label));
  if (!btn) throw new Error(`Кнопка "${label}" не найдена`);
  fireEvent.click(btn);
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('App rendering', () => {
  it('shows a loading spinner while generating, then the board', async () => {
    render(<App />);
    expect(screen.getByText(/Генерация головоломки/)).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.queryByText(/Генерация головоломки/)).not.toBeInTheDocument();
    expect(screen.getByText('🧩 Судоку')).toBeInTheDocument();
  });

  it('renders 81 cells with initial values from the mocked puzzle', async () => {
    await renderGame();
    const cells = boardCells();
    expect(cells).toHaveLength(81);
    expect(within(cells[2]).getByText('4')).toBeInTheDocument();
    expect(cells[0].textContent).toBe('');
    expect(cells[1].textContent).toBe('');
  });

  it('displays difficulty label and zeroed stats', async () => {
    await renderGame();
    expect(screen.getAllByText('Легко').length).toBeGreaterThan(0);
    expect(screen.getAllByText('00:00').length).toBeGreaterThan(0);
  });
});

describe('placing numbers', () => {
  it('places a correct number via the number pad', async () => {
    await renderGame();
    fireEvent.click(cellAt(0, 0));
    fireEvent.click(numberButton(5));
    expect(within(cellAt(0, 0)).getByText('5')).toBeInTheDocument();
  });

  it('marks an incorrect number as an error and clears the mark after correction', async () => {
    await renderGame();
    fireEvent.click(cellAt(0, 0));
    fireEvent.click(numberButton(7)); // правильный ответ — 5
    expect(cellAt(0, 0).textContent).toBe('7');
    expect(cellAt(0, 0)).toHaveClass('text-red-500');
    // Счётчик ошибок в панели статистики
    const errCount = screen.getAllByText('❌')[0].parentElement?.querySelector('.font-semibold');
    expect(errCount?.textContent).toBe('1');
    // Исправляем на верное значение — ошибка снимается
    fireEvent.click(numberButton(5));
    expect(cellAt(0, 0)).not.toHaveClass('text-red-500');
    expect(errCount?.textContent).toBe('0');
  });

  it('does not allow modifying initial (given) cells', async () => {
    await renderGame();
    fireEvent.click(cellAt(0, 2)); // начальная клетка со значением 4
    fireEvent.click(numberButton(1));
    expect(within(cellAt(0, 2)).getByText('4')).toBeInTheDocument();
  });

  it('supports keyboard input for placement', async () => {
    await renderGame();
    fireEvent.click(cellAt(0, 0));
    fireEvent.keyDown(window, { key: '5' });
    expect(within(cellAt(0, 0)).getByText('5')).toBeInTheDocument();
  });

  it('erases a placed value via the erase button', async () => {
    await renderGame();
    fireEvent.click(cellAt(0, 0));
    fireEvent.click(numberButton(5));
    clickControl('Стереть');
    expect(cellAt(0, 0).textContent).toBe('');
  });

  it('erases via Backspace key', async () => {
    await renderGame();
    fireEvent.click(cellAt(0, 0));
    fireEvent.keyDown(window, { key: '5' });
    fireEvent.keyDown(window, { key: 'Backspace' });
    expect(cellAt(0, 0).textContent).toBe('');
  });

  it('navigates selection with arrow keys', async () => {
    await renderGame();
    fireEvent.click(cellAt(4, 4));
    expect(cellAt(4, 4)).toHaveClass('bg-blue-200');
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(cellAt(3, 4)).toHaveClass('bg-blue-200');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(cellAt(3, 5)).toHaveClass('bg-blue-200');
    // Не выходит за границы доски
    for (let i = 0; i < 12; i++) fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(cellAt(0, 5)).toHaveClass('bg-blue-200');
  });
});

describe('notes mode', () => {
  it('toggles notes on and off in a cell', async () => {
    await renderGame();
    clickControl('Заметки');
    fireEvent.click(cellAt(0, 0));
    fireEvent.click(numberButton(5));
    expect(within(cellAt(0, 0)).getByText('5')).toBeInTheDocument();
    // Повторное нажатие снимает заметку
    fireEvent.click(numberButton(5));
    expect(cellAt(0, 0).textContent).toBe('');
  });

  it('clears conflicting notes in the same row/col/box after a correct placement', async () => {
    await renderGame();
    clickControl('Заметки');
    fireEvent.click(cellAt(0, 0));
    fireEvent.click(numberButton(5));
    fireEvent.click(cellAt(1, 0));
    fireEvent.click(numberButton(5));
    // Выходим из режима заметок и ставим верную 5 в (0,0)
    clickControl('Заметки');
    fireEvent.click(numberButton(5));
    expect(within(cellAt(0, 0)).getByText('5')).toBeInTheDocument();
    // Заметка "5" в другой клетке того же столбца должна исчезнуть
    expect(cellAt(1, 0).textContent).toBe('');
  });
});

describe('hints', () => {
  it('fills the selected cell with the correct value and increments hint counter', async () => {
    await renderGame();
    fireEvent.click(cellAt(0, 0));
    clickControl('Подсказка');
    expect(within(cellAt(0, 0)).getByText('5')).toBeInTheDocument();
    const hintCount = screen.getAllByText('💡')[0].parentElement?.querySelector('.font-semibold');
    expect(hintCount?.textContent).toBe('1');
  });

  it('does nothing on an initial cell', async () => {
    await renderGame();
    fireEvent.click(cellAt(0, 2));
    clickControl('Подсказка');
    const hintCount = screen.getAllByText('💡')[0].parentElement?.querySelector('.font-semibold');
    expect(hintCount?.textContent).toBe('0');
  });
});

describe('game completion', () => {
  it('shows the congratulations modal when the board is solved', async () => {
    await renderGame();
    // Заполняем обе пустые клетки правильными значениями через подсказки
    fireEvent.click(cellAt(0, 0));
    clickControl('Подсказка');
    fireEvent.click(cellAt(0, 1));
    clickControl('Подсказка');
    expect(await screen.findByText('Поздравляем!')).toBeInTheDocument();
    expect(screen.getByText('Вы решили судоку!')).toBeInTheDocument();
  });

  it('starts a fresh game from the completion modal', async () => {
    await renderGame();
    fireEvent.click(cellAt(0, 0));
    clickControl('Подсказка');
    fireEvent.click(cellAt(0, 1));
    clickControl('Подсказка');
    await screen.findByText('Поздравляем!');
    fireEvent.click(screen.getByText('Новая игра'));
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.queryByText('Поздравляем!')).not.toBeInTheDocument();
    expect(cellAt(0, 0).textContent).toBe('');
  });
});

describe('timer', () => {
  it('counts up while playing', async () => {
    await renderGame();
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText('00:05')).toBeInTheDocument();
  });

  it('stops counting after completion', async () => {
    await renderGame();
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    fireEvent.click(cellAt(0, 0));
    clickControl('Подсказка');
    fireEvent.click(cellAt(0, 1));
    clickControl('Подсказка');
    await screen.findByText('Поздравляем!');
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getAllByText('00:03').length).toBeGreaterThan(0);
  });
});
