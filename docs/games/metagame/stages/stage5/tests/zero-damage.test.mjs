// zero-damage.test.mjs — Stage 5: a genuine zero-damage clear is ACHIEVABLE (playtest fix, 2026-07-11).
//
// winnable-human.test.mjs already proves every round is winnable (survivable) via the real ±1/tick
// human input path — but "winnable" there only means "finishes with integrity > 0", not "takeless".
// Rival "bump" collisions (resolveBumps, game-loop.js) are a damage source independent of the
// hazard-glyph safe-lane invariant that winnable-human.test.mjs covers — even the OMNISCIENT autoSolve
// bot (perfect play, teleports to any lane, never mistimes) used to take real damage on 6/8 rounds
// (up to 24), because the Hull upgrade's bump-damage softening curve (shop.js) never reached truly 0
// at its max level. This test locks in the fix: a maxed Hull makes a real zero-damage clear possible.
import assert from 'node:assert/strict';
import { createGameLoop } from '../game-loop.js';
import { defaultState } from '../state.js';
import { ROUNDS } from '../rounds.js';

// ── a maxed Hull (level 7) clears every body round with ZERO damage under best-possible (autoSolve) play ──
{
  for (let i = 0; i < ROUNDS.length; i += 1) {
    const state = defaultState({ seed: 'zero-damage' });
    state.shop = { hull: 7, engine: 0, signal: 0 };
    const loop = createGameLoop({ state, seed: 'zero-damage', roundIdx: i, calibrated: true });
    const before = state.run.integrity;
    loop.autoSolve();
    const damage = before - state.run.integrity;
    assert.equal(state.run.roundComplete, true, `round ${i} clears with maxed Hull`);
    assert.equal(damage, 0, `round ${i} should be a genuine zero-damage clear with maxed Hull, took ${damage}`);
  }
}

// ── a FRESH (unupgraded) run still takes real damage on at least some rounds — the fix makes a
// zero-damage clear ACHIEVABLE (earned via Hull investment), not the default outcome of a fresh run ──
{
  let totalDamage = 0;
  for (let i = 0; i < ROUNDS.length; i += 1) {
    const state = defaultState({ seed: 'zero-damage-fresh' });
    const loop = createGameLoop({ state, seed: 'zero-damage-fresh', roundIdx: i, calibrated: true });
    const before = state.run.integrity;
    loop.autoSolve();
    totalDamage += before - state.run.integrity;
  }
  assert.ok(totalDamage > 0, 'a fresh, unupgraded run still takes real damage across the body (Hull investment is a real choice, not a no-op)');
}

console.log('stage5 zero-damage tests passed');
