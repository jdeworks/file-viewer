import assert from 'node:assert/strict';
import {
  defaultState,
  normalizeState,
  parseCheatConfig,
  shouldDisableCheat,
  stageMeta,
} from '../../../docs/games/metagame/stages/stage1/index.js';

const enabled = ['CHEAT=true', 'CHEAT=1', 'CHEAT=yes', 'CHEAT=on', "CHEAT='true'", ' cheat = "YES" '];
for (const source of enabled) {
  const parsed = parseCheatConfig(source);
  assert.equal(parsed.cheatActive, true, `${source} keeps cheat active`);
  assert.equal(shouldDisableCheat(source), false, `${source} does not disable`);
}

const disabled = ['', 'no cheat here', 'CHEAT=', 'CHEAT=false', 'CHEAT=0', 'CHEAT=no', 'CHEAT=off', "CHEAT='off'"];
for (const source of disabled) {
  const parsed = parseCheatConfig(source);
  assert.equal(parsed.disabled, true, `${source || '<empty>'} disables cheat`);
  assert.equal(shouldDisableCheat(source), true, `${source || '<empty>'} should disable`);
}

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

assert.equal(stageMeta.requiredAction, '1.cheat_disabled');
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
  // The un-cheat is load-bearing: identical taps lose while cheating, win once disabled.
  for (let seed = 1; seed <= 5; seed++) {
    assert.equal(simulateFight({ cheatActive: true, tapsPerSec: 12, seed }).won, false, 'cheat active → boss wins');
    assert.equal(simulateFight({ cheatActive: false, tapsPerSec: 12, seed }).won, true, 'cheat disabled → fair fight winnable');
  }
}

console.log('stage1 canonical tests passed');
