import { renderStage9 } from "./renderer.js";
import { defaultState as createDefaultState, normalizeState } from "./state.js";
import { ACTION_NAME, BTS_PATH, REQUIRED_ACTION } from "./messages.js";
import { DEV_CONTROLS } from "./s8dev.js";

export const stageMeta = {
  id: 8,
  slug: "observer-state",
  name: "Observer State",
  btsPath: BTS_PATH,
  requiredAction: REQUIRED_ACTION,
  // Dev-menu controls for this stage (wired in metagame.js → mounted.dev(id)).
  devControls: DEV_CONTROLS
};

export function defaultState(context) {
  return createDefaultState(context);
}

export function mountStage(ctx) {
  const state = normalizeState(ctx.state);
  ensureStyles();
  const unsubscribe = subscribeToOfflineMode(ctx.actions, () => {
    state.offlineMode = true;
    state.boss.fixedSeed = 0;
    if (typeof ctx.save === "function") ctx.save();
  });
  const view = renderStage9({ ...ctx, state });
  return {
    devControls: stageMeta.devControls,
    dev(id) { if (view && typeof view.dev === "function") view.dev(id); },
    destroy() {
      unsubscribe();
      if (view && typeof view.destroy === "function") view.destroy();
    },
    repaint: view.repaint
  };
}

function subscribeToOfflineMode(actions, onUnlock) {
  if (actions && typeof actions.subscribeToActions === "function") {
    return actions.subscribeToActions((detail) => {
      if (isOfflineDetail(detail)) onUnlock(detail);
    }) || (() => {});
  }
  const handler = (event) => {
    if (isOfflineDetail(event.detail)) onUnlock(event.detail);
  };
  window.addEventListener("fv:games:action", handler);
  return () => window.removeEventListener("fv:games:action", handler);
}

function isOfflineDetail(detail) {
  return Boolean(detail && Number(detail.stage) === 8 && detail.action === ACTION_NAME);
}

function ensureStyles() {
  const id = "stage8-observer-state-styles";
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = new URL("./styles.css", import.meta.url).href;
  document.head.append(link);
}

export {
  activateOfflineMode,
  getBossLockState,
  getBossSeed,
  readServiceWorkerNotes,
  recordObserverBossAttempt
} from "./boss.js";
