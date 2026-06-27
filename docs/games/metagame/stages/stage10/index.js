import { renderStage10 } from "./renderer.js";
import { witnessEcho } from "./boss.js";
import { rewitnessFragmentation } from "./confront.js";
import { defaultState as createDefaultState, normalizeState } from "./state.js";
import { BTS_PATH, REQUIRED_ACTION, STAGE_ID } from "./messages.js";

export const stageMeta = {
  id: 10,
  slug: "awakening",
  name: "Awakening",
  bossName: "The Defragmenter",
  btsPath: BTS_PATH,
  requiredAction: REQUIRED_ACTION
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

  // Echo witnessing: opening an awakening artifact in the real viewer fires echo_<memoryId>
  // (viewer-actions.js) → witness that memory's echo (the load-bearing integration gate). The SAME
  // real file-open, when it happens during the confrontation's Phase B, anchors that memory's
  // fragmentation trace (transient — never lowers the canonical echoWitnessed).
  const save = (ctx.orchestrator && ctx.orchestrator.save) || null;
  const unsubscribeEcho = subscribeToEchoes(ctx.actions, (memoryId) => {
    let changed = witnessEcho({ state, memoryId }).ok;
    if (state.confront && state.confront.phase === "fragmentation") {
      if (rewitnessFragmentation({ state, memoryId, save }).ok) changed = true;
    }
    if (changed) {
      if (typeof ctx.save === "function") ctx.save();
      if (view && typeof view.repaint === "function") view.repaint();
    }
  });

  return {
    repaint() { if (view && typeof view.repaint === "function") view.repaint(); },
    destroy() {
      unsubscribeEcho();
      if (view && typeof view.destroy === "function") view.destroy();
    }
  };
}

function subscribeToEchoes(actions, onEcho) {
  const handle = (detail) => {
    if (!detail || Number(detail.stage) !== STAGE_ID) return;
    const action = String(detail.action || "");
    if (action.startsWith("echo_")) onEcho(action.slice(5));
  };
  if (actions && typeof actions.subscribeToActions === "function") {
    return actions.subscribeToActions(handle) || (() => {});
  }
  const handler = (event) => handle(event.detail);
  window.addEventListener("fv:games:action", handler);
  return () => window.removeEventListener("fv:games:action", handler);
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
