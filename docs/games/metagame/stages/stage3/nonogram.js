// Nonogram (picross) engine for Stage 3 — seeded generation of UNIQUELY-SOLVABLE puzzles + the
// line-solver that proves it. Key idea (webpbn / Leiden): a puzzle a pure line-solver can finish
// from the clues alone is, by definition, uniquely solvable. So we generate a random solution,
// derive its clues, run the line-solver, and ACCEPT only if it fully determines the grid — that's
// a free uniqueness guarantee, no separate check. Fully deterministic from the seed.

import { makeRng } from "./rng.js";

export const UNKNOWN = -1;
export const EMPTY = 0;
export const FILLED = 1;

// Clue list for a line: the lengths of consecutive filled runs ([] = an empty line).
export function runLengths(line) {
  const out = [];
  let run = 0;
  for (const v of line) {
    if (v === FILLED) run += 1;
    else if (run > 0) { out.push(run); run = 0; }
  }
  if (run > 0) out.push(run);
  return out;
}

// Every way to place `clues` blocks in a line of length n (≥1 gap between blocks), as bitmasks of
// filled cells. Depends only on (n, clues), so it's cached across a whole generation. n ≤ 30 (fits
// a 32-bit mask) — our grids are ≤ ~15.
const ARR_CACHE = new Map();
function arrangements(n, clues) {
  const key = n + ":" + clues.join(",");
  const hit = ARR_CACHE.get(key);
  if (hit) return hit;
  const out = [];
  function rec(pos, ci, mask) {
    if (ci === clues.length) { out.push(mask >>> 0); return; }
    const b = clues[ci];
    let need = 0;
    for (let k = ci + 1; k < clues.length; k += 1) need += clues[k] + 1;
    for (let s = pos; s + b + need <= n; s += 1) {
      let m = mask;
      for (let i = s; i < s + b; i += 1) m |= (1 << i);
      rec(s + b + 1, ci + 1, m);
    }
  }
  if (clues.length === 0) out.push(0);
  else rec(0, 0, 0);
  ARR_CACHE.set(key, out);
  return out;
}

function consistent(mask, cells) {
  for (let i = 0; i < cells.length; i += 1) {
    const bit = (mask >> i) & 1;
    if (cells[i] === FILLED && !bit) return false;
    if (cells[i] === EMPTY && bit) return false;
  }
  return true;
}

// Force every cell a line's clue determines given current known cells. Returns {out, changed} or
// null on contradiction (no arrangement fits). A cell is filled if every valid arrangement fills it,
// empty if none do.
export function lineSolve(cells, clues) {
  const masks = arrangements(cells.length, clues);
  let and = ~0;
  let or = 0;
  let any = false;
  for (const m of masks) {
    if (!consistent(m, cells)) continue;
    and &= m; or |= m; any = true;
  }
  if (!any) return null;
  const out = cells.slice();
  let changed = false;
  for (let i = 0; i < cells.length; i += 1) {
    if (((and >> i) & 1) && out[i] !== FILLED) { out[i] = FILLED; changed = true; }
    else if (!((or >> i) & 1) && out[i] !== EMPTY) { out[i] = EMPTY; changed = true; }
  }
  return { out, changed };
}

// Run the line-solver over all rows + columns to a fixpoint. Returns {grid, solved, passes}; solved
// === fully determined === uniquely solvable. `passes` (solver loops) is our difficulty metric.
export function solve(rowClues, colClues) {
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
      const res = lineSolve(grid[r], rowClues[r]);
      if (!res) return null;
      if (res.changed) { grid[r] = res.out; changed = true; }
    }
    for (let c = 0; c < W; c += 1) {
      const col = grid.map((row) => row[c]);
      const res = lineSolve(col, colClues[c]);
      if (!res) return null;
      if (res.changed) { for (let r = 0; r < H; r += 1) grid[r][c] = res.out[r]; changed = true; }
    }
  }
  const solved = grid.every((row) => row.every((v) => v !== UNKNOWN));
  return { grid, solved, passes };
}

function cluesOf(sol, width, height) {
  const rowClues = sol.map(runLengths);
  const colClues = [];
  for (let c = 0; c < width; c += 1) colClues.push(runLengths(sol.map((row) => row[c])));
  return { rowClues, colClues };
}

// Sample line-solvable candidates at a fixed density and return the HARDEST found (most solver
// passes) once `want` have been collected — so higher corruption can demand tougher puzzles. With
// want=1 this returns the first line-solvable puzzle (the easy path). Deterministic.
function attempt(seed, width, height, density, maxTries, want) {
  const minFill = Math.max(1, Math.round(width * height * 0.18));
  let best = null;
  let found = 0;
  for (let n = 0; n < maxTries && found < want; n += 1) {
    const rng = makeRng(`${seed}:${n}`);
    const sol = Array.from({ length: height }, () => Array.from({ length: width }, () => (rng.float() < density ? FILLED : EMPTY)));
    let filled = 0;
    for (const row of sol) for (const v of row) filled += v;
    if (filled < minFill) continue; // skip near-empty boards
    const { rowClues, colClues } = cluesOf(sol, width, height);
    const res = solve(rowClues, colClues);
    if (res && res.solved) {
      found += 1;
      if (!best || res.passes > best.difficulty) best = { width, height, solution: sol, rowClues, colClues, seed: `${seed}:${n}`, difficulty: res.passes };
    }
  }
  return best;
}

// A guaranteed line-solvable fallback (horizontal stripes) — every row clue alone forces its row,
// so it solves in one pass. Only used if the random search somehow finds nothing (very rare).
function fallback(width, height) {
  const sol = Array.from({ length: height }, (_, r) => Array.from({ length: width }, () => (r % 2 === 0 ? FILLED : EMPTY)));
  const { rowClues, colClues } = cluesOf(sol, width, height);
  return { width, height, solution: sol, rowClues, colClues, seed: "fallback", difficulty: 1, isFallback: true };
}

// Deterministically make a uniquely-solvable puzzle. Walks descending densities (sparser puzzles are
// more often line-solvable, especially at larger sizes) so it reliably finds one. `hard` (corruption
// level) makes it sample more line-solvable candidates and keep the hardest — qualitatively tougher
// snapshots, not just bigger ones. Falls back to stripes only as a last resort. Same (seed,hard) →
// same puzzle.
export function makePuzzle(seed, { width = 5, height = 5, hard = 0 } = {}) {
  const want = 1 + Math.min(8, Math.max(0, hard)) * 5;
  for (const density of [0.55, 0.5, 0.45, 0.4, 0.35, 0.3]) {
    const p = attempt(`${seed}:d${Math.round(density * 100)}`, width, height, density, 300, want);
    if (p) return p;
  }
  return fallback(width, height);
}
