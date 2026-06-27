import {
  applyExifContradictionUnlock,
  getBossLockState,
  hasExifContradiction
} from "./boss.js";
import { renderStage7 } from "./renderer.js";
import { markChainBroken } from "./substages.js";
import { ensureCase2, ensureCase3, mintSourceFact } from "./accusation.js";
import { defaultState as createDefaultState, normalizeState } from "./state.js";
import {
  ACTION_NAME,
  ANCHOR_ACTION,
  BTS_PATH,
  CASE2_SOURCE_ACTIONS,
  CASE3_SOURCE_ACTIONS,
  CASE3_SEARCH_ACTION,
  REQUIRED_ACTION
} from "./messages.js";

// All Case-2 + Case-3 evidence actions (opens + the Case-3 search) that mint a board fact card.
const ALL_SOURCE_ACTIONS = [...CASE2_SOURCE_ACTIONS, ...CASE3_SOURCE_ACTIONS, CASE3_SEARCH_ACTION];

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

  const unsubscribe = subscribeToActionName(ctx.actions, ACTION_NAME, () => {
    applyExifContradictionUnlock({ state, achievements: ctx.achievements, bell: ctx.bell });
    if (typeof ctx.save === "function") ctx.save();
    if (view && typeof view.repaint === "function") view.repaint();
  });

  // SS4 Reference Chase: opening the decommissioned anchor record (a real viewer file-open) breaks
  // Entity F's credential chain and opens Case 2 (the Duplicate Roster accusation).
  const unsubscribeAnchor = subscribeToActionName(ctx.actions, ANCHOR_ACTION, () => {
    markChainBroken({ state });
    if (typeof ctx.save === "function") ctx.save();
    if (view && typeof view.repaint === "function") view.repaint();
  });

  // Case 2/3 evidence un-cheats: opening (or, for Case 3, SEARCHING) each system file in the real
  // viewer mints its fact card. Seed the case boards + any fact cards whose action already fired
  // (return-from-viewer / reload), then keep listening.
  if (Number(state.substage || 1) >= 5) ensureCase2(state);
  if (Number(state.substage || 1) >= 6) ensureCase3(state);
  for (const action of ALL_SOURCE_ACTIONS) {
    if (ctx.actions && typeof ctx.actions.hasAction === "function" && ctx.actions.hasAction(7, action)) {
      mintSourceFact(state, action);
    }
  }
  const unsubscribeSources = ALL_SOURCE_ACTIONS.map((action) =>
    subscribeToActionName(ctx.actions, action, () => {
      ensureCase2(state);
      if (Number(state.substage || 1) >= 6) ensureCase3(state);
      mintSourceFact(state, action);
      if (typeof ctx.save === "function") ctx.save();
      if (view && typeof view.repaint === "function") view.repaint();
    })
  );

  view = renderStage7({ ...ctx, state });

  return {
    repaint() { if (view && typeof view.repaint === "function") view.repaint(); },
    destroy() {
      unsubscribe();
      unsubscribeAnchor();
      for (const off of unsubscribeSources) off();
      if (view && typeof view.destroy === "function") view.destroy();
    }
  };
}

function subscribeToActionName(actions, actionName, onFire) {
  const matches = (detail) => Boolean(detail && Number(detail.stage) === 7 && detail.action === actionName);
  if (actions && typeof actions.subscribeToActions === "function") {
    return actions.subscribeToActions((detail) => { if (matches(detail)) onFire(detail); }) || (() => {});
  }
  const handler = (event) => { if (matches(event.detail)) onFire(event.detail); };
  window.addEventListener("fv:games:action", handler);
  return () => window.removeEventListener("fv:games:action", handler);
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
