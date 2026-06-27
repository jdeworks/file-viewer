// economy.test.mjs — `node docs/games/metagame/shared/economy.test.mjs`
//
// Covers the shared per-stage economy + prestige primitive: earn/spend/canAfford, prestige resets
// on-hand but keeps the permanent multiplier and lifetime-spent record, determinism, and the
// persistence round-trip through a fake save object. No DOM required; runs clean under Node.

import assert from 'node:assert/strict';
import { createEconomy, defaultPrestigeGain } from './economy.js';

let failed = 0;
const ok = (cond, msg) => { console.log((cond ? '✓ ' : '✗ ') + msg); if (!cond) failed++; };

function freshSave() {
  return { runs: {}, stageState: { 1: {}, 5: {} } };
}

// ── earn / spend / canAfford ──────────────────────────────────────────────────────────────────────
{
  const econ = createEconomy({ save: freshSave(), stageId: 1, currency: 'Bits' });
  ok(econ.balance() === 0 && econ.currency === 'Bits', 'starts at 0 with the configured currency noun');
  econ.earn(100);
  ok(econ.balance() === 100 && econ.totalEarned() === 100, 'earn credits balance and lifetime total');
  ok(econ.canAfford(100) && !econ.canAfford(101), 'canAfford gates exactly at the balance');
  ok(econ.spend(40) === true && econ.balance() === 60, 'spend debits the balance on success');
  ok(econ.spend(999) === false && econ.balance() === 60, 'spend fails (no debit) when unaffordable');
  ok(econ.totalSpent() === 40, 'totalSpent records what was spent');
  ok(econ.spend(-5) === false, 'spend rejects negative amounts');
  econ.earn(-10);
  ok(econ.balance() === 60, 'earn ignores non-positive amounts');
}

// ── start balance config ────────────────────────────────────────────────────────────────────────
{
  const econ = createEconomy({ save: freshSave(), stageId: 5, start: 25 });
  ok(econ.balance() === 25, 'start configures the opening balance');
}

// ── prestige: resets on-hand, keeps multiplier + spent, bumps level ───────────────────────────────
{
  const econ = createEconomy({
    save: freshSave(), stageId: 1, currency: 'Bits',
    prestige: { name: 'Gravity', threshold: 1000 },
  });
  ok(!econ.canPrestige(), 'cannot prestige below the threshold');
  ok(econ.prestige().ok === false, 'prestige() is a no-op below the threshold');

  econ.earn(2000);
  econ.spend(500);
  ok(econ.canPrestige(), 'can prestige once lifetime-earned crosses the threshold');
  const before = econ.totalSpent();
  const res = econ.prestige();
  ok(res.ok && res.level === 1, 'prestige succeeds and bumps the level');
  ok(econ.balance() === 0, 'prestige wipes the on-hand balance');
  ok(econ.totalEarned() === 2000, 'prestige keeps lifetime-earned (drives the curve)');
  ok(econ.totalSpent() === before, 'prestige keeps lifetime-spent (spent is permanent)');
  ok(econ.prestigeLevel() === 1 && econ.prestigeMultiplier() === res.factor, 'multiplier = pushed factor');
  ok(res.factor >= 2, 'default gain is at least 2 at/above the threshold');

  // The permanent multiplier now boosts earnings.
  econ.earn(100);
  ok(Math.abs(econ.balance() - 100 * res.factor) < 1e-9, 'earn applies the prestige multiplier');
  econ.earn(100, { raw: true });
  ok(Math.abs(econ.balance() - (100 * res.factor + 100)) < 1e-9, 'earn({raw}) bypasses the multiplier');
}

// ── stacking factors compound multiplicatively ────────────────────────────────────────────────────
{
  const econ = createEconomy({ save: freshSave(), stageId: 1, prestige: { threshold: 0 } });
  econ.prestige({ factor: 2 });
  econ.prestige({ factor: 3 });
  ok(econ.prestigeMultiplier() === 6 && econ.prestigeLevel() === 2, 'factors compound (2 × 3 = 6)');
  econ.prestige({ force: true, factor: 1.5 });
  ok(econ.prestigeMultiplier() === 9, 'force pushes another factor (6 × 1.5 = 9)');
}

// ── default prestige-gain curve ───────────────────────────────────────────────────────────────────
{
  ok(defaultPrestigeGain({ totalEarned: 1000, threshold: 1000 }) === 2, 'gain is exactly 2 at the threshold');
  ok(defaultPrestigeGain({ totalEarned: 10000, threshold: 1000 }) > 2, 'gain grows past the threshold');
  ok(defaultPrestigeGain({ totalEarned: 1, threshold: 1000 }) === 2, 'gain floors at 2 below the threshold');
}

// ── determinism: identical operation sequences ⇒ identical state ──────────────────────────────────
{
  const run = () => {
    const e = createEconomy({ save: freshSave(), stageId: 1, prestige: { threshold: 100 } });
    e.earn(500); e.spend(120); e.prestige(); e.earn(80); e.spend(33);
    return JSON.stringify(e.state());
  };
  ok(run() === run(), 'same sequence ⇒ identical state (no Date.now / Math.random)');
}

// ── persistence round-trip through the save object ────────────────────────────────────────────────
{
  const save = freshSave();
  const a = createEconomy({ save, stageId: 1, prestige: { threshold: 100 } });
  a.earn(300); a.spend(50); a.prestige(); a.earn(7);
  // A second economy built on the SAME save restores the persisted state.
  const b = createEconomy({ save, stageId: 1, prestige: { threshold: 100 } });
  ok(b.balance() === a.balance(), 'rebuilt economy restores the balance');
  ok(b.totalEarned() === a.totalEarned() && b.totalSpent() === a.totalSpent(), 'restores lifetime totals');
  ok(b.prestigeLevel() === a.prestigeLevel() && b.prestigeMultiplier() === a.prestigeMultiplier(), 'restores prestige');
  ok(save.stageState[1].economy.balance === a.balance(), 'state lives at stageState[id].economy');
}

// ── merge does not clobber sibling slot keys ──────────────────────────────────────────────────────
{
  const save = freshSave();
  save.stageState[1].run = { hp: 9 }; // an unrelated sibling slot (e.g. run-state)
  createEconomy({ save, stageId: 1 }).earn(5);
  ok(save.stageState[1].run.hp === 9, 'economy leaves sibling slots untouched');
  ok(save.stageState[1].economy.balance === 5, 'economy writes only into its own slot');
}

// ── custom slot keeps independent currencies isolated ─────────────────────────────────────────────
{
  const save = freshSave();
  createEconomy({ save, stageId: 1, slot: 'economy' }).earn(10);
  createEconomy({ save, stageId: 1, slot: 'shards' }).earn(20);
  ok(save.stageState[1].economy.balance === 10 && save.stageState[1].shards.balance === 20, 'distinct slots isolated');
}

// ── set() overwrites on-hand for dev without touching lifetime totals ──────────────────────────────
{
  const econ = createEconomy({ save: freshSave(), stageId: 1 });
  econ.earn(100);
  econ.set(5);
  ok(econ.balance() === 5 && econ.totalEarned() === 100, 'set overwrites balance, keeps lifetime');
}

console.log(failed ? `\nECONOMY FAILED (${failed})` : '\nECONOMY PASSED');
process.exit(failed ? 1 : 0);
