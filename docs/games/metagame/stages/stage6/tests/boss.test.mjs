import assert from "node:assert/strict";
import {
  applyProtocolChapter9Unlock,
  endProtocolTurn,
  getBossLockState,
  playProtocolCard,
  recordLockedBossAttempt,
  startProtocolTurn
} from "../boss.js";
import { defaultState } from "../state.js";

const lockedActions = { hasAction: () => false };
const unlockedActions = { hasAction: (stage, action) => stage === 6 && action === "protocol_ch9_read" };

{
  const state = defaultState();
  const lock = getBossLockState({ actions: lockedActions, state });
  assert.equal(lock.unlocked, false);
  assert.equal(lock.status, "PROTOCOL MISMATCH");
  assert.equal(lock.mismatchPermanent, true);
  assert.equal(lock.defeatPossible, false);
  assert.equal(playProtocolCard({ state, card: "SYN" }).damage, 0);
}

{
  const state = defaultState();
  recordLockedBossAttempt(state);
  recordLockedBossAttempt(state);
  const lock = getBossLockState({ actions: lockedActions, state });
  assert.equal(state.boss.attempts, 2);
  assert.match(lock.hint, /Chapter 9|protocol/i);
}

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

{
  const state = defaultState();
  state.boss.unlocked = true;
  assert.equal(playProtocolCard({ state, card: "Signal" }).damage, 0);
  startProtocolTurn(state);
  assert.equal(playProtocolCard({ state, card: "SYN" }).damage, 30);
}

{
  const state = defaultState();
  state.boss.unlocked = true;
  state.boss.phase = 2;
  state.boss.hp = 80;
  assert.equal(playProtocolCard({ state, card: "Signal" }).damage, 0);
  startProtocolTurn(state);
  playProtocolCard({ state, card: "ACK" });
  assert.equal(playProtocolCard({ state, card: "Signal" }).damage, 30);
}

{
  const state = defaultState();
  state.boss.unlocked = true;
  state.boss.phase = 3;
  assert.equal(endProtocolTurn(state).penalty, 8);
  playProtocolCard({ state, card: "ACK" });
  assert.equal(endProtocolTurn(state).penalty, 0);
}

{
  const state = defaultState();
  state.boss.unlocked = true;
  state.boss.phase = 3;
  state.boss.hp = 30;
  const result = playProtocolCard({ state, card: "Signal" });
  assert.equal(result.damage, 30);
  assert.equal(state.boss.defeated, true);
  assert.equal(state.meta.firstClearComplete, true);
  assert.equal(state.handshakes, 80);
}

console.log("stage6 boss tests passed");
