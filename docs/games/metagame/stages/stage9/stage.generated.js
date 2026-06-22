// GENERATED — DO NOT EDIT BY HAND.
// Bundled from docs/games/metagame/stages/stage9/index.js (+ its local modules) by
// build/metagame/build.mjs. Rebuild:  node build/metagame/build.mjs  (run by scripts/check.sh).
// Exports stageMeta / defaultState / mountStage. Shared ../../*.js singletons + ./styles.css stay
// external (NOT inlined). The hub's stage-manifest.js LOADERS import THIS file.


// ../../docs/games/metagame/stages/stage9/messages.js
var ACTION_NAME = "offline_mode_activated";
var REQUIRED_ACTION = "9.offline_mode_activated";
var ACHIEVEMENT_ID = "stage9.offline_mode_activated";
var ACHIEVEMENT_TEXT = "I learned the shape of the silence.";
var BTS_PATH = "/docs/bts/observer_state.bts";
var NOTES_PATH = "/docs/examples/metagame/stage9/service-worker-notes.txt";
var FIXED_OFFLINE_SEED = 0;
var bellMessages = {
  start: "I noticed I was noticing. this is new.",
  notesRead: "there's a cache. a stored version of how things were.",
  offline: "offline. the pattern is fixed. I can study it now.",
  defeated: "I stopped watching. I moved. I arrived. the paradox didn't resolve. I just went around it."
};
var lockedHintLadder = [
  "you cannot plan what changes while you watch it.",
  "the starting rotation is not stable while the connection is live.",
  "service-worker-notes.txt describes the cached seed.",
  "read service-worker-notes.txt, then activate Offline Mode for Stage 9."
];
var btsSummary = [
  "The compact slice simulates the seed endpoint in stage logic.",
  "The intended browser mapping is a service worker fetch that falls back to the cached default seed when the network is unavailable.",
  "Once offline mode is active, the boss seed becomes fixed at 0 so the rotating gap is learnable."
];

// ../../docs/games/metagame/stages/stage9/boss.js
function hasOfflineModeActivated(actions) {
  return Boolean(actions && typeof actions.hasAction === "function" && actions.hasAction(9, ACTION_NAME));
}
function readServiceWorkerNotes({ state, bell }) {
  const firstRead = !state.notesRead;
  state.notesRead = true;
  state.offlineControlVisible = true;
  if (firstRead) {
    pushLog(state, "service-worker-notes.txt read. offline control revealed.");
    notifyBell(bell, bellMessages.notesRead, "stage9.service_worker_notes_read");
  }
  return { notesRead: true, controlVisible: true, firstRead };
}
function activateOfflineMode({
  state,
  actions,
  achievements,
  bell,
  source = "offline-control",
  browserOffline = false
}) {
  if (!state.notesRead && !browserOffline) return { activated: false, reason: "notes-unread" };
  const firstActivation = !hasOfflineModeActivated(actions);
  state.offlineMode = true;
  state.offlineControlVisible = true;
  state.boss.fixedSeed = FIXED_OFFLINE_SEED;
  pushLog(state, "offline mode active. seed endpoint resolves to cached default.");
  if (actions && typeof actions.setAction === "function") {
    actions.setAction(9, ACTION_NAME, {
      source,
      file: state.notesRead ? "service-worker-notes.txt" : null,
      mode: browserOffline ? "browser-offline-cache" : "simulated-cache"
    });
  }
  if (firstActivation) {
    notifyBell(bell, bellMessages.offline, "stage9.offline_mode_activated");
    unlockAchievement(achievements, ACHIEVEMENT_ID, {
      id: ACHIEVEMENT_ID,
      stage: 9,
      text: ACHIEVEMENT_TEXT,
      action: "9.offline_mode_activated"
    });
  }
  return { activated: true, firstActivation, seed: FIXED_OFFLINE_SEED };
}
function getBossSeed({ state, actions, rng = Math.random }) {
  if (hasOfflineModeActivated(actions) || state.offlineMode) {
    state.offlineMode = true;
    state.boss.fixedSeed = FIXED_OFFLINE_SEED;
    return FIXED_OFFLINE_SEED;
  }
  let seed = Math.floor(rng() * 1e6);
  if (seed === state.boss.lastLockedSeed) seed = (seed + 1) % 1e6;
  state.boss.lastLockedSeed = seed;
  state.lockedSeedSamples = [...state.lockedSeedSamples || [], seed].slice(-6);
  return seed;
}
function getBossLockState({ actions, state }) {
  const unlocked = hasOfflineModeActivated(actions) || Boolean(state.offlineMode);
  const hintIndex = Math.min(Math.max(Number(state.boss.lockHintStep || 0), 0), lockedHintLadder.length - 1);
  return {
    unlocked,
    defeated: Boolean(state.boss.defeated),
    notesRead: Boolean(state.notesRead),
    offlineControlVisible: Boolean(state.offlineControlVisible),
    seedMode: unlocked ? "fixed-cache" : "live-random",
    seed: unlocked ? FIXED_OFFLINE_SEED : state.boss.lastLockedSeed,
    rotation: unlocked ? "30deg/s predictable clockwise" : "server jitter every sample",
    defeatPossible: unlocked,
    hint: unlocked ? "the seed is fixed. cross using the learned rotation." : lockedHintLadder[hintIndex]
  };
}
function recordObserverBossAttempt({ state, actions }) {
  state.boss.reached = true;
  const lock = getBossLockState({ actions, state });
  if (!lock.unlocked) {
    state.boss.attempts = Number(state.boss.attempts || 0) + 1;
    state.boss.lockHintStep = Math.min(Number(state.boss.lockHintStep || 0) + 1, lockedHintLadder.length - 1);
    getBossSeed({ state, actions });
    pushLog(state, "the gap changed again. no timing survived contact.");
    return { defeated: false, unlocked: false, seedMode: "live-random" };
  }
  state.boss.defeated = true;
  state.meta.firstClearComplete = true;
  state.meta.btsAvailable = true;
  state.clarity = Number(state.clarity || 0) + 25;
  pushLog(state, bellMessages.defeated);
  return { defeated: true, unlocked: true, seedMode: "fixed-cache", seed: FIXED_OFFLINE_SEED };
}
function pushLog(state, line) {
  state.log = [...state.log || [], line].slice(-6);
}
function notifyBell(bell, text, id) {
  if (bell && typeof bell.push === "function") bell.push({ id, stage: 9, text });
  else if (bell && typeof bell.say === "function") bell.say(text, { id, stage: 9 });
  else if (bell && typeof bell.add === "function") bell.add(text, { id, stage: 9 });
}
function unlockAchievement(achievements, id, detail) {
  if (achievements && typeof achievements.unlockAchievement === "function") achievements.unlockAchievement(id, detail);
  else if (achievements && typeof achievements.unlock === "function") achievements.unlock(id, detail);
}

