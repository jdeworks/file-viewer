import assert from 'node:assert/strict';
import { makePuzzle, solve } from '../nonogram.js';
import { ALIASED_AT, aliasCount, aliasedLines, attachAliased, solveWithHidden, aliasedTotal } from '../s3aliased.js';

// aliasCount ramps with corruption then caps; nothing below ALIASED_AT.
assert.equal(aliasCount(0), 0);
assert.equal(aliasCount(ALIASED_AT - 1), 0);
assert.equal(aliasCount(3), 1);
assert.equal(aliasCount(4), 2);
assert.equal(aliasCount(5), 3);
assert.equal(aliasCount(99), 4);

// Across a spread of seeds: every aliased set keeps the puzzle FULLY solvable with those lines'
// clues suppressed (fairness + uniqueness preserved), and the result is deterministic.
let sawAliased = false;
for (let i = 0; i < 12; i += 1) {
  const seed = `alias-test:${i}`;
  const puzzle = makePuzzle(seed, { width: 8, height: 8, hard: 4 });
  // Baseline: the un-aliased puzzle is itself uniquely solvable.
  const base = solve(puzzle.rowClues, puzzle.colClues);
  assert(base && base.solved, 'base puzzle is line-solvable');

  const a1 = aliasedLines(puzzle, 5, seed);
  const a2 = aliasedLines(puzzle, 5, seed);
  assert.deepEqual(a1, a2, 'aliasedLines is deterministic for a given seed');

  const hiddenRows = new Set(a1.rows);
  const hiddenCols = new Set(a1.cols);
  // Suppressing exactly the aliased lines must STILL fully solve — every aliased clue is deducible.
  assert.equal(
    solveWithHidden(puzzle.rowClues, puzzle.colClues, hiddenRows, hiddenCols),
    true,
    'puzzle stays fully solvable with aliased lines suppressed (deducible from crossings)'
  );
  if (a1.rows.length || a1.cols.length) sawAliased = true;
}
assert(sawAliased, 'at least one seed produces aliased lines at corruption 5');

// attachAliased mutates a mono puzzle in place; is a no-op below ALIASED_AT and for two-colour.
{
  const puzzle = makePuzzle('attach:1', { width: 8, height: 8, hard: 4 });
  attachAliased(puzzle, 4, 'attach:1');
  assert.equal(aliasedTotal(puzzle), (puzzle.aliased ? puzzle.aliased.rows.length + puzzle.aliased.cols.length : 0));

  const low = makePuzzle('attach:2', { width: 8, height: 8, hard: 1 });
  attachAliased(low, ALIASED_AT - 1, 'attach:2');
  assert.equal(low.aliased, undefined, 'no aliasing below ALIASED_AT');

  const tc = { twoColor: true, width: 6, height: 6, rowClues: [], colClues: [] };
  attachAliased(tc, 6, 'attach:3');
  assert.equal(tc.aliased, undefined, 'two-colour puzzles are not aliased (yet)');
}

console.log('\nSTAGE 3 ALIASED PASSED');
