import {
  activateOfflineMode,
  getBossLockState,
  getBossSeed,
  readServiceWorkerNotes,
  recordObserverBossAttempt
} from "./boss.js";
import {
  BOSS_LEVEL,
  crossAttempt,
  levelConfig,
  rotSpeedFor,
  solveElapsed,
  sublevelSeed
} from "./game.js";
import { ringAngle, renderRing } from "./ring.js";
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

  // Local timing state. elapsedMs accrues from the animation ticks (NOT Date.now) so the rotation
  // is deterministic given the tick count and the smoke can drive it with explicit elapsedMs.
  let elapsedMs = 0;
  let bossSeed = null; // set on OBSERVE while at the boss level (online → random, offline → 0)

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
      pushLog(`level ${state.currentLevel} crossed (gap at top). advancing.`);
      state.currentLevel = Math.min(BOSS_LEVEL, state.currentLevel + 1);
      elapsedMs = 0;
      bossSeed = null;
      if (state.currentLevel >= BOSS_LEVEL) pushLog("level 18: THE OBSERVER EFFECT. the gap will not hold still while live.");
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

  // TEST/DEBUG hook (not a player affordance): drives the timing game deterministically for the
  // smoke. It does NOT bypass anything — solveSublevels CROSSes each real level at its solve moment,
  // and the boss still needs the offline un-cheat (online attempts reseed and fail).
  window.__fvStage9 = {
    state: () => state,
    crossAt(ms) { elapsedMs = Number(ms) || 0; doCross(); persistAndPaint(); },
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

  function pushLog(line) {
    state.log = [...(state.log || []), line].slice(-6);
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
    fields.seed.textContent = state.currentLevel >= BOSS_LEVEL ? (lock.seedMode === "fixed-cache" ? "0 (fixed)" : "random") : "stable";
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
