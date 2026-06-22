// GENERATED — DO NOT EDIT BY HAND.
// Bundled from docs/games/metagame/stages/stage8/index.js (+ its local modules) by
// build/metagame/build.mjs. Rebuild:  node build/metagame/build.mjs  (run by scripts/check.sh).
// Exports stageMeta / defaultState / mountStage. Shared ../../*.js singletons + ./styles.css stay
// external (NOT inlined). The hub's stage-manifest.js LOADERS import THIS file.


// ../../docs/games/metagame/stages/stage8/messages.js
var ACTION_NAME = "salvage_archived";
var REQUIRED_ACTION = "8.salvage_archived";
var ACHIEVEMENT_ID = "stage8.salvage_archived";
var ACHIEVEMENT_TEXT = "I sorted the wreckage.";
var BTS_PATH = "/docs/bts/entropy_field.bts";
var SALVAGE_REQUIRED = 72;
var bellMessages = {
  start: "something is degrading. I noticed too late to stop it.",
  debris: "there was something left in the wreckage. it won't last long.",
  archive: "if I can't stop it, I can use what remains.",
  warning: "a cascade is coming. I don't know how large. I am saving what I can.",
  defeated: "I held. the universe didn't care. I did.",
  failed: "there was more. it was in the debris files. I didn't move them in time."
};
var lockedHintLadder = [
  "the collapse is not waiting for a heroic moment.",
  "you keep defending the field. what it discards does not vanish — it settles somewhere outside the fight.",
  "the States from failed nodes cool into .sav debris in /entropy/debris/.",
  "move that debris into /entropy/active_archive/ — the Archive button or drag/drop — and bank enough before Heat Death."
];
var btsSummary = [
  "Stage 8 uses internal drag and drop because OS file dragging behaves differently across browsers, touch devices, and assistive technology.",
  "The critical lesson is still the file action: a generated .sav moves from debris into an active archive before decay.",
  "External import can exist as a bonus, but Heat Death is balanced around the internal archive path and its accessible fallback."
];

