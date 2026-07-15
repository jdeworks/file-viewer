import { renderStage2 } from "./renderer.js";
import { defaultState as createDefaultState, normalizeState } from "./state.js";

export const stageMeta = {
  id: 2,
  slug: "glyph-dungeon",
  name: "Glyph Dungeon",
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
  const state = normalizeState(ctx.state);

  ensureStyles();
  const view = renderStage2({ ...ctx, state });

  return {
    devControls: stageMeta.devControls,
    dev(id) { if (view && typeof view.dev === "function") view.dev(id); },
    jumpToBoss() { return view?.jumpToBoss?.() || false; },
    destroy() {
      if (view && typeof view.destroy === "function") view.destroy();
    }
  };
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
  getBossLockState,
  recordBossAttempt
} from "./boss.js";
