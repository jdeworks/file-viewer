// upgrades.test.mjs — Stage 4 tower economy: sell refund, upgrade cost/gating, extractor income.
import assert from "node:assert/strict";
import { sellTower, upgradeTower, applyExtractorIncome } from "../upgrades.js";

// ── sell: 70% of invested cost ────────────────────────────────────────────────────────────────────
{
  const state = { cycles: 0, towers: [{ id: "t1", type: "pulse_node", level: 1 }] };
  const r = sellTower(state, "t1");
  assert.ok(r.ok, "sell succeeds");
  assert.equal(r.refund, 56, "pulse L1 refunds 56 (80 × 0.7)");
  assert.equal(state.towers.length, 0, "tower removed");
  assert.equal(sellTower(state, "nope").ok, false, "selling a missing tower fails");
}

// ── upgrade: cost gating + max level ──────────────────────────────────────────────────────────────
{
  const state = { cycles: 200, towers: [{ id: "t1", type: "pulse_node", level: 1 }] };
  const r = upgradeTower(state, "t1");
  assert.ok(r.ok && r.level === 2, "L1→L2 upgrade");
  assert.equal(r.cost, 160, "L1→L2 costs 160");
  assert.equal(state.cycles, 40, "cycles deducted");
  assert.equal(upgradeTower(state, "t1").ok, false, "can't afford L2→L3 (needs 320)");
  state.cycles = 1000;
  upgradeTower(state, "t1"); // → L3
  assert.equal(upgradeTower(state, "t1").reason, "max-level", "no upgrade past L3");
}

// ── extractor income ──────────────────────────────────────────────────────────────────────────────
{
  const state = { cycles: 0, towers: [{ id: "e1", type: "cycle_extractor" }, { id: "e2", type: "cycle_extractor" }, { id: "p", type: "pulse_node" }] };
  assert.equal(applyExtractorIncome(state), 50, "two extractors pay 50");
  assert.equal(state.cycles, 50, "income added to cycles");
}

console.log("stage4 upgrades tests passed");
