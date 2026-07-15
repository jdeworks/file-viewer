import assert from 'node:assert/strict';
import {
  defaultState,
  normalizeState,
  stageMeta,
} from '../../../docs/games/metagame/stages/stage1/index.js';

{
  const state = defaultState({ now: 123 });
  assert.deepEqual(state.bits, { m: 0, e: 0 });
  assert.deepEqual(state.totalBits, { m: 0, e: 0 });
  assert.equal(state.runStartedAt, 123);
  assert.equal(state.tabsUnlocked, false);
  assert.equal('version' in state, false);
  assert.equal('stage' in state, false);
  assert.equal('defeated' in state, false);
  assert.equal('achievements' in state, false);
}

{
  const state = normalizeState({
    version: 2,
    stage: 1,
    defeated: [1],
    achievements: ['legacy'],
    bits: 25,
    totalBits: 200,
    owned: { 's1-cursor': 2, 's1-mult': 1 },
  }, { now: 456 });
  assert.deepEqual(state.bits, { m: 25, e: 0 });
  assert.deepEqual(state.totalBits, { m: 200, e: 0 });
  assert.equal(state.owned['s1-mult'], 3);
  assert.equal('s1-cursor' in state.owned, false);
  assert.equal('version' in state, false);
  assert.equal('stage' in state, false);
  assert.equal('defeated' in state, false);
  assert.equal('achievements' in state, false);
}

assert.equal('requiredAction' in stageMeta, false);
assert.equal('requiredFile' in stageMeta, false);
assert.equal(stageMeta.bossName, 'The Defragmenter');

// ── Prestige / post-prestige mechanics (pure, deterministic) ─────────────────────────────────────
const { unlockedMechanics, doPrestige, coreGain } = await import('../../../docs/games/metagame/stages/stage1/s1prestige.js');
const { coreEffects, buyCore } = await import('../../../docs/games/metagame/stages/stage1/s1cores.js');
const { tickFlux, fluxMult } = await import('../../../docs/games/metagame/stages/stage1/s1flux.js');
const { tickEntropy } = await import('../../../docs/games/metagame/stages/stage1/s1entropy.js');
const { resonanceMult } = await import('../../../docs/games/metagame/stages/stage1/s1resonance.js');
const { simulateFight } = await import('../../../docs/games/metagame/stages/stage1/boss-sim.js');

{
  // Prestige depth gates the five mechanics one at a time.
  const s = defaultState({ now: 1 });
  assert.equal(unlockedMechanics(s).length, 0, 'depth 0: no mechanics');
  for (let i = 0; i < 5; i++) doPrestige(s);
  const ids = unlockedMechanics(s).map((m) => m.id);
  assert.deepEqual(ids, ['pipeline', 'flux', 'entropy', 'echoes', 'resonance'], 'depth 5 unlocks all five in order');
  assert.equal(s.prestigeCount, 5, 'prestigeCount tracks depth');
  assert.ok(s.cores >= 5, 'prestige grants Cores');
}
{
  // coreGain scales with totalBits past the unlock point; Cores upgrades aggregate deterministically.
  assert.equal(coreGain({ m: 1, e: 18 }), 1, 'coreGain = 1 at the unlock point');
  assert.equal(coreGain({ m: 1, e: 21 }), 4, 'coreGain = 1 + log10 ratio');
  const s = defaultState({ now: 1 }); s.cores = 99;
  buyCore(s, 'core-yield'); buyCore(s, 'core-yield');
  assert.ok(Math.abs(coreEffects(s).incomeMult - 1.2) < 1e-9, 'two Overclock levels → ×1.2 income');
}
{
  // Flux: meter charges deterministically and fires a ×3 boost at 100%.
  const s = defaultState({ now: 1 });
  for (let i = 0; i < 200; i++) tickFlux(s);
  assert.ok(s.flux.boostTicks > 0 && fluxMult(s) === 3, 'flux fires ×3 at 100%');
}
{
  // Entropy: unprotected tier decays on the minute boundary, floor 1.
  const s = defaultState({ now: 1 }); s.owned = { 's1-box': 3 }; s.ticks = 600;
  const cfg = { tiers: [{ id: 's1-box', type: 'timed' }], managers: [] };
  assert.equal(tickEntropy(s, cfg), true, 'decay fires at the minute boundary');
  assert.equal(s.owned['s1-box'], 2, 'tier loses one unit');
}
{
  // Resonance: the box:booster sweet spot multiplies income.
  const s = defaultState({ now: 1 }); s.owned = { 's1-box': 3, 's1-boost': 1 };
  assert.ok(Math.abs(resonanceMult(s) - 1.3) < 1e-9, 'box:booster 3:1 → ×1.3');
}
{
  // The canonical fair tuning is comfortably winnable at a casual or fast sustained pace.
  for (let seed = 1; seed <= 5; seed++) {
    assert.equal(simulateFight({ tapsPerSec: 4, seed }).won, true, 'casual pace → comfortably winnable');
    assert.equal(simulateFight({ tapsPerSec: 8, seed }).won, true, 'sustained fast tapping → winnable');
  }
}

{
  // Core Dividend: spending Cores grants extra Cores per prestige (the meta-loop sink), on
  // top of the base scaling. Recursion Core compounds income multiplicatively.
  const s = defaultState({ now: 1 }); s.cores = 99;
  buyCore(s, 'core-dividend'); buyCore(s, 'core-dividend');   // level 2 -> +2 Cores per prestige
  const before = s.cores;
  doPrestige(s);   // totalBits 0 -> base coreGain 1, + dividend 2 = 3
  assert.equal(s.cores - before, 3, 'Core Dividend adds +2 on top of the base +1 Core per prestige');
  const r = defaultState({ now: 1 }); r.cores = 99;
  buyCore(r, 'core-compound'); buyCore(r, 'core-compound');
  assert.ok(Math.abs(coreEffects(r).incomeMult - Math.pow(1.12, 2)) < 1e-9, 'Recursion Core compounds income (1.12^2)');
}
console.log('stage1 canonical tests passed');
