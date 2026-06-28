import { renderStage10 } from "./renderer.js";
import { onEchoAction } from "./echo-gate.js";
import { defaultState as createDefaultState, normalizeState } from "./state.js";
import { BTS_PATH, REQUIRED_ACTION } from "./messages.js";

export const stageMeta = {
  id: 10,
  slug: "awakening",
  name: "Awakening",
  bossName: "The Defragmenter",
  btsPath: BTS_PATH,
  requiredAction: REQUIRED_ACTION,
  // Dev-menu controls for this stage (wired in metagame.js → mounted.dev(id)).
  devControls: [
    { id: "grant-echoes",  label: "Grant all 9 echoes" },
    { id: "resolve-all",   label: "Resolve all memories" },
    { id: "integrate-all", label: "Integrate all memories" },
    { id: "win-confront",  label: "Win confrontation" }
  ]
};

export function defaultState(context) {
  return createDefaultState(context);
}

export function mountStage(ctx = {}) {
  const host = ctx.host;
  if (!host) throw new Error("Stage 10 mount requires a host element.");
  ensureStyles();
  const state = normalizeState(ctx.state || defaultState(ctx), ctx);
  const view = renderStage10({ ...ctx, state });

  // Echo witnessing: performing a memory's gated real-app verb (plain open / raw-mode / diff /
  // download …) fires echo_<memoryId> with the per-memory token (viewer-actions.js). onEchoAction is
  // the SINGLE gate: it verifies the token (anti-spoof) then witnesses the echo, and — during the
  // confrontation's Phase B — anchors that memory's fragmentation trace (transient; never lowers the
  // canonical echoWitnessed). Phase B re-witness happens ONLY here, never on a bare button click.
  const save = (ctx.orchestrator && ctx.orchestrator.save) || null;
  const unsubscribeEcho = subscribeToActions(ctx.actions, (detail) => {
    const result = onEchoAction({ state, detail, save });
    if (result.witnessed || result.rewitnessed) {
      if (typeof ctx.save === "function") ctx.save();
      if (view && typeof view.repaint === "function") view.repaint();
    }
  });

  return {
    devControls: stageMeta.devControls,
    dev(id) { if (view && typeof view.dev === "function") view.dev(id); },
    repaint() { if (view && typeof view.repaint === "function") view.repaint(); },
    destroy() {
      unsubscribeEcho();
      if (view && typeof view.destroy === "function") view.destroy();
    }
  };
}

// Raw action subscription — every metagame action detail flows through `handler`. The stage/token/
// phase filtering all lives in onEchoAction (echo-gate.js), keeping that gate logic pure + testable.
function subscribeToActions(actions, handler) {
  if (actions && typeof actions.subscribeToActions === "function") {
    return actions.subscribeToActions(handler) || (() => {});
  }
  const onEvent = (event) => handler(event.detail);
  window.addEventListener("fv:games:action", onEvent);
  return () => window.removeEventListener("fv:games:action", onEvent);
}

function ensureStyles() {
  ensureStylesheet("stage10-awakening-styles", new URL("./styles.css", import.meta.url).href);
  ensureStylesheet("stage10-confront-styles", new URL("./styles-confront.css", import.meta.url).href);
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
  chooseFinal,
  getFinalChoiceState,
  getMemoryCounts,
  getRouteSummary,
  getThresholdState,
  integrateMemory,
  markMemoryRead,
  resolveMemory
} from "./boss.js";
export { memories, memoryById, awakeningText } from "./content.js";
export { normalizeState } from "./state.js";
