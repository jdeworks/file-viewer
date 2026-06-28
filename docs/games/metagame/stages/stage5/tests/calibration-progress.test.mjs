// calibration-progress.test.mjs — Stage 5: the LIVE calibration progress path.
// Verifies that sub-threshold media playback feeds state.calibration.continuousMs (so the HUD string
// animates) WITHOUT firing/persisting the boss-unlock action, and that the real threshold action still
// unlocks the boss exactly as before (the load-bearing un-cheat is unchanged).
import assert from 'node:assert/strict';
import { subscribeToActions, hasAction, clearActionsForDebug } from '../../../action-flags.js';
import { recordStage5MediaPlayback } from '../../../viewer-actions.js';
import { calibrationProgressStr } from '../calibration.js';
import { getBossLockState, hasCounterWave } from '../boss.js';
import { ACTION_NAME, PROGRESS_ACTION } from '../messages.js';

clearActionsForDebug();

// ── 1) Unit: sub-threshold playback emits ONLY the transient progress signal (no save-spamming
//        setAction); threshold playback fires the real, persisted unlock once. ─────────────────────
{
  const setCalls = [];
  const progressCalls = [];
  const setAction = (...args) => setCalls.push(args);
  const emitProgress = (...args) => progressCalls.push(args);

  // Sub-threshold tick → progress only, no setAction (so no full game-state save per tick).
  assert.equal(
    recordStage5MediaPlayback({ file: 'transmission_hum.mp3', continuousMs: 5200, setAction, emitProgress }),
    false,
  );
  assert.equal(setCalls.length, 0, 'sub-threshold: no setAction (no persist/save-spam)');
  assert.equal(progressCalls.length, 1, 'sub-threshold: one transient progress signal');
  assert.deepEqual([progressCalls[0][0], progressCalls[0][1]], [5, PROGRESS_ACTION]);
  assert.equal(progressCalls[0][2].continuousMs, 5200);

  // Same displayed whole-second → throttled, no extra signal.
  recordStage5MediaPlayback({ file: 'transmission_hum.mp3', continuousMs: 5800, setAction, emitProgress });
  assert.equal(progressCalls.length, 1, 'same whole-second is throttled');

  // Next whole-second → a fresh signal.
  recordStage5MediaPlayback({ file: 'transmission_hum.mp3', continuousMs: 6100, setAction, emitProgress });
  assert.equal(progressCalls.length, 2, 'crossing a whole-second emits again');

  // Seeking → no progress signal at all (HUD falls back once playback resumes from 0).
  recordStage5MediaPlayback({ file: 'transmission_hum.mp3', continuousMs: 9000, seeking: true, setAction, emitProgress });
  assert.equal(progressCalls.length, 2, 'seeking emits no progress');

  // Threshold → the load-bearing unlock fires exactly once (unchanged un-cheat).
  assert.equal(
    recordStage5MediaPlayback({ file: 'transmission_hum.mp3', continuousMs: 14000, setAction, emitProgress }),
    true,
  );
  assert.equal(setCalls.length, 1, 'threshold: exactly one unlock setAction');
  assert.equal(setCalls[0][0], 5);
  assert.equal(setCalls[0][1], ACTION_NAME);
}

// ── 2) Integration: the stage subscription mirrors progress into state so the HUD animates while the
//        boss stays LOCKED, and the real threshold action unlocks it. ───────────────────────────────
{
  clearActionsForDebug();
  const state = { calibration: { loopMs: 14000, continuousMs: 0, calibrated: false }, boss: {} };
  const actions = { hasAction, subscribeToActions };

  // Mirror the stage5/index.js subscription handler (transient progress → state, no save).
  const unsub = subscribeToActions((detail) => {
    if (Number(detail.stage) !== 5) return;
    if (detail.action === ACTION_NAME) {
      state.calibration.calibrated = true;
    } else if (detail.action === PROGRESS_ACTION) {
      if (state.calibration.calibrated) return;
      state.calibration.continuousMs = Math.max(0, Number(detail.continuousMs) || 0);
    }
  });

  // Real recorders run through the real (un-stubbed) transient + setAction channels.
  recordStage5MediaPlayback({ file: 'transmission_hum.mp3', continuousMs: 9400 });
  assert.equal(state.calibration.continuousMs, 9400, 'progress mirrored into state');
  assert.equal(calibrationProgressStr(state), 'uncalibrated (9 / 14s)', 'HUD shows the intermediate count');
  assert.equal(hasCounterWave(actions), false, 'boss still locked sub-threshold');
  assert.equal(getBossLockState({ actions, state }).unlocked, false);

  // Restart from 0 (pause/seek reset in the renderer) → HUD falls back to bare 'uncalibrated'.
  recordStage5MediaPlayback({ file: 'transmission_hum.mp3', continuousMs: 0 });
  assert.equal(state.calibration.continuousMs, 0, 'reset mirrored when playback restarts');
  assert.equal(calibrationProgressStr(state), 'uncalibrated');

  // Reach the loop threshold → the un-cheat unlocks the boss and the HUD locks in.
  recordStage5MediaPlayback({ file: 'transmission_hum.mp3', continuousMs: 14000 });
  assert.equal(hasCounterWave(actions), true, 'threshold action unlocks the boss');
  assert.equal(getBossLockState({ actions, state }).unlocked, true);
  assert.equal(state.calibration.calibrated, true);
  assert.equal(calibrationProgressStr(state), 'LOCKED-IN');

  unsub();
  clearActionsForDebug();
}

console.log('stage5 calibration-progress tests passed');