// ../../docs/games/metagame/stages/stage8/boss.js
function hasSalvageArchived(actions) {
  return Boolean(actions && typeof actions.hasAction === "function" && actions.hasAction(8, ACTION_NAME));
}
function archiveDebris({
  state,
  actions,
  achievements,
  bell,
  debrisId,
  source = "internal-drag-drop",
  fallback = false
}) {
  const index = state.debris.findIndex((item) => item.id === debrisId && item.id.endsWith(".sav"));
  if (index < 0) return { archived: false, reason: "missing-debris" };
  const [debris] = state.debris.splice(index, 1);
  const archived = {
    ...debris,
    archivedAtCycle: state.cycle,
    path: `/entropy/active_archive/${debris.id}`
  };
  state.archive.push(archived);
  state.salvageTotal = Number(state.salvageTotal || 0) + Number(debris.value || 0);
  state.states = Number(state.states || 0) + Number(debris.value || 0);
  state.selectedDebrisId = state.debris[0]?.id || "";
  pushLog(state, `archived ${debris.id}. +${debris.value} States.`);
  const firstArchive = !hasSalvageArchived(actions);
  if (actions && typeof actions.setAction === "function") {
    actions.setAction(8, ACTION_NAME, {
      source,
      file: debris.id,
      from: "/entropy/debris/",
      to: "/entropy/active_archive/",
      fallback
    });
  }
  if (firstArchive) {
    notifyBell(bell, bellMessages.archive, "stage8.salvage_archived");
    unlockAchievement(achievements, ACHIEVEMENT_ID, {
      id: ACHIEVEMENT_ID,
      stage: 8,
      text: ACHIEVEMENT_TEXT,
      action: "8.salvage_archived"
    });
  }
  return { archived: true, debris: archived, firstArchive };
}
function handleDebrisDrop({ state, actions, achievements, bell, debrisId, targetPath }) {
  if (targetPath !== "/entropy/active_archive/") return { archived: false, reason: "wrong-target" };
  return archiveDebris({ state, actions, achievements, bell, debrisId, source: "internal-drag-drop", fallback: false });
}
function archiveSelectedDebris({ state, actions, achievements, bell, source = "archive-button" }) {
  return archiveDebris({
    state,
    actions,
    achievements,
    bell,
    debrisId: state.selectedDebrisId,
    source,
    fallback: true
  });
}
function getBossLockState({ actions, state }) {
  const actionReady = hasSalvageArchived(actions);
  const enoughSalvage = Number(state.salvageTotal || 0) >= SALVAGE_REQUIRED;
  const unlocked = actionReady && enoughSalvage;
  const hintIndex = Math.min(Math.max(Number(state.boss.lockHintStep || 0), 0), lockedHintLadder.length - 1);
  return {
    unlocked,
    defeated: Boolean(state.boss.defeated),
    actionReady,
    enoughSalvage,
    salvageTotal: Number(state.salvageTotal || 0),
    salvageRequired: SALVAGE_REQUIRED,
    defeatPossible: unlocked,
    burnCycles: unlocked ? 10 : 0,
    hint: unlocked ? "archived States are sufficient. Heat Death can be waited out." : lockedHintLadder[hintIndex]
  };
}
function recordHeatDeathAttempt({ state, actions }) {
  state.boss.reached = true;
  const lock = getBossLockState({ actions, state });
  if (!lock.unlocked) return recordHeatDeathFailure(state, lock);
  state.boss.defeated = true;
  state.meta.firstClearComplete = true;
  state.meta.btsAvailable = true;
  pushLog(state, bellMessages.defeated);
  return { defeated: true, unlocked: true, btsAvailable: true };
}
function recordHeatDeathFailure(state, lock = null) {
  state.boss.attempts = Number(state.boss.attempts || 0) + 1;
  state.boss.lockHintStep = Math.min(Number(state.boss.lockHintStep || 0) + 1, lockedHintLadder.length - 1);
  if (!state.warningCheckpoint) state.warningCheckpoint = makeWarningCheckpoint(state);
  const checkpoint = rewindToWarningCheckpoint(state);
  pushLog(state, bellMessages.failed);
  return {
    defeated: false,
    unlocked: Boolean(lock?.unlocked),
    canRewindWarningCheckpoint: true,
    checkpointCycle: checkpoint.cycle
  };
}
function makeWarningCheckpoint(state) {
  return {
    cycle: Math.max(1, Number(state.cycle || 1) - 5),
    states: Math.max(0, Number(state.states || 0)),
    salvageTotal: Number(state.salvageTotal || 0),
    debris: state.debris.map((item) => ({ ...item })),
    archive: state.archive.map((item) => ({ ...item }))
  };
}
function rewindToWarningCheckpoint(state) {
  const checkpoint = state.warningCheckpoint || makeWarningCheckpoint(state);
  state.cycle = checkpoint.cycle;
  state.states = checkpoint.states;
  state.salvageTotal = checkpoint.salvageTotal;
  state.debris = checkpoint.debris.map((item) => ({ ...item }));
  state.archive = checkpoint.archive.map((item) => ({ ...item }));
  state.boss.firstFailureRewound = true;
  return checkpoint;
}
function pushLog(state, line) {
  state.log = [...state.log || [], line].slice(-6);
}
function notifyBell(bell, text, id) {
  if (bell && typeof bell.push === "function") bell.push({ id, stage: 8, text });
  else if (bell && typeof bell.say === "function") bell.say(text, { id, stage: 8 });
  else if (bell && typeof bell.add === "function") bell.add(text, { id, stage: 8 });
}
function unlockAchievement(achievements, id, detail) {
  if (achievements && typeof achievements.unlockAchievement === "function") achievements.unlockAchievement(id, detail);
  else if (achievements && typeof achievements.unlock === "function") achievements.unlock(id, detail);
}

// ../../docs/games/metagame/stages/stage8/content.js
var nodeRows = [
  { id: "C1", name: "Core Kernel", state: "active", output: 10 },
  { id: "M2", name: "Memory Shard B", state: "failed", output: 0 },
  { id: "P1", name: "Process Node A", state: "failed", output: 0 },
  { id: "F1", name: "Frontier Ext A", state: "degrading", output: 6 }
];
function entropyTreeText(state) {
  const debris = state.debris.map((item) => `    ${item.id} (${item.decay} cycles, ${item.value} States)`);
  const archive = state.archive.map((item) => `    ${item.id} (${item.value} States)`);
  return [
    "/entropy/",
    "  active_archive/",
    ...archive.length ? archive : ["    (empty)"],
    "  debris/",
    ...debris.length ? debris : ["    (empty)"]
  ].join("\n");
}

