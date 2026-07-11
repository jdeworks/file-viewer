import assert from "node:assert/strict";
import {
  activateOfflineMode,
  getBossLockState,
  getBossSeed,
  offlineSolveElapsed,
  readServiceWorkerNotes,
  recordObserverBossAttempt
} from "../boss.js";
import { FIXED_OFFLINE_SEED } from "../messages.js";
import { defaultState } from "../state.js";

function actionHarness() {
  const set = new Set();
  const calls = [];
  return {
    calls,
    hasAction(stage, action) {
      return set.has(`${stage}.${action}`);
    },
    setAction(stage, action, detail) {
      set.add(`${stage}.${action}`);
      calls.push({ stage, action, detail });
    }
  };
}

{
  const state = defaultState();
  const actions = actionHarness();
  const lock = getBossLockState({ state, actions });
  assert.equal(lock.unlocked, false);
  assert.equal(lock.seedMode, "live-random");
  assert.equal(lock.defeatPossible, false);
}

{
  const state = defaultState();
  const actions = actionHarness();
  const blocked = activateOfflineMode({ state, actions });
  assert.equal(blocked.activated, false);
  assert.equal(blocked.reason, "notes-unread");
  const read = readServiceWorkerNotes({ state });
  assert.equal(read.controlVisible, true);
  const achievements = [];
  const activated = activateOfflineMode({
    state,
    actions,
    achievements: { unlockAchievement: (id) => achievements.push(id) }
  });
  assert.equal(activated.activated, true);
  assert.equal(actions.calls[0].action, "offline_mode_activated");
  assert.equal(actions.calls[0].detail.mode, "simulated-cache");
  assert.equal(achievements[0], "stage8.offline_mode_activated");
}

{
  const state = defaultState();
  const actions = actionHarness();
  const values = [0.11, 0.42, 0.89];
  const seeds = values.map((value) => getBossSeed({ state, actions, rng: () => value }));
  assert.notEqual(seeds[0], seeds[1]);
  assert.notEqual(seeds[1], seeds[2]);
  assert.equal(state.lockedSeedSamples.length, 3);
}

{
  const state = defaultState();
  const actions = actionHarness();
  readServiceWorkerNotes({ state });
  activateOfflineMode({ state, actions });
  const first = getBossSeed({ state, actions, rng: () => 0.77 });
  const second = getBossSeed({ state, actions, rng: () => 0.13 });
  assert.equal(first, FIXED_OFFLINE_SEED);
  assert.equal(second, FIXED_OFFLINE_SEED);
  const lock = getBossLockState({ state, actions });
  assert.equal(lock.unlocked, true);
  assert.equal(lock.rotation, "30deg/s predictable clockwise");
}

{
  const state = defaultState();
  const actions = actionHarness();
  // Online: locked, and the perfect offline timing does NOT help (seed reseeds each attempt).
  const fail = recordObserverBossAttempt({ state, actions, elapsedMs: offlineSolveElapsed() });
  assert.equal(fail.defeated, false);
  assert.equal(fail.unlocked, false);
  assert.equal(state.boss.attempts, 1);

  readServiceWorkerNotes({ state });
  activateOfflineMode({ state, actions });
  // Offline but MISTIMED (half a rotation off) ⇒ still fails — it's a real timing game now.
  const mistimed = recordObserverBossAttempt({ state, actions, elapsedMs: offlineSolveElapsed() + 4000 });
  assert.equal(mistimed.unlocked, true, "offline is unlocked");
  assert.equal(mistimed.defeated, false, "a mistimed cross still fails");
  // Offline + the learned timing ⇒ the gap is at the top ⇒ defeat.
  const win = recordObserverBossAttempt({ state, actions, elapsedMs: offlineSolveElapsed() });
  assert.equal(win.defeated, true);
  assert.equal(win.hit, true);
  assert.equal(state.boss.defeated, true);
  assert.equal(state.meta.btsAvailable, true);
}

console.log("stage8 boss tests passed");
