import { hasRecursionBlueprint } from './boss.js';
import { renderStage4 } from './renderer.js';
import { defaultState as createDefaultState, normalizeState } from './state.js';
import { BTS_PATH, REQUIRED_ACTION } from './messages.js';

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
  return renderStage4({ ...ctx, state });
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
