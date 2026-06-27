import {
  ACHIEVEMENT_ID,
  ACHIEVEMENT_TEXT,
  ACTION_NAME,
  LOOP_DURATION_MS,
  TRANSMISSION_HUM_PATH,
  bellMessages,
} from './messages.js';

export function isTransmissionHum(path) {
  const normalized = String(path || '').replace(/\\/g, '/');
  return normalized === TRANSMISSION_HUM_PATH || normalized.endsWith('/stage5/transmission_hum.mp3');
}

// Pure HUD string for the counter-wave calibration meter. Reads the real calibration state so the
// player can watch the counter-wave fill toward the loop threshold that unlocks the boss. Returns
// 'LOCKED-IN' once calibrated, 'uncalibrated (Ns / Ts)' while a continuous listen is accumulating,
// or a bare 'uncalibrated' before any progress. Deterministic — no timers, no wall clock.
export function calibrationProgressStr(state) {
  const calibration = (state && state.calibration) || {};
  if (calibration.calibrated) return 'LOCKED-IN';
  const loopMs = Number(calibration.loopMs) || LOOP_DURATION_MS;
  const ms = Math.max(0, Math.min(loopMs, Number(calibration.continuousMs) || 0));
  const total = Math.max(1, Math.round(loopMs / 1000));
  if (ms <= 0) return 'uncalibrated';
  return `uncalibrated (${Math.floor(ms / 1000)} / ${total}s)`;
}

export function applyCalibrationTick({
  state,
  actions,
  achievements,
  bell,
  file,
  deltaMs,
  active,
  seeking = false,
}) {
  const calibration = state.calibration;
  calibration.lastFile = file || calibration.lastFile;
  if (!isTransmissionHum(file) || !active || seeking) {
    if (!calibration.calibrated) calibration.continuousMs = 0;
    return { calibrated: calibration.calibrated, continuousMs: calibration.continuousMs, reset: true };
  }

  calibration.continuousMs = Math.min(
    Number(calibration.loopMs || LOOP_DURATION_MS),
    Number(calibration.continuousMs || 0) + Math.max(0, Number(deltaMs) || 0),
  );

  if (!calibration.calibrated && calibration.continuousMs >= Number(calibration.loopMs || LOOP_DURATION_MS)) {
    calibration.calibrated = true;
    actions?.setAction?.(5, ACTION_NAME, {
      source: 'audio-player',
      file: 'transmission_hum.mp3',
      durationMs: Number(calibration.loopMs || LOOP_DURATION_MS),
      loopCompleted: true,
    });
    achievements?.unlockAchievement?.(ACHIEVEMENT_ID, {
      stage: 5,
      title: ACHIEVEMENT_TEXT,
      action: '5.counter_wave_calibrated',
    });
    notifyBell(bell, 'stage5.counter_wave_calibrated', bellMessages.unlock);
    pushLog(state, bellMessages.unlock);
  }

  return { calibrated: calibration.calibrated, continuousMs: calibration.continuousMs, reset: false };
}

export function runCalibrationTimeline({ state, actions, achievements, bell, file, samples }) {
  let previousAt = null;
  let result = { calibrated: false, continuousMs: state.calibration.continuousMs, reset: false };
  for (const sample of samples) {
    const at = Number(sample.atMs);
    const deltaMs = previousAt === null ? 0 : Math.max(0, at - previousAt);
    previousAt = at;
    result = applyCalibrationTick({
      state,
      actions,
      achievements,
      bell,
      file,
      deltaMs,
      active: Boolean(sample.active),
      seeking: Boolean(sample.seeking),
    });
  }
  return result;
}

export function pushLog(state, line) {
  state.log = [...(state.log || []), line].slice(-8);
}

function notifyBell(bell, id, text) {
  if (bell && typeof bell.showBell === 'function') bell.showBell(id, text, { stage: 5 });
  else if (bell && typeof bell.push === 'function') bell.push({ id, stage: 5, text });
}
