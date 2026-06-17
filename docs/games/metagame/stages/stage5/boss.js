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
    defeatPossible: unlocked,
    hint: unlocked ? bellMessages.unlock : lockedHintLadder[hintIndex],
  };
}

export function raceTheJammer({ state, actions }) {
  const lock = getBossLockState({ actions, state });
  state.boss.reached = true;
  state.boss.attempts = Number(state.boss.attempts || 0) + 1;
  if (!lock.unlocked) {
    state.boss.lockHintStep = Math.min(Number(state.boss.lockHintStep || 0) + 1, lockedHintLadder.length - 1);
    pushLog(state, 'suppression wave holds the throttle down.');
    return { defeated: false, locked: true };
  }
  state.boss.defeated = true;
  state.race.position = 1;
  state.race.jammerOffsetMs = 1200;
  state.packets += 100;
  pushLog(state, bellMessages.defeated);
  return { defeated: true, locked: false };
}

export function pushLog(state, line) {
  state.log = [...(state.log || []), line].slice(-8);
}
