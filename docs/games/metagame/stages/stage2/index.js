import { applySearchPassageUnlock, hasSearchPassage } from "./boss.js";
import { renderStage2 } from "./renderer.js";
import { defaultState as createDefaultState, normalizeState } from "./state.js";
import { ACTION_NAME, BTS_PATH, REQUIRED_ACTION } from "./messages.js";

export const stageMeta = {
  id: 2,
  slug: "glyph-dungeon",
  name: "Glyph Dungeon",
  btsPath: BTS_PATH,
  requiredAction: REQUIRED_ACTION
};

export function defaultState(context) {
  return createDefaultState(context);
}

export function mountStage(ctx) {
  const {
    host,
    actions,
    achievements,
    bell,
    save
  } = ctx;
  const state = normalizeState(ctx.state);
  let view = null;

  ensureStyles();

  if (hasSearchPassage(actions)) {
    applySearchPassageUnlock({ state, achievements, bell });
  }

  const unsubscribe = subscribeToSearchPassage(actions, () => {
    applySearchPassageUnlock({ state, achievements, bell });
    if (typeof save === "function") save();
    if (view && typeof view.repaint === "function") view.repaint();
  });

  view = renderStage2({ ...ctx, state });

  return {
    destroy() {
      unsubscribe();
      if (view && typeof view.destroy === "function") view.destroy();
    }
  };
}

function subscribeToSearchPassage(actions, onUnlock) {
  if (actions && typeof actions.subscribeToActions === "function") {
    return actions.subscribeToActions((detail) => {
      if (isSearchPassageDetail(detail)) onUnlock(detail);
    }) || (() => {});
  }

  const handler = (event) => {
    if (isSearchPassageDetail(event.detail)) onUnlock(event.detail);
  };
  window.addEventListener("fv:games:action", handler);
  return () => window.removeEventListener("fv:games:action", handler);
}

function isSearchPassageDetail(detail) {
  return Boolean(detail && Number(detail.stage) === 2 && detail.action === ACTION_NAME);
}

function ensureStyles() {
  const id = "stage2-glyph-dungeon-styles";
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = new URL("./styles.css", import.meta.url).href;
  document.head.append(link);
}

export {
  applySearchPassageUnlock,
  getBossLockState,
  recordLockedBossAttempt
} from "./boss.js";
