// state.test.mjs — Stage 8: fresh cycle-1 boot, forward migration, and snapshot/restore round-trip.
import assert from "node:assert/strict";
import { defaultState, normalizeState, snapshotRun, restoreRun, freshNodes, STATE_VERSION, createDebris } from "../state.js";
import { nodesForSector } from "../nodes.js";

const CORE_COUNT = nodesForSector("core").length; // 14 — the network starts at the core sector

// defaultState boots FRESH: cycle 1, full health, no pre-seeded debris/States (no boss bypass stub).
{
  const s = defaultState();
  assert.equal(s.version, STATE_VERSION);
  assert.equal(s.cycle, 1, "boots at cycle 1");
  assert.equal(s.nodes.length, CORE_COUNT, "boots with the core sector only (14 nodes)");
  assert.deepEqual(s.onlineSectors, ["core"], "only the core sector is online at boot");
  assert.equal(s.act, 1, "starts in act 1");
  assert.equal(s.stormsSurvived, 0, "no storms survived yet");
  assert.ok(s.nodes.every((n) => n.health === 100), "all nodes start at full health");
  assert.equal(s.states, 0, "no pre-seeded States");
  assert.equal(s.totalStatesEarned, 0, "no pre-seeded earnings");
  assert.equal(s.debris.length, 0, "no pre-seeded debris");
  assert.equal(s.salvageTotal, 0, "no pre-seeded salvage");
  assert.equal(s.boss.defeated, false);
}

// Old/malformed sub-state (no version, the retired cycle-14 stub) migrates FRESH.
{
  const stub = { version: 1, cycle: 14, states: 164, salvageTotal: 0, debris: [createDebris({ node: "p1", cycle: 14, tier: 1, value: 24 })] };
  const migrated = normalizeState(stub);
  assert.equal(migrated.cycle, 1, "stub reset to a fresh field");
  assert.equal(migrated.debris.length, 0, "pre-seeded debris dropped");
  assert.equal(migrated.states, 0, "pre-seeded States dropped");
}

// A recorded clear is carried forward (a returning winner is never reset into a new fight).
{
  const migrated = normalizeState({ version: 1, boss: { defeated: true } });
  assert.equal(migrated.boss.defeated, true);
  assert.equal(migrated.meta.firstClearComplete, true);
}

// A current-version state is validated/clamped (health 0–100, missing arrays rebuilt).
{
  const damaged = normalizeState({ version: STATE_VERSION, nodes: freshNodes().map((n, i) => ({ id: n.id, health: i === 0 ? 250 : -5 })) });
  assert.equal(damaged.nodes[0].health, 100, "over-100 health clamped");
  assert.equal(damaged.nodes[1].health, 0, "negative health clamped");
  // Variable-length now (network grows): valid node ids are preserved as-is...
  assert.equal(normalizeState({ version: STATE_VERSION, nodes: [{ id: "C1", health: 50 }, { id: "M5", health: 80 }] }).nodes.length, 2, "valid (grown) node array preserved");
  // ...an all-invalid array rebuilds to the fresh core sector.
  assert.equal(normalizeState({ version: STATE_VERSION, nodes: [{ id: "ZZ", health: 9 }] }).nodes.length, CORE_COUNT, "all-invalid array rebuilt to core sector");
}

// snapshotRun → restoreRun is a faithful round-trip of the in-progress sim.
{
  const s = defaultState();
  s.cycle = 12;
  s.states = 420;
  s.totalStatesEarned = 420;
  s.stabilizers = 3;
  s.debris = [createDebris({ node: "F2", cycle: 11, tier: 4, value: 70, decay: 2 })];
  s.nodes[0].health = 37;
  const snap = snapshotRun(s);
  assert.equal(typeof JSON.stringify(snap), "string", "snapshot is JSON-safe");
  const target = defaultState();
  restoreRun(target, snap);
  assert.equal(target.cycle, 12);
  assert.equal(target.states, 420);
  assert.equal(target.stabilizers, 3);
  assert.equal(target.debris.length, 1);
  assert.equal(target.nodes[0].health, 37);
}

console.log("stage8 state tests passed");
