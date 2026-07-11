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
  missDelta,
  modeHint,
  movementForLevel,
  renderLevel,
  sublevelSeed
} from "./game.js";
import { serviceWorkerNotesText } from "./content.js";
import { btsSummary, BTS_PATH, FIXED_OFFLINE_SEED, NOTES_PATH } from "./messages.js";
import { startLoop } from "./loop.js";
import { AIDS, buyAid, consumeStabilizer, shouldRevealAids, shouldRevealPeek } from "./aids.js";
import { markerIntensity } from "./overlay.js";
import { stage8Markup } from "./markup.js";
import { installTestHook } from "./testhook.js";
import { applyDevControl } from "./s8dev.js";
import { banner, floatNum } from "../../shared/feedback.js";
import { openModal } from "../../shared/modal.js";

const MARKER_READY_DEG = 30;   // gap within this of the top ⇒ the crossing marker brightens (#2)
const BOSS_REVEAL_LEVEL = 13;  // the boss panel stays a one-line locked chip until this level (#7)

export function renderStage9({ host, state, actions, achievements, bell, bts, viewer, save, onStageComplete }) {
  const root = document.createElement("section");
  root.className = "stage8-observer-state";
  root.innerHTML = stage8Markup(AIDS, BOSS_LEVEL);
  host.replaceChildren(root);

  const fields = Object.fromEntries([...root.querySelectorAll("[data-field]")].map((el) => [el.dataset.field, el]));
  const log = fields.log;
  const hud = root.querySelector(".s8-hud");
  const arenaWrap = root.querySelector(".s8-arena-wrap");
  const FLASH_CLASSES = ["s8-arena--perfect", "s8-arena--hit", "s8-arena--miss"];
  let flashTimer = null;
  let bossRevealed = state.currentLevel >= BOSS_REVEAL_LEVEL; // don't re-banner an already-reached reveal
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
    setReadout("", "");
    const cfg = levelConfig(state.currentLevel);
    if ((cfg.onlineUnstable || state.currentLevel >= BOSS_LEVEL) && !offlineUnlocked()) {
      liveSeed = getBossSeed({ state, actions });
    }
  }

  function advanceFrom(level) {
    const prevMode = levelConfig(level).mode;
    state.currentLevel = Math.min(BOSS_LEVEL, level + 1);
    elapsedMs = 0;
    liveSeed = null;
    rhythmChain = 0;
    attempts = [];
    setReadout("", "");
    // Archetype-entry banner (#4): announce the new verb the instant a new mode begins.
    const cfg = levelConfig(state.currentLevel);
    if (cfg.mode !== prevMode && !state.boss.defeated) {
      const mv = movementForLevel(state.currentLevel);
      banner(arenaWrap, `${mv.name.toUpperCase()} — ${mv.verb}`);
    }
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
    if (result.defeated) completeOnce({ stage: 8, defeated: true, btsPath: BTS_PATH });
    return result.hit ? "perfect" : "miss";
  }

  function doCross() {
    if (state.boss.defeated) return;
    const level = state.currentLevel;
    const seed = activeSeed();
    const pressMs = elapsedMs;
    const clarityBefore = Number(state.clarity || 0);
    const outcome = level >= BOSS_LEVEL ? challengeBoss() : crossSublevel();
    flashArena(outcome);
    updateReadout(outcome, seed, level, pressMs);
    const gained = Number(state.clarity || 0) - clarityBefore;
    if (gained > 0) floatNum(arenaWrap, `+${gained} clarity`, "good"); // #6 perfect/clear reward feel
  }

  // Verdict readout under the arena (#6): perfect/on-time on a hit; early/late ±ms on a stable miss.
  // The ±ms is meaningless while an unstable level is still live (the gap reseeds), so we say so instead.
  function updateReadout(outcome, seed, level, pressMs) {
    const cfg = levelConfig(level);
    const unstableLocked = (cfg.onlineUnstable || level >= BOSS_LEVEL) && !offlineUnlocked();
    if (outcome === "perfect") return setReadout("perfect — dead centre", "perfect");
    if (outcome === "hit") return setReadout("crossed", "hit");
    if (unstableLocked) return setReadout("live-random — nothing to time", "miss");
    const { deltaMs, dir } = missDelta({ seed, elapsedMs: pressMs, level });
    setReadout(`${dir} by ${deltaMs}ms`, "miss");
  }

  function setReadout(text, kind) {
    fields.readout.textContent = text;
    fields.readout.className = "s8-readout" + (text ? ` s8-readout--${kind}` : "");
  }

  // Instant point-of-action feedback: flash the arena border/glow for the CROSS result so the player
  // never has to drop their eye to the log mid-window. Pure presentation — the gap motion stays a pure
  // f(seed,elapsedMs); the setTimeout only clears a CSS class and never feeds back into game logic.
  function flashArena(outcome) {
    if (!outcome) return;
    const el = fields.arena;
    el.classList.remove(...FLASH_CLASSES);
    void el.offsetWidth; // restart the transition even on consecutive same-outcome presses
    el.classList.add(`s8-arena--${outcome}`);
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(() => {
      el.classList.remove(...FLASH_CLASSES);
      flashTimer = null;
    }, 360);
  }

  root.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (button) {
      switch (button.dataset.action) {
        case "observe": reobserve(); break;
        case "cross": doCross(); break;
        case "aid": buyAidAction(button.dataset.aid); break;
        case "notes": openNotes(); break;
        case "offline": activateOfflineMode({ state, actions, achievements, bell }); break;
        case "log": openLog(); break;
        case "bts": openBts({ bts, viewer }); break;
      }
      persistAndPaint();
      return;
    }
    // Touch/desktop: a tap anywhere on the ring itself CROSSes (the arena IS the button — #1).
    if (event.target.closest(".s8-arena")) { doCross(); persistAndPaint(); }
  });

  // Keyboard (#1): Space/Enter → CROSS, r → OBSERVE. Scoped to the stage: it no-ops when a modal or a
  // form control has focus (so it never steals typing), and it's removed on destroy so no global leaks.
  function onKey(event) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (!root.isConnected || document.querySelector(".mg-modal-backdrop")) return;
    const t = event.target;
    if (t && typeof t.closest === "function" && t.closest("button, input, textarea, select, [contenteditable]")) return;
    if (event.key === " " || event.key === "Enter") { event.preventDefault(); doCross(); persistAndPaint(); }
    else if (event.key === "r" || event.key === "R") { event.preventDefault(); reobserve(); persistAndPaint(); }
  }
  document.addEventListener("keydown", onKey);

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

  // Install the deterministic smoke/debug hook (window.__fvStage8). See testhook.js — it never bypasses
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
    dev(id) { applyDevControl(id, state, { seed: activeSeed() }); persistAndPaint(); },
    destroy() {
      loop.stop();
      if (flashTimer) clearTimeout(flashTimer);
      document.removeEventListener("keydown", onKey);
      uninstallHook();
      root.remove();
    }
  };

  function openNotes() {
    readServiceWorkerNotes({ state, bell });
    fields.notes.textContent = serviceWorkerNotesText;
    fields.notes.hidden = false;
    const opts = { text: serviceWorkerNotesText, mime: "text/plain", source: "stage8" };
    if (viewer && typeof viewer.openFile === "function") viewer.openFile(NOTES_PATH, opts);
    else if (viewer && typeof viewer.openViewerFile === "function") viewer.openViewerFile(NOTES_PATH, opts);
  }

  // Full log on demand (#8): the inline ticker shows the last two lines; this opens the rest.
  function openLog() {
    const list = document.createElement("ol");
    list.className = "s8-log-full";
    for (const line of (state.log || [])) {
      const li = document.createElement("li");
      li.textContent = line;
      list.appendChild(li);
    }
    openModal({ title: "observer log", contentEl: list, className: "s8-log-modal" });
  }

  function pushLog(line) {
    state.log = [...(state.log || []), line].slice(-6);
  }

  function paintArena() {
    const seed = activeSeed();
    const level = state.currentLevel;
    const cfg = levelConfig(level);
    const ctx = {};
    // Echo (ghostecho): draw the last two presses as faint ghost rings so the player reads their own
    // error (how many degrees early/late) and corrects. Ghosts are presentation only — pure f(seed,ms).
    if (cfg.mode === "ghostecho") {
      ctx.ghosts = attempts.map((at) => ({ angle: crossAttempt({ seed, elapsedMs: at.ms, level }).angle, result: at.hit ? "hit" : "miss" }));
    }
    fields.arena.textContent = renderLevel(seed, level, elapsedMs, ctx);
    paintOverlays(seed, level, cfg);
  }

  // Per-frame overlays (#2 marker brighten, #4 Cadence beat dot). Pure presentation from the same angle
  // the renderer already has — no engine state touched.
  function paintOverlays(seed, level, cfg) {
    const r = crossAttempt({ seed, elapsedMs, level });
    const intensity = markerIntensity(r.distance, MARKER_READY_DEG);
    fields.marker.classList.toggle("s8-marker--ready", intensity > 0.001);
    fields.marker.style.opacity = (0.35 + 0.65 * intensity).toFixed(3);
    const isRhythm = cfg.mode === "rhythm";
    fields.beat.hidden = !isRhythm;
    if (isRhythm) {
      fields.beat.style.opacity = (0.3 + 0.7 * intensity).toFixed(3);
      fields.beat.style.transform = `translateX(-50%) scale(${(0.85 + 0.5 * intensity).toFixed(3)})`;
    }
  }

  function repaint() {
    const lock = getBossLockState({ actions, state });
    const movement = movementForLevel(state.currentLevel);
    const cfg = levelConfig(state.currentLevel);
    const unstable = cfg.onlineUnstable || state.currentLevel >= BOSS_LEVEL;
    fields.level.textContent = String(state.currentLevel);
    fields.movement.textContent = `${movement.name} — ${movement.verb}`;
    fields.clarity.textContent = String(state.clarity);
    // Seed HUD (M3): hidden while stable; unstable shows only the loud orange 'live-random' chip (locked)
    // or the fixed-cache note (offline). The un-cheat lesson reads by contrast, not by a always-on field.
    if (!unstable) fields.seedWrap.hidden = true;
    else {
      fields.seedWrap.hidden = false;
      fields.seed.textContent = lock.unlocked ? "seed 0 · fixed cache" : "live-random — unlearnable online";
    }
    hud.classList.toggle("s8-hud--unstable", unstable && !lock.unlocked);
    fields.arena.classList.toggle("s8-arena--unstable", unstable && !lock.unlocked); // #4 static/jitter border
    fields.observeLabel.textContent = unstable ? "OBSERVE (reseeds online)" : "OBSERVE (reset rotation)"; // #7
    paintBossPanel(lock, unstable, cfg);
    paintStreak(cfg);
    paintTach(cfg);
    paintAids();
    paintArena();
    fields.hint.textContent = unstable && !lock.unlocked ? lock.hint : modeHint(cfg);
    root.querySelector('[data-action="offline"]').hidden = !state.offlineControlVisible;
    root.querySelector('[data-action="bts"]').hidden = !state.boss.defeated;
    // Ticker (#8): last two lines inline; the rest behind the "full log" button.
    log.replaceChildren(...(state.log || []).slice(-2).map((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      return li;
    }));
  }

  // Boss panel (#7): a one-line locked chip until level 13, then it expands with a banner beat.
  function paintBossPanel(lock, unstable, cfg) {
    const reveal = state.currentLevel >= BOSS_REVEAL_LEVEL || state.boss.defeated;
    fields.bossPanel.classList.toggle("s8-boss--chip", !reveal);
    fields.bossChip.textContent = `OBSERVER — level ${BOSS_LEVEL} · ${state.boss.defeated ? "defeated" : "locked"}`;
    if (reveal && !bossRevealed) { bossRevealed = true; banner(arenaWrap, "THE OBSERVER STIRS"); }
    if (state.boss.defeated) fields.boss.textContent = "defeated. BTS trace available.";
    else if (state.currentLevel < BOSS_LEVEL) fields.boss.textContent = `clear levels to reach the Observer (level ${BOSS_LEVEL}).`;
    else fields.boss.textContent = `${lock.unlocked ? "UNLOCKED — cross on the learned timing" : "LOCKED — the gap reseeds while live"} / ${lock.seedMode}`;
  }

  // Cadence streak chip (#4/#6): visible on rhythm levels, showing the live on-beat chain progress.
  function paintStreak(cfg) {
    const isRhythm = cfg.mode === "rhythm";
    fields.streak.hidden = !isRhythm;
    if (isRhythm) fields.streak.textContent = `hits ${rhythmChain}/${Math.max(2, cfg.chain || 3)}`;
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

  // Aid shop disclosure (M1) + per-aid affordability (#5). The shop appears only once clarity income
  // exists (with a one-time arrival banner); the offline-only peek card waits for Offline Mode.
  function paintAids() {
    const offline = offlineUnlocked();
    const reveal = shouldRevealAids(state);
    if (reveal && !state.aidsRevealed) { state.aidsRevealed = true; banner(arenaWrap, "clarity can be spent — calibration available"); }
    fields.aids.hidden = !reveal;
    const showPeek = shouldRevealPeek(offline);
    for (const aid of AIDS) {
      const btn = root.querySelector(`[data-aid="${aid.id}"]`);
      if (!btn) continue;
      if (aid.offlineOnly) btn.hidden = !showPeek;
      const ownedTach = aid.id === "tachometer" && state.aids && state.aids.tachometer;
      const peekLocked = aid.id === "peek" && !offline;
      btn.disabled = ownedTach || peekLocked || Number(state.clarity || 0) < aid.cost;
      btn.classList.toggle("s8-aid-owned", Boolean(ownedTach));
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
