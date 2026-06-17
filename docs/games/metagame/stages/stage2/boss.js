import {
  ACHIEVEMENT_ID,
  ACHIEVEMENT_TEXT,
  ACTION_NAME,
  bellMessages,
  combatLines,
  lockedHintLadder
} from "./messages.js";

export function hasSearchPassage(actions) {
  return Boolean(actions && typeof actions.hasAction === "function" && actions.hasAction(2, ACTION_NAME));
}

export function getBossLockState({ actions, state }) {
  const unlocked = hasSearchPassage(actions);
  const boss = state?.run?.boss || {};
  const hintIndex = Math.min(Math.max(Number(boss.lockHintStep || 0), 0), lockedHintLadder.length - 1);
  return {
    unlocked,
    defeated: Boolean(boss.defeated),
    phase: unlocked ? Math.max(Number(boss.phase || 1), 2) : Number(boss.phase || 1),
    northPillar: unlocked ? "active" : "silent",
    projectileGapTiles: unlocked ? 2 : 0,
    defeatPossible: unlocked,
    hint: unlocked ? combatLines.unlocked : lockedHintLadder[hintIndex]
  };
}

export function recordLockedBossAttempt(state) {
  const boss = state.run.boss;
  boss.reached = true;
  boss.attempts = Number(boss.attempts || 0) + 1;
  boss.lockHintStep = Math.min(Number(boss.lockHintStep || 0) + 1, lockedHintLadder.length - 1);
  state.meta.bossAttempts = Number(state.meta.bossAttempts || 0) + 1;
  pushCombatLine(state, combatLines.lockedDeath);
  return getBossLockState({ actions: null, state });
}

export function applySearchPassageUnlock({ state, achievements, bell }) {
  const boss = state.run.boss;
  const firstUnlock = !boss.unlocked;
  boss.unlocked = true;
  boss.phase = Math.max(Number(boss.phase || 1), 2);
  if (firstUnlock) {
    pushCombatLine(state, combatLines.unlocked);
    notifyBell(bell, bellMessages.unlock, "stage2.search_passage");
    unlockAchievement(achievements, ACHIEVEMENT_ID, {
      id: ACHIEVEMENT_ID,
      stage: 2,
      text: ACHIEVEMENT_TEXT,
      action: "2.search_passage"
    });
  }
  return firstUnlock;
}

export function damageUnlockedBoss({ state, amount = 50 }) {
  const boss = state.run.boss;
  if (!boss.unlocked || boss.defeated) return { defeated: false, phaseChanged: false };
  const beforePhase = boss.phase;
  boss.hp = Math.max(0, Number(boss.hp || 150) - amount);
  if (boss.hp === 0 && boss.phase < 3) {
    boss.phase += 1;
    boss.hp = boss.phase === 3 ? 100 : 150;
    pushCombatLine(state, boss.phase === 3 ? bellMessages.phase3 : bellMessages.phase2);
  } else if (boss.hp === 0) {
    boss.defeated = true;
    state.meta.firstClearComplete = true;
    state.meta.glyphsBanked = Number(state.meta.glyphsBanked || 0) + 25;
    pushCombatLine(state, combatLines.defeated);
  }
  return { defeated: boss.defeated, phaseChanged: beforePhase !== boss.phase };
}

export function pushCombatLine(state, line) {
  state.run.combatLog = [...(state.run.combatLog || []), line].slice(-6);
}

function notifyBell(bell, text, id) {
  if (bell && typeof bell.push === "function") bell.push({ id, stage: 2, text });
  else if (bell && typeof bell.say === "function") bell.say(text, { id, stage: 2 });
  else if (bell && typeof bell.add === "function") bell.add(text, { id, stage: 2 });
}

function unlockAchievement(achievements, id, detail) {
  if (achievements && typeof achievements.unlockAchievement === "function") {
    achievements.unlockAchievement(id, detail);
  } else if (achievements && typeof achievements.unlock === "function") {
    achievements.unlock(id, detail);
  }
}
