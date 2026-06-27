// shop.test.mjs — `node docs/games/metagame/shared/shop.test.mjs`
//
// Covers the shared data-driven shop core: escalating cost, repeatable/maxLevel rules, buy debiting
// the paired economy + raising the level, affordability gating, the effect fold, and the persistence
// round-trip through a fake save. No DOM required (renderShop is feature-detected); runs under Node.

import assert from 'node:assert/strict';
import { createShop } from './shop.js';
import { createEconomy } from './economy.js';

let failed = 0;
const ok = (cond, msg) => { console.log((cond ? '✓ ' : '✗ ') + msg); if (!cond) failed++; };

function freshSave() {
  return { runs: {}, stageState: { 1: {}, 2: {} } };
}

const ITEMS = [
  { id: 'oneshot', label: 'One Shot', cost: 50, effect: { noiseDamage: 1 } },
  { id: 'leveled', label: 'Leveled', cost: 100, costScale: 1.5, repeatable: true, maxLevel: 3,
    effect: (acc, level) => ({ ...acc, power: (acc.power || 0) + level }) },
  { id: 'endless', label: 'Endless', cost: 10, costScale: 2, repeatable: true },
];

// ── escalating cost: round(cost × costScale^level) ────────────────────────────────────────────────
{
  const save = freshSave();
  const econ = createEconomy({ save, stageId: 1 });
  const shop = createShop({ economy: econ, items: ITEMS, save, stageId: 1 });
  ok(shop.costOf('leveled') === 100, 'level-0 cost is the base cost');
  ok(shop.costOf('endless') === 10, 'endless level-0 cost is the base');
  shop.set('leveled', 1);
  ok(shop.costOf('leveled') === 150, 'level-1 cost = round(100 × 1.5)');
  shop.set('leveled', 2);
  ok(shop.costOf('leveled') === 225, 'level-2 cost = round(100 × 1.5^2)');
}

// ── repeatable / maxLevel rules ───────────────────────────────────────────────────────────────────
{
  const save = freshSave();
  const econ = createEconomy({ save, stageId: 1 });
  const shop = createShop({ economy: econ, items: ITEMS, save, stageId: 1 });
  ok(shop.maxLevelFor('oneshot') === 1, 'non-repeatable item caps at level 1');
  ok(shop.maxLevelFor('leveled') === 3, 'repeatable item respects maxLevel');
  ok(shop.maxLevelFor('endless') === Infinity, 'repeatable without maxLevel is unbounded');
  shop.set('oneshot', 1);
  ok(shop.isMaxed('oneshot') && shop.costOf('oneshot') === Infinity, 'maxed item: costOf is Infinity');
  shop.set('leveled', 3);
  ok(shop.isMaxed('leveled'), 'repeatable item maxes at maxLevel');
}

// ── buy: debits economy, raises level; affordability gating ───────────────────────────────────────
{
  const save = freshSave();
  const econ = createEconomy({ save, stageId: 1 });
  const shop = createShop({ economy: econ, items: ITEMS, save, stageId: 1 });

  ok(!shop.canBuy('leveled') && shop.buy('leveled').reason === 'insufficient', 'cannot buy with no balance');
  econ.earn(100);
  ok(shop.canBuy('leveled'), 'canBuy once affordable');
  const res = shop.buy('leveled');
  ok(res.ok && res.level === 1 && res.cost === 100, 'buy succeeds: returns new level + cost');
  ok(econ.balance() === 0, 'buy debits the economy');
  ok(shop.levelOf('leveled') === 1, 'buy raises the level');

  econ.earn(150);
  ok(shop.buy('leveled').level === 2, 'second buy uses the escalated price (150) and levels up');
  ok(econ.balance() === 0, 'escalated price fully debited');

  // Unknown + maxed reasons.
  ok(shop.buy('nope').reason === 'unknown', 'buying an unknown id reports unknown');
  shop.set('oneshot', 1);
  ok(shop.buy('oneshot').reason === 'maxed', 'buying a maxed item reports maxed');
}

// ── buy without an economy is a clean no-op ───────────────────────────────────────────────────────
{
  const save = freshSave();
  const shop = createShop({ items: ITEMS, save, stageId: 2 });
  ok(shop.buy('oneshot').reason === 'no-economy' && shop.levelOf('oneshot') === 0, 'no economy ⇒ no purchase');
}

// ── effect fold: function reducers + value lookups, owned-only, declared order ────────────────────
{
  const save = freshSave();
  const econ = createEconomy({ save, stageId: 1 });
  const shop = createShop({ economy: econ, items: ITEMS, save, stageId: 1 });
  ok(JSON.stringify(shop.effects()) === '{}', 'no owned items ⇒ empty effects');
  shop.set('oneshot', 1);
  shop.set('leveled', 2);
  const eff = shop.applyAll({ base: true });
  ok(eff.base === true, 'applyAll clones the target (keeps existing fields)');
  ok(eff.oneshot && eff.oneshot.noiseDamage === 1, 'value effect stored verbatim under the item id');
  ok(eff.power === 2, 'function effect folds with the level (power = level 2)');
  // applyAll does not mutate the passed target.
  const target = {};
  shop.applyAll(target);
  ok(Object.keys(target).length === 0, 'applyAll does not mutate the input target');
}

// ── persistence round-trip + sibling-slot safety ──────────────────────────────────────────────────
{
  const save = freshSave();
  save.stageState[1].economy = { balance: 5 }; // a sibling slot (the economy) must survive
  const econ = createEconomy({ save, stageId: 1 });
  econ.earn(500);
  const a = createShop({ economy: econ, items: ITEMS, save, stageId: 1 });
  a.buy('endless'); a.buy('endless');
  ok(a.levelOf('endless') === 2, 'two buys reach level 2');
  ok(save.stageState[1].shop.levels.endless === 2, 'levels persist at stageState[id].shop.levels');
  ok(plainPresent(save.stageState[1].economy), 'shop leaves the economy sibling slot intact');

  // A rebuilt shop on the same save restores the levels.
  const b = createShop({ economy: econ, items: ITEMS, save, stageId: 1 });
  ok(b.levelOf('endless') === 2, 'rebuilt shop restores persisted levels');
}

function plainPresent(v) { return v && typeof v === 'object'; }

// ── determinism: identical buy sequence ⇒ identical state ─────────────────────────────────────────
{
  const run = () => {
    const save = freshSave();
    const econ = createEconomy({ save, stageId: 1 });
    econ.earn(1000);
    const shop = createShop({ economy: econ, items: ITEMS, save, stageId: 1 });
    shop.buy('leveled'); shop.buy('endless'); shop.buy('leveled');
    return JSON.stringify({ shop: shop.state(), bal: econ.balance() });
  };
  ok(run() === run(), 'same buy sequence ⇒ identical state');
}

console.log(failed ? `\nSHOP FAILED (${failed})` : '\nSHOP PASSED');
process.exit(failed ? 1 : 0);
