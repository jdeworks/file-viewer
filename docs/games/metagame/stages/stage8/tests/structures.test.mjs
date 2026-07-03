// structures.test.mjs — Stage 8 placeable structures + deterministic automation pass.
import assert from "node:assert/strict";
import { defaultState, snapshotRun, restoreRun, createDebris } from "../state.js";
import { buildStructure, canBuildStructure, buildBlockReason, costOf, levelOf, STRUCTURES } from "../structures.js";
import { buyTech } from "../tech.js";
import { runAutomation } from "../automation.js";

// ── five structures; cost scales with level ────────────────────────────────────────────────────────
{
  assert.equal(STRUCTURES.length, 5, "five structures");
  const s = defaultState();
  s.parts = 1000;
  const c0 = costOf(s, "heatSink");
  buildStructure(s, "heatSink");
  assert.equal(levelOf(s, "heatSink"), 1, "heat sink built");
  assert.equal(s.structHeatVent, 4, "heat-sink vent bonus folded");
  assert.ok(costOf(s, "heatSink") > c0, "cost scales with level");
}

// ── struct bonuses fold independently of tech bonuses (no field collision) ─────────────────────────
{
  const s = defaultState();
  s.parts = 2000;
  buyTech(s, "thm1");               // tech heatVentBonus = 5
  buildStructure(s, "heatSink");    // struct structHeatVent = 4
  assert.equal(s.heatVentBonus, 5, "tech vent intact");
  assert.equal(s.structHeatVent, 4, "struct vent intact (no clobber)");
}

// ── automation structures require their tech (drone→rep3, cold storage→sal3+manual archive) ────────
{
  const s = defaultState();
  s.parts = 5000;
  assert.equal(buildBlockReason(s, "drone"), "requires-tech", "drone needs rep3");
  assert.equal(buildBlockReason(s, "coldStorage"), "requires-tech", "cold storage needs sal3");
  buyTech(s, "rep1"); buyTech(s, "rep2"); buyTech(s, "rep3");
  assert.equal(canBuildStructure(s, "drone"), true, "drone buildable after rep3");
}

// ── Cold Storage stays gated behind the MANUAL archive un-cheat at BOTH tech and build ──────────────
{
  const s = defaultState();
  s.parts = 5000;
  buyTech(s, "sal1"); buyTech(s, "sal2");
  assert.equal(buyTech(s, "sal3").reason, "needs-archive", "sal3 tech blocked without a hand archive");
  s.manualArchiveDone = true;
  assert.equal(buyTech(s, "sal3").ok, true, "sal3 unlocks after manual archive");
  buildStructure(s, "coldStorage");
  assert.equal(levelOf(s, "coldStorage"), 1, "cold storage built only after the un-cheat");
  assert.equal(s.coldStorageRate, 1, "cold-storage automation strength set");
}

// ── automation pass: drones heal weakest non-core; cold storage auto-archives oldest debris ────────
{
  const s = defaultState();
  s.autoRepairUnits = 1;
  // make one frontier node the weakest
  const f = s.nodes.find((n) => n.id === "F1"); f.health = 20;
  const detail = runAutomation(s);
  assert.deepEqual(detail.repaired, ["F1"], "drone healed the weakest non-core node");
  assert.equal(f.health, 26, "healed by +6");

  // cold storage auto-archives without firing the un-cheat action
  s.coldStorageRate = 1;
  s.debris = [createDebris({ node: "F2", cycle: 2, tier: 4, value: 70, decay: 2 })];
  const before = s.salvageTotal;
  const d2 = runAutomation(s);
  assert.equal(d2.archived.length, 1, "one debris auto-archived");
  assert.equal(s.debris.length, 0, "debris removed");
  assert.ok(s.salvageTotal > before, "salvage credited");
  assert.ok(s.parts > 0, "parts refined from the auto-archive");
}

// ── determinism: same state ⇒ same automation result ───────────────────────────────────────────────
{
  const mk = () => { const s = defaultState(); s.autoRepairUnits = 2; s.nodes.find((n) => n.id === "F1").health = 10; s.nodes.find((n) => n.id === "P1").health = 30; return s; };
  const a = mk(); const b = mk();
  assert.deepEqual(runAutomation(a).repaired, runAutomation(b).repaired, "automation is deterministic");
}

// ── builds survive a snapshot/restore round-trip (bonuses rebuilt) ─────────────────────────────────
{
  const s = defaultState();
  s.parts = 1000;
  buildStructure(s, "buffer");
  const t = defaultState();
  restoreRun(t, snapshotRun(s));
  assert.equal(levelOf(t, "buffer"), 1, "structure persisted");
  assert.equal(t.structRepairBonus, 2, "struct bonus rebuilt on restore");
}

console.log("stage8 structures tests passed");
