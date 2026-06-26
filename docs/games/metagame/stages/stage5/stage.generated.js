// GENERATED — DO NOT EDIT BY HAND.
// Bundled from docs/games/metagame/stages/stage5/index.js (+ its local modules) by
// build/metagame/build.mjs. Rebuild:  node build/metagame/build.mjs  (run by scripts/check.sh).
// Exports stageMeta / defaultState / mountStage. Shared ../../*.js singletons + ./styles.css stay
// external (NOT inlined). The hub's stage-manifest.js LOADERS import THIS file.


// ../../docs/games/metagame/stages/stage5/messages.js
var ACTION_NAME = "counter_wave_calibrated";
var REQUIRED_ACTION = "5.counter_wave_calibrated";
var ACHIEVEMENT_ID = "stage5.counter_wave_calibrated";
var ACHIEVEMENT_TEXT = "I listened before I drove.";
var BTS_PATH = "/docs/bts/signal_racer.bts";
var TRANSMISSION_HUM_PATH = "/docs/examples/metagame/stage5/transmission_hum.mp3";
var LOOP_DURATION_MS = 14e3;
var bellMessages = {
  start: "the road is only a waveform drawn flat.",
  unlock: "the counter-wave holds for one full loop.",
  defeated: "the jammer signal collapses into silence."
};
var lockedHintLadder = [
  "the jammer wins before the race starts.",
  "its suppression wave has a rhythm. the rhythm can be answered.",
  "transmission_hum.mp3 carries the counter-signal.",
  "play transmission_hum.mp3 continuously for one full 14-second loop, then race The Jammer."
];

// ../../docs/games/metagame/stages/stage5/boss.js
function hasCounterWave(actions) {
  return Boolean(actions && typeof actions.hasAction === "function" && actions.hasAction(5, ACTION_NAME));
}
function getBossLockState({ actions, state }) {
  const unlocked = hasCounterWave(actions);
  const boss = state?.boss || {};
  const hintIndex = Math.min(Math.max(Number(boss.lockHintStep || 0), 0), lockedHintLadder.length - 1);
  return {
    unlocked,
    defeated: Boolean(boss.defeated),
    jammerSuppression: unlocked ? "canceled" : "dominant",
    playerCounterWave: unlocked ? "phase-inverted" : "absent",
    defeatPossible: unlocked,
    hint: unlocked ? bellMessages.unlock : lockedHintLadder[hintIndex]
  };
}
function raceTheJammer({ state, actions }) {
  const lock = getBossLockState({ actions, state });
  state.boss.reached = true;
  state.boss.attempts = Number(state.boss.attempts || 0) + 1;
  if (!lock.unlocked) {
    state.boss.lockHintStep = Math.min(Number(state.boss.lockHintStep || 0) + 1, lockedHintLadder.length - 1);
    pushLog(state, "suppression wave holds the throttle down.");
    return { defeated: false, locked: true };
  }
  state.boss.defeated = true;
  state.race.position = 1;
  state.race.jammerOffsetMs = 1200;
  state.packets += 100;
  pushLog(state, bellMessages.defeated);
  return { defeated: true, locked: false };
}
function pushLog(state, line) {
  state.log = [...state.log || [], line].slice(-8);
}

