import { bellMessages, combatLines } from "./messages.js";

export function getBossLockState({ state }) {
  const boss = state?.run?.boss || {};
  return {
    defeated: Boolean(boss.defeated),
    phase: Number(boss.phase || 1),
    defeatPossible: true,
    hint: "each strike draws a counterattack. damage persists if you fall."
  };
}

export function recordBossAttempt(state) {
  const boss = state.run.boss;
  boss.reached = true;
  boss.attempts = Number(boss.attempts || 0) + 1;
  state.meta.bossAttempts = Number(state.meta.bossAttempts || 0) + 1;
  return getBossLockState({ state });
}

export function damageBoss({ state, amount = 50 }) {
  const boss = state.run.boss;
  if (boss.defeated) return { defeated: false, phaseChanged: false };
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
