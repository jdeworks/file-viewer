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
};

export function defaultState(context) {
  return createDefaultState(context);
}

export function mountStage(ctx) {
  const state = normalizeState(ctx.state, ctx);
  ensureStyles();
  if (hasDiffKeyRestored(ctx.actions)) state.boss.unlocked = true;
  return renderStage3({ ...ctx, state });
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
