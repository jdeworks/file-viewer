import { hasCounterWave } from './boss.js';
import { renderStage5 } from './renderer.js';
import { defaultState as createDefaultState, normalizeState } from './state.js';
import { ACTION_NAME, BTS_PATH, PROGRESS_ACTION, REQUIRED_ACTION } from './messages.js';

export const stageMeta = {
  id: 5,
  slug: 'signal-racer',
  name: 'Signal Racer',
  btsPath: BTS_PATH,
  requiredAction: REQUIRED_ACTION,
};

export function defaultState(context) {
  return createDefaultState(context);
}

export function mountStage(ctx) {
  const state = normalizeState(ctx.state, ctx);
  ensureStyles();
  if (hasCounterWave(ctx.actions)) state.calibration.calibrated = true;

  let view = null;
  // Live calibration HUD. We mirror the transient continuousMs progress signal into state so the
  // "uncalibrated (N / 14s)" readout animates while the real transmission_hum.mp3 plays in the media
  // viewer. This is purely cosmetic discoverability: the progress signal is transient (never persisted)
  // and we deliberately do NOT call ctx.save() for it, so playback never spams a full game-state save.
  // The boss unlock remains the authoritative, persisted counter_wave_calibrated action below.
  const unsubscribe = subscribeStage5Actions(ctx.actions, (detail) => {
    if (detail.action === ACTION_NAME) {
      state.calibration.calibrated = true;          // authoritative unlock (already persisted by setAction)
    } else if (detail.action === PROGRESS_ACTION) {
      if (state.calibration.calibrated) return;     // once locked-in the HUD shows LOCKED-IN regardless
      state.calibration.continuousMs = Math.max(0, Number(detail.continuousMs) || 0);
    } else {
      return;
    }
    view?.repaint?.();
  });

  view = renderStage5({ ...ctx, state });

  return {
    repaint: view.repaint,
    destroy() {
      unsubscribe();
      view?.destroy?.();
    },
  };
}

function subscribeStage5Actions(actions, handler) {
  const matches = (detail) => Boolean(detail) && Number(detail.stage) === 5;
  if (actions && typeof actions.subscribeToActions === 'function') {
    return actions.subscribeToActions((detail) => { if (matches(detail)) handler(detail); }) || (() => {});
  }
  const onEvent = (event) => { if (matches(event.detail)) handler(event.detail); };
  if (typeof window !== 'undefined') {
    window.addEventListener('fv:games:action', onEvent);
    return () => window.removeEventListener('fv:games:action', onEvent);
  }
  return () => {};
}

function ensureStyles() {
  const id = 'stage5-signal-racer-styles';
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = new URL('./styles.css', import.meta.url).href;
  document.head.append(link);
}

export {
  getBossLockState,
  hasCounterWave,
  raceTheJammer,
} from './boss.js';
export {
  applyCalibrationTick,
  runCalibrationTimeline,
  calibrationProgressStr,
} from './calibration.js';
export { roundLogLine, roundIntro } from './content.js';
