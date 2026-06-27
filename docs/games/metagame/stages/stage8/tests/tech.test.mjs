// tech.test.mjs — Stage 8 tech tree: branches, costs, prerequisites, effects, automation gating.
import assert from "node:assert/strict";
import { defaultState, normalizeState, snapshotRun, restoreRun } from "../state.js";
import {
  TECHS, buyTech, canBuyTech, buyBlockReason, recomputeTechBonuses, techStatus
} from "../tech.js";

// ── twelve techs, four branches ────────────────────────────────────────────────────────────────────
{
  assert.equal(TECHS.length, 12, "12 techs");
  const branches = new Set(TECHS.map((t) => t.branch));
  assert.deepEqual([...branches].sort(), ["repair", "salvage", "thermal", "topology"], "four branches");
}

// ── cost gating + prerequisite chain ───────────────────────────────────────────────────────────────
{
  const s = defaultState();
  assert.equal(buyBlockReason(s, "rep1"), "insight", "cannot afford with no resources");
  s.insight = 1000; s.scrap = 1000;
  assert.equal(canBuyTech(s, "rep1"), true, "affordable tier-1 buyable");
  assert.equal(buyBlockReason(s, "rep2"), "requires", "tier-2 needs its prerequisite");
  assert.equal(buyTech(s, "rep1").ok, true, "bought rep1");
  assert.equal(s.repairBudgetBonus, 3, "rep1 effect applied (+3 repair budget)");
  assert.equal(canBuyTech(s, "rep2"), true, "rep2 now unlocked");
  buyTech(s, "rep2");
  assert.equal(s.repairEfficiencyBonus, 2, "rep2 effect applied");
}

// ── effects feed the engine bonus fields ───────────────────────────────────────────────────────────
{
  const s = defaultState();
  s.insight = 1000; s.scrap = 1000;
  buyTech(s, "thm1");
  assert.equal(s.heatVentBonus, 5, "Heat Sinks vent");
  buyTech(s, "top1");
  assert.equal(s.decayReduction, 1, "Reinforced Relays decay reduction");
  buyTech(s, "sal1");
  assert.equal(s.scrapMult, 1.5, "Refinery Optics scrap multiplier");
}

// ── Cold Storage automation is gated behind the MANUAL archive un-cheat ─────────────────────────────
{
  const s = defaultState();
  s.insight = 1000; s.scrap = 1000;
  buyTech(s, "sal1"); buyTech(s, "sal2");
  assert.equal(buyBlockReason(s, "sal3"), "needs-archive", "Cold Storage blocked until a manual archive has fired");
  s.manualArchiveDone = true;
  assert.equal(canBuyTech(s, "sal3"), true, "Cold Storage unlocks only after the manual un-cheat");
  buyTech(s, "sal3");
  assert.equal(s.coldStorage, true, "Cold Storage automation flag set");
}

// ── bonuses are derived: a normalize/snapshot round-trip rebuilds them from the purchased set ───────
{
  const s = defaultState();
  s.insight = 1000; s.scrap = 1000;
  buyTech(s, "thm1");
  const snap = snapshotRun(s);
  const t = defaultState();
  restoreRun(t, snap);
  assert.equal(t.tech.thm1, true, "purchase persisted");
  assert.equal(t.heatVentBonus, 5, "bonus rebuilt from purchased set on restore");
  // a state with purchases but stale bonuses gets corrected by recompute (via normalize)
  const stale = normalizeState({ ...snapshotRun(s), heatVentBonus: 999, version: undefined });
  assert.notEqual(stale.heatVentBonus, 999, "stale bonus overwritten");
}

// ── techStatus surfaces the whole tree for the UI ──────────────────────────────────────────────────
{
  const status = techStatus(defaultState());
  assert.equal(status.length, 12);
  assert.ok(status.every((t) => "owned" in t && "canBuy" in t && "reason" in t), "status rows shaped for the panel");
}

console.log("stage8 tech tests passed");
