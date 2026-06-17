import { renderStage8 } from "./renderer.js";
import { defaultState as createDefaultState, normalizeState } from "./state.js";
import { ACTION_NAME, BTS_PATH, REQUIRED_ACTION } from "./messages.js";
import { getBossLockState } from "./boss.js";

export const stageMeta = {
  id: 8,
  slug: "entropy-field",
  name: "Entropy Field",
  btsPath: BTS_PATH,
  requiredAction: REQUIRED_ACTION
};

export function defaultState(context) {
  return createDefaultState(context);
}

export function mountStage(ctx) {
  const state = normalizeState(ctx.state);
  ensureStyles();
  const unsubscribe = subscribeToSalvage(ctx.actions, () => {
    if (typeof ctx.save === "function") ctx.save();
  });
  const view = renderStage8({ ...ctx, state });
  return {
    destroy() {
      unsubscribe();
      if (view && typeof view.destroy === "function") view.destroy();
    },
    repaint: view.repaint
  };
}

function subscribeToSalvage(actions, onUnlock) {
  if (actions && typeof actions.subscribeToActions === "function") {
    return actions.subscribeToActions((detail) => {
      if (isSalvageDetail(detail)) onUnlock(detail);
    }) || (() => {});
  }
  const handler = (event) => {
    if (isSalvageDetail(event.detail)) onUnlock(event.detail);
  };
  window.addEventListener("fv:games:action", handler);
  return () => window.removeEventListener("fv:games:action", handler);
}

function isSalvageDetail(detail) {
  return Boolean(detail && Number(detail.stage) === 8 && detail.action === ACTION_NAME);
}

function ensureStyles() {
  const id = "stage8-entropy-field-styles";
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = new URL("./styles.css", import.meta.url).href;
  document.head.append(link);
}

export {
  archiveDebris,
  archiveSelectedDebris,
  getBossLockState,
  handleDebrisDrop,
  recordHeatDeathAttempt,
  recordHeatDeathFailure,
  rewindToWarningCheckpoint
} from "./boss.js";
