// shop.test.mjs — Stage 5: upgrade effects + purchase rules.
import assert from 'node:assert/strict';
import { UPGRADES, applyUpgrades, buyUpgrade } from '../shop.js';
import { defaultState } from '../state.js';

// ── applyUpgrades bends the constants ─────────────────────────────────────────────────────────────
assert.equal(applyUpgrades({}).noiseDamage, 2, 'default ░ damage is 2');
assert.equal(applyUpgrades({ noiseFilter: true }).noiseDamage, 1, 'Noise Filter halves ░ damage');
assert.equal(applyUpgrades({ spectrumAnalyzer: true }).beatWindowBonus, 1, 'Spectrum Analyzer widens beat window');
assert.equal(applyUpgrades({ signalAmplifier: true }).gateValue, 8, 'Signal Amplifier raises gate value');

// ── purchases respect packets + ownership ────────────────────────────────────────────────────────
{
  const state = defaultState();
  state.packets = 100;
  const ok = buyUpgrade(state, 'noiseFilter');
  assert.equal(ok.bought, true);
  assert.equal(state.packets, 40, 'cost deducted');
  assert.equal(state.shop.noiseFilter, true, 'upgrade owned');
  assert.equal(buyUpgrade(state, 'noiseFilter').reason, 'owned', 'cannot rebuy');
  assert.equal(buyUpgrade(state, 'signalAmplifier').reason, 'insufficient', 'cannot afford');
  assert.equal(state.packets, 40, 'failed purchase leaves packets untouched');
  assert.equal(buyUpgrade(state, 'nope').reason, 'unknown');
}

assert.equal(UPGRADES.length, 3);
console.log('stage5 shop tests passed');
