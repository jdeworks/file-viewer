import { renderStage5 } from "./renderer.js";
import { defaultState as createDefaultState, normalizeState } from "./state.js";

export const stageMeta = {
  id: 5,
  slug: "protocol-codex",
  name: "Protocol Codex",
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

  view = renderStage5({ ...ctx, state });

  // The stylesheets are appended fire-and-forget above, so the FIRST paint above can land before
  // the browser has applied them (e.g. `.s5db-map-grid`'s flex layout). Resuming straight into a
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
    jumpToBoss() { return view?.jumpToBoss?.() || false; },
    destroy() {
      if (view && typeof view.destroy === "function") view.destroy();
    }
  };
}

// Returns the <link> elements newly appended by this call (i.e. still loading) so the caller can
// listen for their 'load' event; a stylesheet already present from an earlier mount is omitted
// since it has long since finished loading.
function ensureStyles() {
  return [
    ensureStylesheet("stage5-protocol-codex-styles", new URL("./styles.css", import.meta.url).href),
    ensureStylesheet("stage5-protocol-codex-combat-styles", new URL("./styles-combat.css", import.meta.url).href)
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
