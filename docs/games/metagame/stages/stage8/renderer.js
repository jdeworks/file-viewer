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
import { drawArena, launchAnimExpired } from "./canvas-ring.js";
import { paintBossPanel, paintStreak, paintTach, paintAids } from "./hud.js";
import { banner, floatNum } from "../../shared/feedback.js";
import { openModal } from "../../shared/modal.js";

const MARKER_READY_DEG = 30;   // gap within this of the ship's position ⇒ it brightens (#2)
const BOSS_REVEAL_LEVEL = 13;  // the boss panel stays a one-line locked chip until this level (#7)
// Playtest fix (2026-07-11, "way too easy"): a miss used to cost a flat -1 clarity with instant,
// unlimited free retries, so a wrong press barely registered. Raised so retrying has a real cost —
// tuned against clarity income (a level clear grants cfg.movement*5, i.e. 5-80 across the game) so
// a miss stings without making a rough level unrecoverable.
const MISS_CLARITY_COST = 4;
// Ship steering (2026-07-11 playtest ask): ArrowLeft/ArrowRight steer the crossing point around the
// ring instead of it being fixed at the top. 150deg/s clears the fastest single-ring rotation in the
// game (oscillating's peak instantaneous rate, oscBase+oscAmp, ~64deg/s at L4) with real margin, so
// a player CAN catch up to/lead a gap, but positioning still takes trackable real time — not an
// instant snap-to-target. See the design plan's balance section for why raising this further would
// make any future "too easy" finding WORSE, not better (lower it instead).
const SHIP_TURN_SPEED_DEG_PER_SEC = 150;
const TRAIL_SAMPLE_MS = 40;    // throttle shipPath sampling so the array doesn't grow every single frame
const TRAIL_KEEP_MS = 4000;    // matches canvas-ring.js's TRAIL_MS — how far back kept samples reach