// ../../docs/games/metagame/stages/stage5/calibration.js
function isTransmissionHum(path) {
  const normalized = String(path || "").replace(/\\/g, "/");
  return normalized === TRANSMISSION_HUM_PATH || normalized.endsWith("/stage5/transmission_hum.mp3");
}
function applyCalibrationTick({
  state,
  actions,
  achievements,
  bell,
  file,
  deltaMs,
  active,
  seeking = false
}) {
  const calibration = state.calibration;
  calibration.lastFile = file || calibration.lastFile;
  if (!isTransmissionHum(file) || !active || seeking) {
    if (!calibration.calibrated) calibration.continuousMs = 0;
    return { calibrated: calibration.calibrated, continuousMs: calibration.continuousMs, reset: true };
  }
  calibration.continuousMs = Math.min(
    Number(calibration.loopMs || LOOP_DURATION_MS),
    Number(calibration.continuousMs || 0) + Math.max(0, Number(deltaMs) || 0)
  );
  if (!calibration.calibrated && calibration.continuousMs >= Number(calibration.loopMs || LOOP_DURATION_MS)) {
    calibration.calibrated = true;
    actions?.setAction?.(5, ACTION_NAME, {
      source: "audio-player",
      file: "transmission_hum.mp3",
      durationMs: Number(calibration.loopMs || LOOP_DURATION_MS),
      loopCompleted: true
    });
    achievements?.unlockAchievement?.(ACHIEVEMENT_ID, {
      stage: 5,
      title: ACHIEVEMENT_TEXT,
      action: "5.counter_wave_calibrated"
    });
    notifyBell(bell, "stage5.counter_wave_calibrated", bellMessages.unlock);
    pushLog2(state, bellMessages.unlock);
  }
  return { calibrated: calibration.calibrated, continuousMs: calibration.continuousMs, reset: false };
}
function runCalibrationTimeline({ state, actions, achievements, bell, file, samples }) {
  let previousAt = null;
  let result = { calibrated: false, continuousMs: state.calibration.continuousMs, reset: false };
  for (const sample of samples) {
    const at = Number(sample.atMs);
    const deltaMs = previousAt === null ? 0 : Math.max(0, at - previousAt);
    previousAt = at;
    result = applyCalibrationTick({
      state,
      actions,
      achievements,
      bell,
      file,
      deltaMs,
      active: Boolean(sample.active),
      seeking: Boolean(sample.seeking)
    });
  }
  return result;
}
function pushLog2(state, line) {
  state.log = [...state.log || [], line].slice(-8);
}
function notifyBell(bell, id, text) {
  if (bell && typeof bell.showBell === "function") bell.showBell(id, text, { stage: 5 });
  else if (bell && typeof bell.push === "function") bell.push({ id, stage: 5, text });
}

// ../../docs/games/metagame/stages/stage5/content.js
function raceHudModel({ state, calibrated }) {
  return {
    position: `P${state.race.position}`,
    lap: `${state.race.lap}/${state.race.totalLaps}`,
    time: formatRaceTime(state.race.timeMs),
    integrity: `${state.race.integrity}%`,
    boost: "|".repeat(state.race.boostSegments),
    packets: state.packets,
    jammerWave: waveSamples(state.race.timeMs, 0),
    counterWave: calibrated ? waveSamples(state.race.timeMs, Math.PI) : []
  };
}
function waveSamples(timeMs, phase = 0, count = 16) {
  return Array.from({ length: count }, (_, index) => {
    const t = timeMs / 1e3 + index * 0.25;
    return Number(Math.sin(t * Math.PI * 2 / 3.5 + phase).toFixed(3));
  });
}
function formatRaceTime(ms) {
  const total = Math.max(0, Math.trunc(Number(ms) || 0));
  const minutes = Math.floor(total / 6e4);
  const seconds = Math.floor(total % 6e4 / 1e3);
  const tenths = Math.floor(total % 1e3 / 100);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

// ../../docs/games/metagame/stages/stage5/renderer.js
function renderStage5(ctx) {
  const { host, state, actions, achievements, bell, bts, viewer, save, onStageComplete } = ctx;
  const root = document.createElement("section");
  root.className = "stage5-signal-racer";
  root.innerHTML = `
    <header class="s5-hud">
      <strong>SIGNAL RACER</strong>
      <span data-field="position"></span>
      <span>LAP <span data-field="lap"></span></span>
      <span>TIME <span data-field="time"></span></span>
      <span>BOOST <span data-field="boost"></span></span>
      <span>INTEGRITY <span data-field="integrity"></span></span>
    </header>
    <div class="s5-track" aria-label="signal racer track">
      <div class="s5-car player"></div>
      <div class="s5-car jammer"></div>
    </div>
    <section class="s5-wave-panel">
      <div>JAMMER <span data-field="jammerWave"></span></div>
      <div>COUNTER <span data-field="counterWave"></span></div>
      <div class="s5-hint" data-field="hint"></div>
    </section>
    <ol class="s5-log"></ol>
    <div class="s5-controls">
      <button type="button" data-action="audio">open transmission_hum.mp3</button>
      <button type="button" data-action="calibrate">simulate full loop</button>
      <button type="button" data-action="boss">race The Jammer</button>
      <button type="button" data-action="bts" hidden>open signal_racer.bts</button>
    </div>
  `;
  host.replaceChildren(root);
  const fields = Object.fromEntries([...root.querySelectorAll("[data-field]")].map((el) => [el.dataset.field, el]));
  const log = root.querySelector(".s5-log");
  const completeOnce = once((result) => onStageComplete?.(result));
  function repaint() {
    const lock = getBossLockState({ actions, state });
    const hud = raceHudModel({ state, calibrated: lock.unlocked });
    fields.position.textContent = hud.position;
    fields.lap.textContent = hud.lap;
    fields.time.textContent = hud.time;
    fields.boost.textContent = hud.boost;
    fields.integrity.textContent = hud.integrity;
    fields.jammerWave.textContent = waveGlyphs(hud.jammerWave);
    fields.counterWave.textContent = hud.counterWave.length ? waveGlyphs(hud.counterWave) : "not calibrated";
    fields.hint.textContent = `${lock.jammerSuppression} / ${lock.hint}`;
    root.querySelector('[data-action="bts"]').hidden = !state.boss.defeated;
    log.replaceChildren(...state.log.slice(-6).map((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      return li;
    }));
  }
  root.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    if (button.dataset.action === "audio") viewer?.openFile?.(TRANSMISSION_HUM_PATH, { mime: "audio/mpeg", source: "stage5" });
    if (button.dataset.action === "calibrate") {
      applyCalibrationTick({
        state,
        actions,
        achievements,
        bell,
        file: TRANSMISSION_HUM_PATH,
        deltaMs: LOOP_DURATION_MS,
        active: true
      });
    }
    if (button.dataset.action === "boss") {
      const result = raceTheJammer({ state, actions });
      if (result.defeated) completeOnce({ stage: 5, defeated: true, btsPath: BTS_PATH });
    }
    if (button.dataset.action === "bts") bts?.open?.(5);
    save?.();
    repaint();
  });
  repaint();
  return { repaint, destroy() {
    root.remove();
  } };
}
function waveGlyphs(samples) {
  return samples.map((value) => value > 0.35 ? "^" : value < -0.35 ? "v" : "-").join("");
}
function once(fn) {
  let called = false;
  return (value) => {
    if (called) return;
    called = true;
    fn(value);
  };
}

