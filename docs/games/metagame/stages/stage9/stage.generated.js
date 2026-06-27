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

// ../../docs/games/metagame/stages/stage9/rng.js
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = h << 13 | h >>> 19;
  }
  return () => {
    h = Math.imul(h ^ h >>> 16, 2246822507);
    h = Math.imul(h ^ h >>> 13, 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
function mulberry32(a) {
  return () => {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function makeRng(seed) {
  const next = mulberry32(xmur3(String(seed))());
  const float = () => next();
  const int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1));
  const pick = (arr) => arr[Math.floor(next() * arr.length)];
  const chance = (p) => next() < p;
  const shuffle = (arr) => {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  return { float, int, pick, chance, shuffle };
}

// ../../docs/games/metagame/stages/stage9/ring.js
var RING_W = 25;
var RING_H = 13;
var DEFAULT_GAP_DEG = 20;
function ringAngle(seed, elapsedMs, rotSpeedDegPerSec = 30) {
  const base = makeRng(seed).float() * 360;
  return mod360(base + rotSpeedDegPerSec * (Number(elapsedMs) || 0) / 1e3);
}
function renderRing(gapAngleDeg, opts = {}) {
  const { gapWidth = DEFAULT_GAP_DEG, darkZone = null, ghosts = [], hidden = false } = opts;
  const grid = Array.from({ length: RING_H }, () => Array(RING_W).fill(" "));
  const cx = (RING_W - 1) / 2;
  const cy = (RING_H - 1) / 2;
  for (let a = 0; a < 360; a += 3) {
    const rad = (a - 90) * Math.PI / 180;
    const x = Math.round(cx + cx * Math.cos(rad));
    const y = Math.round(cy + cy * Math.sin(rad));
    if (y < 0 || y >= RING_H || x < 0 || x >= RING_W) continue;
    let ch = hidden ? "?" : ringChar(a);
    if (!hidden && inArc(a, gapAngleDeg, gapWidth)) ch = " ";
    for (const g of ghosts) if (inArc(a, g.angle, 6)) ch = g.result === "hit" || g.hit ? "⊕" : "·";
    if (darkZone && inZone(a, darkZone)) ch = "█";
    grid[y][x] = ch;
  }
  return grid.map((row) => row.join("")).join("\n");
}
function ringChar(a) {
  const d = mod360(a);
  if (inArc(d, 0, 60) || inArc(d, 180, 60)) return "─";
  if (inArc(d, 90, 60) || inArc(d, 270, 60)) return "│";
  return "+";
}
function mod360(a) {
  return (a % 360 + 360) % 360;
}
function angularDist(a, b) {
  return Math.abs(((a - b) % 360 + 540) % 360 - 180);
}
function inArc(a, center, width) {
  return angularDist(a, center) <= width / 2;
}
function inZone(a, zone) {
  const x = mod360(a);
  const s = mod360(zone.start);
  const e = mod360(zone.end);
  return s <= e ? x >= s && x <= e : x >= s || x <= e;
}

// ../../docs/games/metagame/stages/stage9/game.js
var BOSS_LEVEL = 18;
var BANDS = {
  1: { baseSpeed: 30, speedVar: 0, tolerance: 40, display: "open" },
  2: { baseSpeed: 45, speedVar: 10, tolerance: 32, display: "open" },
  3: { baseSpeed: 60, speedVar: 15, tolerance: 26, display: "dual" },
  4: { baseSpeed: 75, speedVar: 20, tolerance: 22, display: "ghosts" },
  5: { baseSpeed: 90, speedVar: 25, tolerance: 18, display: "hidden" },
  6: { baseSpeed: 45, speedVar: 0, tolerance: 15, display: "dark", darkZone: { start: 300, end: 60 } }
};
function bandForLevel(level) {
  return Math.max(1, Math.min(6, Math.ceil((Number(level) || 1) / 3)));
}
function levelConfig(level) {
  const band = bandForLevel(level);
  return { level: Number(level) || 1, band, ...BANDS[band], isBoss: Number(level) === BOSS_LEVEL };
}
function rotSpeedFor(seed, level) {
  const cfg = levelConfig(level);
  return cfg.baseSpeed + makeRng(`${seed}s`).float() * cfg.speedVar;
}
function crossAttempt({ seed, elapsedMs, level }) {
  const cfg = levelConfig(level);
  const speed = rotSpeedFor(seed, level);
  const angle = ringAngle(seed, elapsedMs, speed);
  const distance = angularDist2(angle, 0);
  return { hit: distance <= cfg.tolerance / 2, angle, distance, tolerance: cfg.tolerance, level };
}
function solveElapsed(seed, level) {
  const speed = rotSpeedFor(seed, level);
  const base = ringAngle(seed, 0, speed);
  const need = ((360 - base) % 360 + 360) % 360;
  return Math.round(need / speed * 1e3);
}
function sublevelSeed(level) {
  return (Number(level) || 1) * 31 + 7;
}
function angularDist2(a, b) {
  return Math.abs(((a - b) % 360 + 540) % 360 - 180);
}

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
function recordObserverBossAttempt({ state, actions, elapsedMs = 0 }) {
  state.boss.reached = true;
  const lock = getBossLockState({ actions, state });
  if (!lock.unlocked) {
    state.boss.attempts = Number(state.boss.attempts || 0) + 1;
    state.boss.lockHintStep = Math.min(Number(state.boss.lockHintStep || 0) + 1, lockedHintLadder.length - 1);
    getBossSeed({ state, actions });
    pushLog(state, "the gap changed again. no timing survived contact.");
    return { defeated: false, unlocked: false, hit: false, seedMode: "live-random" };
  }
  const result = crossAttempt({ seed: FIXED_OFFLINE_SEED, elapsedMs: Number(elapsedMs) || 0, level: BOSS_LEVEL });
  if (!result.hit) {
    state.boss.attempts = Number(state.boss.attempts || 0) + 1;
    pushLog(state, `offline, but the cross was mistimed (off by ${Math.round(result.distance)}deg).`);
    return { defeated: false, unlocked: true, hit: false, seedMode: "fixed-cache", distance: result.distance };
  }
  state.boss.defeated = true;
  state.meta.firstClearComplete = true;
  state.meta.btsAvailable = true;
  state.clarity = Number(state.clarity || 0) + 25;
  pushLog(state, bellMessages.defeated);
  return { defeated: true, unlocked: true, hit: true, seedMode: "fixed-cache", seed: FIXED_OFFLINE_SEED };
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

// ../../docs/games/metagame/stages/stage9/loop.js
function startLoop(onTick, intervalMs = 100) {
  const id = setInterval(() => {
    try {
      onTick();
    } catch {
    }
  }, intervalMs);
  return { stop() {
    clearInterval(id);
  } };
}

// ../../docs/games/metagame/stages/stage9/renderer.js
var TICK_MS = 100;
function renderStage9({ host, state, actions, achievements, bell, bts, viewer, save, onStageComplete }) {
  const root = document.createElement("section");
  root.className = "stage9-observer-state";
  root.innerHTML = `
    <header class="s9-hud">
      <strong>OBSERVER STATE</strong>
      <span>level <b data-field="level"></b>/${BOSS_LEVEL}</span>
      <span>band <b data-field="band"></b></span>
      <span>clarity <b data-field="clarity"></b></span>
      <span>seed <b data-field="seed"></b></span>
    </header>
    <div class="s9-layout">
      <pre class="s9-arena" data-field="arena" aria-label="observer ring arena"></pre>
      <aside class="s9-side">
        <button type="button" data-action="observe">OBSERVE (reset rotation)</button>
        <button type="button" data-action="cross">CROSS</button>
        <hr>
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
      <button type="button" data-action="bts" hidden>open observer_state.bts</button>
    </div>
  `;
  host.replaceChildren(root);
  const fields = Object.fromEntries([...root.querySelectorAll("[data-field]")].map((el) => [el.dataset.field, el]));
  const log = root.querySelector(".s9-log");
  const completeOnce = once((result) => {
    if (typeof onStageComplete === "function") onStageComplete(result);
  });
  let elapsedMs = 0;
  let bossSeed = null;
  function activeSeed() {
    if (state.currentLevel >= BOSS_LEVEL) {
      if (bossSeed === null) bossSeed = getBossSeed({ state, actions });
      return bossSeed;
    }
    return sublevelSeed(state.currentLevel);
  }
  function reobserve() {
    elapsedMs = 0;
    if (state.currentLevel >= BOSS_LEVEL) bossSeed = getBossSeed({ state, actions });
  }
  function crossSublevel() {
    const seed = sublevelSeed(state.currentLevel);
    const result = crossAttempt({ seed, elapsedMs, level: state.currentLevel });
    if (result.hit) {
      pushLog2(`level ${state.currentLevel} crossed (gap at top). advancing.`);
      state.currentLevel = Math.min(BOSS_LEVEL, state.currentLevel + 1);
      elapsedMs = 0;
      bossSeed = null;
      if (state.currentLevel >= BOSS_LEVEL) pushLog2("level 18: THE OBSERVER EFFECT. the gap will not hold still while live.");
    } else {
      state.clarity = Math.max(0, Number(state.clarity || 0) - 1);
      pushLog2(`mistimed (off by ${Math.round(result.distance)}deg). clarity -1.`);
    }
  }
  function challengeBoss() {
    const result = recordObserverBossAttempt({ state, actions, elapsedMs });
    if (result.defeated) completeOnce({ stage: 9, defeated: true, btsPath: BTS_PATH });
  }
  function doCross() {
    if (state.boss.defeated) return;
    if (state.currentLevel >= BOSS_LEVEL) challengeBoss();
    else crossSublevel();
  }
  root.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    switch (button.dataset.action) {
      case "observe":
        reobserve();
        break;
      case "cross":
        doCross();
        break;
      case "notes":
        openNotes();
        break;
      case "offline":
        activateOfflineMode({ state, actions, achievements, bell });
        break;
      case "bts":
        openBts({ bts, viewer });
        break;
    }
    persistAndPaint();
  });
  const loop = startLoop(() => {
    if (!state.boss.defeated) elapsedMs += TICK_MS;
    paintArena();
  }, TICK_MS);
  repaint();
  window.__fvStage9 = {
    state: () => state,
    crossAt(ms) {
      elapsedMs = Number(ms) || 0;
      doCross();
      persistAndPaint();
    },
    solveSublevels() {
      let guard = 0;
      while (state.currentLevel < BOSS_LEVEL && guard++ < 64) {
        this.crossAt(solveElapsed(sublevelSeed(state.currentLevel), state.currentLevel));
      }
      return state.currentLevel;
    },
    solveOffline() {
      this.solveSublevels();
      reobserve();
      this.crossAt(solveElapsed(FIXED_OFFLINE_SEED, BOSS_LEVEL));
      return Boolean(state.boss.defeated);
    }
  };
  return {
    repaint,
    destroy() {
      loop.stop();
      if (window.__fvStage9) delete window.__fvStage9;
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
  function pushLog2(line) {
    state.log = [...state.log || [], line].slice(-6);
  }
  function paintArena() {
    const seed = activeSeed();
    const cfg = levelConfig(state.currentLevel);
    const speed = rotSpeedFor(seed, state.currentLevel);
    const angle = ringAngle(seed, elapsedMs, speed);
    const display = cfg.display;
    fields.arena.textContent = renderRing(angle, {
      gapWidth: cfg.tolerance,
      hidden: display === "hidden",
      darkZone: cfg.darkZone || null
    });
  }
  function repaint() {
    const lock = getBossLockState({ actions, state });
    const cfg = levelConfig(state.currentLevel);
    fields.level.textContent = String(state.currentLevel);
    fields.band.textContent = `${cfg.band} (${cfg.display})`;
    fields.clarity.textContent = String(state.clarity);
    fields.seed.textContent = state.currentLevel >= BOSS_LEVEL ? lock.seedMode === "fixed-cache" ? "0 (fixed)" : "random" : "stable";
    paintArena();
    if (state.boss.defeated) fields.boss.textContent = "defeated. BTS trace available.";
    else if (state.currentLevel < BOSS_LEVEL) fields.boss.textContent = `clear levels to reach the Observer (level ${BOSS_LEVEL}).`;
    else fields.boss.textContent = `${lock.unlocked ? "UNLOCKED — cross on the learned timing" : "LOCKED — the gap reseeds while live"} / ${lock.seedMode}`;
    fields.hint.textContent = state.currentLevel >= BOSS_LEVEL ? lock.hint : "watch the gap; CROSS when it faces the top (12 o'clock).";
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