export function renderStage9({ host, state, actions, achievements, bell, bts, viewer, save, onStageComplete }) {
  const root = document.createElement("section");
  root.className = "stage8-observer-state";
  root.innerHTML = stage8Markup(AIDS, BOSS_LEVEL);
  host.replaceChildren(root);

  const fields = Object.fromEntries([...root.querySelectorAll("[data-field]")].map((el) => [el.dataset.field, el]));
  const log = fields.log;
  const hud = root.querySelector(".s8-hud");
  const arenaWrap = root.querySelector(".s8-arena-wrap");
  const FLASH_CLASSES = ["s8-canvas--perfect", "s8-canvas--hit", "s8-canvas--miss"];
  let flashTimer = null;
  const bossRevealedRef = { value: state.currentLevel >= BOSS_REVEAL_LEVEL }; // don't re-banner an already-reached reveal
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

  // Ship steering (2026-07-11). shipAngle defaults to 0 — the OLD fixed "top" position — so a debug/
  // test driver that never steers (every existing solveMoment-based test/smoke path) evaluates
  // byte-identically to before this feature; see modes.js's header comment. keysHeld tracks physical
  // key state (integrated into shipAngle once per rAF tick, see the loop callback below); shipPath is
  // the fading trail history; launchAnim is the short CROSS burst.
  let shipAngle = 0;
  const keysHeld = { left: false, right: false };
  let shipPath = [];
  let launchAnim = null;
  let lastTrailSampleMs = -Infinity;

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
    resetShip();
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
    resetShip();
    setReadout("", "");
    // Archetype-entry banner (#4): announce the new verb the instant a new mode begins.
    const cfg = levelConfig(state.currentLevel);
    if (cfg.mode !== prevMode && !state.boss.defeated) {
      const mv = movementForLevel(state.currentLevel);
      banner(arenaWrap, `${mv.name.toUpperCase()} — ${mv.verb}`);
    }
    if (state.currentLevel >= BOSS_LEVEL) pushLog(`level ${BOSS_LEVEL}: THE OBSERVER EFFECT. the gap will not hold still while live.`);
  }

  // Every fresh attempt starts the ship at the same, fair, previously-fixed position (0/top) — the
  // same reset points elapsedMs/attempts already use.
  function resetShip() {
    shipAngle = 0;
    shipPath = [];
    lastTrailSampleMs = -Infinity;
    launchAnim = null;
  }

  function crossSublevel() {
    const level = state.currentLevel;
    const cfg = levelConfig(level);
    // Online-unstable level while still online: the gap reseeds — no press can land (go offline).
    if (cfg.onlineUnstable && !offlineUnlocked()) {
      state.clarity = Math.max(0, Number(state.clarity || 0) - MISS_CLARITY_COST);
      liveSeed = getBossSeed({ state, actions });
      state.boss.lockHintStep = Math.min(Number(state.boss.lockHintStep || 0) + 1, 3);
      pushLog("the gap reseeded the instant you committed. nothing holds while live. (go offline.)");
      return "miss";
    }
    const seed = activeSeed();
    const toleranceMult = consumeStabilizer(state); // armed Stabilizer Lens widens this one press
    if (toleranceMult > 1) pushLog("stabilizer lens engaged (+tolerance for this cross).");
    const result = crossAttempt({ seed, elapsedMs, level, toleranceMult, shipAngle });
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
      state.clarity = Math.max(0, Number(state.clarity || 0) - MISS_CLARITY_COST);
      pushLog(`chain broken (off by ${Math.round(result.distance)}deg). cadence reset.`);
      return "miss";
    }

    if (result.hit) {
      state.clarity = Number(state.clarity || 0) + cfg.movement * 5;
      pushLog(`level ${level} crossed (gap at top). advancing.`);
      advanceFrom(level);
      return crossOutcome(result);
    }
    state.clarity = Math.max(0, Number(state.clarity || 0) - MISS_CLARITY_COST);
    pushLog(`mistimed (off by ${Math.round(result.distance)}deg). clarity -${MISS_CLARITY_COST}.`);
    return "miss";
  }

  function challengeBoss() {
    // Evaluate against activeSeed() — whatever the player is actually watching right now — so a live
    // reaction to the on-screen rotation is genuinely possible even before offline mode (see boss.js).
    const result = recordObserverBossAttempt({ state, actions, elapsedMs, seed: activeSeed(), shipAngle });
    if (!result.unlocked && !result.hit) liveSeed = state.boss.lastLockedSeed; // pick up the reseed boss.js just committed for the next attempt
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
    launchAnim = { startMs: elapsedMs, fromAngle: shipAngle, hit: outcome !== "miss" };
    flashArena(outcome);
    updateReadout(outcome, seed, level, pressMs);
    const gained = Number(state.clarity || 0) - clarityBefore;
    if (gained > 0) floatNum(arenaWrap, `+${gained} clarity`, "good"); // #6 perfect/clear reward feel
  }

  // Verdict readout under the arena (#6): perfect/on-time on a hit; early/late ±ms on a stable miss.
  // The ±ms is meaningless while an unstable level is still live (the gap reseeds), so we say so instead.
  function updateReadout(outcome, seed, level, pressMs) {
    const cfg = levelConfig(level);
    // 2026-07-11 playtest fix: the boss level is genuinely evaluable now even online (a live read of
    // the on-screen rotation, see boss.js) — only the pre-boss onlineUnstable SUBLEVELS still reseed
    // out from under any press (that gate is unchanged, it's stage-body pacing, not the boss un-cheat).
    const unstableLocked = cfg.onlineUnstable && !offlineUnlocked() && level < BOSS_LEVEL;
    if (outcome === "perfect") return setReadout("perfect — dead centre", "perfect");
    if (outcome === "hit") return setReadout("crossed", "hit");
    if (unstableLocked) return setReadout("live-random — nothing to time", "miss");
    const { deltaMs, dir } = missDelta({ seed, elapsedMs: pressMs, level, shipAngle });
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
    el.classList.add(`s8-canvas--${outcome}`);
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
    if (event.target.closest(".s8-canvas")) { doCross(); persistAndPaint(); }
  });

  // Keyboard (#1): Space/Enter → CROSS, r → OBSERVE, ←/→ → steer the ship (2026-07-11). Scoped to the
  // stage: it no-ops when a modal or a form control has focus (so it never steals typing), and it's
  // removed on destroy so no global leaks.
  function onKey(event) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (!root.isConnected || document.querySelector(".mg-modal-backdrop")) return;
    const t = event.target;
    if (t && typeof t.closest === "function" && t.closest("button, input, textarea, select, [contenteditable]")) return;
    if (event.key === " " || event.key === "Enter") { event.preventDefault(); doCross(); persistAndPaint(); }
    else if (event.key === "r" || event.key === "R") { event.preventDefault(); reobserve(); persistAndPaint(); }
    else if (event.key === "ArrowLeft") { event.preventDefault(); keysHeld.left = true; }
    else if (event.key === "ArrowRight") { event.preventDefault(); keysHeld.right = true; }
  }
  // keyup deliberately has NO modal/form-control guard, unlike keydown: if a modal opens (or focus
  // moves) WHILE a steering key is held, the matching keyup must still clear it, or a released key
  // could leave the ship spinning forever with no way to stop it.
  function onKeyUp(event) {
    if (event.key === "ArrowLeft") keysHeld.left = false;
    else if (event.key === "ArrowRight") keysHeld.right = false;
  }
  // Alt-tabbing away (or any other focus loss) while a key is physically held never fires a keyup —
  // clear both on blur so the ship can't be left spinning by a key release the page never saw.
  function onBlur() { keysHeld.left = false; keysHeld.right = false; }
  document.addEventListener("keydown", onKey);
  document.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

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

  // Offline-only one-frame reveal: report how far the gap is from the ship's CURRENT position right
  // now (real numeric peek). shipAngle must be threaded through here (2026-07-11 ship-steering fix) —
  // without it this paid aid would silently report distance-from-the-old-fixed-top instead of
  // distance-from-wherever-the-player-actually-is the instant they ever steer.
  function doPeek() {
    const r = crossAttempt({ seed: activeSeed(), elapsedMs, level: state.currentLevel, shipAngle });
    const ang = Number.isFinite(r.angle) ? `gap at ${Math.round(r.angle)}deg` : "two gaps to align";
    pushLog(`single-frame: ${ang} (${Math.round(r.distance)}deg from your ship).`);
  }

  const loop = startLoop((dt) => {
    if (!state.boss.defeated) elapsedMs += dt;
    // Steering integration (2026-07-11): shipAngle advances by SHIP_TURN_SPEED_DEG_PER_SEC * dt while
    // a key is held. mod360 keeps it in [0,360) so downstream angularDist math never sees a huge or
    // negative value after long holds.
    if (!state.boss.defeated) {
      if (keysHeld.left) shipAngle -= SHIP_TURN_SPEED_DEG_PER_SEC * dt / 1000;
      if (keysHeld.right) shipAngle += SHIP_TURN_SPEED_DEG_PER_SEC * dt / 1000;
      shipAngle = ((shipAngle % 360) + 360) % 360;
      if (elapsedMs - lastTrailSampleMs >= TRAIL_SAMPLE_MS) {
        shipPath = [...shipPath, { angle: shipAngle, ms: elapsedMs }].filter((s) => elapsedMs - s.ms <= TRAIL_KEEP_MS);
        lastTrailSampleMs = elapsedMs;
      }
    }
    if (launchAnimExpired(launchAnim, elapsedMs)) launchAnim = null;
    paintArena();
  });

  repaint();

  // Install the deterministic smoke/debug hook (window.__fvStage8). See testhook.js — it never bypasses
  // anything; it drives the real CROSS engine at each level's real solve moment. geometry()/steerTo()
  // (2026-07-11) expose the new ship-steering state for deterministic test coverage — steerTo() sets
  // shipAngle directly rather than simulating a timed key-hold, so tests never depend on wall-clock
  // rAF integration (see the design plan's testhook section for why that would be flaky).
  const uninstallHook = installTestHook({
    state,
    activeSeed,
    reobserve,
    getAids: () => ({ ...state.aids }),
    buyAid: (id) => buyAidAction(id),
    crossAt(ms) { elapsedMs = Number(ms) || 0; doCross(); persistAndPaint(); },
    geometry: () => ({ shipAngle, elapsedMs, level: state.currentLevel }),
    steerTo(angleDeg) { shipAngle = ((Number(angleDeg) || 0) % 360 + 360) % 360; }
  });

  return {
    repaint,
    dev(id) { applyDevControl(id, state, { seed: activeSeed() }); persistAndPaint(); },
    destroy() {
      loop.stop();
      if (flashTimer) clearTimeout(flashTimer);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
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

  // One canvas draw per rAF frame (2026-07-11) — replaces the old ASCII textContent rebuild + separate
  // CSS-wheel custom-property write. This is the actual CPU-cost fix: canvas-ring.js's drawArena()
  // does one clear + a handful of arc/path calls instead of rebuilding a 33×17 character grid from
  // scratch every frame. Also drives the #2 marker-ready glow (now folded into the ship's own glow,
  // no separate DOM marker) and the #4 Cadence beat dot (still a separate DOM element).
  function paintArena() {
    const seed = activeSeed();
    const level = state.currentLevel;
    const cfg = levelConfig(level);
    const r = crossAttempt({ seed, elapsedMs, level, shipAngle });
    const intensity = markerIntensity(r.distance, MARKER_READY_DEG);
    // Echo (ghostecho): the last two presses render as faint ghost marks so the player reads their
    // own error (how many degrees early/late) and corrects. `.angle` is the raw gap angle, unaffected
    // by shipAngle/ref (only `.distance`/`.hit` are) — pure f(seed,ms), presentation only.
    const ghosts = cfg.mode === "ghostecho"
      ? attempts.map((at) => ({ angle: crossAttempt({ seed, elapsedMs: at.ms, level }).angle, result: at.hit ? "hit" : "miss" }))
      : [];
    drawArena(fields.arena, { cfg, seed, ms: elapsedMs, shipAngle, shipPath, launchAnim, ghosts, shipIntensity: intensity });

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
    fields.arena.classList.toggle("s8-canvas--unstable", unstable && !lock.unlocked); // #4 static/jitter border
    fields.observeLabel.textContent = unstable ? "OBSERVE (reseeds online)" : "OBSERVE (reset rotation)"; // #7
    paintBossPanel({ fields, arenaWrap, lock, state, bossLevel: BOSS_LEVEL, revealLevel: BOSS_REVEAL_LEVEL, bossRevealedRef });
    paintStreak({ fields, cfg, rhythmChain });
    paintTach({ fields, state, cfg, seed: activeSeed(), elapsedMs, level: state.currentLevel, shipAngle });
    paintAids({ root, fields, arenaWrap, state, offline: offlineUnlocked(), shouldRevealAids, shouldRevealPeek });
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
