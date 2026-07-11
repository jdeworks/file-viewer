import assert from "node:assert/strict";
import {
  activateOfflineMode,
  getBossLockState,
  getBossSeed,
  offlineSolveElapsed,
  readServiceWorkerNotes,
  recordObserverBossAttempt
} from "../boss.js";
import { solveMoment, BOSS_LEVEL } from "../game.js";
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
  // 2026-07-11 playtest fix: offline mode is an optional buff now, not a gate — the boss is always
  // defeatPossible, even online (a live read of the current, unlearnable-in-advance seed can land it).
  const state = defaultState();
  const actions = actionHarness();
  const lock = getBossLockState({ state, actions });
  assert.equal(lock.unlocked, false);
  assert.equal(lock.seedMode, "live-random");
  assert.equal(lock.defeatPossible, true);
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
  // 2026-07-11 playtest fix: online, a press is genuinely evaluated against whatever seed the
  // renderer says is CURRENTLY on screen (passed explicitly here, matching activeSeed()'s contract) —
  // a live read of that exact seed's timing lands the gap even before offline mode.
  const state = defaultState();
  const actions = actionHarness();
  const liveSeed = 424242;
  const liveOptimal = solveMoment(liveSeed, BOSS_LEVEL);

  // Mistimed against the live seed ⇒ still fails (it's a real timing game either way).
  const mistimed = recordObserverBossAttempt({ state, actions, elapsedMs: liveOptimal + 4000, seed: liveSeed });
  assert.equal(mistimed.defeated, false);
  assert.equal(mistimed.unlocked, false);
  assert.equal(state.boss.attempts, 1);

  // A live read of the SAME seed's optimal timing lands it — online, with zero offline progress.
  const liveWin = recordObserverBossAttempt({ state, actions, elapsedMs: liveOptimal, seed: liveSeed });
  assert.equal(liveWin.hit, true, "a correctly-timed press against the live seed lands, even online");
  assert.equal(liveWin.defeated, true);
  assert.equal(liveWin.unlocked, false, "won without ever activating offline mode");
  assert.equal(state.boss.defeated, true);
}

{
  // Old timing memorized against a PAST live seed does NOT carry over to a fresh online attempt —
  // the reseed-per-attempt behavior (no advance memorization) is preserved.
  const state = defaultState();
  const actions = actionHarness();
  const staleOptimal = solveMoment(FIXED_OFFLINE_SEED, BOSS_LEVEL); // "memorized" from a different seed
  const otherLiveSeed = 999999;
  const fail = recordObserverBossAttempt({ state, actions, elapsedMs: staleOptimal, seed: otherLiveSeed });
  assert.equal(fail.defeated, false, "a timing memorized for a different seed doesn't transfer");
  assert.equal(fail.unlocked, false);
}

{
  const state = defaultState();
  const actions = actionHarness();
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
