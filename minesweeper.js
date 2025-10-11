import React, { useEffect, useMemo, useRef, useState } from "react";

// --- Types ---
type Cell = {
  x: number;
  y: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
};

type Board = Cell[][];

type Difficulty = {
  label: string;
  cols: number;
  rows: number;
  mines: number;
};

const DIFFICULTIES: Difficulty[] = [
  { label: "Beginner", cols: 9, rows: 9, mines: 10 },
  { label: "Intermediate", cols: 16, rows: 16, mines: 40 },
  { label: "Expert", cols: 30, rows: 16, mines: 99 },
];

// --- Helpers ---
function createEmptyBoard(cols: number, rows: number): Board {
  const grid: Board = [];
  for (let y = 0; y < rows; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < cols; x++) {
      row.push({ x, y, isMine: false, isRevealed: false, isFlagged: false, neighborMines: 0 });
    }
    grid.push(row);
  }
  return grid;
}

function inBounds(cols: number, rows: number, x: number, y: number) {
  return x >= 0 && y >= 0 && x < cols && y < rows;
}

function neighborsOf(cols: number, rows: number, x: number, y: number) {
  const n: [number, number][] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (inBounds(cols, rows, nx, ny)) n.push([nx, ny]);
    }
  }
  return n;
}

function cloneBoard(board: Board): Board {
  return board.map(row => row.map(cell => ({ ...cell })));
}

function placeMines(board: Board, mines: number, safeX: number, safeY: number) {
  // Place mines after first click. Ensure (safeX,safeY) is not a mine and, optionally, its neighbors are safer.
  const cols = board[0].length;
  const rows = board.length;
  const forbidden = new Set<string>();
  // Make first click and its immediate neighbors safe
  neighborsOf(cols, rows, safeX, safeY).concat([[safeX, safeY]]).forEach(([x, y]) => {
    forbidden.add(`${x},${y}`);
  });

  let placed = 0;
  while (placed < mines) {
    const x = Math.floor(Math.random() * cols);
    const y = Math.floor(Math.random() * rows);
    const key = `${x},${y}`;
    if (forbidden.has(key)) continue;
    if (!board[y][x].isMine) {
      board[y][x].isMine = true;
      placed++;
    }
  }

  // compute neighbor counts
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = board[y][x];
      if (cell.isMine) continue;
      cell.neighborMines = neighborsOf(cols, rows, x, y).reduce((acc, [nx, ny]) => acc + (board[ny][nx].isMine ? 1 : 0), 0);
    }
  }
}

function floodReveal(board: Board, x: number, y: number): Board {
  const cols = board[0].length;
  const rows = board.length;
  const stack: [number, number][] = [[x, y]];
  const visited = new Set<string>();
  while (stack.length) {
    const [cx, cy] = stack.pop()!;
    const key = `${cx},${cy}`;
    if (visited.has(key)) continue;
    visited.add(key);
    const cell = board[cy][cx];
    if (cell.isRevealed || cell.isFlagged) continue;
    cell.isRevealed = true;
    if (cell.neighborMines === 0 && !cell.isMine) {
      for (const [nx, ny] of neighborsOf(cols, rows, cx, cy)) {
        const ncell = board[ny][nx];
        if (!ncell.isRevealed && !ncell.isFlagged) stack.push([nx, ny]);
      }
    }
  }
  return board;
}

function countRevealed(board: Board) {
  return board.flat().filter(c => c.isRevealed).length;
}

function countMines(board: Board) {
  return board.flat().filter(c => c.isMine).length;
}

function countFlags(board: Board) {
  return board.flat().filter(c => c.isFlagged).length;
}

function allSafeCellsRevealed(board: Board) {
  const total = board.length * board[0].length;
  return countRevealed(board) === total - countMines(board);
}

// Number colors like the classic game
const numberClass: Record<number, string> = {
  1: "text-blue-600",
  2: "text-green-600",
  3: "text-red-600",
  4: "text-indigo-600",
  5: "text-rose-600",
  6: "text-teal-600",
  7: "text-gray-800",
  8: "text-gray-600",
};

