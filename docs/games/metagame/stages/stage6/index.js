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
  requiredAction: REQUIRED_ACTION,
  // Dev-menu controls for this stage (wired in metagame.js → mounted.dev(id)).
  devControls: [
    { id: "heal",      label: "Full HP" },
    { id: "keys",      label: "Grant 3 Keys" },
    { id: "cards",     label: "+3 Cards" },
    { id: "skip-boss", label: "Skip to Boss" },
    { id: "energy",    label: "+3 Energy" }
  ]
};

export function defaultState(context) {
  return createDefaultState(context);
}

export function mountStage(ctx) {
  const state = normalizeState(ctx.state);
  let view = null;

  const pendingStylesheets = ensureStyles();

  if (hasProtocolChapter9(ctx.actions)) {
    applyProtocolChapter9Unlock({ state, achievements: ctx.achievements, bell: ctx.bell });
  }

  const unsubscribe = subscribeToProtocolChapter9(ctx.actions, () => {
    applyProtocolChapter9Unlock({ state, achievements: ctx.achievements, bell: ctx.bell });
    if (typeof ctx.save === "function") ctx.save();
    if (view && typeof view.repaint === "function") view.repaint();
  });

  view = renderStage6({ ...ctx, state });

  // The stylesheets are appended fire-and-forget above, so the FIRST paint above can land before
  // the browser has applied them (e.g. `.s6db-map-grid`'s flex layout). Resuming straight into a
  // saved run (state.ui.screen === "run") makes the map/act-DAG the very first thing rendered, and
  // paintMapEdges() measures node rects via getBoundingClientRect() — under the pre-CSS block
  // layout those rects are wrong, so the map spills outside the viewport (scrollbars) with broken
  // connection lines. A fresh run always paints the hub first (no rect measurement), which buys
  // enough time for the CSS to load — hence this only ever shows up on "continue run". Repaint once
  // each newly-added stylesheet finishes loading so any such mis-measured first paint self-corrects.
  pendingStylesheets.forEach((link) => {
    link.addEventListener("load", () => {
      if (view && typeof view.repaint === "function") view.repaint();
    }, { once: true });
  });

  return {
    devControls: stageMeta.devControls,
    dev(id) { if (view && typeof view.dev === "function") view.dev(id); },
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

// Returns the <link> elements newly appended by this call (i.e. still loading) so the caller can
// listen for their 'load' event; a stylesheet already present from an earlier mount is omitted
// since it has long since finished loading.
function ensureStyles() {
  return [
    ensureStylesheet("stage6-protocol-codex-styles", new URL("./styles.css", import.meta.url).href),
    ensureStylesheet("stage6-protocol-codex-combat-styles", new URL("./styles-combat.css", import.meta.url).href)
  ].filter(Boolean);
}

function ensureStylesheet(id, href) {
  if (document.getElementById(id)) return null;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  document.head.append(link);
  return link;
}

export {
  applyProtocolChapter9Unlock,
  getBossLockState,
  recordLockedBossAttempt
} from "./boss.js";
