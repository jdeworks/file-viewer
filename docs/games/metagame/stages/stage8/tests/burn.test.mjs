// burn.test.mjs — Stage 8 Heat Death: the deterministic escalating burn drains banked reserves.
import assert from "node:assert/strict";
import { simulateHeatDeath } from "../burn.js";
import { BURN_CYCLES } from "../messages.js";
import { makeRng } from "../rng.js";

const rng = () => makeRng("8:burn");

// deep reserves endure the full burn
{
  const r = simulateHeatDeath({ states: 600, stabilizers: 0 }, rng());
  assert.equal(r.survived, true, "600 States survives the burn");
  assert.equal(r.trace.length, BURN_CYCLES, "burn runs the full cycle count");
  assert.ok(r.remainingStates > 0, "reserves remain after enduring");
}

// thin reserves are overrun — the burn is a real economic gate, not a one-click win
{
  const r = simulateHeatDeath({ states: 50, stabilizers: 0 }, rng());
  assert.equal(r.survived, false, "50 States cannot survive ~278 total drain");
  assert.ok(r.failedAt >= 1 && r.failedAt <= BURN_CYCLES, "fails on a real burn cycle");
}

// stabilizers turn a losing reserve into a win (each pauses a would-be-fatal cycle)
{
  const noStab = simulateHeatDeath({ states: 270, stabilizers: 0 }, rng());
  const withStab = simulateHeatDeath({ states: 270, stabilizers: 2 }, rng());
  assert.equal(noStab.survived, false, "270 States alone is overrun");
  assert.equal(withStab.survived, true, "270 States + 2 stabilizers endures");
}

// deterministic: same reserves + same seed ⇒ identical trace
{
  const a = simulateHeatDeath({ states: 280, stabilizers: 1 }, rng());
  const b = simulateHeatDeath({ states: 280, stabilizers: 1 }, rng());
  assert.deepEqual(a.trace, b.trace, "burn is deterministic");
}

// pure: does not mutate the input reserves
{
  const input = { states: 300, stabilizers: 2 };
  simulateHeatDeath(input, rng());
  assert.equal(input.states, 300, "states untouched");
  assert.equal(input.stabilizers, 2, "stabilizers untouched");
}

console.log("stage8 burn tests passed");
