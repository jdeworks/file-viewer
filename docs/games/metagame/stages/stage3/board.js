// Stage 3 play model — a player's working state over one generated nonogram (the "memory snapshot").
// Pure data: the puzzle (regenerated from the run seed, never stored), the player's marks, a cursor,
// and solved-state. Marks persist in the save as compact row strings; the puzzle does not.

import { makePuzzle, FILLED, COLOR_B, EMPTY, UNKNOWN } from "./nonogram.js";
import { makeTwoColorPuzzle, TWOCOLOR_AT } from "./s3twocolor.js";
import { ALIASED_AT, attachAliased } from "./s3aliased.js";

const CH = { [FILLED]: "#", [COLOR_B]: "@", [EMPTY]: "x", [UNKNOWN]: "." };
const FROM_CH = { "#": FILLED, "@": COLOR_B, x: EMPTY, ".": UNKNOWN };

// The fill colour a cell carries (0 = none): both solution values (0/1/2) and player marks map
// through this, so every check below is colour-aware AND backward-compatible with mono puzzles
// (whose solutions only ever use 0/1).
export const fillColor = (v) => (v === FILLED ? FILLED : v === COLOR_B ? COLOR_B : EMPTY);

// The TIGHTENED body: corruption peaks at 8 (the boss gate) after BODY_SOLVES snapshots, and grid
// size reaches 12 over the same span — so the pre-boss run is a focused ~13-solve climb (≈40-55 min
// with the new mechanical tiers) rather than the old 90-200 min flat farm. Size/corruption are pure
// functions of solvedCount; tune ONLY this constant + the two ramps to reshape the curve.
export const BODY_SOLVES = 13;

// Grid size grows with snapshots cleared this run, reaching 12 by the end of the body; the Overclock
// upgrade lifts the cap (deeper, richer snapshots). Clamped to a comfortable line-solvable range.
export function sizeForRun(run, shop) {
  const cap = 12 + Number((shop || {}).overclock || 0);
  const ramp = 5 + Math.floor((Number(run.solvedCount || 0) * 7) / BODY_SOLVES);
  return Math.max(5, Math.min(cap, ramp));
}

// Corruption rises as you clear snapshots — the escalation driver and the boss gate. It makes the
// generator pick qualitatively harder (more solver-passes) puzzles, gates the mechanical tiers
// (volatile cells, two-colour), and peaks at 8 after BODY_SOLVES clears.
export function corruptionForRun(run) {
  return Math.min(8, Math.floor((Number(run.solvedCount || 0) * 8) / BODY_SOLVES));
}

export function puzzleForRun(run, shop) {
  const size = sizeForRun(run, shop);
  const corruption = corruptionForRun(run);
  // Two-colour snapshots take over once corruption hits TWOCOLOR_AT (the second-colour tier).
  if (corruption >= TWOCOLOR_AT) return makeTwoColorPuzzle(`${run.seed}:${run.index}:tc`, { width: size, height: size });
  const puzzle = makePuzzle(`${run.seed}:${run.index}`, { width: size, height: size, hard: corruption });
  // Aliased clues (corruption ≥ ALIASED_AT): obscure a fair, deducible subset of lines as "?".
  if (corruption >= ALIASED_AT) attachAliased(puzzle, corruption, `${run.seed}:${run.index}`);
  return puzzle;
}

// Prefetch Cache: pre-fill the first `count` solution cells (deterministic order) so a snapshot
// starts partly solved. Applied only to a fresh board (no saved marks). Returns the board.
export function applyPrefetch(board, count) {
  if (!count) return board;
  let done = 0;
  for (let y = 0; y < board.puzzle.height && done < count; y += 1) {
    for (let x = 0; x < board.puzzle.width && done < count; x += 1) {
      const sol = board.puzzle.solution[y][x];
      if (sol !== EMPTY && board.marks[y][x] !== sol) { board.marks[y][x] = sol; done += 1; }
    }
  }
  board.solved = isSolved(board.puzzle, board.marks);
  return board;
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

// Solved === every cell's fill COLOUR matches the solution's (empty-marks are just aids). Colour-aware
// so it covers mono (colour A only) and two-colour snapshots alike.
export function isSolved(puzzle, marks) {
  for (let y = 0; y < puzzle.height; y += 1) {
    for (let x = 0; x < puzzle.width; x += 1) {
      if (fillColor(puzzle.solution[y][x]) !== fillColor(marks[y][x])) return false;
    }
  }
  return true;
}

// Toggle a cell. `mark` true = the empty-mark (✕ aid), false = a fill of `color` (default colour A).
// Toggling the same value clears the cell. Recomputes solved. Returns whether a WRONG fill (a fill
// whose colour ≠ the solution's colour, including a fill on an empty cell) was just placed.
export function setCell(board, x, y, mark, color = FILLED) {
  if (board.solved) return false;
  const cur = board.marks[y][x];
  const target = mark ? EMPTY : color;
  board.marks[y][x] = cur === target ? UNKNOWN : target;
  board.solved = isSolved(board.puzzle, board.marks);
  const placed = fillColor(board.marks[y][x]);
  const wrong = !mark && placed !== EMPTY && placed !== fillColor(board.puzzle.solution[y][x]);
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
    for (let x = 0; x < puzzle.width; x += 1) if (fillColor(puzzle.solution[i][x]) !== fillColor(marks[i][x])) return false;
    return true;
  }
  for (let y = 0; y < puzzle.height; y += 1) if (fillColor(puzzle.solution[y][i]) !== fillColor(marks[y][i])) return false;
  return true;
}

// First solution cell not yet correctly coloured (Oracle hint reveals it, with its colour). Null when
// nothing's left to reveal.
export function firstHintCell(board) {
  for (let y = 0; y < board.puzzle.height; y += 1) {
    for (let x = 0; x < board.puzzle.width; x += 1) {
      const sol = board.puzzle.solution[y][x];
      if (sol !== EMPTY && fillColor(board.marks[y][x]) !== sol) return { x, y, color: sol };
    }
  }
  return null;
}

// Cells the player filled with the WRONG colour (incl. a fill where the solution is empty). Parity flags these.
export function wrongCells(board) {
  const out = [];
  for (let y = 0; y < board.puzzle.height; y += 1) {
    for (let x = 0; x < board.puzzle.width; x += 1) {
      const placed = fillColor(board.marks[y][x]);
      if (placed !== EMPTY && placed !== fillColor(board.puzzle.solution[y][x])) out.push({ x, y });
    }
  }
  return out;
}

// Count of correctly-coloured vs total filled-in-solution — drives a progress readout.
export function progress(puzzle, marks) {
  let need = 0;
  let have = 0;
  for (let y = 0; y < puzzle.height; y += 1) {
    for (let x = 0; x < puzzle.width; x += 1) {
      if (puzzle.solution[y][x] !== EMPTY) { need += 1; if (fillColor(marks[y][x]) === puzzle.solution[y][x]) have += 1; }
    }
  }
  return { have, need };
}
