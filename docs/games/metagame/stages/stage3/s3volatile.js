// Volatile cells (corruption ≥ VOLATILE_AT) — the working-memory verb. A seeded subset of the
// snapshot's FILLED solution cells is "volatile": once you fill one it stays only for a short window
// of MOVES (a deterministic tick count, NOT wall-clock), then reverts to UNKNOWN unless you LOCK it.
// Locking is free but a deliberate extra action, so deep snapshots force you to fill-then-lock in
// order instead of leisurely scanning the whole grid — the memory theme made mechanical.
//
// Pure board-extension: holds no clocks of its own. The renderer ticks it once per cell action. A
// board is ALWAYS solvable (lock every volatile cell as you fill it), so uniqueness is preserved.

import { makeRng } from "./rng.js";
import { EMPTY, UNKNOWN } from "./nonogram.js";

export const VOLATILE_AT = 2; // corruption level at which volatile cells appear

const key = (x, y) => `${x},${y}`;
const isFill = (v) => v !== UNKNOWN && v !== EMPTY; // a filled cell of either colour

// How many moves a freshly-filled volatile cell survives before decaying — tighter as corruption
// rises (8 - corruption, floored at 3): c2 → 6 moves, c8 → 3 moves.
export function decayWindow(corruption) {
  return Math.max(3, 8 - Number(corruption || 0));
}

// Deterministic count of volatile cells for a corruption level (kept strictly below the solution's
// filled count so a snapshot is never entirely volatile).
function volatileCount(corruption, filled) {
  const want = 2 + (Number(corruption || 0) - VOLATILE_AT); // c2→2, c8→8
  return Math.max(0, Math.min(filled - 1, want));
}

// Initialise volatile tracking on a board. Picks a seeded subset of the solution's FILLED cells.
// No-op (returns the board unchanged, no .volatile field) below VOLATILE_AT.
export function initVolatile(board, corruption, seed) {
  if (Number(corruption || 0) < VOLATILE_AT) return board;
  const filledCells = [];
  for (let y = 0; y < board.puzzle.height; y += 1) {
    for (let x = 0; x < board.puzzle.width; x += 1) {
      if (board.puzzle.solution[y][x] !== EMPTY) filledCells.push(key(x, y));
    }
  }
  const n = volatileCount(corruption, filledCells.length);
  if (n <= 0) return board;
  const picked = makeRng(`s3-volatile:${seed}`).shuffle(filledCells).slice(0, n);
  board.volatile = new Set(picked);
  board.locked = new Set();
  board.volFilledAt = new Map();
  board.ticks = 0;
  board.decayWindow = decayWindow(corruption);
  // Any volatile cell already filled (e.g. by Prefetch) is locked for free so prefetch can't decay.
  for (const k of board.volatile) {
    const [x, y] = k.split(",").map(Number);
    if (isFill(board.marks[y][x])) board.locked.add(k);
  }
  return board;
}

// Record that a volatile cell was just filled, starting its decay timer.
export function noteFill(board, x, y) {
  if (!board.volatile) return;
  const k = key(x, y);
  if (board.volatile.has(k) && !board.locked.has(k)) board.volFilledAt.set(k, board.ticks);
}

// Lock the cell under the cursor if it is a currently-filled volatile cell. Returns true if locked.
export function lockCell(board, x, y) {
  if (!board.volatile) return false;
  const k = key(x, y);
  if (!board.volatile.has(k) || board.locked.has(k)) return false;
  if (!isFill(board.marks[y][x])) return false;
  board.locked.add(k);
  board.volFilledAt.delete(k);
  return true;
}

// Advance one move: age every filled, unlocked volatile cell and revert any past its window. Returns
// the list of reverted {x,y} cells (for a UI flash). Recomputes board.solved when anything reverts.
export function tickVolatile(board, isSolvedFn) {
  if (!board.volatile) return [];
  board.ticks += 1;
  const reverted = [];
  for (const [k, at] of board.volFilledAt) {
    if (board.locked.has(k)) { board.volFilledAt.delete(k); continue; }
    if (board.ticks - at >= board.decayWindow) {
      const [x, y] = k.split(",").map(Number);
      if (isFill(board.marks[y][x])) { board.marks[y][x] = UNKNOWN; reverted.push({ x, y }); }
      board.volFilledAt.delete(k);
    }
  }
  if (reverted.length && typeof isSolvedFn === "function") board.solved = isSolvedFn(board.puzzle, board.marks);
  return reverted;
}

// Count of volatile cells still at risk (filled, unlocked) and total volatile — for the HUD.
export function volatileStatus(board) {
  if (!board.volatile) return null;
  let atRisk = 0;
  for (const k of board.volatile) if (!board.locked.has(k) && board.volFilledAt.has(k)) atRisk += 1;
  return { total: board.volatile.size, locked: board.locked.size, atRisk, window: board.decayWindow };
}
