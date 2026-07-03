import {
  archiveSelectedDebris,
  getBossLockState,
  handleDebrisDrop,
  recordHeatDeathAttempt
} from "./boss.js";
import { btsSummary, BTS_PATH, SALVAGE_REQUIRED, STABILIZER_COST, ACTION_NAME, EXTERNAL_IMPORT_LABEL, DISCLOSE_MESSAGES } from "./messages.js";
import { devGiveResources, devSkipStorm, devUnlockBossGate, devCoolField, devSpawnDebris } from "./s8dev.js";
import { advanceCycle, applyRepair, applyStabilizer, buildStabilizer, toggleHighLoad } from "./engine.js";
import { driveToGate } from "./solver.js";
import { stormAvailable, braceStorm } from "./storms.js";
import { buyTech, techStatus } from "./tech.js";
import { buildStructure, structureStatus } from "./structures.js";
import { microstateCollapse, prestigeAvailable, coresPreview } from "./prestige.js";
import { paintStage8 } from "./paint.js";
import { paintTech, paintStructures } from "./techpanel.js";
import { computeDisclosure, DISCLOSE_ORDER } from "./disclose.js";
import { banner } from "../../shared/feedback.js";
import { snapshotRun } from "./state.js";
import { makeRng } from "./rng.js";

const REPAIR_STEP = 2; // repair units spent per click

