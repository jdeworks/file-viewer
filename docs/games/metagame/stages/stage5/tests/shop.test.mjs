// shop.test.mjs — Stage 5: the multi-rank vehicle shop (data-driven levels, cost scaling, tuning fold).
import assert from 'node:assert/strict';
import { UPGRADES, applyUpgrades, buyUpgrade, levelOf, maxLevelOf, costOf, isMaxed, BASE_TUNING } from '../shop.js';
import { defaultState } from '../state.js';

// ── a stock racer reads BASE_TUNING; every part is multi-rank ──────────────────────────────────────
assert.deepEqual(applyUpgrades({}), { ...BASE_TUNING }, 'no upgrades → base tuning');
assert.ok(UPGRADES.length >= 7, 'at least 7 vehicle parts');
assert.ok(UPGRADES.every((u) => maxLevelOf(u.id) >= 2), 'every part has multiple ranks');
for (const id of ['engine', 'chassis', 'cooling', 'navArray', 'traction', 'signalAmp', 'noiseFilter']) {
  assert.ok(UPGRADES.some((u) => u.id === id), `${id} part present`);
}

// ── effects fold into tuning and matter across the run ──────────────────────────────────────────────
assert.ok(applyUpgrades({ engine: 1 }).topSpeed > BASE_TUNING.topSpeed, 'Engine raises top speed');
assert.ok(applyUpgrades({ engine: 4 }).topSpeed > applyUpgrades({ engine: 1 }).topSpeed, 'higher rank → faster');
assert.equal(applyUpgrades({ chassis: 2 }).maxIntegrity, 124, 'Chassis raises hull');
assert.equal(applyUpgrades({ navArray: 3 }).lookAhead, 11, 'Nav Array extends look-ahead');
assert.ok(applyUpgrades({ noiseFilter: 1 }).noiseDamage < 2, 'Noise Filter cuts static damage');
assert.ok(applyUpgrades({ cooling: 3 }).overclockBonusMs > 0, 'Cooling lengthens overclock');
assert.ok(applyUpgrades({ traction: 3 }).bumpSlow < BASE_TUNING.bumpSlow, 'Traction softens bumps');
assert.equal(applyUpgrades({ signalAmp: 2 }).gateValue, 9, 'Signal Amp raises gate value');

// ── escalating cost: each rank costs more (costScale) ───────────────────────────────────────────────
{
  const shop = {};
  const c0 = costOf(shop, 'engine');
  shop.engine = 1;
  const c1 = costOf(shop, 'engine');
  assert.ok(c1 > c0, 'rank 2 costs more than rank 1');
}

// ── buying debits packets, raises the level, respects affordability + the rank cap ──────────────────
{
  const state = defaultState();
  state.packets = 1000;
  const r1 = buyUpgrade(state, 'engine');
  assert.equal(r1.bought, true);
  assert.equal(r1.level, 1);
  assert.equal(state.shop.engine, 1, 'level stored');
  assert.equal(state.packets, 1000 - r1.cost, 'cost deducted');

  // buy it to max, then it refuses
  while (!isMaxed(state.shop, 'engine')) buyUpgrade(state, 'engine');
  assert.equal(levelOf(state.shop, 'engine'), maxLevelOf('engine'));
  assert.equal(buyUpgrade(state, 'engine').reason, 'maxed', 'cannot exceed the rank cap');

  state.packets = 0;
  assert.equal(buyUpgrade(state, 'chassis').reason, 'insufficient', 'cannot afford');
  assert.equal(buyUpgrade(state, 'nope').reason, 'unknown');
}

console.log('stage5 shop tests passed');
