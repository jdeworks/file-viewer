import { hasCounterWave } from './boss.js';
import { renderStage5 } from './renderer.js';
import { defaultState as createDefaultState, normalizeState } from './state.js';
import { BTS_PATH, REQUIRED_ACTION } from './messages.js';

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
  return renderStage5({ ...ctx, state });
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
