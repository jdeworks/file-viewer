import {
  ACHIEVEMENT_ID,
  ACHIEVEMENT_TEXT,
  ACTION_NAME,
  bellMessages,
  combatLines,
  lockedHintLadder
} from "./messages.js";

const PHASE_HP = { 1: 60, 2: 80, 3: 60 };
const SIGNAL_DAMAGE = 30;

export function hasProtocolChapter9(actions) {
  return Boolean(actions && typeof actions.hasAction === "function" && actions.hasAction(6, ACTION_NAME));
}

export function getBossLockState({ actions, state }) {
  const unlocked = hasProtocolChapter9(actions) || Boolean(state?.boss?.unlocked);
  const hintIndex = Math.min(Math.max(Number(state?.boss?.lockHintStep || 0), 0), lockedHintLadder.length - 1);
  return {
    unlocked,
    defeated: Boolean(state?.boss?.defeated),
    status: unlocked ? "PROTOCOL MATCH NEGOTIABLE" : "PROTOCOL MISMATCH",
    mismatchPermanent: !unlocked,
    defeatPossible: unlocked,
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

export function startProtocolTurn(state) {
  state.boss.turn = {
    firstCard: null,
    playedAck: false,
    signalDamageThisTurn: 0
  };
}

export function playProtocolCard({ state, card }) {
  const boss = state.boss;
  const normalized = normalizeCard(card);
  boss.reached = true;

  if (boss.defeated) return { ok: false, reason: "defeated", damage: 0, phase: boss.phase };
  if (!boss.unlocked) {
    recordLockedBossAttempt(state);
    return { ok: false, reason: "locked", damage: 0, phase: boss.phase };
  }

  const turn = boss.turn || {};
  if (!turn.firstCard) turn.firstCard = normalized;
  if (normalized === "ACK") {
    turn.playedAck = true;
    boss.turn = turn;
    pushLog(state, phaseAckLine(boss.phase));
    return { ok: true, reason: "ack", damage: 0, phase: boss.phase };
  }

  let damage = 0;
  if (normalized === "Signal" || normalized === "SYN") {
    damage = acceptedSignalDamage({ phase: boss.phase, card: normalized, turn });
    if (damage === 0) pushLog(state, combatLines.mismatch);
    else applyBossDamage(state, damage);
  }

  boss.turn = turn;
  return { ok: damage > 0, reason: damage > 0 ? "accepted" : "mismatch", damage, phase: boss.phase };
}

export function endProtocolTurn(state) {
  const boss = state.boss;
  if (!boss.unlocked || boss.defeated) return { penalty: 0 };
  if (boss.phase !== 3) {
    startProtocolTurn(state);
    return { penalty: 0 };
  }
  const acknowledged = Boolean(boss.turn?.playedAck);
  startProtocolTurn(state);
  if (acknowledged) return { penalty: 0 };
  pushLog(state, "no ACK this turn. 8 ongoing damage returns through the protocol.");
  return { penalty: 8 };
}

export function defeatRefusedConnection(state) {
  const boss = state.boss;
  if (!boss.unlocked || boss.defeated) return false;
  boss.defeated = true;
  state.handshakes = Number(state.handshakes || 0) + 80;
  state.meta.firstClearComplete = true;
  pushLog(state, combatLines.defeated);
  return true;
}

export function pushLog(state, line) {
  state.log = [...(state.log || []), line].slice(-8);
}

function acceptedSignalDamage({ phase, card, turn }) {
  if (phase === 1) return turn.firstCard === "SYN" ? SIGNAL_DAMAGE : 0;
  if (phase === 2) return turn.playedAck ? SIGNAL_DAMAGE : 0;
  if (phase === 3) return SIGNAL_DAMAGE;
  return card === "SYN" ? SIGNAL_DAMAGE : 0;
}

function applyBossDamage(state, amount) {
  const boss = state.boss;
  boss.hp = Math.max(0, Number(boss.hp || PHASE_HP[boss.phase] || 60) - amount);
  pushLog(state, `${amount} protocol damage accepted.`);
  if (boss.hp > 0) return;
  if (boss.phase < 3) {
    boss.phase += 1;
    boss.hp = PHASE_HP[boss.phase];
    startProtocolTurn(state);
    pushLog(state, boss.phase === 2 ? bellMessages.phase2 : bellMessages.phase3);
    return;
  }
  defeatRefusedConnection(state);
}

function normalizeCard(card) {
  const value = String(card || "").trim().toLowerCase();
  if (value === "syn") return "SYN";
  if (value === "ack") return "ACK";
  return "Signal";
}

function phaseAckLine(phase) {
  if (phase === 2) return combatLines.ackSignal;
  if (phase === 3) return combatLines.ackOngoing;
  return combatLines.synFirst;
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
