import { bellMessages, bodyHint } from './messages.js';

// The body must be PLAYED to its end before the boss is reachable: corruption must have peaked at 8
// through actual snapshot solving (state.boss.corruption8Reached), set only in renderer.onSolved.
// No path sets this from a button. This is the "boss never from start" guard.
export function bodyComplete(state) {
  return Boolean(state?.boss?.corruption8Reached);
}

export function getBossLockState({ state }) {
  const bodyReady = bodyComplete(state);
  return {
    unlocked: bodyReady,
    bodyReady,
    defeated: Boolean(state?.boss?.defeated),
    defeatPossible: bodyReady,
    hint: bodyReady ? bellMessages.ready : bodyHint,
  };
}

export function defeatMemoryLeak(state) {
  if (!bodyComplete(state) || state.boss.defeated) return false;
  state.boss.defeated = true;
  state.registers += 120;
  state.retained = Math.max(state.retained, 1);
  pushLog(state, bellMessages.defeated);
  return true;
}

export function pushLog(state, line) {
  state.log = [...(state.log || []), line].slice(-8);
}
