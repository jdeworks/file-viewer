import {
  applyProtocolChapter9Unlock,
  getBossLockState,
  hasProtocolChapter9
} from "./boss.js";
import { renderStage6 } from "./renderer.js";
import { defaultState as createDefaultState, normalizeState } from "./state.js";
import { ACTION_NAME, BTS_PATH, REQUIRED_ACTION } from "./messages.js";

export const stageMeta = {
  id: 6,
  slug: "protocol-codex",
  name: "Protocol Codex",
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

  if (hasProtocolChapter9(ctx.actions)) {
    applyProtocolChapter9Unlock({ state, achievements: ctx.achievements, bell: ctx.bell });
  }

  const unsubscribe = subscribeToProtocolChapter9(ctx.actions, () => {
    applyProtocolChapter9Unlock({ state, achievements: ctx.achievements, bell: ctx.bell });
    if (typeof ctx.save === "function") ctx.save();
    if (view && typeof view.repaint === "function") view.repaint();
  });

  view = renderStage6({ ...ctx, state });

  return {
    destroy() {
      unsubscribe();
      if (view && typeof view.destroy === "function") view.destroy();
    }
  };
}

function subscribeToProtocolChapter9(actions, onUnlock) {
  if (actions && typeof actions.subscribeToActions === "function") {
    return actions.subscribeToActions((detail) => {
      if (isProtocolChapter9Detail(detail)) onUnlock(detail);
    }) || (() => {});
  }

  const handler = (event) => {
    if (isProtocolChapter9Detail(event.detail)) onUnlock(event.detail);
  };
  window.addEventListener("fv:games:action", handler);
  return () => window.removeEventListener("fv:games:action", handler);
}

function isProtocolChapter9Detail(detail) {
  return Boolean(detail && Number(detail.stage) === 6 && detail.action === ACTION_NAME);
}

function ensureStyles() {
  const id = "stage6-protocol-codex-styles";
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = new URL("./styles.css", import.meta.url).href;
  document.head.append(link);
}

export {
  applyProtocolChapter9Unlock,
  getBossLockState,
  recordLockedBossAttempt
} from "./boss.js";
