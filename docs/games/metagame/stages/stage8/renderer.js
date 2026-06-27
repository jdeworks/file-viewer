import {
  archiveSelectedDebris,
  getBossLockState,
  handleDebrisDrop,
  recordHeatDeathAttempt
} from "./boss.js";
import { btsSummary, BTS_PATH, SALVAGE_REQUIRED, STABILIZER_COST } from "./messages.js";
import { entropyTreeText } from "./content.js";
import { advanceCycle, applyRepair, buildStabilizer, status as nodeStatus } from "./engine.js";
import { driveToGate } from "./solver.js";
import { nodeById } from "./nodes.js";
import { makeRng } from "./rng.js";

const REPAIR_STEP = 2; // repair units spent per click

export function renderStage8({ host, state, actions, achievements, bell, bts, viewer, save, onStageComplete }) {
  const root = document.createElement("section");
  root.className = "stage8-entropy-field";
  root.innerHTML = `
    <header class="s8-hud">
      <strong>ENTROPY FIELD</strong>
      <span>cycle <b data-field="cycle"></b></span>
      <span>States <b data-field="states"></b></span>
      <span>entropy <b data-field="entropy"></b>%</span>
      <span>repair <b data-field="repairUnits"></b></span>
      <span>stabilizers <b data-field="stabilizers"></b></span>
      <span>salvage <b data-field="salvage"></b>/${SALVAGE_REQUIRED}</span>
    </header>
    <div class="s8-layout">
      <div class="s8-map" aria-label="node status"></div>
      <div class="s8-files">
        <pre data-field="tree" aria-label="entropy virtual file tree"></pre>
        <label>Debris
          <select data-field="debrisSelect"></select>
        </label>
        <button type="button" data-action="archive">Archive</button>
        <div class="s8-drop" data-drop-target="/entropy/active_archive/" tabindex="0" role="button" aria-label="Archive selected debris">Active Archive</div>
      </div>
    </div>
    <div class="s8-boss">
      <strong>THE HEAT DEATH</strong>
      <div data-field="boss"></div>
      <div data-field="hint"></div>
      <pre data-field="burn" class="s8-burn" hidden></pre>
    </div>
    <ol class="s8-log"></ol>
    <div class="s8-controls">
      <button type="button" data-action="advance">advance cycle ▸</button>
      <button type="button" data-action="stabilizer">build stabilizer (${STABILIZER_COST} States)</button>
      <button type="button" data-action="boss">challenge Heat Death</button>
      <button type="button" data-action="external">simulate external import</button>
      <button type="button" data-action="bts" hidden>open entropy_field.bts</button>
    </div>
  `;
  host.replaceChildren(root);

  const fields = Object.fromEntries([...root.querySelectorAll("[data-field]")].map((el) => [el.dataset.field, el]));
  const map = root.querySelector(".s8-map");
  const log = root.querySelector(".s8-log");
  const dropTarget = root.querySelector(".s8-drop");
  const completeOnce = once((result) => {
    if (typeof onStageComplete === "function") onStageComplete(result);
  });

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
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    if (button.dataset.action === "advance") advanceCycle(state, cycleRng(state.cycle));
    if (button.dataset.action === "stabilizer") buildStabilizer(state, STABILIZER_COST);
    if (button.dataset.action === "archive") archiveSelectedDebris({ state, actions, achievements, bell });
    if (button.dataset.action === "external") {
      state.externalImportBonusCycles = 3;
      actions?.setAction?.(8, "external_debris_imported", { source: "external-import" });
    }
    if (button.dataset.action === "boss") challengeBoss();
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
    destroy() {
      if (window.__fvStage8) delete window.__fvStage8;
      root.remove();
    }
  };

  // Deterministic per-cycle rng. (The run-state retrofit swaps the seed base to the run seed.)
  function cycleRng(cycle) {
    return makeRng(`8:cyc:${cycle}`);
  }

  function challengeBoss() {
    const result = recordHeatDeathAttempt({ state, actions, rng: makeRng(`8:burn:${state.cycle}`) });
    persistAndPaint();
    if (result.defeated) {
      completeOnce({ stage: 8, defeated: true, btsPath: BTS_PATH });
    }
    return result;
  }

  function repaint() {
    if (!state.debris.some((d) => d.id === state.selectedDebrisId)) {
      state.selectedDebrisId = state.debris[0]?.id || "";
    }
    const lock = getBossLockState({ actions, state });
    fields.cycle.textContent = String(state.cycle);
    fields.states.textContent = String(state.states);
    fields.entropy.textContent = String(state.entropy || 0);
    fields.repairUnits.textContent = String(Number.isFinite(state.repairUnits) ? state.repairUnits : 6);
    fields.stabilizers.textContent = String(state.stabilizers || 0);
    fields.salvage.textContent = String(state.salvageTotal);
    fields.tree.textContent = entropyTreeText(state);
    fields.boss.textContent = state.boss.defeated
      ? "defeated. BTS trace available."
      : `${lock.unlocked ? "UNLOCKED" : "LOCKED"} · action ${lock.actionReady ? "✓" : "✗"} · salvage ${lock.enoughSalvage ? "✓" : "✗"} · cycles ${lock.enoughCycles ? "✓" : "✗"} · reserves ${lock.enoughStates ? "✓" : "✗"}`;
    fields.hint.textContent = lock.hint;
    if (state.boss.burn && Array.isArray(state.boss.burn.trace) && state.boss.burn.trace.length) {
      fields.burn.hidden = false;
      const b = state.boss.burn;
      fields.burn.textContent = [
        b.survived ? `HEAT DEATH ENDURED · ${b.remainingStates} States remain` : `HEAT DEATH OVERRAN at burn cycle ${b.failedAt}`,
        ...b.trace.map((t) => `  burn ${t.cycle}: -${t.drain}${t.paused ? " (stabilizer)" : ""} → ${t.remaining}`)
      ].join("\n");
    } else {
      fields.burn.hidden = true;
    }
    fields.debrisSelect.replaceChildren(...state.debris.map((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = `${item.id} (${item.value})`;
      option.selected = item.id === state.selectedDebrisId;
      return option;
    }));
    map.replaceChildren(...state.nodes.map((n) => {
      const def = nodeById(n.id) || {};
      const s = nodeStatus(n.health);
      const item = document.createElement("div");
      item.className = `s8-node is-${s}`;
      const bar = `<span class="s8-node-bar"><span style="width:${Math.round(n.health)}%"></span></span>`;
      item.innerHTML = `<span class="s8-node-id">${n.id}</span> <span class="s8-node-name">${def.name || ""}</span>
        ${bar} <span class="s8-node-hp">${Math.round(n.health)}%</span>
        <button type="button" data-repair="${n.id}">repair</button>`;
      return item;
    }), ...state.debris.map((item) => {
      const debris = document.createElement("button");
      debris.type = "button";
      debris.className = "s8-debris";
      debris.draggable = true;
      debris.dataset.debrisId = item.id;
      debris.textContent = item.id;
      debris.addEventListener("click", () => {
        state.selectedDebrisId = item.id;
        repaint();
      });
      return debris;
    }));
    log.replaceChildren(...state.log.slice(-5).map((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      return li;
    }));
    root.querySelector('[data-action="bts"]').hidden = !state.boss.defeated;
  }

  function persistAndPaint() {
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
