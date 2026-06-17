import { renderStage10 } from "./renderer.js";
import { defaultState as createDefaultState, normalizeState } from "./state.js";
import { BTS_PATH, REQUIRED_ACTION } from "./messages.js";

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
  return {
    destroy() {
      if (view && typeof view.destroy === "function") view.destroy();
    }
  };
}

function ensureStyles() {
  const id = "stage10-awakening-styles";
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = new URL("./styles.css", import.meta.url).href;
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
