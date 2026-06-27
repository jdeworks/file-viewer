import { ACHIEVEMENT_ID, ACHIEVEMENT_TEXT, ACTION_NAME, bellMessages, bodyHint, lockedHintLadder } from './messages.js';
import { diffKeyFromState } from './content.js';

export function hasDiffKeyRestored(actions) {
  return Boolean(actions && typeof actions.hasAction === 'function' && actions.hasAction(3, ACTION_NAME));
}

// The body must be PLAYED to its end before the boss is reachable: corruption must have peaked at 8
// through actual snapshot solving (state.boss.corruption8Reached), set only in renderer.onSolved.
// No path sets this from a button. This is the "boss never from start" guard.
export function bodyComplete(state) {
  return Boolean(state?.boss?.corruption8Reached);
}

export function getBossLockState({ actions, state }) {
  const keyRestored = hasDiffKeyRestored(actions) || Boolean(state?.boss?.unlocked);
  const bodyReady = bodyComplete(state);
  const unlocked = keyRestored && bodyReady; // BOTH the played body AND the diff un-cheat
  const hintIndex = Math.min(Math.max(Number(state?.boss?.lockHintStep || 0), 0), lockedHintLadder.length - 1);
  return {
    unlocked,
    bodyReady,
    keyRestored,
    defeated: Boolean(state?.boss?.defeated),
    corruptionRate: unlocked ? 'normal' : 'accelerated',
    columnClues: unlocked ? 'restored' : 'missing',
    defeatPossible: unlocked,
    hint: !bodyReady ? bodyHint : (keyRestored ? bellMessages.unlock : lockedHintLadder[hintIndex]),
  };
}

export function tryRestoreDiffKey({ state, actions, achievements, bell, input }) {
  const expected = diffKeyFromState(state);
  const normalized = String(input || '').trim();
  state.boss.attempts = Number(state.boss.attempts || 0) + 1;
  // Gate: a key is not even accepted until the body is complete — restoring early can never unlock.
  if (!bodyComplete(state)) {
    pushLog(state, bodyHint);
    return { ok: false, locked: true, expected };
  }
  if (normalized !== expected) {
    state.boss.lockHintStep = Math.min(Number(state.boss.lockHintStep || 0) + 1, lockedHintLadder.length - 1);
    pushLog(state, 'wrong restoration key. the leak keeps the columns hidden.');
    return { ok: false, expected };
  }

  state.boss.unlocked = true;
  actions?.setAction?.(3, ACTION_NAME, {
    source: 'stage-boss',
    files: ['memory_v1.log', 'memory_v2.log'],
    diffActionSeen: true,
    keyId: state.memoryPair.runId,
  });
  achievements?.unlockAchievement?.(ACHIEVEMENT_ID, {
    stage: 3,
    title: ACHIEVEMENT_TEXT,
    detail: { keyId: state.memoryPair.runId },
  });
  bell?.showBell?.('stage3.diff_key_restored', bellMessages.unlock, { stage: 3 });
  pushLog(state, bellMessages.unlock);
  return { ok: true, expected };
}

export function defeatMemoryLeak(state) {
  if (!state.boss.unlocked || !bodyComplete(state) || state.boss.defeated) return false;
  state.boss.defeated = true;
  state.registers += 120;
  state.retained = Math.max(state.retained, 1);
  pushLog(state, bellMessages.defeated);
  return true;
}

export function pushLog(state, line) {
  state.log = [...(state.log || []), line].slice(-8);
}
