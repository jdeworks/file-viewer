// winnable.test.mjs — Stage 4 length rebalance (round 4): the campaign was cut 150→90 waves and the
// per-wave difficulty was COMPENSATED (steeper count ramp + wavegen.waveHpScale). This proves the
// rebalanced difficulty is still BEATABLE: a strong-but-legal defence clears the campaign's HARDEST
// waves (a deep non-sub-boss wave AND the final-bastion guardian wave) on the deepest map without the
// core falling. Pure engine sim — deterministic, no DOM, no RNG. (If a tuning change made a late wave
// unwinnable even with an overwhelming board, this test goes red.)
import assert from 'node:assert/strict';
import { buildPath, mapPathDepth } from '../lsystem.js';
import { startWave, tick, waveComplete } from '../engine.js';
import { defaultState } from '../state.js';
import { mapByIndex, mapPathSeed } from '../maps.js';
import { mapWaveComposition } from '../wavegen.js';

// Build an overwhelming, fully-upgraded defence: a null cannon on (near) every path tile (ignores armor
// AND shields → answers every archetype) plus global mortars for any leak, with a maxed-Armory damage
// multiplier. This models late-campaign "good play", not a minimal clear — the assertion is winnability.
function fortify(state, tiles) {
  let id = 1;
  tiles.forEach((t, i) => {
    if (i % 2 === 0) state.towers.push({ id: `t${id++}`, type: 'null_spike', x: t.x, y: t.y, level: 3, targetMode: 'first', lastFiredMs: -Infinity });
  });
  for (let k = 0; k < 10; k++) state.towers.push({ id: `m${id++}`, type: 'glyph_mortar', x: 2 + k, y: 38, level: 3, targetMode: 'strongest', lastFiredMs: -Infinity });
  // Armory ceiling: overclocked-emitters maxed = 5 levels × +8% = ×1.4 (armory.js). The old value
  // here (×3) was an ILLEGAL multiplier no real campaign could ever reach — it silently proved
  // winnability with more than double the damage a maxed player actually has.
  state.damageMult = 1.4;
}

// Play one wave to completion (or failure) under a 12-minute sim budget. Returns the end state.
function playWave(state, w, tiles) {
  startWave(state, w, tiles);
  let guard = 0;
  while (state.waveActive && guard++ < 12000) { tick(state, 200, tiles); if (waveComplete(state)) break; }
  return state;
}

// ── the deepest map's HARDEST trash wave is clearable without losing the core ───────────────────────
{
  const state = defaultState({ seed: 'win' });
  state.campaign.mapIndex = 4;            // Infinite Approach (depth 3, 35 waves)
  const map = mapByIndex(4);
  const w = 33;                            // a heavy late non-sub-boss wave (hpScale ≈ 2.3)
  assert.equal(mapWaveComposition(4, w).subBoss, null, 'wave 33 is a trash wave, not a guardian');
  const tiles = buildPath(mapPathSeed(state.recursion.pointSetId, 4), mapPathDepth(map.depth, w)).tiles;
  state.cycles = 0; state.integrity = 140; state.maxIntegrity = 140;
  fortify(state, tiles);
  playWave(state, w, tiles);
  assert.equal(state.waveActive, false, 'the heavy late wave fully clears');
  assert.equal(state.enemies.length, 0, 'no enemy left standing');
  assert.ok(state.integrity > 0, `core survives the rebalanced wave (integrity ${state.integrity})`);
}

// ── the FINAL guardian wave (final-bastion) is beatable — the campaign can actually be won ──────────
{
  const state = defaultState({ seed: 'win2' });
  state.campaign.mapIndex = 4;
  const map = mapByIndex(4);
  const w = map.waveCount;                 // wave 35 — final-bastion
  assert.equal(mapWaveComposition(4, w).subBoss, 'final-bastion', 'final wave carries the capstone guardian');
  const tiles = buildPath(mapPathSeed(state.recursion.pointSetId, 4), mapPathDepth(map.depth, w)).tiles;
  state.cycles = 0; state.integrity = 140; state.maxIntegrity = 140;
  fortify(state, tiles);
  playWave(state, w, tiles);
  assert.equal(state.waveActive, false, 'the final wave clears — the campaign is winnable');
  assert.ok(state.integrity > 0, `core survives the final guardian (integrity ${state.integrity})`);
}

console.log('stage4 winnable tests passed');
