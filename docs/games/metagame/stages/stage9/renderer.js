import {
  activateOfflineMode,
  getBossLockState,
  getBossSeed,
  hasOfflineModeActivated,
  readServiceWorkerNotes,
  recordObserverBossAttempt
} from "./boss.js";
import {
  BOSS_LEVEL,
  crossAttempt,
  levelConfig,
  movementForLevel,
  renderLevel,
  solveMoment,
  sublevelSeed
} from "./game.js";
import { serviceWorkerNotesText } from "./content.js";
import { btsSummary, BTS_PATH, FIXED_OFFLINE_SEED, NOTES_PATH } from "./messages.js";
import { startLoop } from "./loop.js";

const TICK_MS = 100;

export function renderStage9({ host, state, actions, achievements, bell, bts, viewer, save, onStageComplete }) {
  const root = document.createElement("section");
  root.className = "stage9-observer-state";
  root.innerHTML = `
    <header class="s9-hud">
      <strong>OBSERVER STATE</strong>
      <span>level <b data-field="level"></b>/${BOSS_LEVEL}</span>
      <span>movement <b data-field="movement"></b></span>
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

  // Local timing state. elapsedMs accrues from the animation ticks (NOT Date.now) so the rotation
  // is deterministic given the tick count and the smoke can drive it with explicit elapsedMs.
  let elapsedMs = 0;
  let liveSeed = null; // random seed for onlineUnstable levels/boss (resampled on each OBSERVE)

  function offlineUnlocked() {
    return hasOfflineModeActivated(actions) || Boolean(state.offlineMode);
  }

  // The seed actually driving a level: stable per-level when learnable online; for the onlineUnstable
  // back third + boss it is the FIXED cached seed once offline, else a live-random seed that jumps on
  // every OBSERVE (so no timing learned online survives — the un-cheat is load-bearing for ALL of them).
  function activeSeed() {
    const cfg = levelConfig(state.currentLevel);
    if (cfg.onlineUnstable || state.currentLevel >= BOSS_LEVEL) {
      if (offlineUnlocked()) return FIXED_OFFLINE_SEED;
      if (liveSeed === null) liveSeed = getBossSeed({ state, actions });
      return liveSeed;
    }
    return sublevelSeed(state.currentLevel);
  }

  function reobserve() {
    elapsedMs = 0;
    const cfg = levelConfig(state.currentLevel);
    if ((cfg.onlineUnstable || state.currentLevel >= BOSS_LEVEL) && !offlineUnlocked()) {
      liveSeed = getBossSeed({ state, actions });
    }
  }

  function crossSublevel() {
    const level = state.currentLevel;
    const cfg = levelConfig(level);
    // Online-unstable level while still online: the gap reseeds — no press can land (go offline).
    if (cfg.onlineUnstable && !offlineUnlocked()) {
      state.clarity = Math.max(0, Number(state.clarity || 0) - 1);
      liveSeed = getBossSeed({ state, actions });
      state.boss.lockHintStep = Math.min(Number(state.boss.lockHintStep || 0) + 1, 3);
      pushLog("the gap reseeded the instant you committed. nothing holds while live. (go offline.)");
      return;
    }
    const seed = activeSeed();
    const result = crossAttempt({ seed, elapsedMs, level });
    if (result.hit) {
      state.clarity = Number(state.clarity || 0) + cfg.movement * 5;
      pushLog(`level ${level} crossed (gap at top). advancing.`);
      state.currentLevel = Math.min(BOSS_LEVEL, level + 1);
      elapsedMs = 0;
      liveSeed = null;
      if (state.currentLevel >= BOSS_LEVEL) pushLog(`level ${BOSS_LEVEL}: THE OBSERVER EFFECT. the gap will not hold still while live.`);
    } else {
      state.clarity = Math.max(0, Number(state.clarity || 0) - 1);
      pushLog(`mistimed (off by ${Math.round(result.distance)}deg). clarity -1.`);
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
      case "observe": reobserve(); break;
      case "cross": doCross(); break;
      case "notes": openNotes(); break;
      case "offline": activateOfflineMode({ state, actions, achievements, bell }); break;
      case "bts": openBts({ bts, viewer }); break;
    }
    persistAndPaint();
  });

  const loop = startLoop(() => {
    if (!state.boss.defeated) elapsedMs += TICK_MS;
    paintArena();
  }, TICK_MS);

  repaint();

  // TEST/DEBUG hook (not a player affordance): drives the timing game deterministically for the smoke.
  // It does NOT bypass anything — each call CROSSes a real level at its real solve moment for the seed
  // that level actually uses. The onlineUnstable back third + boss reseed while online, so solveOffline
  // only completes the run once Offline Mode is active (solveStableBody stalls there while online).
  window.__fvStage9 = {
    state: () => state,
    config: (level) => levelConfig(level ?? state.currentLevel),
    crossAt(ms) { elapsedMs = Number(ms) || 0; doCross(); persistAndPaint(); },
    // CROSS the current level at its perfect moment for the seed it actually uses right now.
    solveLevel() { this.crossAt(solveMoment(activeSeed(), state.currentLevel)); return state.currentLevel; },
    // Clear the learnable front movements. Online this STALLS at the first onlineUnstable level
    // (its gap reseeds on every commit) — proving the back third demands the offline un-cheat.
    solveStableBody() {
      let guard = 0;
      while (state.currentLevel < BOSS_LEVEL && !levelConfig(state.currentLevel).onlineUnstable && guard++ < 64) {
        const before = state.currentLevel;
        this.solveLevel();
        if (state.currentLevel === before) break;
      }
      return state.currentLevel;
    },
    // Full run to defeat (assumes Offline Mode already activated by the player/smoke).
    solveOffline() {
      let guard = 0;
      while (state.currentLevel < BOSS_LEVEL && guard++ < 64) {
        const before = state.currentLevel;
        this.solveLevel();
        if (state.currentLevel === before) break;
      }
      reobserve();
      this.crossAt(solveMoment(FIXED_OFFLINE_SEED, BOSS_LEVEL));
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

  function pushLog(line) {
    state.log = [...(state.log || []), line].slice(-6);
  }

  function paintArena() {
    fields.arena.textContent = renderLevel(activeSeed(), state.currentLevel, elapsedMs);
  }

  function repaint() {
    const lock = getBossLockState({ actions, state });
    const movement = movementForLevel(state.currentLevel);
    fields.level.textContent = String(state.currentLevel);
    fields.movement.textContent = `${movement.name} — ${movement.verb}`;
    fields.clarity.textContent = String(state.clarity);
    const cfg = levelConfig(state.currentLevel);
    const unstable = cfg.onlineUnstable || state.currentLevel >= BOSS_LEVEL;
    fields.seed.textContent = unstable ? (lock.unlocked ? "0 (fixed cache)" : "live-random") : "stable";
    paintArena();
    if (state.boss.defeated) fields.boss.textContent = "defeated. BTS trace available.";
    else if (state.currentLevel < BOSS_LEVEL) fields.boss.textContent = `clear levels to reach the Observer (level ${BOSS_LEVEL}).`;
    else fields.boss.textContent = `${lock.unlocked ? "UNLOCKED — cross on the learned timing" : "LOCKED — the gap reseeds while live"} / ${lock.seedMode}`;
    fields.hint.textContent = unstable && !lock.unlocked
      ? lock.hint
      : "watch the gap; CROSS when it faces the top (12 o'clock).";
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
