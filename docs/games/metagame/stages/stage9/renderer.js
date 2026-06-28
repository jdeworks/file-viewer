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
  crossOutcome,
  levelConfig,
  modeHint,
  movementForLevel,
  renderLevel,
  sublevelSeed
} from "./game.js";
import { serviceWorkerNotesText } from "./content.js";
import { btsSummary, BTS_PATH, FIXED_OFFLINE_SEED, NOTES_PATH } from "./messages.js";
import { startLoop } from "./loop.js";
import { AIDS, buyAid, consumeStabilizer } from "./aids.js";
import { installTestHook } from "./testhook.js";

export function renderStage9({ host, state, actions, achievements, bell, bts, viewer, save, onStageComplete }) {
  const root = document.createElement("section");
  root.className = "stage9-observer-state";
  root.innerHTML = `
    <header class="s9-hud">
      <strong>OBSERVER STATE</strong>
      <span>level <b data-field="level"></b>/${BOSS_LEVEL}</span>
      <span>movement <b data-field="movement"></b></span>
      <span>clarity <b data-field="clarity"></b></span>
      <span data-field="tachWrap" hidden>tach <b data-field="tach"></b></span>
      <span>seed <b data-field="seed"></b></span>
    </header>
    <div class="s9-layout">
      <pre class="s9-arena" data-field="arena" aria-label="observer ring arena"></pre>
      <aside class="s9-side">
        <button type="button" data-action="observe">OBSERVE (reset rotation)</button>
        <button type="button" data-action="cross">CROSS</button>
        <hr>
        <div class="s9-aids">
          <strong>calibration (spend clarity)</strong>
          ${AIDS.map((a) => `<button type="button" data-action="aid" data-aid="${a.id}" title="${a.desc}">${a.label} (${a.cost})</button>`).join("")}
        </div>
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
  const hud = root.querySelector(".s9-hud");
  const FLASH_CLASSES = ["s9-arena--perfect", "s9-arena--hit", "s9-arena--miss"];
  let flashTimer = null;
  const completeOnce = once((result) => {
    if (typeof onStageComplete === "function") onStageComplete(result);
  });

  // Local timing state. elapsedMs accumulates per-frame deltas (rAF), giving fine CROSS resolution.
  // The gap angle is a pure function of (seed, elapsedMs), so rotation is deterministic for a given
  // accumulated time and the smoke can drive any level by passing an explicit elapsedMs via the hook.
  let elapsedMs = 0;
  let liveSeed = null; // random seed for onlineUnstable levels/boss (resampled on each OBSERVE)
  let rhythmChain = 0; // consecutive on-beat crosses for the current Cadence level (reset on miss)
  let attempts = [];   // recent {ms, hit} presses on the current level — drives ghostecho feedback

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
    rhythmChain = 0;
    attempts = [];
    const cfg = levelConfig(state.currentLevel);
    if ((cfg.onlineUnstable || state.currentLevel >= BOSS_LEVEL) && !offlineUnlocked()) {
      liveSeed = getBossSeed({ state, actions });
    }
  }

  function advanceFrom(level) {
    state.currentLevel = Math.min(BOSS_LEVEL, level + 1);
    elapsedMs = 0;
    liveSeed = null;
    rhythmChain = 0;
    attempts = [];
    if (state.currentLevel >= BOSS_LEVEL) pushLog(`level ${BOSS_LEVEL}: THE OBSERVER EFFECT. the gap will not hold still while live.`);
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
      return "miss";
    }
    const seed = activeSeed();
    const toleranceMult = consumeStabilizer(state); // armed Stabilizer Lens widens this one press
    if (toleranceMult > 1) pushLog("stabilizer lens engaged (+tolerance for this cross).");
    const result = crossAttempt({ seed, elapsedMs, level, toleranceMult });
    if (cfg.mode === "ghostecho") attempts = [...attempts, { ms: elapsedMs, hit: result.hit }].slice(-2);

    // Cadence (rhythm): land N consecutive on-beat crosses; a miss resets the chain. The clock keeps
    // running between presses (no elapsed reset) so the next beat is reachable; only a full chain advances.
    if (cfg.mode === "rhythm") {
      const need = Math.max(2, cfg.chain || 3);
      if (result.hit) {
        rhythmChain += 1;
        if (rhythmChain >= need) {
          state.clarity = Number(state.clarity || 0) + cfg.movement * 5;
          pushLog(`cadence held — ${need} crosses on the beat. advancing.`);
          advanceFrom(level);
        } else {
          pushLog(`on beat (${rhythmChain}/${need}). hold the cadence.`);
        }
        return crossOutcome(result);
      }
      rhythmChain = 0;
      state.clarity = Math.max(0, Number(state.clarity || 0) - 1);
      pushLog(`chain broken (off by ${Math.round(result.distance)}deg). cadence reset.`);
      return "miss";
    }

    if (result.hit) {
      state.clarity = Number(state.clarity || 0) + cfg.movement * 5;
      pushLog(`level ${level} crossed (gap at top). advancing.`);
      advanceFrom(level);
      return crossOutcome(result);
    }
    state.clarity = Math.max(0, Number(state.clarity || 0) - 1);
    pushLog(`mistimed (off by ${Math.round(result.distance)}deg). clarity -1.`);
    return "miss";
  }

  function challengeBoss() {
    const result = recordObserverBossAttempt({ state, actions, elapsedMs });
    if (result.defeated) completeOnce({ stage: 9, defeated: true, btsPath: BTS_PATH });
    return result.hit ? "perfect" : "miss";
  }

  function doCross() {
    if (state.boss.defeated) return;
    const outcome = state.currentLevel >= BOSS_LEVEL ? challengeBoss() : crossSublevel();
    flashArena(outcome);
  }

  // Instant point-of-action feedback: flash the arena border/glow for the CROSS result so the player
  // never has to drop their eye to the log mid-window. Pure presentation — the gap motion stays a pure
  // f(seed,elapsedMs); the setTimeout only clears a CSS class and never feeds back into game logic.
  function flashArena(outcome) {
    if (!outcome) return;
    const el = fields.arena;
    el.classList.remove(...FLASH_CLASSES);
    void el.offsetWidth; // restart the transition even on consecutive same-outcome presses
    el.classList.add(`s9-arena--${outcome}`);
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(() => {
      el.classList.remove(...FLASH_CLASSES);
      flashTimer = null;
    }, 360);
  }

  root.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    switch (button.dataset.action) {
      case "observe": reobserve(); break;
      case "cross": doCross(); break;
      case "aid": buyAidAction(button.dataset.aid); break;
      case "notes": openNotes(); break;
      case "offline": activateOfflineMode({ state, actions, achievements, bell }); break;
      case "bts": openBts({ bts, viewer }); break;
    }
    persistAndPaint();
  });

  // Spend clarity on a calibration aid. The Single-Frame peek is offline-only (it reveals nothing while
  // the seed is live), so it can never bypass the un-cheat. Returns the buyAid result for the smoke.
  function buyAidAction(id) {
    const offline = offlineUnlocked();
    const res = buyAid(state, id, { offline });
    if (!res.ok) {
      const why = { "offline-only": "single-frame only works in Offline Mode (online the seed reseeds).", insufficient: "not enough clarity.", owned: "already owned." }[res.reason] || "cannot buy that.";
      pushLog(why);
      return res;
    }
    if (id === "stabilizer") pushLog("stabilizer lens armed: your next CROSS gets a wider window.");
    if (id === "tachometer") pushLog("tachometer online: numeric gap readout enabled.");
    if (id === "peek") doPeek();
    return res;
  }

  // Offline-only one-frame reveal: report how far the gap is from the top right now (real numeric peek).
  function doPeek() {
    const r = crossAttempt({ seed: activeSeed(), elapsedMs, level: state.currentLevel });
    const ang = Number.isFinite(r.angle) ? `gap at ${Math.round(r.angle)}deg` : "two gaps to align";
    pushLog(`single-frame: ${ang} (${Math.round(r.distance)}deg from the top).`);
  }

  const loop = startLoop((dt) => {
    if (!state.boss.defeated) elapsedMs += dt;
    paintArena();
  });

  repaint();

  // Install the deterministic smoke/debug hook (window.__fvStage9). See testhook.js — it never bypasses
  // anything; it drives the real CROSS engine at each level's real solve moment.
  const uninstallHook = installTestHook({
    state,
    activeSeed,
    reobserve,
    getAids: () => ({ ...state.aids }),
    buyAid: (id) => buyAidAction(id),
    crossAt(ms) { elapsedMs = Number(ms) || 0; doCross(); persistAndPaint(); }
  });

  return {
    repaint,
    destroy() {
      loop.stop();
      if (flashTimer) clearTimeout(flashTimer);
      uninstallHook();
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
    const level = state.currentLevel;
    const ctx = {};
    // Echo (ghostecho): draw the last two presses as faint ghost rings so the player reads their own
    // error (how many degrees early/late) and corrects. Ghosts are presentation only — pure f(seed,ms).
    if (levelConfig(level).mode === "ghostecho") {
      ctx.ghosts = attempts.map((at) => ({ angle: crossAttempt({ seed, elapsedMs: at.ms, level }).angle, result: at.hit ? "hit" : "miss" }));
    }
    fields.arena.textContent = renderLevel(seed, level, elapsedMs, ctx);
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
    hud.classList.toggle("s9-hud--unstable", unstable && !lock.unlocked);
    paintTach(cfg);
    paintAids();
    paintArena();
    if (state.boss.defeated) fields.boss.textContent = "defeated. BTS trace available.";
    else if (state.currentLevel < BOSS_LEVEL) fields.boss.textContent = `clear levels to reach the Observer (level ${BOSS_LEVEL}).`;
    else fields.boss.textContent = `${lock.unlocked ? "UNLOCKED — cross on the learned timing" : "LOCKED — the gap reseeds while live"} / ${lock.seedMode}`;
    fields.hint.textContent = unstable && !lock.unlocked ? lock.hint : modeHint(cfg);
    root.querySelector('[data-action="offline"]').hidden = !state.offlineControlVisible;
    root.querySelector('[data-action="bts"]').hidden = !state.boss.defeated;
    log.replaceChildren(...state.log.slice(-5).map((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      return li;
    }));
  }

  // Tachometer (owned aid): live numeric gap angle + rotation speed in the HUD.
  function paintTach(cfg) {
    const owned = Boolean(state.aids && state.aids.tachometer);
    fields.tachWrap.hidden = !owned;
    if (!owned) return;
    const r = crossAttempt({ seed: activeSeed(), elapsedMs, level: state.currentLevel });
    const ang = Number.isFinite(r.angle) ? `${Math.round(r.angle)}deg` : `${Math.round(r.distance)}deg off`;
    fields.tach.textContent = `${ang} @ ${Math.round(cfg.speed || cfg.speedInner || cfg.oscBase || 0)}deg/s`;
  }

  // Disable each aid the player can't currently buy (cost / owned / offline-only), with the reason.
  function paintAids() {
    const offline = offlineUnlocked();
    for (const aid of AIDS) {
      const btn = root.querySelector(`[data-aid="${aid.id}"]`);
      if (!btn) continue;
      const ownedTach = aid.id === "tachometer" && state.aids && state.aids.tachometer;
      const peekLocked = aid.id === "peek" && !offline;
      btn.disabled = ownedTach || peekLocked || Number(state.clarity || 0) < aid.cost;
      btn.classList.toggle("s9-aid-owned", Boolean(ownedTach));
    }
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
