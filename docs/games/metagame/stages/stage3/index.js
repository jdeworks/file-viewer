import { hasDiffKeyRestored } from './boss.js';
import { renderStage3 } from './renderer.js';
import { defaultState as createDefaultState, normalizeState } from './state.js';
import { BTS_PATH, REQUIRED_ACTION } from './messages.js';

export const stageMeta = {
  id: 3,
  slug: 'memory-grid',
  name: 'Memory Grid',
  btsPath: BTS_PATH,
  requiredAction: REQUIRED_ACTION,
  // Dev-menu controls for this stage (wired in metagame.js → mounted.dev(id)).
  devControls: [
    { id: 'show-solution', label: 'Show Solution' },
    { id: 'give-currency', label: '+500 reg / +3 frag' },
    { id: 'skip-to-boss', label: 'Skip to Boss Gate' },
    { id: 'clear-pressure', label: 'Clear Run Pressure' },
  ],
};

export function defaultState(context) {
  return createDefaultState(context);
}

export function mountStage(ctx) {
  const state = normalizeState(ctx.state, ctx);
  ensureStyles();
  if (hasDiffKeyRestored(ctx.actions)) state.boss.unlocked = true;
  const view = renderStage3({ ...ctx, state });
  return {
    devControls: stageMeta.devControls,
    dev(id) { if (view && typeof view.dev === 'function') view.dev(id); },
    jumpToBoss() { return view?.jumpToBoss?.() || false; },
    repaint() { if (view && typeof view.repaint === 'function') view.repaint(); },
    destroy() { if (view && typeof view.destroy === 'function') view.destroy(); },
  };
}

function ensureStyles() {
  const id = 'stage3-memory-grid-styles';
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = new URL('./styles.css', import.meta.url).href;
  document.head.append(link);
}

export {
  defeatMemoryLeak,
  getBossLockState,
  tryRestoreDiffKey,
} from './boss.js';
