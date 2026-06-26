// Stage 3 play model — a player's working state over one generated nonogram (the "memory snapshot").
// Pure data: the puzzle (regenerated from the run seed, never stored), the player's marks, a cursor,
// and solved-state. Marks persist in the save as compact row strings; the puzzle does not.

import { makePuzzle, FILLED, EMPTY, UNKNOWN } from "./nonogram.js";

const CH = { [FILLED]: "#", [EMPTY]: "x", [UNKNOWN]: "." };
const FROM_CH = { "#": FILLED, x: EMPTY, ".": UNKNOWN };

// Grid size grows with how many snapshots you've cleared this run (the early corruption ramp; the
// full ladder is a later feature). Clamped to a comfortable line-solvable range.
export function sizeForRun(run) {
  return Math.max(5, Math.min(12, 5 + Math.floor(Number(run.solvedCount || 0) / 2)));
}

export function puzzleForRun(run) {
  const size = sizeForRun(run);
  return makePuzzle(`${run.seed}:${run.index}`, { width: size, height: size });
}

export function encodeMarks(marks) {
  return marks.map((row) => row.map((v) => CH[v] || ".").join(""));
}
function decodeMarks(rows, width, height) {
  if (!Array.isArray(rows) || rows.length !== height) return null;
  const out = [];
  for (let y = 0; y < height; y += 1) {
    const s = String(rows[y] || "");
    if (s.length !== width) return null;
    out.push([...s].map((c) => (FROM_CH[c] === undefined ? UNKNOWN : FROM_CH[c])));
  }
  return out;
}

export function createBoard(puzzle, savedMarks) {
  const marks = decodeMarks(savedMarks, puzzle.width, puzzle.height)
    || Array.from({ length: puzzle.height }, () => new Array(puzzle.width).fill(UNKNOWN));
  return { puzzle, marks, cursor: { x: 0, y: 0 }, solved: isSolved(puzzle, marks) };
}

// Solved === the set of FILLED marks equals the solution's filled set (empty-marks are just aids).
export function isSolved(puzzle, marks) {
  for (let y = 0; y < puzzle.height; y += 1) {
    for (let x = 0; x < puzzle.width; x += 1) {
      if ((puzzle.solution[y][x] === FILLED) !== (marks[y][x] === FILLED)) return false;
    }
  }
  return true;
}

// Toggle a cell. `mark` true = the empty-mark (✕ aid), false = a fill (#). Toggling the same value
// clears the cell. Recomputes solved. Returns whether a WRONG fill was just placed (for integrity).
export function setCell(board, x, y, mark) {
  if (board.solved) return false;
  const cur = board.marks[y][x];
  const target = mark ? EMPTY : FILLED;
  board.marks[y][x] = cur === target ? UNKNOWN : target;
  board.solved = isSolved(board.puzzle, board.marks);
  const wrong = !mark && board.marks[y][x] === FILLED && board.puzzle.solution[y][x] !== FILLED;
  return wrong;
}

export function moveCursor(board, dx, dy) {
  board.cursor.x = Math.max(0, Math.min(board.puzzle.width - 1, board.cursor.x + dx));
  board.cursor.y = Math.max(0, Math.min(board.puzzle.height - 1, board.cursor.y + dy));
}

// A row/column clue is "done" when the player's FILLED marks in that line exactly match the
// solution's — i.e. that line is correct. Used to cross out satisfied clues.
export function lineDone(puzzle, marks, kind, i) {
  if (kind === "row") {
    for (let x = 0; x < puzzle.width; x += 1) if ((puzzle.solution[i][x] === FILLED) !== (marks[i][x] === FILLED)) return false;
    return true;
  }
  for (let y = 0; y < puzzle.height; y += 1) if ((puzzle.solution[y][i] === FILLED) !== (marks[y][i] === FILLED)) return false;
  return true;
}

// Count of correctly-filled vs total filled-in-solution — drives a progress readout.
export function progress(puzzle, marks) {
  let need = 0;
  let have = 0;
  for (let y = 0; y < puzzle.height; y += 1) {
    for (let x = 0; x < puzzle.width; x += 1) {
      if (puzzle.solution[y][x] === FILLED) { need += 1; if (marks[y][x] === FILLED) have += 1; }
    }
  }
  return { have, need };
}
