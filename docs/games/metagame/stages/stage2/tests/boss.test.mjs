import {
  applySearchPassageUnlock,
  damageUnlockedBoss,
  getBossLockState,
  recordLockedBossAttempt
} from "../boss.js";
import { defaultState } from "../state.js";

let failed = 0;
const ok = (condition, message) => {
  console.log(`${condition ? "OK" : "FAIL"} ${message}`);
  if (!condition) failed += 1;
};

const lockedActions = { hasAction: () => false };
const unlockedActions = { hasAction: (stage, action) => stage === 2 && action === "search_passage" };

{
  const state = defaultState();
  const lock = getBossLockState({ actions: lockedActions, state });
  ok(lock.unlocked === false, "boss starts locked without 2.search_passage");
  ok(lock.projectileGapTiles === 0, "locked phase has no projectile gap");
  ok(lock.defeatPossible === false, "locked phase is not defeatable");
}

{
  const state = defaultState();
  recordLockedBossAttempt(state);
  recordLockedBossAttempt(state);
  const lock = getBossLockState({ actions: lockedActions, state });
  ok(state.run.boss.attempts === 2, "locked attempts are counted");
  ok(/cipher\.txt|passage|pattern/i.test(lock.hint), "hint ladder advances toward the search clue");
}

{
  const state = defaultState();
  const achievements = [];
  const bells = [];
  const first = applySearchPassageUnlock({
    state,
    achievements: { unlockAchievement: (id, detail) => achievements.push({ id, detail }) },
    bell: { push: (entry) => bells.push(entry) }
  });
  const second = applySearchPassageUnlock({
    state,
    achievements: { unlockAchievement: (id, detail) => achievements.push({ id, detail }) },
    bell: { push: (entry) => bells.push(entry) }
  });
  const lock = getBossLockState({ actions: unlockedActions, state });
  ok(first === true && second === false, "unlock transition is idempotent");
  ok(lock.unlocked === true, "2.search_passage unlocks the boss");
  ok(lock.projectileGapTiles === 2, "unlocked phase exposes a two-tile gap");
  ok(achievements.length === 1 && achievements[0].id === "stage2.search_passage", "achievement fires on action unlock");
  ok(bells.length === 1, "bell fires once on action unlock");
  ok(state.run.boss.defeated === false, "unlock does not auto-defeat the boss");
}

{
  const state = defaultState();
  state.run.boss.unlocked = true;
  state.run.boss.phase = 3;
  state.run.boss.hp = 20;
  const result = damageUnlockedBoss({ state, amount: 20 });
  ok(result.defeated === true, "unlocked phase 3 can be defeated");
  ok(state.meta.firstClearComplete === true, "defeat marks first clear in stage state");
  ok(state.meta.glyphsBanked === 25, "defeat grants 25 glyphs");
}

console.log(failed ? `\nSTAGE 2 BOSS FAILED (${failed})` : "\nSTAGE 2 BOSS PASSED");
if (failed) process.exit(1);
