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
  if (state.run) state.run.roundComplete = true;
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

// ../../docs/games/metagame/stages/stage5/rng.js
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

// ../../docs/games/metagame/stages/stage5/track.js
var LANES = 3;
var DENSITY = { 1: 0.4, 2: 0.42, 3: 0.45, 4: 0.45, 5: 0.45, 6: 0.48, 7: 0.5 };
function buildObstacleTable(seed, roundDef) {
  const rng = makeRng(`${seed}:${roundDef.id}`);
  const count = Number(roundDef.tickCount) || 100;
  const obstacleGlyphs = (roundDef.glyphs || ["░"]).filter((g) => g !== ">>");
  const density = DENSITY[roundDef.id] ?? 0.45;
  const burst = Array.isArray(roundDef.burstPattern) ? roundDef.burstPattern : null;
  const shift = Number(roundDef.counterPhaseShift) || 0;
  const table = [];
  for (let tick = 0; tick < count; tick += 1) {
    const beatOpen = burst ? burst[tick % burst.length] === 0 : true;
    const counterPhaseLane = shift > 0 ? Math.floor(tick / shift) % LANES : null;
    const lanes = [null, null, null];
    let blocked = 0;
    for (let lane = 0; lane < LANES; lane += 1) {
      if (rng.chance(density)) {
        lanes[lane] = rng.pick(obstacleGlyphs);
        blocked += 1;
      }
    }
    if (blocked >= LANES) lanes[rng.int(0, LANES - 1)] = null;
    if (roundDef.hasGates && beatOpen && rng.chance(0.4)) {
      const open = [0, 1, 2].filter((lane) => lanes[lane] === null);
      if (open.length) lanes[rng.pick(open)] = ">>";
    }
    table.push({ lanes, beatOpen, counterPhaseLane });
  }
  return table;
}
function isBlock(glyph) {
  return glyph === "░" || glyph === "▒" || glyph === "▓";
}
function isGate(glyph) {
  return glyph === ">>";
}
function optimalLane(row, currentLane) {
  if (!row) return currentLane;
  const clear = [0, 1, 2].filter((l) => !isBlock(row.lanes[l]));
  const gate = clear.find((l) => isGate(row.lanes[l]));
  if (row.beatOpen && gate !== void 0) return gate;
  if (clear.includes(row.counterPhaseLane)) return row.counterPhaseLane;
  if (clear.includes(currentLane)) return currentLane;
  return clear.length ? clear[0] : currentLane;
}

// ../../docs/games/metagame/stages/stage5/rounds.js
var GLYPH_DAMAGE = { "░": 2, "▒": 2, "▓": 5 };
var ROUNDS = [
  {
    id: 1,
    label: "AVOID",
    tickMs: 180,
    beatWindowTicks: null,
    glyphs: ["░"],
    burstPattern: null,
    counterPhaseShift: null,
    hasFork: false,
    hasGates: false,
    tickCount: 100
  },
  {
    id: 2,
    label: "TIME IT",
    tickMs: 160,
    beatWindowTicks: 2,
    glyphs: ["▒"],
    burstPattern: [1, 1, 1, 0, 0],
    counterPhaseShift: null,
    hasFork: false,
    hasGates: false,
    tickCount: 120
  },
  {
    id: 3,
    label: "READ AHEAD",
    tickMs: 140,
    beatWindowTicks: 1,
    glyphs: ["░", "▓"],
    burstPattern: [1, 0, 1, 1],
    counterPhaseShift: null,
    hasFork: false,
    hasGates: false,
    tickCount: 120
  },
  {
    id: 4,
    label: "COUNTER-PHASE LANE",
    tickMs: 140,
    beatWindowTicks: 1,
    glyphs: ["░", "▒"],
    burstPattern: [1, 1, 0, 0],
    counterPhaseShift: 8,
    hasFork: false,
    hasGates: false,
    tickCount: 130
  },
  {
    id: 5,
    label: "BOOST GATES",
    tickMs: 130,
    beatWindowTicks: 1,
    glyphs: ["░", ">>"],
    burstPattern: [1, 0, 1, 0],
    counterPhaseShift: 8,
    hasFork: false,
    hasGates: true,
    tickCount: 140
  },
  {
    id: 6,
    label: "SPLIT CHANNEL",
    tickMs: 130,
    beatWindowTicks: 1,
    glyphs: ["░", "▓", ">>"],
    burstPattern: [1, 0, 1, 0],
    counterPhaseShift: 8,
    hasFork: true,
    hasGates: true,
    tickCount: 160
  },
  {
    id: 7,
    label: "BOSS",
    tickMs: 120,
    beatWindowTicks: 1,
    glyphs: ["░", "▒", "▓", ">>"],
    burstPattern: [1, 1, 0, 1, 0],
    counterPhaseShift: 4,
    hasFork: true,
    hasGates: true,
    tickCount: 200
  }
];
var FINAL_ROUND_ID = 7;
var ROUND_COUNT = ROUNDS.length;
function roundByIdx(idx) {
  return ROUNDS[Math.max(0, Math.min(ROUNDS.length - 1, Number(idx) || 0))];
}
function isBossRound(roundIdx) {
  return roundByIdx(roundIdx).id === FINAL_ROUND_ID;
}

