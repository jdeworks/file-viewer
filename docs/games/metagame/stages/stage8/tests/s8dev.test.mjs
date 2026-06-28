// s8dev.test.mjs — Stage 8 dev-menu cheat functions: state mutation correctness.
// NOTE: devUnlockBossGate's action-bus side (actions.setAction) is DOM/context-bound and is
// NOT tested here — it lives in renderer.js dev() which has access to `actions`.
import assert from "node:assert/strict";
import { defaultState } from "../state.js";
import { STATES_REQUIRED, SALVAGE_REQUIRED, MIN_CYCLE } from "../messages.js";
import { TOTAL_STORMS } from "../storms.js";
import {
  devGiveResources,
  devSkipStorm,
  devUnlockBossGate,
  devCoolField,
  devSpawnDebris
} from "../s8dev.js";

// ── devGiveResources ──────────────────────────────────────────────────────────────────────────────────
{
  const s = defaultState();
  const before = { states: s.states, scrap: s.scrap, insight: s.insight, total: s.totalStatesEarned };
  devGiveResources(s);
  assert.equal(s.states, before.states + 500, "states +500");
  assert.equal(s.totalStatesEarned, before.total + 500, "totalStatesEarned +500");
  assert.equal(s.scrap, before.scrap + 200, "scrap +200");
  assert.ok(s.insight >= before.insight + 100, "insight +100");
  assert.ok(Array.isArray(s.log) && s.log.some((l) => l.startsWith("DEV:")), "log entry added");
}

// additive on repeated calls
{
  const s = defaultState();
  devGiveResources(s);
  devGiveResources(s);
  assert.equal(s.states, 1000, "double call doubles states");
  assert.equal(s.scrap, 400, "double call doubles scrap");
}

// ── devSkipStorm ──────────────────────────────────────────────────────────────────────────────────────
{
  const s = defaultState(); // act 1, stormsSurvived 0
  devSkipStorm(s);
  assert.equal(s.stormsSurvived, 1, "one storm survived");
  assert.equal(s.act, 2, "advanced to act 2");
  assert.ok(s.onlineSectors.includes("alpha"), "alpha sector online");
  assert.ok(s.insight > 0, "insight bonus credited");
}

{
  const s = defaultState();
  devSkipStorm(s); // α
  devSkipStorm(s); // β
  devSkipStorm(s); // γ
  assert.equal(s.stormsSurvived, TOTAL_STORMS, "all three storms skipped");
  assert.equal(s.act, TOTAL_STORMS + 1, "past all acts");
  assert.ok(s.onlineSectors.includes("gamma"), "gamma sector online");
}

// idempotent when all storms are done
{
  const s = defaultState();
  s.stormsSurvived = TOTAL_STORMS;
  s.act = TOTAL_STORMS + 1;
  const insightBefore = s.insight;
  devSkipStorm(s);
  assert.equal(s.stormsSurvived, TOTAL_STORMS, "no extra storm incremented");
  assert.equal(s.insight, insightBefore, "no insight credited when nothing to skip");
}

// clears active storm if one is in progress
{
  const s = defaultState();
  s.activeStorm = { id: "alpha", sector: "alpha", cyclesLeft: 2, duration: 3, label: "α" };
  devSkipStorm(s);
  assert.equal(s.activeStorm, null, "active storm cleared");
}

// ── devUnlockBossGate ─────────────────────────────────────────────────────────────────────────────────
{
  const s = defaultState();
  devUnlockBossGate(s);
  assert.ok(Number(s.cycle) >= MIN_CYCLE, "cycle meets gate");
  assert.ok(Number(s.totalStatesEarned) >= STATES_REQUIRED, "totalStatesEarned meets gate");
  assert.equal(Number(s.stormsSurvived), TOTAL_STORMS, "all storms recorded");
  assert.ok(Number(s.salvageTotal) >= SALVAGE_REQUIRED, "salvage floor met");
  assert.equal(s.manualArchiveDone, true, "manual archive flag set");
  assert.ok(Number(s.states) >= 400, "in-hand states adequate for burn");
  assert.ok(s.onlineSectors.includes("alpha") && s.onlineSectors.includes("beta") && s.onlineSectors.includes("gamma"),
    "all sectors online");
  assert.ok(Array.isArray(s.archive) && s.archive.length > 0, "dummy debris in archive");
}

// double-call is idempotent (no counter drift)
{
  const s = defaultState();
  devUnlockBossGate(s);
  const stormsAfterFirst = s.stormsSurvived;
  const salvageAfterFirst = s.salvageTotal;
  const archiveLenAfterFirst = s.archive.length;
  devUnlockBossGate(s);
  assert.equal(s.stormsSurvived, stormsAfterFirst, "stormsSurvived unchanged on double-call");
  assert.equal(s.salvageTotal, salvageAfterFirst, "salvageTotal unchanged on double-call");
  assert.equal(s.archive.length, archiveLenAfterFirst, "no duplicate archive entry");
}

// preserves states already above 400
{
  const s = defaultState();
  s.states = 800;
  s.totalStatesEarned = 800;
  devUnlockBossGate(s);
  assert.ok(s.states >= 800, "high state balance preserved");
}

// ── devCoolField ──────────────────────────────────────────────────────────────────────────────────────
{
  const s = defaultState();
  s.heat = 80;
  s.heatRate = 3;
  s.entropy = 40;
  for (const n of s.nodes) { n.health = 20; n.cascadeStress = 5; }
  devCoolField(s);
  assert.equal(s.heat, 0, "heat zeroed");
  assert.equal(s.heatRate, 0, "heatRate zeroed");
  assert.equal(s.entropy, 0, "entropy zeroed");
  assert.ok(s.nodes.every((n) => n.health === 100), "all nodes at full health");
  assert.ok(s.nodes.every((n) => n.cascadeStress === 0), "cascade stress cleared");
}

// repairUnits is at least 6 after cooling
{
  const s = defaultState();
  s.repairUnits = 0;
  devCoolField(s);
  assert.ok(s.repairUnits >= 6, "repairUnits restored to at least 6");
}

// ── devSpawnDebris ────────────────────────────────────────────────────────────────────────────────────
{
  const s = defaultState();
  assert.equal(s.debris.length, 0, "fresh state has no debris");
  devSpawnDebris(s);
  assert.ok(s.debris.length >= 3, "3 debris items spawned");
  assert.ok(typeof s.selectedDebrisId === "string" && s.selectedDebrisId.length > 0, "selectedDebrisId set");
  assert.ok(s.debris.every((d) => d.id.endsWith(".sav")), "all debris ids end with .sav (archivable)");
}

// idempotent: second call adds no duplicates when debris still present
{
  const s = defaultState();
  devSpawnDebris(s);
  const firstCount = s.debris.length;
  devSpawnDebris(s);
  assert.equal(s.debris.length, firstCount, "duplicate ids not re-added");
}

// re-spawns after items are archived (ids removed from debris)
{
  const s = defaultState();
  devSpawnDebris(s);
  const beforeIds = s.debris.map((d) => d.id);
  // simulate archiving all of them
  s.debris = [];
  devSpawnDebris(s);
  assert.deepEqual(s.debris.map((d) => d.id), beforeIds, "same ids re-spawned after archiving");
}

console.log("stage8 s8dev tests passed");
