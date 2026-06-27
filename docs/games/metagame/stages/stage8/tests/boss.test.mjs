// boss.test.mjs — Stage 8 Heat Death: triple-gate + real burn. Proves the old two-click bypass fails.
import assert from "node:assert/strict";
import { getBossLockState, handleDebrisDrop, recordHeatDeathAttempt } from "../boss.js";
import { SALVAGE_REQUIRED, MIN_CYCLE } from "../messages.js";
import { defaultState, createDebris } from "../state.js";
import { makeRng } from "../rng.js";

function actionHarness() {
  const set = new Set();
  const calls = [];
  return {
    calls,
    hasAction(stage, action) { return set.has(`${stage}.${action}`); },
    setAction(stage, action, detail) { set.add(`${stage}.${action}`); calls.push({ stage, action, detail }); }
  };
}
const noopAch = { unlockAchievement() {} };
const noopBell = { push() {} };
const burnRng = () => makeRng("8:burn");

function archive(state, actions) {
  return handleDebrisDrop({
    state, actions, achievements: noopAch, bell: noopBell,
    debrisId: state.selectedDebrisId, targetPath: "/entropy/active_archive/"
  });
}

// A fresh field is LOCKED on every gate (closes "two clicks → win").
{
  const state = defaultState();
  const actions = actionHarness();
  const lock = getBossLockState({ actions, state });
  assert.equal(lock.unlocked, false);
  assert.equal(lock.actionReady, false);
  assert.equal(lock.enoughSalvage, false);
  assert.equal(lock.enoughCycles, false);
  assert.equal(lock.enoughStates, false);
}

// The old bypass on a fresh field: nothing to archive, and challenging returns LOCKED (no defeat).
{
  const state = defaultState();
  const actions = actionHarness();
  const r = recordHeatDeathAttempt({ state, actions, rng: burnRng() });
  assert.equal(r.locked, true, "fresh challenge is locked");
  assert.notEqual(r.defeated, true);
  assert.equal(state.boss.defeated, false);
}

// Archiving fires the un-cheat + banks salvage, but cycle/reserve gates still keep the boss locked.
{
  const state = defaultState();
  state.debris = [createDebris({ node: "F1", cycle: 1, tier: 4, value: 80, decay: 2 })];
  state.selectedDebrisId = state.debris[0].id;
  const actions = actionHarness();
  const drag = archive(state, actions);
  assert.equal(drag.archived, true);
  const lock = getBossLockState({ actions, state });
  assert.equal(lock.actionReady, true, "drag-drop un-cheat fired");
  assert.equal(lock.enoughSalvage, true, "80 ≥ salvage floor");
  assert.equal(lock.enoughCycles, false, "still cycle 1");
  assert.equal(lock.unlocked, false, "gated by cycles + reserves");
  const r = recordHeatDeathAttempt({ state, actions, rng: burnRng() });
  assert.equal(r.locked, true);
}

// The Cascade-Storm gate keeps the boss locked until all three storms are survived.
{
  const state = defaultState();
  state.cycle = MIN_CYCLE + 2;
  state.debris = [createDebris({ node: "F1", cycle: state.cycle - 1, tier: 4, value: 80, decay: 2 })];
  state.selectedDebrisId = state.debris[0].id;
  const actions = actionHarness();
  archive(state, actions);
  state.totalStatesEarned = 600;
  state.states = 600;
  state.stormsSurvived = 2; // only two of three storms weathered
  const lock = getBossLockState({ actions, state });
  assert.equal(lock.enoughStorms, false, "storm gate not yet met");
  assert.equal(lock.unlocked, false, "boss locked until all three storms survived");
}

// Fully gated + deep reserves → the real burn is endured → defeat.
{
  const state = defaultState();
  state.cycle = MIN_CYCLE + 2;
  state.stormsSurvived = 3; // all three Cascade Storms weathered (network fully grown)
  state.debris = [createDebris({ node: "F1", cycle: state.cycle - 1, tier: 4, value: 80, decay: 2 })];
  state.selectedDebrisId = state.debris[0].id;
  const actions = actionHarness();
  archive(state, actions);
  state.totalStatesEarned = 600;
  state.states = 600;
  const lock = getBossLockState({ actions, state });
  assert.equal(lock.unlocked, true, "all gates satisfied");
  const r = recordHeatDeathAttempt({ state, actions, rng: burnRng() });
  assert.equal(r.defeated, true);
  assert.equal(state.boss.defeated, true);
  assert.equal(state.meta.btsAvailable, true);
  assert.ok(r.burn.survived);
}

// Gated by cumulative earned States, but actual banked reserves spent down → burn overruns → no win.
{
  const state = defaultState();
  state.cycle = MIN_CYCLE + 2;
  state.debris = [createDebris({ node: "F1", cycle: state.cycle - 1, tier: 4, value: 80, decay: 2 })];
  state.selectedDebrisId = state.debris[0].id;
  state.stormsSurvived = 3;
  const actions = actionHarness();
  archive(state, actions);
  state.totalStatesEarned = 600; // unlocks the gate (cumulative)
  state.states = 50;             // but reserves were spent → cannot survive the burn
  state.stabilizers = 0;
  const lock = getBossLockState({ actions, state });
  assert.equal(lock.unlocked, true);
  const r = recordHeatDeathAttempt({ state, actions, rng: burnRng() });
  assert.notEqual(r.defeated, true, "thin reserves are overrun by the burn");
  assert.equal(state.boss.defeated, false);
  assert.equal(r.burn.survived, false);
}

console.log("stage8 boss tests passed");