// ../../docs/games/metagame/stages/stage5/shop.js
var UPGRADES = [
  { id: "noiseFilter", label: "Noise Filter", cost: 60, desc: "Reduces ░ hit damage from 2 to 1." },
  { id: "spectrumAnalyzer", label: "Spectrum Analyzer", cost: 80, desc: "Widens the beat window by 1 extra tick." },
  { id: "signalAmplifier", label: "Signal Amplifier", cost: 100, desc: "Boost gate value: 5 → 8 packets." }
];
var BASE = { noiseDamage: 2, beatWindowBonus: 0, gateValue: 5 };
function applyUpgrades(shop = {}, base = BASE) {
  return {
    noiseDamage: shop.noiseFilter ? 1 : base.noiseDamage,
    beatWindowBonus: shop.spectrumAnalyzer ? base.beatWindowBonus + 1 : base.beatWindowBonus,
    gateValue: shop.signalAmplifier ? 8 : base.gateValue
  };
}
function buyUpgrade(state, id) {
  const def = UPGRADES.find((u) => u.id === id);
  if (!def) return { bought: false, reason: "unknown" };
  if (state.shop?.[id]) return { bought: false, reason: "owned" };
  if (Number(state.packets || 0) < def.cost) return { bought: false, reason: "insufficient" };
  state.packets = Number(state.packets) - def.cost;
  state.shop = { ...state.shop || {}, [id]: true };
  return { bought: true, reason: "ok", cost: def.cost };
}

