import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

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
  { label: "Beginner (9x9, 10 Mines)", cols: 9, rows: 9, mines: 10 },
  { label: "Intermediate (16x16, 40 Mines)", cols: 16, rows: 16, mines: 40 },
  { label: "Expert (30x16, 99 Mines)", cols: 30, rows: 16, mines: 99 },
];

const NUMBER_CLASS: Record<number, string> = {
  1: "num-1",
  2: "num-2",
  3: "num-3",
  4: "num-4",
  5: "num-5",
  6: "num-6",
  7: "num-7",
  8: "num-8",
};

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

function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

function inBounds(cols: number, rows: number, x: number, y: number) {
  return x >= 0 && y >= 0 && x < cols && y < rows;
}

function neighborsOf(cols: number, rows: number, x: number, y: number): [number, number][] {
  const neighbors: [number, number][] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (inBounds(cols, rows, nx, ny)) neighbors.push([nx, ny]);
    }
  }
  return neighbors;
}

// Mines are placed after the first click so the opening move is always safe.
function initializeBoard(cols: number, rows: number, mines: number, startX: number, startY: number): Board {
  const board = createEmptyBoard(cols, rows);
  const forbidden = new Set<string>();
  neighborsOf(cols, rows, startX, startY)
    .concat([[startX, startY]])
    .forEach(([x, y]) => forbidden.add(`${x},${y}`));

  let placed = 0;
  while (placed < mines) {
    const x = Math.floor(Math.random() * cols);
    const y = Math.floor(Math.random() * rows);
    const key = `${x},${y}`;
    if (forbidden.has(key) || board[y][x].isMine) continue;
    board[y][x].isMine = true;
    placed++;
  }

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = board[y][x];
      if (cell.isMine) continue;
      cell.neighborMines = neighborsOf(cols, rows, x, y).reduce(
        (count, [nx, ny]) => count + (board[ny][nx].isMine ? 1 : 0),
        0
      );
    }
  }

  return board;
}

// Reveals (x, y) and, if it has no adjacent mines, flood-fills its neighbors. Returns whether a mine was hit.
function floodReveal(board: Board, cols: number, rows: number, startX: number, startY: number): boolean {
  const stack: [number, number][] = [[startX, startY]];
  let exploded = false;

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const cell = board[y][x];
    if (cell.isRevealed || cell.isFlagged) continue;

    cell.isRevealed = true;
    if (cell.isMine) {
      exploded = true;
      continue;
    }

    if (cell.neighborMines === 0) {
      for (const [nx, ny] of neighborsOf(cols, rows, x, y)) {
        if (!board[ny][nx].isRevealed && !board[ny][nx].isFlagged) stack.push([nx, ny]);
      }
    }
  }

  return exploded;
}

