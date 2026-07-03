// shop.test.mjs — Stage 5: the THREE-stat vehicle shop (UX audit M1 + approved merged-SIGNAL OPTION).
// The previous seven parts collapsed into ENGINE / HULL / SIGNAL; migrateShop() rebases any old save
// onto the three lines (summed, clamped) with no purchase lost. These assertions replace the old
// seven-track ones — justified: the seven parts no longer exist; the merge is the designed change.
import assert from 'node:assert/strict';
import { UPGRADES, applyUpgrades, buyUpgrade, migrateShop, levelOf, maxLevelOf, costOf, isMaxed, BASE_TUNING } from '../shop.js';
import { defaultState } from '../state.js';

// ── a stock racer reads BASE_TUNING; there are exactly three multi-rank stats ───────────────────────
assert.deepEqual(applyUpgrades({}), { ...BASE_TUNING }, 'no upgrades → base tuning');
assert.equal(UPGRADES.length, 3, 'exactly three stats (Engine/Hull/Signal)');
assert.deepEqual(UPGRADES.map((u) => u.id), ['engine', 'hull', 'signal'], 'the three stat ids');
assert.ok(UPGRADES.every((u) => maxLevelOf(u.id) >= 2), 'every stat has multiple ranks');

// ── effects fold into tuning across the run ─────────────────────────────────────────────────────────
assert.ok(applyUpgrades({ engine: 1 }).topSpeed > BASE_TUNING.topSpeed, 'Engine raises top speed');
assert.ok(applyUpgrades({ engine: 7 }).topSpeed > applyUpgrades({ engine: 1 }).topSpeed, 'higher rank → faster');
assert.ok(applyUpgrades({ engine: 3 }).overclockBonusMs > 0, 'Engine lengthens overclock');
assert.equal(applyUpgrades({ hull: 3 }).maxIntegrity, 124, 'Hull raises the hull cap (100 + 8·L)');
assert.ok(applyUpgrades({ hull: 3 }).bumpSlow < BASE_TUNING.bumpSlow, 'Hull softens bumps');
assert.ok(applyUpgrades({ hull: 3 }).offBeatPenalty < BASE_TUNING.offBeatPenalty, 'Hull softens off-beat switches');

// SIGNAL is ONE merged curve: the same level drives gate value, packet mult, look-ahead AND static.
{
  const s = applyUpgrades({ signal: 4 });
  assert.equal(s.gateValue, 5 + 2 * 4, 'Signal raises gate value (+2/rank)');
  assert.ok(s.packetMult > 1, 'Signal lifts the packet multiplier');
  assert.equal(s.lookAhead, 8 + Math.floor(4 / 2), 'Signal extends look-ahead (a row per 2 ranks)');
  assert.ok(s.noiseDamage < BASE_TUNING.noiseDamage, 'Signal cuts static damage');
}

// ── escalating cost per rank (costScale) ────────────────────────────────────────────────────────────
for (const id of ['engine', 'hull', 'signal']) {
  const shop = {};
  const c0 = costOf(shop, id);
  shop[id] = 1;
  assert.ok(costOf(shop, id) > c0, `${id} rank 2 costs more than rank 1`);
}

// ── buying debits packets, raises the level, respects affordability + the rank cap ──────────────────
{
  const state = defaultState();
  state.packets = 100000;
  const r1 = buyUpgrade(state, 'hull');
  assert.equal(r1.bought, true);
  assert.equal(state.shop.hull, 1, 'level stored');
  assert.equal(state.packets, 100000 - r1.cost, 'cost deducted');
  while (!isMaxed(state.shop, 'hull')) buyUpgrade(state, 'hull');
  assert.equal(levelOf(state.shop, 'hull'), maxLevelOf('hull'));
  assert.equal(buyUpgrade(state, 'hull').reason, 'maxed', 'cannot exceed the rank cap');
  state.packets = 0;
  assert.equal(buyUpgrade(state, 'engine').reason, 'insufficient', 'cannot afford');
  assert.equal(buyUpgrade(state, 'nope').reason, 'unknown');
}

// ── migrateShop: a legacy 7-part save maps onto the three stats with NO purchase lost ───────────────
{
  // fully-maxed legacy save → each merged stat at its cap (engine 4+3=7, hull 4+3=7, signal 3+3+2=8).
  assert.deepEqual(
    migrateShop({ engine: 4, chassis: 4, cooling: 3, navArray: 3, traction: 3, signalAmp: 3, noiseFilter: 2 }),
    { engine: 7, hull: 7, signal: 8 },
    'legacy full → three stats fully ranked (sum, clamped, nothing lost)',
  );
  assert.deepEqual(migrateShop({ chassis: 2 }), { hull: 2 }, 'legacy partial folds into its stat');
  assert.deepEqual(migrateShop({ cooling: 2, engine: 1 }), { engine: 3 }, 'engine + cooling → engine');
  assert.deepEqual(migrateShop({}), {}, 'empty stays empty');
  // an already-three-stat save is sanitised/clamped, not doubled.
  assert.deepEqual(migrateShop({ engine: 2, hull: 1 }), { engine: 2, hull: 1 }, 'three-stat save preserved');
  assert.deepEqual(migrateShop({ engine: 99 }), { engine: 7 }, 'over-cap level clamped to the rank cap');
}

console.log('stage5 shop tests passed');
