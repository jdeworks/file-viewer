// Two-colour nonograms (corruption ≥ TWOCOLOR_AT) — a second fill colour with its own interleaved
// clues. Cells are EMPTY(0) / colour A (FILLED=1) / colour B (COLOR_B=2). Each line's clue is an
// ORDERED list of { len, color } blocks; same-colour neighbours need a ≥1 gap, different-colour
// neighbours may touch (the standard colored-nonogram rule). Uniqueness is proven exactly as the
// mono engine does: generate a solution, derive its clues, run the colour-aware line-solver, and
// ACCEPT only if it fully determines the grid. Fully deterministic from the seed.
//
// Enumeration grows with width, so two-colour snapshots are capped smaller (see makeTwoColorPuzzle).

import { makeRng } from "./rng.js";
import { UNKNOWN, EMPTY, FILLED, COLOR_B } from "./nonogram.js";

export const TWOCOLOR_AT = 6; // corruption level at which the second colour appears
export const TWOCOLOR_MAX = 9; // cap two-colour grid size (enumeration cost)

// Colour-run clue list for a line: ordered { len, color } blocks (splits on EMPTY and colour change).
export function colorRuns(line) {
  const out = [];
  let len = 0;
  let col = 0;
  for (const v of line) {
    if (v === EMPTY) { if (len) out.push({ len, color: col }); len = 0; col = 0; }
    else if (v === col) { len += 1; }
    else { if (len) out.push({ len, color: col }); col = v; len = 1; }
  }
  if (len) out.push({ len, color: col });
  return out;
}

// Minimum cells needed to lay clues[ci..end] (lens + a 1-gap between adjacent same-colour blocks).
function minSpan(clues, ci) {
  let need = clues[ci].len;
  for (let k = ci + 1; k < clues.length; k += 1) {
    need += (clues[k].color === clues[k - 1].color ? 1 : 0) + clues[k].len;
  }
  return need;
}

// Every placement of `clues` in a length-n line, as colour arrays (Int8Array of 0/1/2). Cached on
// (n, clues) since it depends only on those. Small n only (two-colour grids ≤ TWOCOLOR_MAX).
const ARR_CACHE = new Map();
function colorArrangements(n, clues) {
  const key = n + ":" + clues.map((c) => c.len + "." + c.color).join(",");
  const hit = ARR_CACHE.get(key);
  if (hit) return hit;
  const out = [];
  function rec(pos, ci, acc) {
    if (ci === clues.length) { out.push(acc.slice()); return; }
    const { len, color } = clues[ci];
    const need = minSpan(clues, ci);
    for (let s = pos; s + need <= n; s += 1) {
      const next = acc.slice();
      for (let i = s; i < s + len; i += 1) next[i] = color;
      const gap = ci + 1 < clues.length && clues[ci + 1].color === color ? 1 : 0;
      rec(s + len + gap, ci + 1, next);
    }
  }
  rec(0, 0, new Int8Array(n));
  ARR_CACHE.set(key, out);
  return out;
}

// Force every cell a colour clue determines. Returns { out, changed } or null on contradiction.
export function colorLineSolve(cells, clues) {
  const n = cells.length;
  const arrs = colorArrangements(n, clues);
  const poss = Array.from({ length: n }, () => new Set());
  let any = false;
  for (const arr of arrs) {
    let okc = true;
    for (let i = 0; i < n; i += 1) { if (cells[i] !== UNKNOWN && cells[i] !== arr[i]) { okc = false; break; } }
    if (!okc) continue;
    any = true;
    for (let i = 0; i < n; i += 1) poss[i].add(arr[i]);
  }
  if (!any) return null;
  const out = cells.slice();
  let changed = false;
  for (let i = 0; i < n; i += 1) {
    if (poss[i].size === 1) { const v = [...poss[i]][0]; if (out[i] !== v) { out[i] = v; changed = true; } }
  }
  return { out, changed };
}

// Colour-aware line-solver over rows + columns to a fixpoint. solved === uniquely determined.
export function colorSolve(rowClues, colClues) {
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
      const res = colorLineSolve(grid[r], rowClues[r]);
      if (!res) return null;
      if (res.changed) { grid[r] = res.out; changed = true; }
    }
    for (let c = 0; c < W; c += 1) {
      const col = grid.map((row) => row[c]);
      const res = colorLineSolve(col, colClues[c]);
      if (!res) return null;
      if (res.changed) { for (let r = 0; r < H; r += 1) grid[r][c] = res.out[r]; changed = true; }
    }
  }
  const solved = grid.every((row) => row.every((v) => v !== UNKNOWN));
  return { grid, solved, passes };
}

function cluesOf(sol, width) {
  const rowClues = sol.map(colorRuns);
  const colClues = [];
  for (let c = 0; c < width; c += 1) colClues.push(colorRuns(sol.map((row) => row[c])));
  return { rowClues, colClues };
}

// Guaranteed line-solvable fallback: alternating full-width colour stripes (each row clue forces its
// whole row in one pass). Only used if the random search finds nothing.
function fallback(width, height) {
  const sol = Array.from({ length: height }, (_, r) => new Array(width).fill(r % 2 === 0 ? FILLED : COLOR_B));
  const { rowClues, colClues } = cluesOf(sol, width);
  return { width, height, solution: sol, rowClues, colClues, seed: "tc-fallback", difficulty: 1, twoColor: true, isFallback: true };
}

function attempt(seed, width, height, density, maxTries) {
  for (let n = 0; n < maxTries; n += 1) {
    const rng = makeRng(`${seed}:${n}`);
    const sol = Array.from({ length: height }, () => Array.from({ length: width }, () => {
      if (rng.float() >= density) return EMPTY;
      return rng.float() < 0.5 ? FILLED : COLOR_B;
    }));
    let filled = 0;
    let hasA = false;
    let hasB = false;
    for (const row of sol) for (const v of row) { if (v) filled += 1; if (v === FILLED) hasA = true; if (v === COLOR_B) hasB = true; }
    if (!hasA || !hasB || filled < Math.round(width * height * 0.2)) continue; // need both colours, not too sparse
    const { rowClues, colClues } = cluesOf(sol, width);
    const res = colorSolve(rowClues, colClues);
    if (res && res.solved) return { width, height, solution: sol, rowClues, colClues, seed: `${seed}:${n}`, difficulty: res.passes, twoColor: true };
  }
  return null;
}

// Deterministically make a uniquely-solvable TWO-COLOUR puzzle. Caps size for enumeration cost and
// walks descending densities (sparser → more often line-solvable). Same seed → same puzzle.
export function makeTwoColorPuzzle(seed, { width = 7, height = 7 } = {}) {
  const w = Math.min(TWOCOLOR_MAX, width);
  const h = Math.min(TWOCOLOR_MAX, height);
  for (const density of [0.6, 0.55, 0.5, 0.45, 0.4]) {
    const p = attempt(`${seed}:d${Math.round(density * 100)}`, w, h, density, 240);
    if (p) return p;
  }
  return fallback(w, h);
}
