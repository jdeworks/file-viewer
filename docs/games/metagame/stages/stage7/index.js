import {
  applyExifContradictionUnlock,
  getBossLockState,
  hasExifContradiction
} from "./boss.js";
import { renderStage7 } from "./renderer.js";
import { defaultState as createDefaultState, normalizeState } from "./state.js";
import { ACTION_NAME, BTS_PATH, REQUIRED_ACTION } from "./messages.js";

export const stageMeta = {
  id: 7,
  slug: "identity-arbiter",
  name: "Identity Arbiter",
  btsPath: BTS_PATH,
  requiredAction: REQUIRED_ACTION
};

export function defaultState(context) {
  return createDefaultState(context);
}

export function mountStage(ctx) {
  const state = normalizeState(ctx.state);
  let view = null;

  ensureStyles();

  if (hasExifContradiction(ctx.actions)) {
    applyExifContradictionUnlock({ state, achievements: ctx.achievements, bell: ctx.bell });
  }

  const unsubscribe = subscribeToExifContradiction(ctx.actions, () => {
    applyExifContradictionUnlock({ state, achievements: ctx.achievements, bell: ctx.bell });
    if (typeof ctx.save === "function") ctx.save();
    if (view && typeof view.repaint === "function") view.repaint();
  });

  view = renderStage7({ ...ctx, state });

  return {
    destroy() {
      unsubscribe();
      if (view && typeof view.destroy === "function") view.destroy();
    }
  };
}

function subscribeToExifContradiction(actions, onUnlock) {
  if (actions && typeof actions.subscribeToActions === "function") {
    return actions.subscribeToActions((detail) => {
      if (isExifContradictionDetail(detail)) onUnlock(detail);
    }) || (() => {});
  }

  const handler = (event) => {
    if (isExifContradictionDetail(event.detail)) onUnlock(event.detail);
  };
  window.addEventListener("fv:games:action", handler);
  return () => window.removeEventListener("fv:games:action", handler);
}

function isExifContradictionDetail(detail) {
  return Boolean(detail && Number(detail.stage) === 7 && detail.action === ACTION_NAME);
}

function ensureStyles() {
  const id = "stage7-identity-arbiter-styles";
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = new URL("./styles.css", import.meta.url).href;
  document.head.append(link);
}

export {
  applyExifContradictionUnlock,
  commitIdentity,
  getBossLockState,
  inspectContradictoryExif,
  recordLockedBossAttempt
} from "./boss.js";