// ../../docs/games/metagame/stages/stage8/renderer.js
function renderStage8({ host, state, actions, achievements, bell, bts, viewer, save, onStageComplete }) {
  const root = document.createElement("section");
  root.className = "stage8-entropy-field";
  root.innerHTML = `
    <header class="s8-hud">
      <strong>ENTROPY FIELD</strong>
      <span>cycle <b data-field="cycle"></b></span>
      <span>States <b data-field="states"></b></span>
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
    </div>
    <ol class="s8-log"></ol>
    <div class="s8-controls">
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
    const button = event.target.closest("button[data-action]");
    if (!button) return;
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
  return {
    repaint,
    destroy() {
      root.remove();
    }
  };
  function challengeBoss() {
    const result = recordHeatDeathAttempt({ state, actions });
    if (result.defeated) {
      completeOnce({ stage: 8, defeated: true, btsPath: BTS_PATH });
    }
  }
  function repaint() {
    const lock = getBossLockState({ actions, state });
    fields.cycle.textContent = String(state.cycle);
    fields.states.textContent = String(state.states);
    fields.salvage.textContent = String(state.salvageTotal);
    fields.tree.textContent = entropyTreeText(state);
    fields.boss.textContent = state.boss.defeated ? "defeated. BTS trace available." : `${lock.unlocked ? "UNLOCKED" : "LOCKED"} / archived action ${lock.actionReady ? "yes" : "no"}`;
    fields.hint.textContent = lock.hint;
    fields.debrisSelect.replaceChildren(...state.debris.map((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = `${item.id} (${item.value})`;
      option.selected = item.id === state.selectedDebrisId;
      return option;
    }));
    map.replaceChildren(...nodeRows.map((node) => {
      const item = document.createElement("div");
      item.className = `s8-node is-${node.state}`;
      item.textContent = `${node.id} ${node.name} ${node.state} +${node.output}`;
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

// ../../docs/games/metagame/stages/stage8/state.js
function defaultState() {
  return {
    version: 1,
    cycle: 14,
    states: 164,
    totalStatesEarned: 460,
    salvageTotal: 0,
    selectedDebrisId: "node_p1_cycle14.sav",
    externalImportBonusCycles: 0,
    debris: [
      createDebris({ node: "p1", cycle: 14, tier: 1, value: 24, decay: 2 }),
      createDebris({ node: "m2", cycle: 13, tier: 2, value: 48, decay: 1 }),
      createDebris({ node: "f1", cycle: 12, tier: 4, value: 64, decay: 1 })
    ],
    archive: [],
    warningCheckpoint: null,
    log: [
      "node P1 failed. debris file created in /entropy/debris/.",
      "there was something left in the wreckage. it won't last long."
    ],
    boss: {
      reached: false,
      defeated: false,
      attempts: 0,
      lockHintStep: 0,
      firstFailureRewound: false
    },
    meta: {
      firstClearComplete: false,
      btsAvailable: false
    }
  };
}
function normalizeState(state) {
  const fresh = defaultState();
  const target = state && typeof state === "object" ? state : {};
  target.version = 1;
  target.cycle = Number.isFinite(Number(target.cycle)) ? Number(target.cycle) : fresh.cycle;
  target.states = Number.isFinite(Number(target.states)) ? Number(target.states) : fresh.states;
  target.totalStatesEarned = Number.isFinite(Number(target.totalStatesEarned)) ? Number(target.totalStatesEarned) : fresh.totalStatesEarned;
  target.salvageTotal = Number.isFinite(Number(target.salvageTotal)) ? Number(target.salvageTotal) : fresh.salvageTotal;
  target.selectedDebrisId = target.selectedDebrisId || fresh.selectedDebrisId;
  target.externalImportBonusCycles = Number(target.externalImportBonusCycles || 0);
  target.debris = Array.isArray(target.debris) ? target.debris : fresh.debris;
  target.archive = Array.isArray(target.archive) ? target.archive : fresh.archive;
  target.warningCheckpoint = target.warningCheckpoint || fresh.warningCheckpoint;
  target.log = Array.isArray(target.log) ? target.log : fresh.log;
  target.boss = { ...fresh.boss, ...target.boss && typeof target.boss === "object" ? target.boss : {} };
  target.meta = { ...fresh.meta, ...target.meta && typeof target.meta === "object" ? target.meta : {} };
  return target;
}
function createDebris({ node, cycle, tier, value, decay = 2 }) {
  const id = `node_${node}_cycle${cycle}.sav`;
  return {
    id,
    node,
    cycle,
    tier,
    value,
    decay,
    path: `/entropy/debris/${id}`
  };
}

// ../../docs/games/metagame/stages/stage8/index.js
var stageMeta = {
  id: 8,
  slug: "entropy-field",
  name: "Entropy Field",
  btsPath: BTS_PATH,
  requiredAction: REQUIRED_ACTION
};
function defaultState2(context) {
  return defaultState(context);
}
function mountStage(ctx) {
  const state = normalizeState(ctx.state);
  ensureStyles();
  const unsubscribe = subscribeToSalvage(ctx.actions, () => {
    if (typeof ctx.save === "function") ctx.save();
  });
  const view = renderStage8({ ...ctx, state });
  return {
    destroy() {
      unsubscribe();
      if (view && typeof view.destroy === "function") view.destroy();
    },
    repaint: view.repaint
  };
}
function subscribeToSalvage(actions, onUnlock) {
  if (actions && typeof actions.subscribeToActions === "function") {
    return actions.subscribeToActions((detail) => {
      if (isSalvageDetail(detail)) onUnlock(detail);
    }) || (() => {
    });
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
  defaultState2 as defaultState,
  getBossLockState,
  handleDebrisDrop,
  mountStage,
  recordHeatDeathAttempt,
  recordHeatDeathFailure,
  rewindToWarningCheckpoint,
  stageMeta
};
