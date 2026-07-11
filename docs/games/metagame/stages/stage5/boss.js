import { ACTION_NAME, bellMessages, lockedHintLadder } from './messages.js';

export function hasCounterWave(actions) {
  return Boolean(actions && typeof actions.hasAction === 'function' && actions.hasAction(5, ACTION_NAME));
}

export function getBossLockState({ actions, state }) {
  const unlocked = hasCounterWave(actions);
  const boss = state?.boss || {};
  const hintIndex = Math.min(Math.max(Number(boss.lockHintStep || 0), 0), lockedHintLadder.length - 1);
  return {
    unlocked,
    defeated: Boolean(boss.defeated),
    jammerSuppression: unlocked ? 'canceled' : 'dominant',
    playerCounterWave: unlocked ? 'phase-inverted' : 'absent',
    // 2026-07-11 playtest fix: calibration is a buff (it cancels the suppression drain outright, see
    // game-loop.js), not a hard requirement — the boss race is always attemptable/winnable, just far
    // harder (near-maxed Hull + Engine, near-flawless play) without it.
    defeatPossible: true,
    hint: unlocked ? bellMessages.unlock : lockedHintLadder[hintIndex],
  };
}

// The actual fight is the real race (game-loop.js), exactly like every other round — calibration only
// changes how survivable it is (the suppression drain), it no longer gates the win after the fact.
// Called from renderer.js's handleEnd once the race itself reports a clean finish.
export function raceTheJammer({ state, actions }) {
  const lock = getBossLockState({ actions, state });
  state.boss.reached = true;
  state.boss.attempts = Number(state.boss.attempts || 0) + 1;
  if (!lock.unlocked) {
    state.boss.lockHintStep = Math.min(Number(state.boss.lockHintStep || 0) + 1, lockedHintLadder.length - 1);
  }
  state.boss.defeated = true;
  if (state.run) state.run.roundComplete = true;
  state.packets += 100;
  pushLog(state, bellMessages.defeated);
  return { defeated: true, locked: false };
}

export function pushLog(state, line) {
  state.log = [...(state.log || []), line].slice(-8);
}
