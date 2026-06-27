// ascension.test.mjs — Stage 5: the opt-in difficulty ladder (cumulative rungs) folds into the run.
import assert from 'node:assert/strict';
import { createAscension } from '../../../shared/ascension.js';
import { ASCENSION_MODS, BASE_ASCENSION_CONFIG } from '../ascension-mods.js';
import { createGameLoop } from '../game-loop.js';
import { defaultState } from '../state.js';

const save = { stageState: { 5: {} }, global: {} };
const asc = createAscension({ save, stageId: 5, modifiers: ASCENSION_MODS });

// ── ladder shape ────────────────────────────────────────────────────────────────────────────────
assert.equal(asc.maxLevel, 4, '4 ascension rungs');

// ── level 0 = base; rungs are cumulative; base config never mutated ─────────────────────────────────
{
  assert.deepEqual(asc.applyModifiers(BASE_ASCENSION_CONFIG, 0), BASE_ASCENSION_CONFIG, 'A0 = base');
  const c2 = asc.applyModifiers(BASE_ASCENSION_CONFIG, 2);
  assert.ok(c2.rivalSpeedMult > 1, 'A2 still includes A1 faster field');
  assert.ok(c2.integrityMult < 1, 'A2 adds the hairline hull');
  const c4 = asc.applyModifiers(BASE_ASCENSION_CONFIG, 4);
  assert.ok(c4.densityBonus > 0 && c4.noiseDamageBonus === 1, 'A4 includes denser noise + sharp static');
  assert.equal(BASE_ASCENSION_CONFIG.rivalSpeedMult, 1, 'base config untouched (pure fold)');
}

// ── unlock gate: base must be cleared before A1 selectable ──────────────────────────────────────────
{
  const s2 = { stageState: { 5: {} }, global: {} };
  const a2 = createAscension({ save: s2, stageId: 5, modifiers: ASCENSION_MODS });
  a2.recordClear(0);                 // clear the base stage
  assert.ok(a2.maxUnlocked() >= 1, 'clearing base unlocks A1');
}

// ── the mods harden a real run: faster field finishes sooner; hull cap drops ─────────────────────────
{
  const mods = asc.applyModifiers(BASE_ASCENSION_CONFIG, 4);
  const base = defaultState();
  const hard = defaultState();
  const baseLoop = createGameLoop({ state: base, seed: 'asc', roundIdx: 2, calibrated: false });
  const hardLoop = createGameLoop({ state: hard, seed: 'asc', roundIdx: 2, calibrated: false, mods });
  // faster field: at least one rival crosses the line earlier under ascension
  const baseFirst = Math.min(...baseLoop.rivals.map((r) => r.finishTick));
  const hardFirst = Math.min(...hardLoop.rivals.map((r) => r.finishTick));
  assert.ok(hardFirst < baseFirst, 'ascension field is faster (lower finish tick)');
  // tighter hull: the ascension run starts with a lower integrity cap
  hardLoop.autoSolve();
  baseLoop.autoSolve();
  assert.ok(hard.run.maxIntegrity < base.run.maxIntegrity, 'ascension lowers the hull cap');
  // …yet an optimal run still clears (escape invariant holds at any density)
  assert.equal(hardLoop.outcome, 'clear', 'a hardened round is still solvable with optimal play');
}

console.log('stage5 ascension tests passed');
