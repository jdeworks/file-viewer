// s5dev.js — Stage 5 Signal Racer: dev-menu cheat mutations (pure state-in, mutate).
// No DOM, no timers, no Math.random, no Date.now. Fully Node-testable.
// DOM side-effects (repaint, save) are always the caller's responsibility.

import { ACTION_NAME } from './messages.js';
import { ROUND_COUNT } from './rounds.js';

// Boss-round index (0-based). clearedRounds must reach this value for the boss button to unlock.
export const BOSS_IDX = ROUND_COUNT - 1; // 8

// ── individual cheats ──────────────────────────────────────────────────────────────────────────────

// Add currency. Deterministic — no randomness.
export function devGivePackets(state, amount = 200) {
  state.packets = Number(state.packets || 0) + amount;
}

// Restore hull to full integrity.
export function devRepair(state) {
  state.run.integrity = 100;
}

// Unlock the boss-round button by marking every body round as cleared.
// Mirrors exactly what startRound / handleEnd accumulate over a natural run.
export function devClearAllRounds(state, bossIdx = BOSS_IDX) {
  state.run.clearedRounds = bossIdx;
}

// Register the counter-wave calibration: mirrors what applyCalibrationTick does at the loop threshold.
// Calls actions.setAction so getBossLockState (which reads actions.hasAction) sees the unlock.
export function devInstantCalibrate(state, actions) {
  const loopMs = Number(state.calibration?.loopMs) || 14000;
  state.calibration.calibrated = true;
  state.calibration.continuousMs = loopMs;
  actions?.setAction?.(5, ACTION_NAME, {
    source: 'dev-cheat',
    file: 'transmission_hum.mp3',
    durationMs: loopMs,
    loopCompleted: true,
  });
}

// ── central dispatch ───────────────────────────────────────────────────────────────────────────────

// Returns true when id was handled — the caller (dev() in renderer.js) calls persistAndPaint() then.
export function applyDev(id, state, actions) {
  if (id === 'calibrate')  { devInstantCalibrate(state, actions); return true; }
  if (id === 'clear-runs') { devClearAllRounds(state);            return true; }
  if (id === 'packets')    { devGivePackets(state);               return true; }
  if (id === 'repair')     { devRepair(state);                    return true; }
  return false;
}
