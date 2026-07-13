import assert from "node:assert/strict";
import {
  applyProtocolChapter9Unlock,
  getBossLockState,
  recordLockedBossAttempt
} from "../boss.js";
import { defaultState } from "../state.js";

// The boss is a real-deck fight (boss-combat.js) gated by the ch9 un-cheat. This suite covers ONLY the
// surviving lock surface — the retired 3-button puzzle (playProtocolCard / start|endProtocolTurn /
// defeatRefusedConnection) was deleted in round-4 (it had been dead since B2b).
const lockedActions = { hasAction: () => false };
const unlockedActions = { hasAction: (stage, action) => stage === 5 && action === "protocol_ch9_read" };

// 2026-07-11 playtest fix: ch9 unread ⇒ a tougher fight (bigger HP pools, boss-combat.js's
// UNCH9_HP_MULT), not a permanent mismatch — the boss is always defeatable.
{
  const state = defaultState();
  const lock = getBossLockState({ actions: lockedActions, state });
  assert.equal(lock.unlocked, false);
  assert.match(lock.status, /MISMATCH/);
  assert.equal(lock.mismatchPermanent, false);
  assert.equal(lock.defeatPossible, true);
}

// Repeated locked attempts escalate the hint ladder.
{
  const state = defaultState();
  recordLockedBossAttempt(state);
  recordLockedBossAttempt(state);
  const lock = getBossLockState({ actions: lockedActions, state });
  assert.equal(state.boss.attempts, 2);
  assert.match(lock.hint, /Chapter 9|protocol/i);
}

// Reading ch9 unlocks the negotiation once (idempotent): fires the bell + achievement a single time.
{
  const state = defaultState();
  const achievements = [];
  const bells = [];
  const first = applyProtocolChapter9Unlock({
    state,
    achievements: { unlockAchievement: (id, detail) => achievements.push({ id, detail }) },
    bell: { push: (entry) => bells.push(entry) }
  });
  const second = applyProtocolChapter9Unlock({
    state,
    achievements: { unlockAchievement: (id, detail) => achievements.push({ id, detail }) },
    bell: { push: (entry) => bells.push(entry) }
  });
  const lock = getBossLockState({ actions: unlockedActions, state });
  assert.equal(first, true);
  assert.equal(second, false);
  assert.equal(lock.unlocked, true);
  assert.equal(lock.defeatPossible, true);
  assert.equal(state.boss.defeated, false);
  assert.equal(achievements.length, 1);
  assert.equal(bells.length, 1);
}

console.log("stage5 boss tests passed");
