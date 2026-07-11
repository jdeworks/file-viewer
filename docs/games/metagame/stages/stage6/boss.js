// boss.js — Stage 6 codex un-cheat gate: the lock state + ch9-unlock for The Refused Connection.
//
// The OLD 3-button boss puzzle (playProtocolCard / start|endProtocolTurn / defeatRefusedConnection …)
// was retired in B2b — the boss is now a real-deck fight wired in boss-combat.js, gated by the
// `combat.acceptance` hook. This module keeps only the load-bearing un-cheat surface: read ch9 in the
// epub ⇒ unlock the negotiation. (renderer.js calls getBossLockState / applyProtocolChapter9Unlock.)
import {
  ACHIEVEMENT_ID,
  ACHIEVEMENT_TEXT,
  ACTION_NAME,
  bellMessages,
  combatLines,
  lockedHintLadder
} from "./messages.js";

export function hasProtocolChapter9(actions) {
  return Boolean(actions && typeof actions.hasAction === "function" && actions.hasAction(6, ACTION_NAME));
}

export function getBossLockState({ actions, state }) {
  const unlocked = hasProtocolChapter9(actions) || Boolean(state?.boss?.unlocked);
  const hintIndex = Math.min(Math.max(Number(state?.boss?.lockHintStep || 0), 0), lockedHintLadder.length - 1);
  // 2026-07-11 playtest fix: ch9 is an optional buff now, not a gate — the negotiation always accepts
  // a satisfied handshake (see boss-combat.js's accepts()); unread, the boss just carries more HP
  // (UNCH9_HP_MULT), a real but survivable difficulty cost, not a permanent mismatch.
  return {
    unlocked,
    defeated: Boolean(state?.boss?.defeated),
    status: unlocked ? "PROTOCOL MATCH NEGOTIABLE" : "PROTOCOL MISMATCH (tougher — unread)",
    mismatchPermanent: false,
    defeatPossible: true,
    phase: Number(state?.boss?.phase || 1),
    hint: unlocked ? bellMessages.unlock : lockedHintLadder[hintIndex]
  };
}

export function recordLockedBossAttempt(state) {
  const boss = state.boss;
  boss.reached = true;
  boss.attempts = Number(boss.attempts || 0) + 1;
  boss.lockHintStep = Math.min(Number(boss.lockHintStep || 0) + 1, lockedHintLadder.length - 1);
  pushLog(state, combatLines.lockedDeath);
  return getBossLockState({ actions: null, state });
}

export function applyProtocolChapter9Unlock({ state, achievements, bell }) {
  const boss = state.boss;
  const firstUnlock = !boss.unlocked;
  boss.unlocked = true;
  if (firstUnlock) {
    pushLog(state, bellMessages.unlock);
    notifyBell(bell, bellMessages.unlock, "stage6.protocol_ch9_read");
    unlockAchievement(achievements, ACHIEVEMENT_ID, {
      id: ACHIEVEMENT_ID,
      stage: 6,
      text: ACHIEVEMENT_TEXT,
      action: "6.protocol_ch9_read"
    });
  }
  return firstUnlock;
}

export function pushLog(state, line) {
  state.log = [...(state.log || []), line].slice(-8);
}

function notifyBell(bell, text, id) {
  if (bell && typeof bell.push === "function") bell.push({ id, stage: 6, text });
  else if (bell && typeof bell.say === "function") bell.say(text, { id, stage: 6 });
  else if (bell && typeof bell.add === "function") bell.add(text, { id, stage: 6 });
  else if (bell && typeof bell.showBell === "function") bell.showBell(id, text, { stage: 6 });
}

function unlockAchievement(achievements, id, detail) {
  if (achievements && typeof achievements.unlockAchievement === "function") {
    achievements.unlockAchievement(id, detail);
  } else if (achievements && typeof achievements.unlock === "function") {
    achievements.unlock(id, detail);
  }
}