// ../../docs/games/metagame/stages/stage5/state.js
function defaultState(context = {}) {
  const seed = String(context.seed || "signal-racer").replace(/\W/g, "").slice(-8) || "stage5";
  return {
    version: 1,
    packets: 125,
    race: {
      circuit: "championship",
      lap: 3,
      totalLaps: 5,
      timeMs: 42300,
      integrity: 87,
      boostSegments: 3,
      position: 2,
      jammerOffsetMs: -900
    },
    calibration: {
      seed: `signal-${seed}`,
      loopMs: LOOP_DURATION_MS,
      continuousMs: 0,
      calibrated: false,
      lastFile: null
    },
    boss: {
      reached: false,
      attempts: 0,
      lockHintStep: 0,
      defeated: false
    },
    log: ["signal racer mounted.", "the jammer is already in the racing line."]
  };
}
function normalizeState(state, context = {}) {
  const fresh = defaultState(context);
  const target = state && typeof state === "object" ? state : {};
  target.version = 1;
  target.packets = Number.isFinite(target.packets) ? target.packets : fresh.packets;
  target.race = mergePlain(fresh.race, target.race);
  target.calibration = mergePlain(fresh.calibration, target.calibration);
  target.calibration.loopMs = Number(target.calibration.loopMs) || fresh.calibration.loopMs;
  target.calibration.continuousMs = Math.max(0, Number(target.calibration.continuousMs) || 0);
  target.calibration.calibrated = Boolean(target.calibration.calibrated);
  target.boss = mergePlain(fresh.boss, target.boss);
  target.log = Array.isArray(target.log) ? target.log : [...fresh.log];
  return target;
}
function mergePlain(base, override) {
  return { ...base, ...override && typeof override === "object" ? override : {} };
}

// ../../docs/games/metagame/stages/stage5/index.js
var stageMeta = {
  id: 5,
  slug: "signal-racer",
  name: "Signal Racer",
  btsPath: BTS_PATH,
  requiredAction: REQUIRED_ACTION
};
function defaultState2(context) {
  return defaultState(context);
}
function mountStage(ctx) {
  const state = normalizeState(ctx.state, ctx);
  ensureStyles();
  if (hasCounterWave(ctx.actions)) state.calibration.calibrated = true;
  return renderStage5({ ...ctx, state });
}
function ensureStyles() {
  const id = "stage5-signal-racer-styles";
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = new URL("./styles.css", import.meta.url).href;
  document.head.append(link);
}
export {
  applyCalibrationTick,
  defaultState2 as defaultState,
  getBossLockState,
  hasCounterWave,
  mountStage,
  raceHudModel,
  raceTheJammer,
  runCalibrationTimeline,
  stageMeta,
  waveSamples
};