// ../../docs/games/metagame/stages/stage5/economy.js
var BASE_PACKETS = { 1: 30, 2: 40, 3: 50, 4: 60, 5: 70, 6: 80, 7: 100 };
function calcRoundPackets({ roundId, onBeatPct = 0, integrityRemaining = 0, gatesCollected = 0, upgrades = {}, multiplier = 1 }) {
  const base = BASE_PACKETS[roundId] ?? 30;
  const accuracy = Math.floor(clamp01(onBeatPct) * 20);
  const survival = Math.floor(Math.max(0, integrityRemaining) * 0.3);
  const gateValue = upgrades.signalAmplifier ? 8 : 5;
  const gates = Math.max(0, gatesCollected) * gateValue;
  const subtotal = base + accuracy + survival + gates;
  const mult = Number.isFinite(Number(multiplier)) && multiplier > 0 ? Number(multiplier) : 1;
  return Math.max(10, Math.round(subtotal * mult));
}
function clamp01(value) {
  const n = Number(value) || 0;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

// ../../docs/games/metagame/stages/stage5/race-state.js
function raceLengthFor(round) {
  const archetype = round.archetype || "sprint";
  const lapLength = Math.max(1, Number(round.tickCount) || 100);
  if (archetype === "circuit") {
    const laps = Math.max(1, Number(round.laps) || 1);
    return lapLength * laps;
  }
  return Math.max(1, Number(round.trackLength) || lapLength);
}
function createRaceState(round) {
  const archetype = round.archetype || "sprint";
  const lapLength = Math.max(1, Number(round.tickCount) || 100);
  const laps = archetype === "circuit" ? Math.max(1, Number(round.laps) || 1) : 1;
  const raceLength = raceLengthFor(round);
  let distance = 0;
  return {
    archetype,
    lapLength,
    laps,
    raceLength,
    get distance() {
      return distance;
    },
    advance(speed) {
      distance = Math.min(raceLength, distance + Math.max(0, Number(speed) || 0));
      return distance;
    },
    reset() {
      distance = 0;
    },
    // Logical obstacle-table row for a given scroll tick (wraps on circuits where the table = one lap).
    rowIndex(tick, tableLen) {
      const len = Math.max(1, Number(tableLen) || lapLength);
      return ((Number(tick) || 0) % len + len) % len;
    },
    lap() {
      return Math.min(laps, Math.floor(distance / lapLength) + 1);
    },
    progress() {
      return raceLength > 0 ? Math.min(1, distance / raceLength) : 1;
    },
    finished() {
      return distance >= raceLength;
    }
  };
}

// ../../docs/games/metagame/stages/stage5/rivals.js
var RIVAL_GLYPHS = ["o", "x", "%", "#"];
function rivalGlyph(i) {
  return RIVAL_GLYPHS[i % RIVAL_GLYPHS.length];
}
function clampLane(l) {
  return Math.max(0, Math.min(2, Number(l) || 0));
}
function rollSkill(rng) {
  return {
    optimalLaneProb: 0.55 + rng.float() * 0.4,
    // 0.55–0.95
    reactionLag: rng.int(0, 2),
    topSpeed: 0.9 + rng.float() * 0.28,
    // 0.90–1.18
    aggression: rng.float()
  };
}
function buildGhost({ rng, skill, table, raceLength, tickCap }) {
  const len = Math.max(1, table.length);
  const lane = [];
  const distance = [];
  let cur = 1;
  let dist = 0;
  let finishTick = Infinity;
  for (let t = 0; t < tickCap; t += 1) {
    const row = table[(t % len + len) % len];
    if (t % (skill.reactionLag + 1) === 0) {
      if (rng.float() < skill.optimalLaneProb) {
        cur = optimalLane(row, cur);
      } else if (rng.chance(0.5)) {
        cur = clampLane(cur + (rng.chance(0.5) ? 1 : -1));
      }
    }
    cur = clampLane(cur);
    lane.push(cur);
    let speed = skill.topSpeed;
    const glyph = row ? row.lanes[cur] : null;
    if (isBlock(glyph)) speed *= 0.5;
    if (isGate(glyph)) speed *= 1 + 0.2 * skill.aggression;
    dist = Math.min(raceLength, dist + speed);
    distance.push(dist);
    if (dist >= raceLength && finishTick === Infinity) finishTick = t;
  }
  return { lane, distance, finishTick, skill };
}
function buildRivals({ seed, round, table, raceLength }) {
  const count = Math.max(0, Number(round.rivals) || 0);
  const tickCap = Math.ceil(raceLength / 0.9) + 32;
  const rivals = [];
  for (let i = 0; i < count; i += 1) {
    const rng = makeRng(`${seed}:rival:${round.id}:${i}`);
    const ghost = buildGhost({ rng, skill: rollSkill(rng), table, raceLength, tickCap });
    const last = tickCap - 1;
    rivals.push({
      id: i,
      glyph: rivalGlyph(i),
      finishTick: ghost.finishTick,
      skill: ghost.skill,
      laneAt: (t) => ghost.lane[Math.min(Math.max(0, t), last)],
      distAt: (t) => ghost.distance[Math.min(Math.max(0, t), last)]
    });
  }
  return rivals;
}
function finishPosition(rivals, playerFinishTick) {
  const ahead = rivals.filter((r) => r.finishTick < playerFinishTick).length;
  return ahead + 1;
}
function positionMultiplier(position, fieldSize) {
  const size = Math.max(1, fieldSize);
  if (size <= 1) return 1;
  const frac = (size - position) / (size - 1);
  return Number((0.6 + 0.4 * Math.max(0, Math.min(1, frac))).toFixed(3));
}

// ../../docs/games/metagame/stages/stage5/game-loop.js
var LOOK_AHEAD = 8;
var BASE_SPEED = 1;
var BUMP_DAMAGE = 1;
var BUMP_SLOW = 0.5;
var BUMP_COOLDOWN = 10;
function createGameLoop({ state, seed, roundIdx, calibrated, onPaint, onEnd }) {
  const round = roundByIdx(roundIdx);
  const table = buildObstacleTable(seed, round);
  const tuning = applyUpgrades(state.shop || {});
  const boss = isBossRound(roundIdx);
  const suppressionActive = boss && !calibrated;
  const race = createRaceState(round);
  const maxTicks = race.raceLength + 16;
  const rivals = buildRivals({ seed, round, table, raceLength: race.raceLength });
  const bumpReady = rivals.map(() => 0);
  const run = state.run;
  run.lane = clampLane2(run.lane);
  run.roundIdx = roundIdx;
  run.roundComplete = false;
  run.integrity = 100;
  run.onBeatCount = 0;
  run.totalSwitches = 0;
  run.gatesThisRound = 0;
  run.lap = 1;
  run.distance = 0;
  run.position = rivals.length + 1;
  let tick = 0;
  let done = false;
  let outcome = null;
  function rowAt(t) {
    return table[race.rowIndex(t, table.length)];
  }
  function rivalView() {
    return rivals.map((r) => ({
      glyph: r.glyph,
      lane: r.laneAt(tick),
      ahead: Math.round(r.distAt(tick) - race.distance)
    }));
  }
  function resolveBumps() {
    let slow = 0;
    rivals.forEach((r, i) => {
      if (tick < bumpReady[i]) return;
      if (Math.round(r.distAt(tick) - race.distance) !== 0) return;
      if (r.laneAt(tick) !== run.lane) return;
      run.integrity -= BUMP_DAMAGE;
      bumpReady[i] = tick + BUMP_COOLDOWN;
      slow = BUMP_SLOW;
    });
    return slow;
  }
  function paint() {
    onPaint?.({
      table,
      tick,
      lane: run.lane,
      round,
      integrity: run.integrity,
      gates: run.gatesThisRound,
      suppressionActive,
      lookAhead: LOOK_AHEAD,
      race,
      lap: race.lap(),
      laps: race.laps,
      progress: race.progress(),
      archetype: race.archetype,
      rivals: rivalView(),
      position: run.position,
      fieldSize: rivals.length + 1
    });
  }
  function damageFor(glyph) {
    const base = glyph === "▓" ? GLYPH_DAMAGE["▓"] : tuning.noiseDamage;
    return suppressionActive && glyph === "▓" ? base * 2 : base;
  }
  function setLane(next) {
    const target = clampLane2(next);
    if (done || target === run.lane) return;
    run.totalSwitches += 1;
    const row = rowAt(tick);
    if (row && row.beatOpen === false) run.integrity -= 1;
    else run.onBeatCount += 1;
    run.lane = target;
    paint();
  }
  function handleKey(key) {
    if (key === "ArrowLeft") setLane(run.lane - 1);
    else if (key === "ArrowRight") setLane(run.lane + 1);
  }
  function step() {
    if (done) return outcome;
    const row = rowAt(tick);
    if (row) {
      const glyph = row.lanes[run.lane];
      const shielded = row.counterPhaseLane === run.lane;
      if (isBlock(glyph) && !shielded) run.integrity -= damageFor(glyph);
      if (isGate(glyph)) run.gatesThisRound += 1;
    }
    if (suppressionActive) run.integrity -= 1;
    const slow = resolveBumps();
    if (run.integrity <= 0) {
      run.integrity = 0;
      finish("fail");
      return outcome;
    }
    race.advance(speedFor() - slow);
    run.distance = race.distance;
    run.lap = race.lap();
    run.position = 1 + rivals.filter((r) => r.distAt(tick) > race.distance).length;
    tick += 1;
    if (race.finished() || tick >= maxTicks) {
      finish("clear");
      return outcome;
    }
    paint();
    return null;
  }
  function speedFor() {
    return BASE_SPEED;
  }
  function finish(result) {
    if (done) return;
    done = true;
    outcome = result;
    run.roundComplete = result === "clear";
    let packets = 0;
    let position = run.position;
    if (result === "clear") {
      position = rivals.length ? finishPosition(rivals, tick) : 1;
      run.position = position;
      const onBeatPct = run.totalSwitches > 0 ? run.onBeatCount / run.totalSwitches : 1;
      const multiplier = positionMultiplier(position, rivals.length + 1);
      packets = calcRoundPackets({
        roundId: round.id,
        onBeatPct,
        integrityRemaining: run.integrity,
        gatesCollected: run.gatesThisRound,
        upgrades: state.shop || {},
        multiplier
      });
      state.packets = Number(state.packets || 0) + packets;
    }
    onEnd?.({ result, round, roundIdx, integrity: run.integrity, packets, gates: run.gatesThisRound, position, fieldSize: rivals.length + 1 });
  }
  function bestLane(atTick) {
    return optimalLane(rowAt(atTick), run.lane);
  }
  function autoSolve(limit = maxTicks + 32) {
    let guard = 0;
    while (!done && guard < limit) {
      run.lane = bestLane(tick);
      step();
      guard += 1;
    }
    return outcome;
  }
  return {
    round,
    table,
    isBoss: boss,
    suppressionActive,
    race,
    rivals,
    get tick() {
      return tick;
    },
    get done() {
      return done;
    },
    get outcome() {
      return outcome;
    },
    get position() {
      return run.position;
    },
    handleKey,
    step,
    autoSolve,
    paint,
    rivalView
  };
}
function clampLane2(lane) {
  return Math.max(0, Math.min(2, Number(lane) || 0));
}

// ../../docs/games/metagame/stages/stage5/engine.js
function createEngine({ onTick, getTickMs }) {
  const raf = typeof requestAnimationFrame === "function" ? requestAnimationFrame : null;
  const caf = typeof cancelAnimationFrame === "function" ? cancelAnimationFrame : () => {
  };
  let handle = null;
  let last = null;
  let acc = 0;
  let tick = 0;
  let running = false;
  function frame(ts) {
    if (!running) return;
    if (last === null) last = ts;
    acc += Math.max(0, ts - last);
    last = ts;
    let guard = 0;
    while (acc >= getTickMs() && guard < 8) {
      acc -= getTickMs();
      guard += 1;
      onTick(tick);
      tick += 1;
      if (!running) return;
    }
    if (running && raf) handle = raf(frame);
  }
  return {
    start() {
      if (running || !raf) return;
      running = true;
      last = null;
      acc = 0;
      handle = raf(frame);
    },
    stop() {
      running = false;
      if (handle) caf(handle);
      handle = null;
    },
    get running() {
      return running;
    }
  };
}

// ../../docs/games/metagame/stages/stage5/render-track.js
var CELL = { empty: " · ", "░": " ░ ", "▒": " ▒ ", "▓": " ▓ ", ">>": ">> " };
function renderTrackGrid({ table, tick, lane, lookAhead = 8, wrap = false, rivals = [] }) {
  const rows = [];
  const at = (t) => {
    if (wrap && table.length) return table[(t % table.length + table.length) % table.length];
    return table[t];
  };
  const here = at(tick) || { counterPhaseLane: null, beatOpen: true };
  const rivalAt = /* @__PURE__ */ new Map();
  for (const r of rivals) {
    if (r && r.ahead >= 0 && r.ahead < lookAhead) rivalAt.set(`${r.ahead},${r.lane}`, r.glyph || "o");
  }
  const header = [0, 1, 2].map((l) => l === here.counterPhaseLane ? " ~ " : "   ").join(" ");
  rows.push(`${header} ${here.beatOpen ? "*" : " "}`);
  for (let ahead = lookAhead - 1; ahead >= 0; ahead -= 1) {
    const row = at(tick + ahead);
    const cells = [0, 1, 2].map((l) => {
      const rival = rivalAt.get(`${ahead},${l}`);
      return rival ? ` ${rival} ` : cell(row ? row.lanes[l] : null);
    });
    rows.push(cells.join("|"));
  }
  const playerCells = [0, 1, 2].map((l) => l === lane ? "[>]" : " · ");
  rows.push(playerCells.join("|"));
  return rows.join("\n");
}
function cell(glyph) {
  return CELL[glyph] || CELL.empty;
}

// ../../docs/games/metagame/stages/stage5/content.js
var roundLogLines = [
  "signal corridor acquired. static interference at standard density.",
  "the interference pulses. move on the gaps, not against them.",
  "dense blocks ahead — choose which hit to take, not whether.",
  "a shield lane drifts through the noise. ride it.",
  "boost gates open on the beat. take the throughput, not just the safe line.",
  "the channel splits and re-merges. hold your route through the noise.",
  "jammer signal collapses into silence. the channel is yours."
];
function roundLogLine(roundIdx) {
  return roundLogLines[Math.max(0, Math.min(roundLogLines.length - 1, Number(roundIdx) || 0))];
}
var GLYPH_LEGEND = [
  ["░", "static (−2)"],
  ["▒", "pulse (−2, off-beat hurts)"],
  ["▓", "dense block (−5)"],
  [">>", "boost gate (+packets)"],
  ["~", "shield lane (phase through)"]
];

// ../../docs/games/metagame/stages/stage5/renderer.js
var BOSS_IDX = ROUNDS.length - 1;
function renderStage5(ctx) {
  const { host, state, actions, achievements, bell, bts, viewer, save, onStageComplete } = ctx;
  const root = document.createElement("section");
  root.className = "stage5-signal-racer";
  root.tabIndex = 0;
  root.innerHTML = `
    <header class="s5-hud">
      <strong>SIGNAL RACER</strong>
      <span>ROUND <span data-field="round"></span></span>
      <span>INTEGRITY <span data-field="integrity"></span></span>
      <span>PACKETS <span data-field="packets"></span></span>
      <span>CALIBRATION <span data-field="calib"></span></span>
    </header>
    <div class="s5-layout">
      <pre class="s5-track-grid" data-field="arena" aria-label="signal racer track"></pre>
      <aside class="s5-side">
        <div class="s5-rounds" data-field="rounds"></div>
        <div class="s5-shop" data-field="shop"></div>
        <pre class="s5-legend" data-field="legend"></pre>
      </aside>
    </div>
    <section class="s5-boss-panel">
      <strong>THE JAMMER</strong>
      <div data-field="bossState"></div>
      <div class="s5-hint" data-field="hint"></div>
    </section>
    <ol class="s5-log"></ol>
    <div class="s5-controls">
      <button type="button" data-action="audio">open transmission_hum.mp3</button>
      <button type="button" data-action="bts" hidden>open signal_racer.bts</button>
    </div>
  `;
  host.replaceChildren(root);
  const fields = Object.fromEntries([...root.querySelectorAll("[data-field]")].map((el) => [el.dataset.field, el]));
  const log = root.querySelector(".s5-log");
  const completeOnce = once((result) => onStageComplete?.(result));
  let loop = null;
  let engine = null;
  let mode = "select";
  fields.legend.textContent = GLYPH_LEGEND.map(([g, t]) => `${g}  ${t}`).join("\n");
  function calibrated() {
    return getBossLockState({ actions, state }).unlocked;
  }
  function unlockedRounds() {
    return Math.min(BOSS_IDX, Number(state.run.clearedRounds || 0));
  }
  function startRound(idx) {
    if (mode === "playing") return;
    const roundIdx = Math.max(0, Math.min(BOSS_IDX, Number(idx) || 0));
    if (roundIdx > unlockedRounds()) return;
    if (isBossRound(roundIdx) && state.run.clearedRounds < BOSS_IDX) return;
    loop = createGameLoop({
      state,
      seed: state.calibration.seed,
      roundIdx,
      calibrated: calibrated(),
      onPaint: paintArena,
      onEnd: handleEnd
    });
    mode = "playing";
    engine = createEngine({ onTick: () => loop.step(), getTickMs: () => loop.round.tickMs });
    engine.start();
    loop.paint();
    repaint();
  }
  function handleEnd({ result, round, roundIdx, packets }) {
    engine?.stop();
    engine = null;
    mode = "result";
    if (result === "clear") {
      pushLog3(roundLogLine(roundIdx) + (packets ? ` (+${packets} packets)` : ""));
      if (!isBossRound(roundIdx)) {
        state.run.clearedRounds = Math.max(Number(state.run.clearedRounds || 0), roundIdx + 1);
      } else {
        const r = raceTheJammer({ state, actions });
        if (r.defeated) completeOnce({ stage: 5, defeated: true, btsPath: BTS_PATH });
      }
    } else {
      pushLog3(round.id === FINAL_ROUND_ID ? "the jammer held the throttle down. the counter-wave is not calibrated." : "signal integrity collapsed. recalibrate and run it again.");
    }
    persistAndPaint();
  }
  function paintArena(view) {
    fields.arena.textContent = renderTrackGrid({
      table: view.table,
      tick: view.tick,
      lane: view.lane,
      lookAhead: view.lookAhead,
      wrap: view.archetype === "circuit",
      rivals: view.rivals || []
    });
    fields.integrity.textContent = `${Math.round(view.integrity)}%`;
  }
  function repaint() {
    const lock = getBossLockState({ actions, state });
    const idx = Number(state.run.roundIdx || 0);
    fields.round.textContent = `${roundByIdx(idx).id}/${FINAL_ROUND_ID} ${roundByIdx(idx).label}`;
    if (mode !== "playing") fields.integrity.textContent = `${Math.round(state.run.integrity)}%`;
    fields.packets.textContent = String(state.packets);
    fields.calib.textContent = lock.unlocked ? "LOCKED-IN" : "uncalibrated";
    fields.bossState.textContent = state.boss.defeated ? "defeated. BTS trace available." : `${lock.jammerSuppression} / ${lock.unlocked ? "beatable" : "suppression dominant"}`;
    fields.hint.textContent = lock.hint;
    renderRoundButtons();
    renderShop();
    root.querySelector('[data-action="bts"]').hidden = !state.boss.defeated;
    log.replaceChildren(...state.log.slice(-6).map((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      return li;
    }));
  }
  function renderRoundButtons() {
    const unlocked = unlockedRounds();
    const cleared = Number(state.run.clearedRounds || 0);
    fields.rounds.replaceChildren(...ROUNDS.map((round, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.startRound = String(i);
      const boss = isBossRound(i);
      const locked = boss ? cleared < BOSS_IDX : i > unlocked;
      btn.disabled = locked || mode === "playing";
      btn.textContent = `${round.id}. ${round.label}${i < cleared ? " ✓" : ""}${locked ? " 🔒" : ""}`;
      if (boss) btn.classList.add("s5-boss-btn");
      return btn;
    }));
  }
  function renderShop() {
    fields.shop.replaceChildren(...UPGRADES.map((u) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.buy = u.id;
      const owned = Boolean(state.shop?.[u.id]);
      btn.disabled = owned || mode === "playing" || Number(state.packets) < u.cost;
      btn.title = u.desc;
      btn.textContent = owned ? `${u.label} ✓` : `${u.label} (${u.cost}p)`;
      return btn;
    }));
  }
  root.addEventListener("click", (event) => {
    const startBtn = event.target.closest("button[data-start-round]");
    if (startBtn) {
      startRound(Number(startBtn.dataset.startRound));
      return;
    }
    const buyBtn = event.target.closest("button[data-buy]");
    if (buyBtn) {
      buyUpgrade(state, buyBtn.dataset.buy);
      persistAndPaint();
      return;
    }
    const action = event.target.closest("button[data-action]");
    if (!action) return;
    if (action.dataset.action === "audio") {
      viewer?.openFile?.(TRANSMISSION_HUM_PATH, { mime: "audio/mpeg", source: "stage5" });
    }
    if (action.dataset.action === "bts") bts?.open?.(5);
    persistAndPaint();
  });
  const onKey = (event) => {
    if (mode !== "playing" || !loop) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      loop.handleKey(event.key);
    }
  };
  root.addEventListener("keydown", onKey);
  repaint();
  window.__fvStage5 = {
    state: () => state,
    startRound,
    solveRound() {
      if (loop && mode === "playing") return loop.autoSolve();
      return null;
    },
    solveRun() {
      for (let i = 0; i < BOSS_IDX; i += 1) {
        startRound(i);
        if (loop && mode === "playing") loop.autoSolve();
      }
      return Number(state.run.clearedRounds || 0);
    },
    calibrate() {
      const samples = Array.from({ length: 16 }, (_, i) => ({ atMs: i * 1e3, active: true, seeking: false }));
      runCalibrationTimeline({ state, actions, achievements, bell, file: TRANSMISSION_HUM_PATH, samples });
      persistAndPaint();
      return calibrated();
    },
    solveBoss() {
      startRound(BOSS_IDX);
      if (loop && mode === "playing") return loop.autoSolve();
      return null;
    }
  };
  return {
    repaint,
    destroy() {
      engine?.stop();
      if (window.__fvStage5) delete window.__fvStage5;
      root.removeEventListener("keydown", onKey);
      root.remove();
    }
  };
  function pushLog3(line) {
    state.log = [...state.log || [], line].slice(-8);
  }
  function persistAndPaint() {
    save?.();
    repaint();
  }
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
    run: {
      lane: 1,
      // 0=A, 1=B, 2=C
      roundIdx: 0,
      // 0–6 for rounds 1–7
      roundComplete: false,
      integrity: 100,
      onBeatCount: 0,
      totalSwitches: 0,
      gatesThisRound: 0,
      clearedRounds: 0
      // how many non-boss rounds finished (boss gated behind this)
    },
    shop: {
      noiseFilter: false,
      spectrumAnalyzer: false,
      signalAmplifier: false
    },
    log: ["signal racer mounted.", "the jammer is already in the racing line."]
  };
}
function normalizeState(state, context = {}) {
  const fresh = defaultState(context);
  const target = state && typeof state === "object" ? state : {};
  target.version = 1;
  target.packets = Number.isFinite(target.packets) ? target.packets : fresh.packets;
  target.calibration = mergePlain(fresh.calibration, target.calibration);
  target.calibration.loopMs = Number(target.calibration.loopMs) || fresh.calibration.loopMs;
  target.calibration.continuousMs = Math.max(0, Number(target.calibration.continuousMs) || 0);
  target.calibration.calibrated = Boolean(target.calibration.calibrated);
  target.boss = mergePlain(fresh.boss, target.boss);
  target.run = mergePlain(fresh.run, target.run);
  target.run.integrity = Number.isFinite(Number(target.run.integrity)) ? Number(target.run.integrity) : fresh.run.integrity;
  target.shop = mergePlain(fresh.shop, target.shop);
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
  raceTheJammer,
  roundLogLine,
  runCalibrationTimeline,
  stageMeta
};
