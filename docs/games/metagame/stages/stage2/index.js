import { applySearchPassageUnlock, hasSearchPassage } from "./boss.js";
import { renderStage2 } from "./renderer.js";
import { defaultState as createDefaultState, normalizeState } from "./state.js";
import { ACTION_NAME, BTS_PATH, REQUIRED_ACTION } from "./messages.js";

export const stageMeta = {
  id: 2,
  slug: "glyph-dungeon",
  name: "Glyph Dungeon",
  btsPath: BTS_PATH,
  requiredAction: REQUIRED_ACTION,
  // Dev-menu controls for this stage (wired in metagame.js → mounted.dev(id)).
  devControls: [
    { id: "heal", label: "Full HP" },
    { id: "atk", label: "+5 ATK" },
    { id: "lvl", label: "+1 LVL" },
    { id: "glyphs", label: "+1k glyphs" },
    { id: "items", label: "+3 of each rune" },
    { id: "map", label: "Zoom out (full map)" }
  ]
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
    devControls: stageMeta.devControls,
    dev(id) { if (view && typeof view.dev === "function") view.dev(id); },
    jumpToBoss() { return view?.jumpToBoss?.() || false; },
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
  // Three sheets, link-tagged in cascade order (core → ui → overlays). The board styles were split
  // out of one styles.css to stay under the project LOC cap; load order matters so the responsive
  // @media overrides in styles-ui.css still win over the base rules in styles.css.
  ensureStylesheet("stage2-glyph-dungeon-styles", new URL("./styles.css", import.meta.url).href);
  ensureStylesheet("stage2-glyph-dungeon-ui-styles", new URL("./styles-ui.css", import.meta.url).href);
  ensureStylesheet("stage2-glyph-dungeon-overlay-styles", new URL("./styles-overlays.css", import.meta.url).href);
}

function ensureStylesheet(id, href) {
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  document.head.append(link);
}

export {
  applySearchPassageUnlock,
  getBossLockState,
  recordBossAttempt
} from "./boss.js";
