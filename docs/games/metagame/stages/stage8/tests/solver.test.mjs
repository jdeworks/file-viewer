// solver.test.mjs — Stage 8: the deterministic body solver plays the REAL engine to the boss gate.
import assert from "node:assert/strict";
import { driveToGate, bodyGateMet, salvageableValue } from "../solver.js";
import { defaultState } from "../state.js";
import { getBossLockState } from "../boss.js";
import { makeRng } from "../rng.js";
import { SALVAGE_REQUIRED, STATES_REQUIRED, MIN_CYCLE } from "../messages.js";

const cycleRng = (cycle) => makeRng(`8:cyc:${cycle}`);

// From a fresh field, the solver reaches the body gate by playing the real sim (frontier sheds debris).
{
  const s = defaultState();
  driveToGate(s, cycleRng);
  assert.ok(bodyGateMet(s), "body gate reached");
  assert.ok(s.cycle >= MIN_CYCLE, "minimum cycles survived");
  assert.ok(s.totalStatesEarned >= STATES_REQUIRED, "reserve threshold earned");
  assert.ok(salvageableValue(s) >= SALVAGE_REQUIRED, "enough archivable debris on hand");

  // The solver does NOT archive — the un-cheat action stays the player's, so the boss is still locked.
  const lock = getBossLockState({ actions: { hasAction: () => false }, state: s });
  assert.equal(lock.actionReady, false, "archive action not auto-fired");
  assert.equal(lock.unlocked, false, "boss still locked until the player archives");
}

// Deterministic: same seed scheme ⇒ identical run.
{
  const a = defaultState(); driveToGate(a, cycleRng);
  const b = defaultState(); driveToGate(b, cycleRng);
  assert.equal(a.cycle, b.cycle);
  assert.equal(a.totalStatesEarned, b.totalStatesEarned);
  assert.equal(salvageableValue(a), salvageableValue(b));
}

console.log("stage8 solver tests passed");
