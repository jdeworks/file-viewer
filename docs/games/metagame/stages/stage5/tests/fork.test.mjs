// fork.test.mjs — Stage 5: the sub-channel routing layer (deterministic spans, HI/LO variants).
import assert from 'node:assert/strict';
import { applyForks, resolveRow, channelGateCount, hasEscape } from '../fork.js';
import { buildObstacleTable, isBlock } from '../track.js';
import { makeRng } from '../rng.js';
import { ROUNDS } from '../rounds.js';

const forkRound = ROUNDS.find((r) => r.archetype === 'fork');

function buildForked(seed) {
  const table = buildObstacleTable(seed, forkRound);
  const entries = applyForks(table, makeRng(`${seed}:fork:${forkRound.id}`), forkRound);
  return { table, entries };
}

// ── determinism: same seed ⇒ identical fork carving ─────────────────────────────────────────────────
{
  const a = buildForked('fseed');
  const b = buildForked('fseed');
  assert.deepEqual(a.entries, b.entries, 'same seed → same fork entries');
  assert.deepEqual(a.table, b.table, 'same seed → identical forked table');
  assert.ok(a.entries.length >= 2, 'the fork round has multiple splits');
}

// ── every fork span carries BOTH sub-channel variants, each with an escape ──────────────────────────
{
  const { table } = buildForked('escape');
  let forkRows = 0;
  for (const row of table) {
    if (!row.fork) continue;
    forkRows += 1;
    assert.ok(Array.isArray(row.forkHi) && row.forkHi.length === 3, 'forkHi present');
    assert.ok(Array.isArray(row.forkLo) && row.forkLo.length === 3, 'forkLo present');
    assert.ok(row.forkHi.filter(isBlock).length < 3, 'HI channel always has an escape');
    assert.ok(row.forkLo.filter(isBlock).length < 3, 'LO channel always has an escape');
    assert.ok(hasEscape(row, 'hi') && hasEscape(row, 'lo'), 'both channels escapable');
  }
  assert.ok(forkRows > 0, 'fork rows were carved');
}

// ── resolveRow picks the committed channel's lanes; non-fork rows pass through unchanged ─────────────
{
  const { table, entries } = buildForked('resolve');
  const entry = entries[0];
  const row = table[entry];
  assert.deepEqual(resolveRow(row, 'hi').lanes, row.forkHi, 'hi resolves to forkHi');
  assert.deepEqual(resolveRow(row, 'lo').lanes, row.forkLo, 'lo resolves to forkLo');
  const plain = table.find((r) => !r.fork);
  assert.equal(resolveRow(plain, 'hi'), plain, 'non-fork row returned as-is');
}

// ── HI is the risk/reward route: across the run it offers at least as many gates as LO ──────────────
{
  const { table, entries } = buildForked('gates');
  let hi = 0;
  let lo = 0;
  for (const e of entries) {
    hi += channelGateCount(table, e, forkRound.forkSpan, 'hi');
    lo += channelGateCount(table, e, forkRound.forkSpan, 'lo');
  }
  assert.ok(hi >= lo, 'HI offers at least as many boost gates as LO');
  assert.ok(hi > 0, 'HI offers boost gates');
}

console.log('stage5 fork tests passed');
