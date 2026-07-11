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
  // 2026-07-11 playtest fix: the EXIF read is an optional buff now, not a gate — the boss is always
  // defeatPossible, even with zero EXIF progress (a determined investigator can accuse their way there).
  assert.equal(lock.defeatPossible, true);
  assert.equal(commitIdentity({ state, entity: "A" }).reason, "not-yet-boss", "no commit before the boss substage");
  state.substage = 5;
  assert.equal(commitIdentity({ state, entity: "A" }).reason, "not-yet-boss", "Case 2 accusation (5) is still before the boss");
  state.substage = 6;
  assert.equal(commitIdentity({ state, entity: "A" }).reason, "not-yet-boss", "Case 3 accusation (6) is still before the boss");
  state.substage = 7;
  // A correct accusation wins EVEN with zero EXIF progress — it's no longer refused outright.
  const win = commitIdentity({ state, entity: "A" });
  assert.equal(win.ok, true, "a correct accusation wins even before the EXIF is ever inspected");
  assert.equal(state.boss.defeated, true);
}

{
  // A wrong accusation before the EXIF read is a real, costly setback (not a free non-attempt): it
  // eliminates the accused entity and costs addresses — never a dead-end refusal.
  const state = defaultState();
  state.substage = 7;
  state.addresses = 100;
  const wrong = commitIdentity({ state, entity: "B" });
  assert.equal(wrong.ok, false);
  assert.equal(wrong.reason, "wrong-entity");
  assert.equal(state.boss.defeated, false);
  assert.equal(state.addresses, 90, "wrong accusation costs the same 10-address penalty as Case 2/3");
  assert.deepEqual(state.evidence.contradicted, ["B"], "the wrong entity is eliminated, same marker the EXIF buff uses");
  // The field is genuinely narrowable: eliminate every wrong entity in turn, then win on A.
  for (const bad of ["C", "D", "E", "F"]) commitIdentity({ state, entity: bad });
  assert.deepEqual(state.evidence.contradicted.sort(), ["B", "C", "D", "E", "F"], "all five wrong entities eliminated through costly accusations alone");
  const finalWin = commitIdentity({ state, entity: "A" });
  assert.equal(finalWin.ok, true, "A still wins after grinding out every wrong entity blind");
  assert.equal(state.addresses, 200, "50 left after 5 penalties, +150 defeat reward on the final correct commit");
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
  state.substage = 7;
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
