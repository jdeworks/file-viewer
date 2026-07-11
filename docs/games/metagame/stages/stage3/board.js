// Stage 3 play model — a player's working state over one generated nonogram (the "memory snapshot").
// Pure data: the puzzle (regenerated from the run seed, never stored), the player's marks, a cursor,
// and solved-state. Marks persist in the save as compact row strings; the puzzle does not.

import { makePuzzle, FILLED, COLOR_B, EMPTY, UNKNOWN } from "./nonogram.js";
import { makeTwoColorPuzzle, TWOCOLOR_AT } from "./s3twocolor.js";
import { ALIASED_AT, attachAliased } from "./s3aliased.js";
import { pictogramPuzzle } from "./s3pictograms.js";

const CH = { [FILLED]: "#", [COLOR_B]: "@", [EMPTY]: "x", [UNKNOWN]: "." };
const FROM_CH = { "#": FILLED, "@": COLOR_B, x: EMPTY, ".": UNKNOWN };

// The fill colour a cell carries (0 = none): both solution values (0/1/2) and player marks map
// through this, so every check below is colour-aware AND backward-compatible with mono puzzles
// (whose solutions only ever use 0/1).
export const fillColor = (v) => (v === FILLED ? FILLED : v === COLOR_B ? COLOR_B : EMPTY);

// The body: corruption peaks at 8 (the boss gate) after BODY_SOLVES snapshots, and grid size reaches
// 12 over the same span. BODY_SOLVES = 20 gives every mechanical tier a fair introduction-and-practice
// window before the next layers on (with corruptionForRun = floor(solvedCount·8/20)):
//   solves 0–4   corruption 0–1  pure tutorial nonograms (5 puzzles)
//   solves 5–7   corruption 2    volatile cells, ALONE (3 puzzles to learn the fill-then-lock verb)
//   solves 8–9   corruption 3    aliased "?" clues stack on volatile (2 puzzles)
//   solves 10–14 corruption 4–5  the decay clock engages on top (5 puzzles)
//   solves 15–19 corruption 6–7  two-colour snapshots take over (5 puzzles)
//   solve  20    corruption 8    boss gate opens
// This spreads the four mechanics across ~40–120 min instead of the old compressed ~13-solve climb.
// Size/corruption are pure functions of solvedCount; tune ONLY this constant + the two ramps to
// reshape the curve. (Tier-arrival messaging in s3tiers.js is keyed off the same thresholds.)
export const BODY_SOLVES = 20;

// Grid size grows with snapshots cleared this run, reaching its cap by solve 14 — mono puzzles only
// run through solve 14; two-colour snapshots take over at solve 15 (TWOCOLOR_AT in s3twocolor.js)
// and are separately hard-capped at 9×9 regardless of this ramp (an enumeration-cost constraint,
// not something this ramp can affect). The base cap is 20 with zero shop investment; the Overclock
// upgrade (shop.js) raises it further — up to 25×25 fully upgraded — for players who want deeper,
// richer snapshots. The ramp's own target tracks the (possibly Overclock-boosted) cap, not a fixed
// number, so a maxed Overclock is actually reachable within the mono window instead of being capped
// out by the ramp itself. Clamped to a comfortable line-solvable range.
const SIZE_RAMP_SOLVES = 14; // matches the last solve before two-colour takes over
const BASE_MAX_SIZE = 20;
export function sizeForRun(run, shop) {
  const cap = BASE_MAX_SIZE + Number((shop || {}).overclock || 0);
  const solved = Math.min(Number(run.solvedCount || 0), SIZE_RAMP_SOLVES);
  const ramp = 5 + Math.floor((solved * (cap - 5)) / SIZE_RAMP_SOLVES);
  return Math.max(5, Math.min(cap, ramp));
}

// Corruption rises as you clear snapshots — the escalation driver and the boss gate. It makes the
// generator pick qualitatively harder (more solver-passes) puzzles, gates the mechanical tiers
// (volatile cells, two-colour), and peaks at 8 after BODY_SOLVES clears.
export function corruptionForRun(run) {
  return Math.min(8, Math.floor((Number(run.solvedCount || 0) * 8) / BODY_SOLVES));
}

// Generate the current snapshot's puzzle. `opts` lets the renderer's tier-cap / learning-window logic
// shape a snapshot without changing the (uniqueness-preserving) defaults every caller/test relies on:
//   size      — override the ramped size (a small learning-window board)
//   pictogram — false to force a generated board (default: use a 1-bit theme pictogram where one of
//               that size is uniquely line-solvable; else fall back to the generated board)
//   aliased   — false to suppress the aliased-clue overlay (default: attach it at corruption ≥ ALIASED_AT)
export function puzzleForRun(run, shop, opts = {}) {
  const size = opts.size || sizeForRun(run, shop);
  const corruption = corruptionForRun(run);
  const seed = `${run.seed}:${run.index}`;
  // Two-colour snapshots take over once corruption hits TWOCOLOR_AT (the second-colour tier). These are
  // 2-bit, so pictograms (1-bit) don't apply.
  if (corruption >= TWOCOLOR_AT) return makeTwoColorPuzzle(`${seed}:tc`, { width: size, height: size });
  // Mono: prefer a uniquely-solvable pictogram (chip/key/bell…) so a solved snapshot reveals a PICTURE
  // (the genre's core payoff); fall back to a generated board when no icon of this size qualifies.
  let puzzle = opts.pictogram === false ? null : pictogramPuzzle(seed, size);
  if (!puzzle) puzzle = makePuzzle(seed, { width: size, height: size, hard: corruption });
  // Aliased clues (corruption ≥ ALIASED_AT): obscure a fair, deducible subset of lines as "?".
  if (opts.aliased !== false && corruption >= ALIASED_AT) attachAliased(puzzle, corruption, seed);
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
