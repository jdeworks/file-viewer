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

// 2026-07-11 playtest fix: the diff-key restoration key is a genuine random 9-char (3×3 base-36
// chunk) value — blind-guessing it is astronomically improbable (36^9 combinations), so without
// diffing the logs the fight used to be a real dead end, not just "hard." It's now an optional buff:
// wrong submissions beyond the static hint ladder start leaking real characters of the actual key
// (one more per wrong attempt), so a determined player who never opens the diff viewer can eventually
// grind the whole key out through repeated guesses — slow and effortful, but always convergent.
// Diffing the logs stays the fast path (skip straight to the full key in one read).
const REVEAL_START_ATTEMPT = lockedHintLadder.length; // static hints exhausted, then reveals begin
const KEY_LENGTH = 9;

function revealedKey(state, count) {
  const key = diffKeyFromState(state);
  const shown = key.slice(0, Math.max(0, Math.min(KEY_LENGTH, count)));
  return shown.padEnd(KEY_LENGTH, '?');
}

export function getBossLockState({ actions, state }) {
  const keyRestored = hasDiffKeyRestored(actions) || Boolean(state?.boss?.unlocked);
  const bodyReady = bodyComplete(state);
  const unlocked = keyRestored && bodyReady; // BOTH the played body AND the diff buff
  const attempts = Number(state?.boss?.attempts || 0);
  const hintIndex = Math.min(Math.max(Number(state?.boss?.lockHintStep || 0), 0), lockedHintLadder.length - 1);
  const revealCount = bodyReady && !keyRestored ? Math.max(0, attempts - REVEAL_START_ATTEMPT) : 0;
  const revealHint = revealCount > 0
    ? `key so far, from wrong attempts: ${revealedKey(state, revealCount)} — ${Math.max(0, KEY_LENGTH - revealCount)} character(s) still unknown (or diff the logs to read it outright).`
    : lockedHintLadder[hintIndex];
  return {
    unlocked,
    bodyReady,
    keyRestored,
    defeated: Boolean(state?.boss?.defeated),
    corruptionRate: unlocked ? 'normal' : 'accelerated',
    columnClues: unlocked ? 'restored' : 'missing',
    // The fight is attemptable — and, with enough persistence, winnable — the moment the body is
    // done; the diff buff is no longer required, just a much faster path.
    defeatPossible: bodyReady,
    hint: !bodyReady ? bodyHint : (keyRestored ? bellMessages.unlock : revealHint),
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
    pushLog(state, 'wrong restoration key. but the attempt wasn\'t wasted — check the hint, another character just surfaced.');
    return { ok: false, expected };
  }

  state.boss.unlocked = true;
  actions?.setAction?.(3, ACTION_NAME, {
    source: 'stage-boss',
    files: ['memory_v1.log', 'memory_v2.log', 'memory_v3.log'],
    diffActionSeen: true,
    threeWay: true,
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
