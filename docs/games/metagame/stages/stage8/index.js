import { renderStage8 } from "./renderer.js";
import { defaultState as createDefaultState, normalizeState, restoreRun } from "./state.js";
import { ACTION_NAME, BTS_PATH, REQUIRED_ACTION } from "./messages.js";
import { getBossLockState } from "./boss.js";
import { createRun } from "../../shared/run-state.js";

export const stageMeta = {
  id: 8,
  slug: "entropy-field",
  name: "Entropy Field",
  btsPath: BTS_PATH,
  requiredAction: REQUIRED_ACTION,
  // Dev-menu controls for this stage (wired in metagame.js → mounted.dev(id)).
  devControls: [
    { id: "resources",   label: "+500 States / +300 parts" },
    { id: "skip-storm",  label: "Skip Cascade Storm" },
    { id: "boss-gate",   label: "Unlock Boss Gate" },
    { id: "cool-field",  label: "Cool Field (restore nodes)" },
    { id: "spawn-debris", label: "Spawn Debris" }
  ]
};

export function defaultState(context) {
  return createDefaultState(context);
}

export function mountStage(ctx) {
  const state = normalizeState(ctx.state);
  // normalizeState may return a fresh object (on a forward migration), so re-seat it in the save so
  // ctx.save() persists the live object and not the stale pre-migration one.
  const saveData = ctx.orchestrator?.save;
  if (saveData && saveData.stageState && typeof saveData.stageState === "object") {
    saveData.stageState[8] = state;
  }
  ensureStyles();

  // Run-state retrofit (slot "runsim", distinct from stage8's own stageState keys): snapshot the live
  // sim each action so a reload RESUMES the in-progress run instead of re-seeding. debounceMs:0 so the
  // snapshot is flushed into the save object before ctx.save() serializes it. Guarded by a run-identity
  // tag (the run seed) so a stale snapshot from a prior, already-cleared run is never resumed.
  const run = saveData ? createRun({ save: saveData, stageId: 8, slot: "runsim", debounceMs: 0 }) : null;
  if (run) {
    const snap = run.restore();
    if (snap && snap.runTag === run.seed && !snap.boss?.defeated) {
      restoreRun(state, snap);
    }
  }

  const unsubscribe = subscribeToSalvage(ctx.actions, () => {
    if (typeof ctx.save === "function") ctx.save();
  });
  const view = renderStage8({ ...ctx, state, run });
  return {
    devControls: stageMeta.devControls,
    dev(id) { if (view && typeof view.dev === "function") view.dev(id); },
    destroy() {
      unsubscribe();
      if (run && typeof run.destroy === "function") run.destroy();
      if (view && typeof view.destroy === "function") view.destroy();
    },
    repaint: view.repaint
  };
}

function subscribeToSalvage(actions, onUnlock) {
  if (actions && typeof actions.subscribeToActions === "function") {
    return actions.subscribeToActions((detail) => {
      if (isSalvageDetail(detail)) onUnlock(detail);
    }) || (() => {});
  }
  const handler = (event) => {
    if (isSalvageDetail(event.detail)) onUnlock(event.detail);
  };
  window.addEventListener("fv:games:action", handler);
  return () => window.removeEventListener("fv:games:action", handler);
}

function isSalvageDetail(detail) {
  return Boolean(detail && Number(detail.stage) === 8 && detail.action === ACTION_NAME);
}

function ensureStyles() {
  const id = "stage8-entropy-field-styles";
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = new URL("./styles.css", import.meta.url).href;
  document.head.append(link);
}

export {
  archiveDebris,
  archiveSelectedDebris,
  getBossLockState,
  handleDebrisDrop,
  recordHeatDeathAttempt,
  recordHeatDeathFailure,
  rewindToWarningCheckpoint
} from "./boss.js";
