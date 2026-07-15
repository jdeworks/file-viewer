// Run-pressure clock (round 4): the forgiving run-level failure arc. Wrong fills accrue CUMULATIVELY
// across all snapshots of a run; at the corruption-scaled limit the run softly COLLAPSES, preserving
// all permanent meta and drawing a fresh-seeded run. Distinct from s3decay (per-snapshot).
import assert from "node:assert/strict";
import {
  RUN_PRESSURE_BASE, RUN_PRESSURE_PER_CORRUPTION,
  runPressureLimit, bumpRunPressure, runPressureReached, collapseRun, defaultState,
} from "../state.js";
import { BOONS } from "../s3boons.js";

// A fresh run starts at zero pressure.
assert.equal(defaultState().run.pressure, 0, "a fresh run starts with zero run-pressure");

// The limit is the eval's tunable 20 + corruption*2, and scales UP with corruption (deeper = MORE slack).
assert.equal(RUN_PRESSURE_BASE, 20, "base tolerance is the generous 20");
assert.equal(RUN_PRESSURE_PER_CORRUPTION, 2, "+2 tolerance per corruption level");
assert.equal(runPressureLimit(0, 0), 20, "limit at corruption 0 is 20");
assert.equal(runPressureLimit(8, 0), 36, "limit at peak corruption 8 is 36 (20 + 8*2)");
for (let c = 0; c < 8; c += 1) assert(runPressureLimit(c + 1, 0) > runPressureLimit(c, 0), `limit rises with corruption (${c})`);

// The Pressure Valve boon (its decayPct headroom) WIDENS the run limit — coherent with its decay-clock effect.
const valve = BOONS.find((b) => b.id === "pressure_valve");
assert(valve && typeof valve.effect.decayPct === "number" && valve.effect.decayPct > 0, "Pressure Valve boon exposes decayPct headroom");
assert.equal(runPressureLimit(8, valve.effect.decayPct), Math.round(36 * (1 + valve.effect.decayPct)), "valve raises the limit by its headroom");
assert(runPressureLimit(8, valve.effect.decayPct) > runPressureLimit(8, 0), "valve gives strictly more run slack");

// Accrual is cumulative; the limit is reached exactly at the limit value.
{
  const state = defaultState();
  for (let i = 0; i < 19; i += 1) bumpRunPressure(state);
  assert.equal(state.run.pressure, 19, "19 wrong fills accrue to 19");
  assert(!runPressureReached(state, 0, 0), "below the limit the run has NOT collapsed");
  assert.equal(bumpRunPressure(state), 20, "the 20th wrong fill brings pressure to the limit");
  assert(runPressureReached(state, 0, 0), "at the limit the run collapses");
}

// Pressure does NOT reset on a per-snapshot reset (failSnapshot wipes run.marks only; it never touches
// run.pressure) — the run-level clock keeps accumulating across snapshots.
{
  const state = defaultState();
  bumpRunPressure(state); bumpRunPressure(state); bumpRunPressure(state);
  state.run.marks = null; // simulate a snapshot collapse / draw of the next snapshot
  state.run.index += 1;
  state.run.solvedCount += 1;
  assert.equal(state.run.pressure, 3, "snapshot reset leaves run-pressure intact (accrues across snapshots)");
}

// A COLLAPSE is a SOFT reset: preserves ALL meta, increments runCount → fresh seed, zeroes run-pressure.
{
  const state = defaultState();
  state.registers = 137;
  state.retained = 9;
  state.shopUpgrades = { oracle: 2, throughput: 1 };
  state.achievements = { flawless: true, retainer: true };
  state.run.solvedCount = 11;
  state.run.boons = ["cache"];
  for (let i = 0; i < 30; i += 1) bumpRunPressure(state);
  const beforeRunCount = state.runCount;
  const beforeSeed = state.run.seed;

  collapseRun(state);

  assert.equal(state.registers, 137, "collapse PRESERVES registers");
  assert.equal(state.retained, 9, "collapse PRESERVES retained fragments");
  assert.deepEqual(state.shopUpgrades, { oracle: 2, throughput: 1 }, "collapse PRESERVES shop upgrades");
  assert.deepEqual(state.achievements, { flawless: true, retainer: true }, "collapse PRESERVES achievements/best");
  assert.equal(state.runCount, beforeRunCount + 1, "collapse INCREMENTS runCount");
  assert.notEqual(state.run.seed, beforeSeed, "the new run has a fresh seed");
  assert.equal(state.run.seed, `s3-run${beforeRunCount + 1}`, "the fresh seed derives from runCount (deterministic)");
  assert.equal(state.run.pressure, 0, "collapse ZEROES run-pressure");
  assert.equal(state.run.solvedCount, 0, "collapse draws a brand-new run (solvedCount reset)");
  assert.deepEqual(state.run.boons, [], "collapse clears the run-scoped boons");
  assert.equal(state.boss.corruption8Reached, false, "collapse draws a fresh body-locked boss for the new run");
  assert.equal("memoryPair" in state, false, "collapse does not create an external diff payload");
}

console.log("stage3 run-pressure clock tests passed");
