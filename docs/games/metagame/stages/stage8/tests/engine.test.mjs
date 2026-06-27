// engine.test.mjs — Stage 8 cycle-advance core: decay, repair, debris, cascade, determinism.
import assert from "node:assert/strict";
import { defaultState } from "../state.js";
import { makeRng } from "../rng.js";
import { advanceCycle, applyRepair, applyStabilizer, buildStabilizer, toggleHighLoad, BASE_REPAIR_UNITS_PER_CYCLE } from "../engine.js";

function mkState() {
  const s = defaultState();
  s.cycle = 1; s.debris = []; s.states = 0; s.totalStatesEarned = 0;
  return s;
}
const get = (s, id) => s.nodes.find((n) => n.id === id);

// ── decay: every node loses health, income accrues, cycle advances ────────────────────────────────
{
  const s = mkState();
  const res = advanceCycle(s, makeRng("8:1"));
  assert.ok(s.nodes.every((n) => n.health < 100), "all nodes decayed from full health");
  assert.equal(s.cycle, 2, "cycle advanced");
  assert.ok(res.income > 0 && s.states === res.income, "income accrued from active nodes");
  assert.equal(s.repairUnits, BASE_REPAIR_UNITS_PER_CYCLE, "repair budget reset");
}

// ── repair: budget validated, allocation raises health on the next advance ─────────────────────────
{
  const s = mkState();
  get(s, "C1").health = 50;
  assert.equal(applyRepair(s, "C1", 99).ok, false, "over-budget repair rejected");
  const r = applyRepair(s, "C1", 4);
  assert.ok(r.ok && s.repairUnits === BASE_REPAIR_UNITS_PER_CYCLE - 4, "budget spent");
  advanceCycle(s, makeRng("8:1"));
  assert.ok(get(s, "C1").health > 50, "repair raised C1 above its pre-cycle health (50 - 2 + 12)");
}

// ── a node that hits 0 fails and drops debris; failure stresses its downstream neighbour ───────────
{
  const s = mkState();
  get(s, "F1").health = 1; // frontier decay (6) drives it to 0 this cycle
  const res = advanceCycle(s, makeRng("8:1"));
  assert.ok(res.newlyFailed.includes("F1"), "F1 failed");
  assert.equal(res.newDebris.length, 1, "one debris file created");
  assert.ok(s.debris.some((d) => d.node === "F1"), "debris recorded in state");
  assert.equal(get(s, "M1").cascadeStress, 1, "failed F1 stresses downstream M1");
}

// ── determinism: same state + same seed ⇒ same debris value ────────────────────────────────────────
{
  const a = mkState(); get(a, "F1").health = 1;
  const b = mkState(); get(b, "F1").health = 1;
  const ra = advanceCycle(a, makeRng("8:1"));
  const rb = advanceCycle(b, makeRng("8:1"));
  assert.equal(ra.newDebris[0].value, rb.newDebris[0].value, "same seed ⇒ same debris value");
}

// ── stabilizer freezes decay; high-load only on supporting nodes ───────────────────────────────────
{
  const s = mkState();
  s.stabilizers = 1;
  assert.ok(applyStabilizer(s, "C1").ok, "stabilizer applied");
  advanceCycle(s, makeRng("8:1"));
  assert.equal(get(s, "C1").health, 100, "stabilized node did not decay");
  assert.equal(toggleHighLoad(s, "C1").ok, false, "core cannot go high-load");
  assert.equal(toggleHighLoad(s, "P1").ok, true, "production can go high-load");
}

// ── buildStabilizer: spends banked States, validated against the balance ───────────────────────────
{
  const s = mkState();
  s.states = 100;
  assert.equal(buildStabilizer(s, 40).ok, true, "affordable stabilizer built");
  assert.equal(s.states, 60, "States spent");
  assert.equal(s.stabilizers, 1, "stabilizer banked");
  assert.equal(buildStabilizer(s, 999).ok, false, "unaffordable stabilizer rejected");
  assert.equal(s.stabilizers, 1, "no stabilizer on a failed build");
}

console.log("stage8 engine tests passed");
