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

// Gate-message clarity (Issue 8): the lock exposes both quantities and the hint disambiguates the
// cumulative-earned gate from the in-hand balance the burn actually drains.
{
  const state = defaultState();
  state.cycle = MIN_CYCLE + 2;
  state.debris = [createDebris({ node: "F1", cycle: state.cycle - 1, tier: 4, value: 80, decay: 2 })];
  state.selectedDebrisId = state.debris[0].id;
  state.stormsSurvived = 3;
  const actions = actionHarness();
  archive(state, actions);
  state.totalStatesEarned = 600; // gate (cumulative) passes
  state.states = 30;             // but the in-hand balance the burn drains is thin
  const lock = getBossLockState({ actions, state });
  assert.equal(lock.unlocked, true);
  assert.equal(lock.inHandStates, 30, "lock exposes current balance");
  assert.ok(lock.burnEstimate > 0, "lock exposes a burn estimate");
  assert.ok(lock.inHandStates < lock.burnEstimate, "thin balance < burn cost");
  assert.ok(/CURRENT balance/.test(lock.hint), "hint warns the burn drains the CURRENT balance");
  assert.ok(lock.hint.includes(String(lock.inHandStates)) && lock.hint.includes(String(lock.burnEstimate)),
    "hint shows both numbers");

  // With ample in-hand reserves the hint flips to the endurable message (gate unchanged either way).
  state.states = lock.burnEstimate + 100;
  const lock2 = getBossLockState({ actions, state });
  assert.equal(lock2.unlocked, true, "gate threshold unchanged");
  assert.ok(/deep enough/.test(lock2.hint), "hint confirms reserves are deep enough");
}

console.log("stage8 boss tests passed");
