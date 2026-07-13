import { hasRecursionBlueprint } from './boss.js';
import { renderStage4 } from './renderer.js';
import { defaultState as createDefaultState, normalizeState } from './state.js';
import { BTS_PATH, REQUIRED_ACTION } from './messages.js';
import { createRun } from '../../shared/run-state.js';

export const stageMeta = {
  id: 4,
  slug: 'fractal-bastion',
  name: 'Fractal Bastion',
  btsPath: BTS_PATH,
  requiredAction: REQUIRED_ACTION,
  // Dev-menu controls for this stage (wired in metagame.js → mounted.dev(id)).
  devControls: [
    { id: 'give-glory',   label: '+500 Glory' },
    { id: 'skip-wave',    label: 'Skip Wave' },
    { id: 'skip-to-boss', label: 'Skip to Boss' },
    { id: 'god-core',     label: 'God Core (∞ integrity)' },
  ],
};

export function defaultState(context) {
  return createDefaultState(context);
}

export function mountStage(ctx) {
  const state = normalizeState(ctx.state, ctx);
  ensureStyles();
  if (hasRecursionBlueprint(ctx.actions)) state.log = [...state.log, 'recursion blueprint already read.'].slice(-8);

  // Run-state retrofit (slot "runwave", distinct from stage4's own state keys): the engine drops the
  // in-flight wave on reload (normalizeState resets enemies/spawn queue). The renderer snapshots it
  // each tick and RESUMES on mount when the campaign is mid-combat (guarded by the run seed so a stale
  // wave from a prior run/map is never resumed). The TD engine uses no RNG, so the run's RNG is unused.
  const saveData = ctx.orchestrator?.save;
  const run = saveData ? createRun({ save: saveData, stageId: 4, slot: 'runwave', debounceMs: 0 }) : null;

  const view = renderStage4({ ...ctx, state, run });
  return {
    devControls: stageMeta.devControls,
    dev(id) { if (view && typeof view.dev === 'function') view.dev(id); },
    jumpToBoss() { return view?.jumpToBoss?.() || false; },
    repaint: view.repaint,
    destroy() {
      if (run && typeof run.destroy === 'function') run.destroy();
      if (view && typeof view.destroy === 'function') view.destroy();
    },
  };
}

function ensureStyles() {
  injectSheet('stage4-fractal-bastion-styles', './styles.css');
  injectSheet('stage4-fractal-bastion-board-styles', './styles-board.css');
}

function injectSheet(id, rel) {
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = new URL(rel, import.meta.url).href;
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
