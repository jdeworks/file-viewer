// Library-integrity guard for the Stage 3 pictogram nonogram library. Every entry must be square,
// well-formed ('#'/'.' only), and — crucially — UNIQUELY LINE-SOLVABLE (pictogramToPuzzle() returns
// non-null, i.e. the pure line-solver fully determines it from clues alone). Also checks that
// pictogramPuzzle(seed, size) is deterministic and returns null for an unpopulated size.
import assert from "node:assert/strict";
import { PICTOGRAMS, pictogramSolution, pictogramToPuzzle, pictogramPuzzle } from "../s3pictograms.js";

// 1. The library is non-empty.
assert.ok(PICTOGRAMS.length > 0, "PICTOGRAMS is non-empty");

// 2. Every entry is square, well-formed, and uniquely line-solvable.
const seenIds = new Set();
for (const entry of PICTOGRAMS) {
  const tag = `${entry.id} (${entry.name})`;
  assert.ok(!seenIds.has(entry.id), `duplicate id: ${entry.id}`);
  seenIds.add(entry.id);
  assert.equal(entry.width, entry.height, `${tag}: width === height (square)`);
  assert.equal(entry.grid.length, entry.height, `${tag}: grid has height rows`);
  for (const row of entry.grid) {
    assert.equal(row.length, entry.width, `${tag}: row width === ${entry.width}`);
    assert.match(row, /^[#.]+$/, `${tag}: row uses only '#' and '.'`);
  }
  // Fill fraction sanity: avoid near-empty / near-full boards.
  const sol = pictogramSolution(entry);
  const fill = sol.reduce((s, r) => s + r.reduce((t, v) => t + v, 0), 0);
  const pct = fill / (entry.width * entry.height);
  assert.ok(pct > 0.2 && pct < 0.72, `${tag}: fill ${(pct * 100).toFixed(1)}% within sane range`);
  // The integrity guarantee: it IS uniquely line-solvable.
  const puzzle = pictogramToPuzzle(entry);
  assert.ok(puzzle, `${tag}: is uniquely line-solvable (pictogramToPuzzle non-null)`);
  assert.equal(puzzle.picto.id, entry.id, `${tag}: puzzle carries its picto id`);
}

// 3a. pictogramPuzzle is deterministic: same seed + size → identical solution.
const sizes = [...new Set(PICTOGRAMS.map((p) => p.width))].sort((a, b) => a - b);
for (const size of sizes) {
  const a = pictogramPuzzle("determinism-seed", size);
  const b = pictogramPuzzle("determinism-seed", size);
  assert.ok(a && b, `size ${size}: pictogramPuzzle returns a puzzle`);
  assert.equal(JSON.stringify(a.solution), JSON.stringify(b.solution), `size ${size}: deterministic`);
  assert.equal(a.width, size, `size ${size}: puzzle is ${size}×${size}`);
}

// 3b. Different seeds may pick different icons — but each pick is always uniquely-solvable.
for (const size of sizes) {
  for (const seed of ["s1", "s2", "s3", "s4", "s5"]) {
    const p = pictogramPuzzle(seed, size);
    assert.ok(p && p.width === size, `size ${size} seed ${seed}: valid puzzle`);
  }
}

// 3c. A size with no entries yields null (nothing anywhere near 20×20 in the library).
assert.equal(pictogramPuzzle("x", 20), null, "unpopulated size 20 → null");
assert.equal(pictogramPuzzle("x", 4), null, "unpopulated size 4 → null");

// 4. Coverage line.
const counts = {};
for (const p of PICTOGRAMS) counts[p.width] = (counts[p.width] || 0) + 1;
const cov = Object.keys(counts).sort((a, b) => a - b).map((s) => `${s}×${s}:${counts[s]}`).join("  ");
console.log(`Coverage — ${PICTOGRAMS.length} icons — ${cov}`);

console.log("stage 3 pictograms test passed");
