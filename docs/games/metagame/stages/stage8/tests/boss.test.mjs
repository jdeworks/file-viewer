import assert from "node:assert/strict";
import {
  archiveSelectedDebris,
  getBossLockState,
  handleDebrisDrop,
  recordHeatDeathAttempt
} from "../boss.js";
import { SALVAGE_REQUIRED } from "../messages.js";
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
  const lock = getBossLockState({ actions, state });
  assert.equal(lock.unlocked, false);
  assert.equal(lock.actionReady, false);
  assert.equal(lock.defeatPossible, false);
}

{
  const state = defaultState();
  const actions = actionHarness();
  const achievements = [];
  const bells = [];
  const drag = handleDebrisDrop({
    state,
    actions,
    achievements: { unlockAchievement: (id) => achievements.push(id) },
    bell: { push: (entry) => bells.push(entry) },
    debrisId: "node_p1_cycle14.sav",
    targetPath: "/entropy/active_archive/"
  });
  assert.equal(drag.archived, true);
  assert.equal(actions.calls[0].action, "salvage_archived");
  assert.equal(actions.calls[0].detail.fallback, false);
  assert.equal(achievements[0], "stage8.salvage_archived");
  assert.equal(bells.length, 1);

  const fallback = archiveSelectedDebris({ state, actions });
  assert.equal(fallback.archived, true);
  assert.equal(actions.calls[1].detail.fallback, true);
  assert.equal(actions.calls[1].detail.source, "archive-button");
  assert.equal(state.archive.length, 2);
}

{
  const state = defaultState();
  const actions = actionHarness();
  const keyboard = archiveSelectedDebris({ state, actions, source: "keyboard-archive-target" });
  assert.equal(keyboard.archived, true);
  assert.equal(actions.calls[0].detail.fallback, true);
  assert.equal(actions.calls[0].detail.source, "keyboard-archive-target");
}

{
  const state = defaultState();
  const actions = actionHarness();
  archiveSelectedDebris({ state, actions });
  const lock = getBossLockState({ actions, state });
  assert.equal(lock.actionReady, true);
  assert.equal(lock.enoughSalvage, state.salvageTotal >= SALVAGE_REQUIRED);
  assert.equal(lock.unlocked, state.salvageTotal >= SALVAGE_REQUIRED);
}

{
  const state = defaultState();
  const actions = actionHarness();
  const failed = recordHeatDeathAttempt({ state, actions });
  assert.equal(failed.defeated, false);
  assert.equal(failed.canRewindWarningCheckpoint, true);
  assert.equal(state.boss.firstFailureRewound, true);
  assert.equal(state.cycle, 9);
}

{
  const state = defaultState();
  const actions = actionHarness();
  archiveSelectedDebris({ state, actions });
  archiveSelectedDebris({ state, actions });
  const lock = getBossLockState({ actions, state });
  assert.equal(lock.unlocked, true);
  const result = recordHeatDeathAttempt({ state, actions });
  assert.equal(result.defeated, true);
  assert.equal(state.boss.defeated, true);
  assert.equal(state.meta.btsAvailable, true);
}

console.log("stage8 boss tests passed");