export default function Minesweeper() {
  const [difficulty, setDifficulty] = useState<Difficulty>(DIFFICULTIES[0]);
  const [board, setBoard] = useState<Board>(() => createEmptyBoard(difficulty.cols, difficulty.rows));
  const [alive, setAlive] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [won, setWon] = useState(false);
  const [flagMode, setFlagMode] = useState(false);
  const [cellSize, setCellSize] = useState(30);

  const { cols, rows, mines } = difficulty;
  const totalSafeCells = useMemo(() => cols * rows - mines, [cols, rows, mines]);
  const minesLeft = useMemo(() => mines - board.flat().filter((c) => c.isFlagged).length, [board, mines]);

  const gameAreaRef = useRef<HTMLDivElement | null>(null);

  const recalcCellSize = useCallback(() => {
    const container = gameAreaRef.current;
    if (!container) return;
    const availableWidth = container.clientWidth - 8;
    const availableHeight = container.clientHeight - 8;
    const size = Math.max(20, Math.min(Math.floor(availableWidth / cols), Math.floor(availableHeight / rows)));
    setCellSize(size);
  }, [cols, rows]);

  useLayoutEffect(() => {
    const container = gameAreaRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => recalcCellSize());
    observer.observe(container);
    recalcCellSize();
    return () => observer.disconnect();
  }, [recalcCellSize]);

  const revealCell = useCallback(
    (x: number, y: number) => {
      setBoard((prevBoard) => {
        if (!alive || won) return prevBoard;
        const cell = prevBoard[y][x];
        if (cell.isFlagged || cell.isRevealed) return prevBoard;

        let next = prevBoard;
        if (!initialized) {
          next = initializeBoard(cols, rows, mines, x, y);
          setInitialized(true);
        } else {
          next = cloneBoard(prevBoard);
        }

        const exploded = floodReveal(next, cols, rows, x, y);
        if (exploded) setAlive(false);
        return next;
      });
    },
    [alive, won, initialized, cols, rows, mines]
  );

  const toggleFlag = useCallback(
    (x: number, y: number) => {
      setBoard((prevBoard) => {
        if (!alive || won) return prevBoard;
        const cell = prevBoard[y][x];
        if (cell.isRevealed) return prevBoard;

        const next = cloneBoard(prevBoard);
        next[y][x].isFlagged = !next[y][x].isFlagged;
        return next;
      });
    },
    [alive, won]
  );

  const handleChord = useCallback(
    (x: number, y: number) => {
      setBoard((prevBoard) => {
        if (!alive || won) return prevBoard;
        const cell = prevBoard[y][x];
        if (!cell.isRevealed || cell.neighborMines === 0) return prevBoard;

        const neighbors = neighborsOf(cols, rows, x, y);
        const flaggedNeighbors = neighbors.filter(([nx, ny]) => prevBoard[ny][nx].isFlagged).length;
        if (flaggedNeighbors !== cell.neighborMines) return prevBoard;

        const next = cloneBoard(prevBoard);
        let exploded = false;
        for (const [nx, ny] of neighbors) {
          const neighborCell = next[ny][nx];
          if (!neighborCell.isFlagged && !neighborCell.isRevealed) {
            if (floodReveal(next, cols, rows, nx, ny)) exploded = true;
          }
        }
        if (exploded) setAlive(false);
        return next;
      });
    },
    [alive, won, cols, rows]
  );

  const handleCellClick = useCallback(
    (x: number, y: number) => {
      if (flagMode) toggleFlag(x, y);
      else revealCell(x, y);
    },
    [flagMode, revealCell, toggleFlag]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, x: number, y: number) => {
      e.preventDefault();
      e.stopPropagation();
      toggleFlag(x, y);
    },
    [toggleFlag]
  );

  // Win check: all non-mine cells revealed.
  useEffect(() => {
    if (!alive || won) return;
    const revealedSafeCells = board.reduce(
      (count, row) => count + row.filter((cell) => cell.isRevealed && !cell.isMine).length,
      0
    );
    if (totalSafeCells > 0 && revealedSafeCells === totalSafeCells) {
      setWon(true);
      setBoard((b) => b.map((row) => row.map((cell) => (cell.isMine ? { ...cell, isFlagged: true } : cell))));
    }
  }, [board, alive, won, totalSafeCells]);

  const resetGame = useCallback((newDifficulty: Difficulty = difficulty) => {
    setDifficulty(newDifficulty);
    setBoard(createEmptyBoard(newDifficulty.cols, newDifficulty.rows));
    setAlive(true);
    setWon(false);
    setInitialized(false);
  }, [difficulty]);

  useEffect(() => {
    const handleContext = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof HTMLElement) || !target.closest("#minesweeper-grid")) {
        e.preventDefault();
      }
    };
    document.addEventListener("contextmenu", handleContext);
    return () => document.removeEventListener("contextmenu", handleContext);
  }, []);

  const gridStyle = {
    gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
    gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
    width: cellSize * cols,
    height: cellSize * rows,
  };

  const face = won ? "😎" : !alive ? "🤕" : initialized ? "🤔" : "😊";

  return (
    <div className="min-h-screen w-full flex justify-center bg-slate-100 p-4">
      <div className="w-full max-w-4xl flex flex-col items-center">
        {/* Header/Controls */}
        <div className="w-full p-4 md:p-8 bg-white rounded-3xl shadow-xl flex flex-col mb-4">
          <h1 className="text-3xl font-extrabold text-gray-800 text-center mb-6">Minesweeper</h1>

          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
            <select
              className="p-2 border border-gray-300 rounded-lg shadow-sm text-sm"
              value={difficulty.label}
              onChange={(e) => {
                const newDiff = DIFFICULTIES.find((d) => d.label === e.target.value);
                if (newDiff) resetGame(newDiff);
              }}
              disabled={initialized && alive}
            >
              {DIFFICULTIES.map((d) => (
                <option key={d.label} value={d.label}>
                  {d.label}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-4">
              <span
                className={`text-xl font-mono px-3 py-1 rounded-lg ${
                  minesLeft < 0 ? "bg-red-200" : "bg-green-100"
                } text-gray-800 shadow-inner`}
              >
                🚩 {Math.max(0, minesLeft)}
              </span>
              <button
                onClick={() => resetGame()}
                className={`p-2 rounded-full text-2xl transition-transform ${
                  alive && initialized
                    ? "hover:scale-110 active:scale-95"
                    : "bg-yellow-200 hover:bg-yellow-300 active:bg-yellow-400"
                }`}
                title="Reset Game"
                aria-label="Reset Game"
              >
                {face}
              </button>
            </div>

            <button
              onClick={() => setFlagMode((f) => !f)}
              className={`sm:hidden p-2 text-sm rounded-lg font-medium transition-colors ${
                flagMode ? "bg-indigo-600 text-white shadow-md" : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
              }`}
            >
              {flagMode ? "Flag Mode: ON 🚩" : "Flag Mode: OFF"}
            </button>
          </div>
        </div>

        {/* Grid */}
        <div
          ref={gameAreaRef}
          className="w-full flex justify-center items-center p-2 min-h-20 max-h-[65vh] overflow-auto"
        >
          <div
            id="minesweeper-grid"
            style={gridStyle}
            className="grid bg-gray-100 rounded-xl shadow-inner shrink-0 mx-auto"
          >
            {board.map((row, y) =>
              row.map((cell, x) => {
                const { isRevealed: revealed, isMine: mine, isFlagged: flagged } = cell;

                let btnClass =
                  "flex items-center justify-center font-bold select-none border border-gray-300 box-border transition-all duration-75 ";
                btnClass += "leading-none ";
                if (revealed) {
                  btnClass += mine ? "bg-red-500 text-white" : "bg-gray-200 shadow-inner";
                } else if (alive && initialized) {
                  btnClass +=
                    "bg-green-400 hover:bg-green-500 active:bg-green-600 border-b-4 border-r-4 border-t-2 border-l-2 border-green-500 cursor-pointer";
                } else {
                  btnClass +=
                    "bg-yellow-400 hover:bg-yellow-500 active:bg-yellow-600 border-b-4 border-r-4 border-t-2 border-l-2 border-yellow-500 cursor-pointer";
                }

                return (
                  <button
                    key={`${x}-${y}`}
                    style={{ width: cellSize, height: cellSize, fontSize: cellSize * 0.5 }}
                    className={btnClass}
                    onClick={() => handleCellClick(x, y)}
                    onContextMenu={(e) => handleContextMenu(e, x, y)}
                    onDoubleClick={() => handleChord(x, y)}
                    disabled={!alive || won}
                    aria-label={
                      revealed
                        ? mine
                          ? `mine at column ${x + 1}, row ${y + 1}`
                          : `cell ${x + 1}, ${y + 1}: ${cell.neighborMines || "empty"}`
                        : `hidden cell ${x + 1}, ${y + 1}${flagged ? ", flagged" : ""}`
                    }
                  >
                    {!revealed && flagged && "🚩"}
                    {revealed && mine && "💣"}
                    {revealed && !mine && cell.neighborMines > 0 && (
                      <span className={NUMBER_CLASS[cell.neighborMines] || ""}>{cell.neighborMines}</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {(!alive || won) && (
          <div className="mt-4 p-4 rounded-2xl border shadow-lg bg-white border-green-500 w-full max-w-4xl">
            <p className={`text-center text-xl font-bold ${won ? "text-green-600" : "text-red-600"}`}>
              {won ? "You cleared the board — Nice! 🎉" : "Boom! Try again? 💀"}
            </p>
          </div>
        )}

        <div className="mt-4 p-4 border border-gray-200 rounded-2xl shadow-sm bg-white w-full max-w-4xl">
          <h3 className="text-lg font-semibold mb-2 text-gray-700">How to Play</h3>
          <div className="text-sm text-slate-600 grid grid-cols-1 md:grid-cols-2 gap-3">
            <span className="p-2 bg-slate-50 border rounded-xl shadow-sm">💡 <strong>Left-click</strong> to reveal a cell.</span>
            <span className="p-2 bg-slate-50 border rounded-xl shadow-sm">
              🚩 <strong>Right-click</strong> to place/remove a flag.
            </span>
            <span className="p-2 bg-slate-50 border rounded-xl shadow-sm">
              📱 <strong>Touch users:</strong> use the Flag Mode button to toggle between revealing and flagging.
            </span>
            <span className="p-2 bg-slate-50 border rounded-xl shadow-sm">
              🧪 <strong>Double-click</strong> a revealed number (Chord) to clear safe neighbors.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