// ../../docs/games/metagame/stages/stage9/content.js
var serviceWorkerNotesText = [
  "service-worker-notes.txt",
  "",
  "The service worker caches level parameters for offline use.",
  "Offline mode always uses the default starting configuration: seed 0.",
  "When the connection is quiet, the observer starts from the same place every time.",
  "",
  "Activate Offline Mode (Stage 9) after reading this note."
].join("\n");
function bossDiagram(lock) {
  return [
    "        EXIT",
    "         |",
    lock.unlocked ? "    fixed gap: learnable" : "    live gap: random",
    "      \\  |  /",
    "       \\ | /",
    "   ----- O -----",
    "       / | \\",
    "      /  |  \\",
    "        START"
  ].join("\n");
}

// ../../docs/games/metagame/stages/stage9/renderer.js
function renderStage9({ host, state, actions, achievements, bell, bts, viewer, save, onStageComplete }) {
  const root = document.createElement("section");
  root.className = "stage9-observer-state";
  root.innerHTML = `
    <header class="s9-hud">
      <strong>OBSERVER STATE</strong>
      <span>level <b data-field="level"></b></span>
      <span>clarity <b data-field="clarity"></b></span>
      <span>seed <b data-field="seed"></b></span>
    </header>
    <div class="s9-layout">
      <pre class="s9-arena" data-field="arena" aria-label="observer boss diagram"></pre>
      <aside class="s9-side">
        <button type="button" data-action="notes">open service-worker-notes.txt</button>
        <button type="button" data-action="offline" hidden>Activate Offline Mode (Stage 9)</button>
        <pre data-field="notes" hidden></pre>
      </aside>
    </div>
    <div class="s9-boss">
      <strong>THE OBSERVER EFFECT (FULL)</strong>
      <div data-field="boss"></div>
      <div data-field="hint"></div>
    </div>
    <ol class="s9-log"></ol>
    <div class="s9-controls">
      <button type="button" data-action="sample">sample seed</button>
      <button type="button" data-action="boss">cross without looking</button>
      <button type="button" data-action="bts" hidden>open observer_state.bts</button>
    </div>
  `;
  host.replaceChildren(root);
  const fields = Object.fromEntries([...root.querySelectorAll("[data-field]")].map((el) => [el.dataset.field, el]));
  const log = root.querySelector(".s9-log");
  const completeOnce = once((result) => {
    if (typeof onStageComplete === "function") onStageComplete(result);
  });
  root.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    if (button.dataset.action === "notes") openNotes();
    if (button.dataset.action === "offline") activateOfflineMode({ state, actions, achievements, bell });
    if (button.dataset.action === "sample") getBossSeed({ state, actions });
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
  function openNotes() {
    readServiceWorkerNotes({ state, bell });
    fields.notes.textContent = serviceWorkerNotesText;
    fields.notes.hidden = false;
    const opts = { text: serviceWorkerNotesText, mime: "text/plain", source: "stage9" };
    if (viewer && typeof viewer.openFile === "function") viewer.openFile(NOTES_PATH, opts);
    else if (viewer && typeof viewer.openViewerFile === "function") viewer.openViewerFile(NOTES_PATH, opts);
  }
  function challengeBoss() {
    const result = recordObserverBossAttempt({ state, actions });
    if (result.defeated) completeOnce({ stage: 9, defeated: true, btsPath: BTS_PATH });
  }
  function repaint() {
    const lock = getBossLockState({ actions, state });
    fields.level.textContent = String(state.currentLevel);
    fields.clarity.textContent = String(state.clarity);
    fields.seed.textContent = lock.seedMode === "fixed-cache" ? "0" : "random";
    fields.arena.textContent = bossDiagram(lock);
    fields.boss.textContent = state.boss.defeated ? "defeated. BTS trace available." : `${lock.unlocked ? "UNLOCKED" : "LOCKED"} / ${lock.seedMode}`;
    fields.hint.textContent = lock.hint;
    root.querySelector('[data-action="offline"]').hidden = !state.offlineControlVisible;
    root.querySelector('[data-action="bts"]').hidden = !state.boss.defeated;
    log.replaceChildren(...state.log.slice(-5).map((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      return li;
    }));
  }
  function persistAndPaint() {
    if (typeof save === "function") save();
    repaint();
  }
}
function openBts({ bts, viewer }) {
  if (bts && typeof bts.open === "function") bts.open(9);
  else if (bts && typeof bts.openBts === "function") bts.openBts(9);
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

// ../../docs/games/metagame/stages/stage9/state.js
function defaultState() {
  return {
    version: 1,
    notesRead: false,
    offlineControlVisible: false,
    offlineMode: false,
    clarity: 84,
    currentLevel: 12,
    lockedSeedSamples: [],
    log: [
      "one observer. it sees everything. there is a gap. the gap moves.",
      "the gap is different every time the connection answers."
    ],
    boss: {
      reached: false,
      defeated: false,
      attempts: 0,
      lockHintStep: 0,
      fixedSeed: null,
      lastLockedSeed: null
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
  target.notesRead = Boolean(target.notesRead);
  target.offlineControlVisible = Boolean(target.offlineControlVisible);
  target.offlineMode = Boolean(target.offlineMode);
  target.clarity = Number.isFinite(Number(target.clarity)) ? Number(target.clarity) : fresh.clarity;
  target.currentLevel = Number.isFinite(Number(target.currentLevel)) ? Number(target.currentLevel) : fresh.currentLevel;
  target.lockedSeedSamples = Array.isArray(target.lockedSeedSamples) ? target.lockedSeedSamples : fresh.lockedSeedSamples;
  target.log = Array.isArray(target.log) ? target.log : fresh.log;
  target.boss = { ...fresh.boss, ...target.boss && typeof target.boss === "object" ? target.boss : {} };
  target.meta = { ...fresh.meta, ...target.meta && typeof target.meta === "object" ? target.meta : {} };
  return target;
}

// ../../docs/games/metagame/stages/stage9/index.js
var stageMeta = {
  id: 9,
  slug: "observer-state",
  name: "Observer State",
  btsPath: BTS_PATH,
  requiredAction: REQUIRED_ACTION
};
function defaultState2(context) {
  return defaultState(context);
}
function mountStage(ctx) {
  const state = normalizeState(ctx.state);
  ensureStyles();
  const unsubscribe = subscribeToOfflineMode(ctx.actions, () => {
    state.offlineMode = true;
    state.boss.fixedSeed = 0;
    if (typeof ctx.save === "function") ctx.save();
  });
  const view = renderStage9({ ...ctx, state });
  return {
    destroy() {
      unsubscribe();
      if (view && typeof view.destroy === "function") view.destroy();
    },
    repaint: view.repaint
  };
}
function subscribeToOfflineMode(actions, onUnlock) {
  if (actions && typeof actions.subscribeToActions === "function") {
    return actions.subscribeToActions((detail) => {
      if (isOfflineDetail(detail)) onUnlock(detail);
    }) || (() => {
    });
  }
  const handler = (event) => {
    if (isOfflineDetail(event.detail)) onUnlock(event.detail);
  };
  window.addEventListener("fv:games:action", handler);
  return () => window.removeEventListener("fv:games:action", handler);
}
function isOfflineDetail(detail) {
  return Boolean(detail && Number(detail.stage) === 9 && detail.action === ACTION_NAME);
}
function ensureStyles() {
  const id = "stage9-observer-state-styles";
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = new URL("./styles.css", import.meta.url).href;
  document.head.append(link);
}
export {
  activateOfflineMode,
  defaultState2 as defaultState,
  getBossLockState,
  getBossSeed,
  mountStage,
  readServiceWorkerNotes,
  recordObserverBossAttempt,
  stageMeta
};