export function renderStage8({ host, state, actions, achievements, bell, bts, viewer, save, run, onStageComplete }) {
  const root = document.createElement("section");
  root.className = "stage8-entropy-field";
  root.innerHTML = `
    <div class="s8-cmdbar" role="group" aria-label="cycle command bar">
      <button type="button" data-action="advance" class="s8-cmd-advance">advance cycle ▸</button>
      <button type="button" data-action="storm" data-field="braceBtn" class="s8-cmd-brace" hidden>brace ▸</button>
      <span class="s8-cmd-stat"><b data-field="cycle"></b><small>cycle</small></span>
      <span class="s8-cmd-stat"><b data-field="entropy"></b><small>entropy %</small></span>
      <span class="s8-cmd-stat" data-field="heatRateWrap" hidden><b data-field="cmdHeatRate"></b><small>heat/cyc</small></span>
      <span class="s8-cmd-stat is-warn" data-field="stormWrap" hidden><b data-field="stormCountdown"></b><small>storm left</small></span>
      <span class="s8-ticker" data-field="ticker" aria-live="polite"></span>
    </div>
    <div class="s8-hud">
      <div class="s8-cluster">
        <span class="s8-cl-label">NETWORK</span>
        <span class="s8-cl-num"><b data-field="repairUnits"></b><small>repair</small></span>
        <span class="s8-cl-num" data-field="statesWrap" hidden><b data-field="states"></b><small>States</small></span>
      </div>
      <div class="s8-cluster" data-field="thermalCluster" hidden>
        <span class="s8-cl-label">THERMAL</span>
        <span class="s8-cl-num"><b data-field="heat"></b><small>heat</small></span>
      </div>
      <div class="s8-cluster" data-field="resourcesCluster" hidden>
        <span class="s8-cl-label">RESOURCES</span>
        <span class="s8-cl-num"><b data-field="parts"></b> <i data-field="partsRate" class="s8-rate"></i><small>parts</small></span>
      </div>
      <div class="s8-cluster" data-field="prestigeCluster" hidden>
        <span class="s8-cl-label">PRESTIGE</span>
        <span class="s8-cl-num"><b data-field="cores"></b> <i data-field="prestigeMult" class="s8-rate"></i><small>cores</small></span>
      </div>
    </div>
    <div class="s8-layout">
      <div class="s8-map" aria-label="node status"></div>
      <div class="s8-files" data-field="archivePanel" hidden>
        <pre data-field="tree" aria-label="entropy virtual file tree"></pre>
        <label>Debris
          <select data-field="debrisSelect"></select>
        </label>
        <button type="button" data-action="archive">Archive</button>
        <div class="s8-drop" data-drop-target="/entropy/active_archive/" tabindex="0" role="button" aria-label="Archive selected debris">Active Archive</div>
        <div class="s8-salvage-progress" title="Heat Death gate progress">
          <span class="s8-salvage-bar"><span data-field="salvageFill"></span></span>
          <small>salvage <b data-field="salvageNum"></b>/${SALVAGE_REQUIRED} archived</small>
        </div>
        <button type="button" data-action="external" data-field="externalBtn" class="s8-external">${EXTERNAL_IMPORT_LABEL}</button>
      </div>
    </div>
    <div class="s8-boss" data-field="bossPanel" hidden>
      <strong>THE HEAT DEATH</strong>
      <div data-field="bossGate" class="s8-boss-gate"></div>
      <div data-field="hint" class="s8-boss-hint"></div>
      <button type="button" data-action="boss" data-field="bossBtn" class="s8-boss-btn">challenge Heat Death</button>
      <pre data-field="burn" class="s8-burn" hidden></pre>
    </div>
    <div data-field="telegraph" class="s8-telegraph" hidden></div>
    <details class="s8-tech-panel" data-field="techPanel" hidden>
      <summary>TECH TREE — spend parts ⛭</summary>
      <div class="s8-tech" data-field="tech"></div>
    </details>
    <details class="s8-tech-panel" data-field="structPanel" hidden>
      <summary>STRUCTURES — build with parts ⛭</summary>
      <div class="s8-tech" data-field="struct"></div>
    </details>
    <ol class="s8-log"></ol>
    <div class="s8-controls">
      <button type="button" data-action="stabilizer" data-field="stabilizerBtn" hidden>build stabilizer (${STABILIZER_COST} States)</button>
      <button type="button" data-action="bts" hidden>open entropy_field.bts</button>
      <button type="button" data-action="collapse" hidden>collapse to Microstate</button>
    </div>
  `;
  host.replaceChildren(root);
  const cmdbar = root.querySelector(".s8-cmdbar");
  let disclosureSeeded = false;

  const fields = Object.fromEntries([...root.querySelectorAll("[data-field]")].map((el) => [el.dataset.field, el]));
  const map = root.querySelector(".s8-map");
  const log = root.querySelector(".s8-log");
  const dropTarget = root.querySelector(".s8-drop");
  const completeOnce = once((result) => {
    if (typeof onStageComplete === "function") onStageComplete(result);
  });
  // Run-seed base for all deterministic rng (cycle decay + burn). The retrofit seeds it from the
  // run-state run identity so the same run replays identically across reloads.
  const seedBase = run?.seed || "8";

  dropTarget.addEventListener("dragover", (event) => event.preventDefault());
  dropTarget.addEventListener("drop", (event) => {
    event.preventDefault();
    const debrisId = event.dataTransfer?.getData("text/plain") || state.selectedDebrisId;
    handleDebrisDrop({ state, actions, achievements, bell, debrisId, targetPath: "/entropy/active_archive/" });
    persistAndPaint();
  });
  dropTarget.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    archiveSelectedDebris({ state, actions, achievements, bell, source: "keyboard-archive-target" });
    persistAndPaint();
  });

  root.addEventListener("dragstart", (event) => {
    const item = event.target.closest("[data-debris-id]");
    if (item && event.dataTransfer) event.dataTransfer.setData("text/plain", item.dataset.debrisId);
  });

  root.addEventListener("change", (event) => {
    if (event.target === fields.debrisSelect) {
      state.selectedDebrisId = fields.debrisSelect.value;
      persistAndPaint();
    }
  });

  root.addEventListener("click", (event) => {
    const repair = event.target.closest("button[data-repair]");
    if (repair) { applyRepair(state, repair.dataset.repair, REPAIR_STEP); persistAndPaint(); return; }
    const highLoad = event.target.closest("button[data-high-load]");
    if (highLoad) { toggleHighLoad(state, highLoad.dataset.highLoad); persistAndPaint(); return; }
    const freeze = event.target.closest("button[data-stabilize-node]");
    if (freeze) { applyStabilizer(state, freeze.dataset.stabilizeNode); persistAndPaint(); return; }
    const tech = event.target.closest("button[data-tech]");
    if (tech) { buyTech(state, tech.dataset.tech); persistAndPaint(); return; }
    const struct = event.target.closest("button[data-struct]");
    if (struct) { buildStructure(state, struct.dataset.struct); persistAndPaint(); return; }
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    if (button.dataset.action === "advance") advanceCycle(state, cycleRng(state.cycle));
    if (button.dataset.action === "storm") braceStorm(state);
    if (button.dataset.action === "stabilizer") buildStabilizer(state, STABILIZER_COST);
    if (button.dataset.action === "archive") archiveSelectedDebris({ state, actions, achievements, bell });
    if (button.dataset.action === "external") {
      state.externalImportBonusCycles = 3;
      actions?.setAction?.(8, "external_debris_imported", { source: "external-import" });
    }
    if (button.dataset.action === "boss") challengeBoss();
    if (button.dataset.action === "collapse") { if (microstateCollapse(state).ok && run?.reset) run.reset(); }
    if (button.dataset.action === "bts") openBts({ bts, viewer });
    persistAndPaint();
  });

  repaint();

  // TEST/DEBUG hook (not a player affordance): deterministic fast-forward solvers for the smoke.
  // Neither bypasses the gate — bodySolver only plays the REAL engine forward (repair the spine, let
  // the frontier shed debris) to the body gate; bossSolver runs the REAL triple-gated burn. A fresh
  // field / two-click attempt still returns locked.
  window.__fvStage8 = {
    state: () => state,
    lockState: () => getBossLockState({ actions, state }),
    advance(cycles = 1) {
      for (let i = 0; i < cycles; i += 1) advanceCycle(state, cycleRng(state.cycle));
      persistAndPaint();
    },
    stormState: () => ({ available: stormAvailable(state), active: state.activeStorm, survived: state.stormsSurvived || 0, act: state.act || 1 }),
    techStatus: () => techStatus(state),
    buyTech(id) { const r = buyTech(state, id); persistAndPaint(); return r; },
    structureStatus: () => structureStatus(state),
    buildStructure(id) { const r = buildStructure(state, id); persistAndPaint(); return r; },
    prestigeState: () => ({ available: prestigeAvailable(state), cores: state.meta.cores || 0, mult: state.prestigeMult || 1, preview: coresPreview(state) }),
    collapse() { const r = microstateCollapse(state); if (r.ok && run?.reset) run.reset(); persistAndPaint(); return r; },
    brace() {
      const r = braceStorm(state);
      persistAndPaint();
      return r;
    },
    bodySolver() {
      driveToGate(state, cycleRng);
      persistAndPaint();
      return getBossLockState({ actions, state });
    },
    bossSolver() {
      const result = challengeBoss();
      return {
        defeated: Boolean(state.boss.defeated),
        locked: Boolean(result?.locked),
        burn: result?.burn || null
      };
    }
  };

  return {
    repaint,
    dev,
    destroy() {
      if (window.__fvStage8) delete window.__fvStage8;
      root.remove();
    }
  };

  // Dev-menu cheats (see index.js stageMeta.devControls). Pure state mutations live in s8dev.js;
  // action-bus side-effects (actions.setAction) are handled here where `actions` is in scope.
  function dev(id) {
    if (id === "resources")    devGiveResources(state);
    else if (id === "skip-storm")  devSkipStorm(state);
    else if (id === "boss-gate") {
      devUnlockBossGate(state);
      // Fire the action-bus entry that hasSalvageArchived() checks — can't be done in pure state.
      if (actions && typeof actions.setAction === "function") {
        actions.setAction(8, ACTION_NAME, { source: "dev-cheat", fallback: true });
      }
    }
    else if (id === "cool-field")  devCoolField(state);
    else if (id === "spawn-debris") devSpawnDebris(state);
    persistAndPaint();
  }

  // Deterministic per-cycle rng, reseeded from the run seed: `${run.seed}:cyc:${cycle}` (so the SAME
  // run replays identically across reloads, and a fresh run after reset() gets a new seed base).
  function cycleRng(cycle) {
    return makeRng(`${seedBase}:cyc:${cycle}`);
  }

  function challengeBoss() {
    const result = recordHeatDeathAttempt({ state, actions, rng: makeRng(`${seedBase}:burn:${state.cycle}`) });
    persistAndPaint();
    if (result.defeated) {
      if (run && typeof run.reset === "function") run.reset(); // run resolved → clear the resume slot
      completeOnce({ stage: 8, defeated: true, btsPath: BTS_PATH });
    }
    return result;
  }

  function repaint() {
    if (!state.debris.some((d) => d.id === state.selectedDebrisId)) {
      state.selectedDebrisId = state.debris[0]?.id || "";
    }
    const lock = getBossLockState({ actions, state });
    const disc = computeDisclosure(state);
    updateDisclosure(disc);
    paintStage8({
      state,
      lock,
      disc,
      storm: stormAvailable(state),
      els: { fields, map, log, root },
      onSelectDebris: (id) => { state.selectedDebrisId = id; repaint(); }
    });
    if (disc.parts) paintTech(fields.tech, state);
    if (disc.structures) paintStructures(fields.struct, state);
  }

  // Progressive disclosure (M1): seed the persisted flag set silently on first paint (so a loaded
  // veteran save fires no banners), then on later repaints fire ONE arrival banner per newly-revealed
  // system and persist the flag. Display-only — never touches the engine or the gate.
  function updateDisclosure(disc) {
    if (!state.disclosed || typeof state.disclosed !== "object") state.disclosed = {};
    if (!disclosureSeeded) {
      for (const key of Object.keys(disc)) if (disc[key]) state.disclosed[key] = true;
      disclosureSeeded = true;
      return;
    }
    let bannered = false;
    for (const key of DISCLOSE_ORDER) {
      if (disc[key] && !state.disclosed[key]) {
        state.disclosed[key] = true;
        if (!bannered && DISCLOSE_MESSAGES[key]) { banner(cmdbar, DISCLOSE_MESSAGES[key]); bannered = true; }
      }
    }
  }

  function persistAndPaint() {
    // Checkpoint the live sim into the run-state resume slot (tagged with the run identity) BEFORE the
    // save() call serializes the save object, so a reload resumes this exact mid-run position.
    if (run && typeof run.checkpoint === "function" && !state.boss.defeated) {
      run.checkpoint({ ...snapshotRun(state), runTag: run.seed });
    }
    if (typeof save === "function") save();
    repaint();
  }
}

function openBts({ bts, viewer }) {
  if (bts && typeof bts.open === "function") bts.open(8);
  else if (bts && typeof bts.openBts === "function") bts.openBts(8);
  else if (viewer && typeof viewer.openFile === "function") viewer.openFile(BTS_PATH);
  else if (viewer && typeof viewer.openViewerFile === "function") viewer.openViewerFile(BTS_PATH);
  else console.info(btsSummary.join("\n"));
}

function once(fn) {
  let called = false;
  return (value) => {
    if (called) return;
    called = true;
    fn(value);
  };
}
