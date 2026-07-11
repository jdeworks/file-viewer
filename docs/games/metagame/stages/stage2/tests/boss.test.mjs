import {
  applySearchPassageUnlock,
  damageBoss,
  getBossLockState,
  recordBossAttempt
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
  ok(lock.unlocked === false, "boss starts locked (no buff) without 2.search_passage");
  ok(lock.projectileGapTiles === 0, "locked phase has no projectile gap (cosmetic)");
  // 2026-07-11 playtest fix: PASSAGE is an optional buff now, not a gate — the boss is always
  // defeatable once reached, just harder/riskier without it.
  ok(lock.defeatPossible === true, "boss is defeatable even before PASSAGE is found");
}

{
  const state = defaultState();
  recordBossAttempt(state);
  recordBossAttempt(state);
  const lock = getBossLockState({ actions: lockedActions, state });
  ok(state.run.boss.attempts === 2, "attempts are counted");
  ok(/cipher\.txt|passage|pattern/i.test(lock.hint), "hint ladder advances toward the search clue");
}

{
  // A real fight is winnable even without PASSAGE — damageBoss no longer gates on `unlocked`.
  const state = defaultState();
  state.run.boss.phase = 3;
  state.run.boss.hp = 20;
  const result = damageBoss({ state, amount: 20 });
  ok(result.defeated === true, "boss phase 3 can be defeated without ever finding PASSAGE");
  ok(state.meta.firstClearComplete === true, "defeat marks first clear in stage state");
  ok(state.meta.glyphsBanked === 25, "defeat grants 25 glyphs");
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

console.log(failed ? `\nSTAGE 2 BOSS FAILED (${failed})` : "\nSTAGE 2 BOSS PASSED");
if (failed) process.exit(1);
