import assert from "node:assert/strict";
import {
  applyExifContradictionUnlock,
  commitIdentity,
  getBossLockState,
  inspectContradictoryExif,
  recordLockedBossAttempt
} from "../boss.js";
import { defaultState } from "../state.js";

const lockedActions = { hasAction: () => false };
const unlockedActions = { hasAction: (stage, action) => stage === 7 && action === "exif_contradiction_found" };

{
  const state = defaultState();
  const lock = getBossLockState({ actions: lockedActions, state });
  assert.equal(lock.unlocked, false);
  assert.equal(lock.informationState, "A/F unresolved");
  assert.equal(lock.defeatPossible, false);
  assert.equal(commitIdentity({ state, entity: "A" }).reason, "not-yet-boss", "no commit before the boss substage");
  state.substage = 5;
  assert.equal(commitIdentity({ state, entity: "A" }).reason, "locked", "at the boss but exif not yet inspected");
  assert.equal(state.boss.defeated, false);
}

{
  const state = defaultState();
  recordLockedBossAttempt(state);
  recordLockedBossAttempt(state);
  const lock = getBossLockState({ actions: lockedActions, state });
  assert.equal(state.boss.attempts, 2);
  assert.match(lock.hint, /photo|metadata|Entity F/i);
}

{
  const state = defaultState();
  const achievements = [];
  const bells = [];
  const first = applyExifContradictionUnlock({
    state,
    achievements: { unlockAchievement: (id, detail) => achievements.push({ id, detail }) },
    bell: { push: (entry) => bells.push(entry) }
  });
  const second = applyExifContradictionUnlock({
    state,
    achievements: { unlockAchievement: (id, detail) => achievements.push({ id, detail }) },
    bell: { push: (entry) => bells.push(entry) }
  });
  const lock = getBossLockState({ actions: unlockedActions, state });
  assert.equal(first, true);
  assert.equal(second, false);
  assert.equal(lock.unlocked, true);
  assert.deepEqual(state.evidence.contradicted, ["F"]);
  assert.equal(state.boss.defeated, false);
  assert.equal(achievements.length, 1);
  assert.equal(bells.length, 1);
}

{
  const state = defaultState();
  const actions = [];
  const wrongField = inspectContradictoryExif({
    state,
    actions: { setAction: (...args) => actions.push(args) },
    field: "Software",
    entity: "F"
  });
  assert.equal(wrongField.ok, false);
  assert.equal(actions.length, 0);
  assert.equal(state.boss.unlocked, false);

  const result = inspectContradictoryExif({
    state,
    actions: { setAction: (...args) => actions.push(args) },
    field: "GPSInfo",
    entity: "F"
  });
  assert.equal(result.ok, true);
  assert.equal(actions[0][0], 7);
  assert.equal(actions[0][1], "exif_contradiction_found");
  assert.deepEqual(state.evidence.contradicted, ["F"]);
}

{
  const state = defaultState();
  state.substage = 5;
  state.boss.unlocked = true;
  state.evidence.contradicted = ["F"];
  const wrong = commitIdentity({ state, entity: "F" });
  assert.equal(wrong.ok, false);
  assert.equal(wrong.reason, "wrong-entity");
  assert.equal(state.boss.defeated, false);
  const right = commitIdentity({ state, entity: "A" });
  assert.equal(right.ok, true);
  assert.equal(state.boss.defeated, true);
  assert.equal(state.meta.firstClearComplete, true);
  assert.equal(state.addresses, 150);
}

console.log("stage7 boss tests passed");