export default function Minesweeper() {
  const [difficulty, setDifficulty] = useState<Difficulty>(DIFFICULTIES[0]);
  const [board, setBoard] = useState<Board>(() => createEmptyBoard(difficulty.cols, difficulty.rows));
  const [isFirstClick, setIsFirstClick] = useState(true);
  const [alive, setAlive] = useState(true);
  const [won, setWon] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [flagMode, setFlagMode] = useState(false); // for touch users
  const timerRef = useRef<number | null>(null);

  const cols = difficulty.cols;
  const rows = difficulty.rows;

  // Reset when difficulty changes
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  function startTimer() {
    if (timerRef.current != null) return;
    timerRef.current = window.setInterval(() => setSeconds(s => s + 1), 1000);
  }

  function stopTimer() {
    if (timerRef.current != null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => {
    if (!alive || won) stopTimer();
  }, [alive, won]);

  useEffect(() => () => stopTimer(), []);

  function reset() {
    stopTimer();
    setSeconds(0);
    setIsFirstClick(true);
    setAlive(true);
    setWon(false);
    setFlagMode(false);
    setBoard(createEmptyBoard(difficulty.cols, difficulty.rows));
  }

  const flagsRemaining = useMemo(() => difficulty.mines - countFlags(board), [board, difficulty.mines]);

  function handleReveal(x: number, y: number) {
    if (!alive || won) return;
    const next = cloneBoard(board);
    const cell = next[y][x];
    if (cell.isRevealed || cell.isFlagged) return;

    if (isFirstClick) {
      // lay mines now, avoiding the clicked cell and its neighbors
      placeMines(next, difficulty.mines, x, y);
      setIsFirstClick(false);
      startTimer();
    }

    if (next[y][x].isMine) {
      next[y][x].isRevealed = true;
      // reveal all mines
      next.flat().forEach(c => {
        if (c.isMine) c.isRevealed = true;
      });
      setBoard(next);
      setAlive(false);
      return;
    }

    floodReveal(next, x, y);
    setBoard(next);

    if (allSafeCellsRevealed(next)) {
      setWon(true);
      setAlive(false);
    }
  }

  function handleChord(x: number, y: number) {
    // If number cell is revealed and flagged neighbors === number, reveal all neighbors
    const c = board[y][x];
    if (!c.isRevealed || c.neighborMines === 0) return;
    const n = neighborsOf(cols, rows, x, y);
    const flags = n.reduce((acc, [nx, ny]) => acc + (board[ny][nx].isFlagged ? 1 : 0), 0);
    if (flags !== c.neighborMines) return;
    const next = cloneBoard(board);
    for (const [nx, ny] of n) {
      const cell = next[ny][nx];
      if (!cell.isFlagged && !cell.isRevealed) {
        if (cell.isMine) {
          // boom
          cell.isRevealed = true;
          next.flat().forEach(cc => {
            if (cc.isMine) cc.isRevealed = true;
          });
          setBoard(next);
          setAlive(false);
          return;
        }
        floodReveal(next, nx, ny);
      }
    }
    setBoard(next);
    if (allSafeCellsRevealed(next)) {
      setWon(true);
      setAlive(false);
    }
  }

  function handleFlag(x: number, y: number) {
    if (!alive || won) return;
    const next = cloneBoard(board);
    const cell = next[y][x];
    if (cell.isRevealed) return;
    if (flagsRemaining <= 0 && !cell.isFlagged) return; // optional: limit flags
    cell.isFlagged = !cell.isFlagged;
    setBoard(next);
  }

  function onCellClick(e: React.MouseEvent, x: number, y: number) {
    e.preventDefault();
    if (flagMode || e.shiftKey) {
      handleFlag(x, y);
    } else {
      handleReveal(x, y);
    }
  }

  function onCellContextMenu(e: React.MouseEvent, x: number, y: number) {
    e.preventDefault();
    handleFlag(x, y);
  }

  const face = won ? "😎" : alive ? (isFirstClick ? "🙂" : "😐") : "😵";

  return (
    <div className="min-h-screen w-full flex items-start justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h1 className="text-3xl font-bold tracking-tight">Minesweeper</h1>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="px-3 py-2 rounded-xl border shadow-sm bg-white"
              value={difficulty.label}
              onChange={(e) => {
                const d = DIFFICULTIES.find((d) => d.label === e.target.value)!;
                setDifficulty(d);
              }}
            >
              {DIFFICULTIES.map((d) => (
                <option key={d.label} value={d.label}>{`${d.label} (${d.cols}×${d.rows}, ${d.mines} mines)`}</option>
              ))}
            </select>
            <button onClick={reset} className="px-4 py-2 rounded-xl bg-white border shadow-sm hover:shadow transition">
              Reset
            </button>
            <button
              onClick={() => setFlagMode((f) => !f)}
              className={`px-4 py-2 rounded-xl border shadow-sm transition ${flagMode ? "bg-yellow-100" : "bg-white"}`}
              title="Flag Mode (for touch). You can also Shift+Click or Right-Click."
            >
              {flagMode ? "Flag Mode: ON" : "Flag Mode: OFF"}
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="grid grid-cols-3 items-center gap-3 mb-3">
          <div className="rounded-2xl bg-white border p-3 shadow-sm text-center text-sm">
            ⛳️ Flags: <span className="font-semibold">{Math.max(0, flagsRemaining)}</span>
          </div>
          <button onClick={reset} className="rounded-2xl bg-white border p-3 shadow-sm text-2xl text-center">
            {face}
          </button>
          <div className="rounded-2xl bg-white border p-3 shadow-sm text-center text-sm">
            ⏱ Time: <span className="font-semibold">{seconds}s</span>
          </div>
        </div>

        {/* Board */}
        <div
          className="rounded-2xl bg-white border p-3 shadow-md"
          style={{ width: "100%", overflowX: "auto" }}
        >
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(24px, 1fr))` }}
          >
            {board.map((row, y) =>
              row.map((cell, x) => {
                const base = "select-none aspect-square flex items-center justify-center text-sm font-semibold rounded-lg border transition active:scale-[0.98]";
                const revealed = cell.isRevealed;
                const mine = cell.isMine;
                const flagged = cell.isFlagged;
                let cls = base;
                if (!revealed) cls += " bg-slate-200 hover:bg-slate-300 border-slate-300";
                else cls += " bg-slate-50 border-slate-300";

                return (
                  <button
                    key={`${x}-${y}`}
                    className={cls}
                    onClick={(e) => onCellClick(e, x, y)}
                    onContextMenu={(e) => onCellContextMenu(e, x, y)}
                    onDoubleClick={() => handleChord(x, y)}
                    aria-label={`cell ${x},${y}`}
                  >
                    {!revealed && flagged && "🚩"}
                    {revealed && mine && "💣"}
                    {revealed && !mine && cell.neighborMines > 0 && (
                      <span className={numberClass[cell.neighborMines] || ""}>{cell.neighborMines}</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Footer / Tips */}
        <div className="mt-4 text-sm text-slate-600 flex flex-wrap gap-2">
          <span className="px-3 py-2 bg-white border rounded-xl shadow-sm">💡 Tip: Right-click to place a flag.</span>
          <span className="px-3 py-2 bg-white border rounded-xl shadow-sm">⌨️ Shift+Click toggles flag on desktop.</span>
          <span className="px-3 py-2 bg-white border rounded-xl shadow-sm">📱 Touch users: toggle Flag Mode.</span>
          <span className="px-3 py-2 bg-white border rounded-xl shadow-sm">🧪 Double‑click a number to chord‑reveal neighbors.</span>
        </div>

        {/* Win/Lose Banner */}
        {(!alive || won) && (
          <div className="mt-4 p-4 rounded-2xl border shadow-sm bg-white">
            <p className="text-center text-lg">
              {won ? "You cleared the board — Nice!" : "Boom! Try again?"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
