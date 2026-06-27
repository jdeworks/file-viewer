// Aliased clues (corruption ≥ ALIASED_AT, mono snapshots) — the deduction verb. A seeded subset of
// rows/columns has its WHOLE clue obscured (rendered as a single "?"): the player must DEDUCE that
// line from the crossing clues rather than read it. Uniqueness is preserved trivially — aliasing only
// HIDES displayed information, it never changes the solution. Fairness is GUARANTEED constructively:
// a line is aliased only if the puzzle is STILL fully line-solvable with that line's clue suppressed,
// proven by the same line-solver the generator uses. So every aliased line is recoverable from its
// neighbours, and the snapshot stays uniquely solvable. Fully deterministic from the seed.
//
// Pure puzzle-extension: attaches puzzle.aliased = { rows:[…], cols:[…] }. The renderer/grid read it
// for display; the solve check (board.isSolved) is unaffected (it compares marks to the solution).

import { makeRng } from "./rng.js";
import { lineSolve, UNKNOWN } from "./nonogram.js";

export const ALIASED_AT = 3; // corruption level at which aliased clues appear (mono snapshots only)
export const ALIAS_GLYPH = "?"; // sentinel an aliased line's display clue collapses to

// How many lines to obscure for a corruption level: corr3→1, corr4→2, corr5→3 (capped). Two-colour
// snapshots (corruption ≥ 6) take over before this grows further, so the band is small by design.
export function aliasCount(corruption) {
  return Math.max(0, Math.min(4, Number(corruption || 0) - (ALIASED_AT - 1)));
}

// Line-solve to a fixpoint while treating hidden rows/cols as having NO clue constraint (they fill in
// only via crossing lines). Returns true iff the grid is still fully determined — i.e. the hidden
// lines are deducible from the rest. Mirrors nonogram.solve, minus the hidden lines.
export function solveWithHidden(rowClues, colClues, hiddenRows, hiddenCols) {
  const H = rowClues.length;
  const W = colClues.length;
  const grid = Array.from({ length: H }, () => new Array(W).fill(UNKNOWN));
  let changed = true;
  let passes = 0;
  while (changed) {
    changed = false;
    passes += 1;
    if (passes > 2000) break;
    for (let r = 0; r < H; r += 1) {
      if (hiddenRows.has(r)) continue;
      const res = lineSolve(grid[r], rowClues[r]);
      if (!res) return false;
      if (res.changed) { grid[r] = res.out; changed = true; }
    }
    for (let c = 0; c < W; c += 1) {
      if (hiddenCols.has(c)) continue;
      const col = grid.map((row) => row[c]);
      const res = lineSolve(col, colClues[c]);
      if (!res) return false;
      if (res.changed) { for (let r = 0; r < H; r += 1) grid[r][c] = res.out[r]; changed = true; }
    }
  }
  return grid.every((row) => row.every((v) => v !== UNKNOWN));
}

// Greedily pick a seeded set of rows/cols to alias such that the puzzle stays fully solvable with each
// one suppressed. A line is added only if solvability survives — so the final set is jointly fair.
export function aliasedLines(puzzle, corruption, seed) {
  const target = aliasCount(corruption);
  if (target <= 0) return { rows: [], cols: [] };
  const candidates = [];
  for (let r = 0; r < puzzle.height; r += 1) candidates.push({ kind: "r", i: r });
  for (let c = 0; c < puzzle.width; c += 1) candidates.push({ kind: "c", i: c });
  const order = makeRng(`s3-alias:${seed}`).shuffle(candidates);
  const hiddenRows = new Set();
  const hiddenCols = new Set();
  let count = 0;
  for (const cand of order) {
    if (count >= target) break;
    const set = cand.kind === "r" ? hiddenRows : hiddenCols;
    set.add(cand.i);
    if (solveWithHidden(puzzle.rowClues, puzzle.colClues, hiddenRows, hiddenCols)) count += 1;
    else set.delete(cand.i);
  }
  return { rows: [...hiddenRows].sort((a, b) => a - b), cols: [...hiddenCols].sort((a, b) => a - b) };
}

// Attach aliasing to a (mono) puzzle in place. No-op (no .aliased field) below ALIASED_AT or when no
// line can be fairly hidden. Returns the puzzle.
export function attachAliased(puzzle, corruption, seed) {
  if (!puzzle || puzzle.twoColor || Number(corruption || 0) < ALIASED_AT) return puzzle;
  const aliased = aliasedLines(puzzle, corruption, seed);
  if (aliased.rows.length || aliased.cols.length) puzzle.aliased = aliased;
  return puzzle;
}

// Total aliased lines on a puzzle (for the HUD).
export function aliasedTotal(puzzle) {
  const a = puzzle && puzzle.aliased;
  return a ? a.rows.length + a.cols.length : 0;
}
