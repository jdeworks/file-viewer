import { hasRecursionBlueprint } from './boss.js';
import { renderStage4 } from './renderer.js';
import { defaultState as createDefaultState, normalizeState, restoreWave } from './state.js';
import { BTS_PATH, REQUIRED_ACTION } from './messages.js';
import { createRun } from '../../shared/run-state.js';

export const stageMeta = {
  id: 4,
  slug: 'fractal-bastion',
  name: 'Fractal Bastion',
  btsPath: BTS_PATH,
  requiredAction: REQUIRED_ACTION,
};

export function defaultState(context) {
  return createDefaultState(context);
}

export function mountStage(ctx) {
  const state = normalizeState(ctx.state, ctx);
  ensureStyles();
  if (hasRecursionBlueprint(ctx.actions)) state.log = [...state.log, 'recursion blueprint already read.'].slice(-8);

  // Run-state retrofit (slot "runwave", distinct from stage4's own state keys): the engine drops the
  // in-flight wave on reload (normalizeState resets enemies/spawn queue). Snapshot it each tick and
  // RESUME on mount, guarded by a run-identity tag (the run seed) so a stale wave from an already-won
  // boss or a prior run is never resumed. The TD engine uses no RNG, so the run's RNG is unused here.
  const saveData = ctx.orchestrator?.save;
  const run = saveData ? createRun({ save: saveData, stageId: 4, slot: 'runwave', debounceMs: 0 }) : null;
  if (run) {
    const snap = run.restore();
    if (snap && snap.runTag === run.seed && snap.waveActive && !state.boss?.defeated) {
      restoreWave(state, snap);
      state.log = [...state.log, 'wave resumed mid-flight.'].slice(-8);
    }
  }

  const view = renderStage4({ ...ctx, state, run });
  return {
    repaint: view.repaint,
    destroy() {
      if (run && typeof run.destroy === 'function') run.destroy();
      if (view && typeof view.destroy === 'function') view.destroy();
    },
  };
}

function ensureStyles() {
  const id = 'stage4-fractal-bastion-styles';
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = new URL('./styles.css', import.meta.url).href;
  document.head.append(link);
}

export {
  applyRecursionBlueprintOpen,
  fightInfiniteLoop,
  getBossLockState,
  getTowerCoverage,
  hasRecursionBlueprint,
  placeTower,
} from './boss.js';
export { recursionBlueprintContent, recursionBlueprintData } from './content.js';
