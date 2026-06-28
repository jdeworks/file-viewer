// GENERATED — DO NOT EDIT BY HAND.
// Bundled from docs/games/metagame/stages/stage5/index.js (+ its local modules) by
// build/metagame/build.mjs. Rebuild:  node build/metagame/build.mjs  (run by scripts/check.sh).
// Exports stageMeta / defaultState / mountStage. Shared ../../*.js singletons + ./styles.css stay
// external (NOT inlined). The hub's stage-manifest.js LOADERS import THIS file.


// ../../docs/games/metagame/stages/stage5/messages.js
var ACTION_NAME = "counter_wave_calibrated";
var PROGRESS_ACTION = "calibration_progress";
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
var DENSITY = { 1: 0.4, 2: 0.42, 3: 0.45, 4: 0.45, 5: 0.45, 6: 0.48, 7: 0.44, 8: 0.4, 9: 0.5 };
function buildObstacleTable(seed, roundDef, densityBonus = 0) {
  const rng = makeRng(`${seed}:${roundDef.id}`);
  const count = Number(roundDef.tickCount) || 100;
  const obstacleGlyphs = (roundDef.glyphs || ["░"]).filter((g) => g !== ">>");
  const density = Math.min(0.7, (DENSITY[roundDef.id] ?? 0.45) + Math.max(0, Number(densityBonus) || 0));
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
  // ── Act I — SPRINTS (point-to-point single tracks; learn to move, then to time it) ───────────────
  {
    id: 1,
    label: "AVOID",
    tickMs: 170,
    beatWindowTicks: null,
    glyphs: ["░"],
    burstPattern: null,
    counterPhaseShift: null,
    hasFork: false,
    hasGates: false,
    archetype: "sprint",
    tickCount: 900,
    trackLength: 900,
    rivals: 2,
    hasPowerups: true,
    powerupPool: ["repair", "cache"]
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
    archetype: "sprint",
    tickCount: 1e3,
    trackLength: 1e3,
    rivals: 2,
    hasPowerups: true,
    powerupPool: ["repair", "cache", "overclock"]
  },
  // ── Act II — CIRCUITS (one looping lap raced N times; read the pattern, hold the shield lane) ────
  {
    id: 3,
    label: "READ AHEAD",
    tickMs: 150,
    beatWindowTicks: 1,
    glyphs: ["░", "▓"],
    burstPattern: [1, 0, 1, 1],
    counterPhaseShift: null,
    hasFork: false,
    hasGates: false,
    archetype: "circuit",
    tickCount: 220,
    laps: 5,
    rivals: 3,
    hasPowerups: true,
    powerupPool: ["repair", "shield", "overclock"]
  },
  {
    id: 4,
    label: "COUNTER-PHASE LANE",
    tickMs: 150,
    beatWindowTicks: 1,
    glyphs: ["░", "▒"],
    burstPattern: [1, 1, 0, 0],
    counterPhaseShift: 8,
    hasFork: false,
    hasGates: false,
    archetype: "circuit",
    tickCount: 240,
    laps: 5,
    rivals: 3,
    hasPowerups: true,
    powerupPool: ["repair", "shield", "emp"]
  },
  // ── Act III — GAUNTLETS (long survival tracks; harvest gates, commit at the fork) ───────────────
  {
    id: 5,
    label: "BOOST GATES",
    tickMs: 140,
    beatWindowTicks: 1,
    glyphs: ["░", ">>"],
    burstPattern: [1, 0, 1, 0],
    counterPhaseShift: 8,
    hasFork: false,
    hasGates: true,
    archetype: "gauntlet",
    tickCount: 1300,
    trackLength: 1300,
    rivals: 3,
    hasPowerups: true,
    powerupPool: ["shield", "overclock", "cache", "emp"]
  },
  {
    id: 6,
    label: "SPLIT CHANNEL",
    tickMs: 135,
    beatWindowTicks: 1,
    glyphs: ["░", "▓", ">>"],
    burstPattern: [1, 0, 1, 0],
    counterPhaseShift: 8,
    hasFork: true,
    hasGates: true,
    archetype: "gauntlet",
    tickCount: 1500,
    trackLength: 1500,
    rivals: 3,
    hasPowerups: true,
    powerupPool: ["shield", "overclock", "repair", "cache", "emp"]
  },
  // ── Act IV — TIME TRIAL (race the par clock + a translucent ghost of your own prior-best run) ─────
  {
    id: 7,
    label: "TIME TRIAL",
    tickMs: 140,
    beatWindowTicks: 1,
    glyphs: ["░", "▒"],
    burstPattern: [1, 0, 1, 0],
    counterPhaseShift: null,
    hasFork: false,
    hasGates: true,
    archetype: "time-trial",
    tickCount: 900,
    trackLength: 900,
    parPace: 0.9,
    rivals: 2,
    hasPowerups: true,
    powerupPool: ["overclock", "overclock", "repair", "cache"]
  },
  // ── Act V — FORK RELAY (the channel splits repeatedly: commit HI for gates or LO for safety) ──────
  {
    id: 8,
    label: "FORK RELAY",
    tickMs: 135,
    beatWindowTicks: 1,
    glyphs: ["░", "▓", ">>"],
    burstPattern: [1, 0, 1, 0],
    counterPhaseShift: null,
    hasFork: true,
    hasGates: true,
    archetype: "fork",
    tickCount: 1400,
    trackLength: 1400,
    forkSpan: 44,
    forkGap: 130,
    forkFirst: 70,
    rivals: 3,
    hasPowerups: true,
    powerupPool: ["shield", "overclock", "repair", "cache"]
  },
  // ── BOSS — Jammer Pursuit (all verbs at once; NO powerups — the calibration un-cheat is the gate) ─
  {
    id: 9,
    label: "BOSS",
    tickMs: 120,
    beatWindowTicks: 1,
    glyphs: ["░", "▒", "▓", ">>"],
    burstPattern: [1, 1, 0, 1, 0],
    counterPhaseShift: 4,
    hasFork: true,
    hasGates: true,
    archetype: "boss",
    tickCount: 1100,
    trackLength: 1100,
    forkSpan: 36,
    forkGap: 200,
    forkFirst: 90,
    rivals: 2,
    hasPowerups: false
  }
];
var FINAL_ROUND_ID = 9;
var ROUND_COUNT = ROUNDS.length;
function roundByIdx(idx) {
  return ROUNDS[Math.max(0, Math.min(ROUNDS.length - 1, Number(idx) || 0))];
}
function isBossRound(roundIdx) {
  return roundByIdx(roundIdx).id === FINAL_ROUND_ID;
}

// ../../docs/games/metagame/stages/stage5/shop.js
var BASE_TUNING = {
  noiseDamage: 2,
  // ░ static hit damage
  topSpeed: 1,
  // base race pace (distance/tick)
  maxIntegrity: 100,
  // hull cap
  overclockSpeed: 1.6,
  // pace while an overclock buff is live
  overclockBonusMs: 0,
  // extra overclock duration
  lookAhead: 8,
  // rows of track drawn ahead
  offBeatPenalty: 1,
  // integrity lost on an off-beat lane switch
  bumpDamage: 1,
  // integrity lost sharing a lane with a rival
  bumpSlow: 0.5,
  // speed lost on a bump
  gateValue: 5,
  // packets per boost gate
  packetMult: 1
  // overall packet reward multiplier
};
var UPGRADES = [
  {
    id: "engine",
    label: "Engine",
    desc: "Higher top speed on every track.",
    cost: 50,
    costScale: 1.6,
    maxLevel: 4,
    effect: (t, l) => {
      t.topSpeed = +(1 + 0.07 * l).toFixed(3);
    }
  },
  {
    id: "chassis",
    label: "Chassis",
    desc: "More hull integrity to spend on hits.",
    cost: 60,
    costScale: 1.6,
    maxLevel: 4,
    effect: (t, l) => {
      t.maxIntegrity = 100 + 12 * l;
    }
  },
  {
    id: "cooling",
    label: "Cooling",
    desc: "Stronger, longer overclock bursts.",
    cost: 70,
    costScale: 1.7,
    maxLevel: 3,
    effect: (t, l) => {
      t.overclockSpeed = +(1.6 + 0.12 * l).toFixed(3);
      t.overclockBonusMs = 500 * l;
    }
  },
  {
    id: "navArray",
    label: "Nav Array",
    desc: "See more rows ahead — read tunnels & forks sooner.",
    cost: 55,
    costScale: 1.7,
    maxLevel: 3,
    effect: (t, l) => {
      t.lookAhead = 8 + l;
    }
  },
  {
    id: "traction",
    label: "Traction",
    desc: "Off-beat switches & rival bumps cost less.",
    cost: 50,
    costScale: 1.6,
    maxLevel: 3,
    effect: (t, l) => {
      t.offBeatPenalty = +Math.max(0, 1 - 0.3 * l).toFixed(3);
      t.bumpSlow = +Math.max(0.1, 0.5 - 0.12 * l).toFixed(3);
      t.bumpDamage = +Math.max(0, 1 - 0.3 * l).toFixed(3);
    }
  },
  {
    id: "signalAmp",
    label: "Signal Amp",
    desc: "Boost gates & packet rewards pay more.",
    cost: 60,
    costScale: 1.6,
    maxLevel: 3,
    effect: (t, l) => {
      t.gateValue = 5 + 2 * l;
      t.packetMult = +(1 + 0.08 * l).toFixed(3);
    }
  },
  {
    id: "noiseFilter",
    label: "Noise Filter",
    desc: "Less damage from ░ static.",
    cost: 55,
    costScale: 1.7,
    maxLevel: 2,
    effect: (t, l) => {
      t.noiseDamage = +Math.max(0.5, 2 - 0.75 * l).toFixed(3);
    }
  }
];
var byId = new Map(UPGRADES.map((u) => [u.id, u]));
function levelOf(shop, id) {
  return Math.max(0, Math.floor(Number(shop?.[id]) || 0));
}
function maxLevelOf(id) {
  const def = byId.get(id);
  return def ? Math.max(1, Number(def.maxLevel) || 1) : 0;
}
function isMaxed(shop, id) {
  return levelOf(shop, id) >= maxLevelOf(id);
}
function costOf(shop, id) {
  const def = byId.get(id);
  if (!def || isMaxed(shop, id)) return Infinity;
  const scale = Number.isFinite(Number(def.costScale)) ? Number(def.costScale) : 1;
  return Math.round((Number(def.cost) || 0) * Math.pow(scale, levelOf(shop, id)));
}
function applyUpgrades(shop = {}, base = BASE_TUNING) {
  const t = { ...base };
  for (const def of UPGRADES) {
    const level = levelOf(shop, def.id);
    if (level > 0 && typeof def.effect === "function") def.effect(t, level);
  }
  return t;
}
function buyUpgrade(state, id) {
  const def = byId.get(id);
  if (!def) return { bought: false, reason: "unknown" };
  const shop = state.shop = state.shop && typeof state.shop === "object" ? state.shop : {};
  if (isMaxed(shop, id)) return { bought: false, reason: "maxed" };
  const cost = costOf(shop, id);
  if (Number(state.packets || 0) < cost) return { bought: false, reason: "insufficient", cost };
  state.packets = Number(state.packets) - cost;
  shop[id] = levelOf(shop, id) + 1;
  return { bought: true, reason: "ok", cost, level: shop[id] };
}

// ../../docs/games/metagame/stages/stage5/economy.js
var BASE_PACKETS = { 1: 30, 2: 40, 3: 50, 4: 60, 5: 70, 6: 80, 7: 90, 8: 95, 9: 100 };
function calcRoundPackets({ roundId, onBeatPct = 0, integrityRemaining = 0, gatesCollected = 0, gateValue = 5, multiplier = 1 }) {
  const base = BASE_PACKETS[roundId] ?? 30;
  const accuracy = Math.floor(clamp01(onBeatPct) * 20);
  const survival = Math.floor(Math.max(0, integrityRemaining) * 0.3);
  const gv = Number(gateValue) || 5;
  const gates = Math.max(0, gatesCollected) * gv;
  const subtotal = base + accuracy + survival + gates;
  const mult = Number.isFinite(Number(multiplier)) && multiplier > 0 ? Number(multiplier) : 1;
  return Math.max(10, Math.round(subtotal * mult));
}
function estimateRoundPackets(round, tuning = {}) {
  const gateValue = Number(tuning.gateValue) || 5;
  const packetMult = Number(tuning.packetMult) > 0 ? Number(tuning.packetMult) : 1;
  const repGates = round && round.hasGates ? 6 : 0;
  const roundId = round ? round.id : 1;
  const low = calcRoundPackets({
    roundId,
    onBeatPct: 0.5,
    integrityRemaining: 35,
    gatesCollected: 0,
    gateValue,
    multiplier: 0.6 * packetMult
    // 0.6 = last-place position floor
  });
  const high = calcRoundPackets({
    roundId,
    onBeatPct: 1,
    integrityRemaining: 100,
    gatesCollected: repGates,
    gateValue,
    multiplier: packetMult
    // 1.0 = 1st-place position
  });
  return { low, high };
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
function buildGhost({ rng, skill, table, raceLength, tickCap, speedMult = 1 }) {
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
    let speed = skill.topSpeed * speedMult;
    const glyph = row ? row.lanes[cur] : null;
    if (isBlock(glyph)) speed *= 0.5;
    if (isGate(glyph)) speed *= 1 + 0.2 * skill.aggression;
    dist = Math.min(raceLength, dist + speed);
    distance.push(dist);
    if (dist >= raceLength && finishTick === Infinity) finishTick = t;
  }
  return { lane, distance, finishTick, skill };
}
function buildRivals({ seed, round, table, raceLength, speedMult = 1 }) {
  const count = Math.max(0, Number(round.rivals) || 0);
  const tickCap = Math.ceil(raceLength / 0.4) + 64;
  const rivals = [];
  for (let i = 0; i < count; i += 1) {
    const rng = makeRng(`${seed}:rival:${round.id}:${i}`);
    const ghost = buildGhost({ rng, skill: rollSkill(rng), table, raceLength, tickCap, speedMult });
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

// ../../docs/games/metagame/stages/stage5/powerups.js
var POWERUPS = {
  shield: { glyph: "U", label: "shield", kind: "buff", durationMs: 2600 },
  overclock: { glyph: "O", label: "overclock", kind: "buff", durationMs: 2200 },
  emp: { glyph: "E", label: "EMP", kind: "instant", drag: 9, finishTicks: 12 },
  repair: { glyph: "+", label: "repair", kind: "instant", amount: 12 },
  cache: { glyph: "$", label: "packet-cache", kind: "instant", amount: 15 }
};
var GLYPH_TO_TYPE = Object.fromEntries(Object.entries(POWERUPS).map(([t, d]) => [d.glyph, t]));
var POWERUP_GLYPHS = Object.values(POWERUPS).map((p) => p.glyph);
var DEFAULT_POOL = ["shield", "overclock", "repair", "cache", "emp"];
function isPowerup(glyph) {
  return Boolean(GLYPH_TO_TYPE[glyph]);
}
function powerupType(glyph) {
  return GLYPH_TO_TYPE[glyph] || null;
}
function poolFor(round) {
  const pool = round && Array.isArray(round.powerupPool) ? round.powerupPool.filter((t) => POWERUPS[t]) : null;
  return pool && pool.length ? pool : DEFAULT_POOL;
}
function placePowerups(table, rng, round = {}) {
  const pool = poolFor(round);
  const spacing = Math.max(4, Number(round.powerupSpacing) || 14);
  const chance = Number.isFinite(Number(round.powerupChance)) ? Number(round.powerupChance) : 0.7;
  for (let t = 0; t < table.length; t += 1) {
    if (t % spacing !== 0) continue;
    const row = table[t];
    if (!row || row.beatOpen === false || row.fork) continue;
    const open = [0, 1, 2].filter((l) => row.lanes[l] === null);
    if (!open.length || !rng.chance(chance)) continue;
    const lane = rng.pick(open);
    row.lanes[lane] = POWERUPS[rng.pick(pool)].glyph;
  }
  return table;
}
function durationTicks(type, getTickMs, bonusMs = 0) {
  const def = POWERUPS[type];
  if (!def || !def.durationMs) return 0;
  const ms = Math.max(1, Number(getTickMs && getTickMs()) || 130);
  return Math.max(1, Math.ceil((def.durationMs + Math.max(0, Number(bonusMs) || 0)) / ms));
}

// ../../docs/games/metagame/stages/stage5/ghost.js
function clampLane2(l) {
  return Math.max(0, Math.min(2, Number(l) || 0));
}
function makeParGhost(raceLength, pace = 0.9) {
  const len = Math.max(1, Number(raceLength) || 1);
  const p = Math.max(0.05, Number(pace) || 0.9);
  const finishTick = Math.ceil(len / p);
  return {
    kind: "par",
    glyph: "P",
    finishTick,
    laneAt: () => 1,
    distAt: (t) => Math.min(len, Math.max(0, Number(t) || 0) * p)
  };
}
function ghostFromRecording(rec, glyph = "G") {
  if (!rec || typeof rec !== "object") return null;
  const lanes = String(rec.lanes || "");
  const dist = Array.isArray(rec.dist) ? rec.dist : [];
  const last = Math.max(0, Math.max(lanes.length, dist.length) - 1);
  const finishTick = Number.isFinite(Number(rec.tick)) ? Number(rec.tick) : last;
  return {
    kind: "replay",
    glyph,
    finishTick,
    laneAt: (t) => clampLane2(Number(lanes[Math.min(Math.max(0, t | 0), last)]) || 0),
    distAt: (t) => Number(dist[Math.min(Math.max(0, t | 0), last)]) || 0
  };
}
function createRecorder() {
  const lanes = [];
  const dist = [];
  return {
    sample(lane, distance) {
      lanes.push(clampLane2(lane));
      dist.push(Math.round(Math.max(0, Number(distance) || 0)));
    },
    finalize(finishTick) {
      return { tick: Number(finishTick) || lanes.length, lanes: lanes.join(""), dist };
    }
  };
}
function medalFor(finishTick, parTick) {
  const f = Number(finishTick);
  const par = Number(parTick);
  if (!Number.isFinite(f) || !Number.isFinite(par) || par <= 0) return "bronze";
  if (f <= par * 0.85) return "gold";
  if (f <= par) return "silver";
  return "bronze";
}

// ../../docs/games/metagame/stages/stage5/fork.js
var LANES2 = 3;
var HI_DENSITY = 0.55;
var LO_DENSITY = 0.3;
function buildLanes(rng, density, glyphs, beatOpen, withGates) {
  const lanes = [null, null, null];
  let blocked = 0;
  for (let l = 0; l < LANES2; l += 1) {
    if (rng.chance(density)) {
      lanes[l] = rng.pick(glyphs);
      blocked += 1;
    }
  }
  if (blocked >= LANES2) lanes[rng.int(0, LANES2 - 1)] = null;
  if (withGates && beatOpen && rng.chance(0.5)) {
    const open = [0, 1, 2].filter((l) => lanes[l] === null);
    if (open.length) lanes[rng.pick(open)] = ">>";
  }
  return lanes;
}
function applyForks(table, rng, round = {}) {
  const span = Math.max(8, Number(round.forkSpan) || 36);
  const gap = Math.max(span + 8, Number(round.forkGap) || 150);
  const first = Math.max(24, Number(round.forkFirst) || 60);
  const hiGlyphs = ["░", "▓"];
  const loGlyphs = ["░"];
  const entries = [];
  for (let start = first; start + span < table.length - 8; start += gap) {
    entries.push(start);
    for (let i = 0; i < span; i += 1) {
      const t = start + i;
      const row = table[t];
      if (!row) continue;
      const beatOpen = row.beatOpen !== false;
      const forkHi = buildLanes(rng, HI_DENSITY, hiGlyphs, beatOpen, true);
      const forkLo = buildLanes(rng, LO_DENSITY, loGlyphs, beatOpen, false);
      row.fork = true;
      row.forkEntry = i === 0;
      row.forkHi = forkHi;
      row.forkLo = forkLo;
      row.lanes = forkLo.slice();
    }
  }
  return entries;
}
function resolveRow(row, channel) {
  if (!row || !row.fork) return row;
  const lanes = channel === "hi" ? row.forkHi : row.forkLo;
  return { ...row, lanes: lanes || row.lanes };
}

// ../../docs/games/metagame/stages/stage5/drive.js
function bestChannelForSplit(loop, startTick) {
  const r = loop.rawRowAt(startTick);
  const span = r && r.fork ? Number(loop.round.forkSpan) || 36 : 0;
  for (let i = 0; i < span; i += 1) {
    const row = loop.rawRowAt(startTick + i);
    if (row && row.forkHi && row.forkHi.includes(">>")) return "hi";
  }
  return "lo";
}
function autoSolve(loop, limit = loop.maxTicks + 32) {
  let guard = 0;
  while (!loop.done && guard < limit) {
    if (loop.rawRowAt(loop.tick)?.forkEntry) loop.setChannel(bestChannelForSplit(loop, loop.tick));
    loop.commitLane(optimalLane(loop.activeRowAt(loop.tick), loop.lane));
    loop.step();
    guard += 1;
  }
  return loop.outcome;
}
function replayResume(loop, resume) {
  if (!resume || typeof resume.lanes !== "string") return;
  const L = resume.lanes;
  const C = typeof resume.channels === "string" ? resume.channels : "";
  const upto = Math.min(Number(resume.tick) || L.length, L.length, loop.maxTicks);
  loop.setReplaying(true);
  for (let t = 0; t < upto && !loop.done; t += 1) {
    if (loop.rawRowAt(loop.tick)?.forkEntry) loop.setChannel(C[t] === "h" ? "hi" : "lo");
    loop.commitLane(Number(L[t]) || 0);
    loop.step();
  }
  loop.setReplaying(false);
}

// ../../docs/games/metagame/stages/stage5/game-loop.js
var BUMP_COOLDOWN = 10;
function createGameLoop({ state, seed, roundIdx, calibrated, onPaint, onEnd, getTickMs, roundOverride, prevGhost, mods = {}, resume = null }) {
  const round = roundOverride || roundByIdx(roundIdx);
  const tickMs = getTickMs || (() => round.tickMs);
  const m = mods && typeof mods === "object" ? mods : {};
  const table = buildObstacleTable(seed, round, m.densityBonus || 0);
  if (round.hasFork) applyForks(table, makeRng(`${seed}:fork:${round.id}`), round);
  if (round.hasPowerups) placePowerups(table, makeRng(`${seed}:pu:${round.id}`), round);
  const tuning = applyUpgrades(state.shop || {});
  tuning.maxIntegrity = Math.max(20, Math.round(tuning.maxIntegrity * (Number(m.integrityMult) || 1)));
  tuning.noiseDamage += Math.max(0, Number(m.noiseDamageBonus) || 0);
  const boss = roundOverride ? Boolean(round.boss) : isBossRound(roundIdx);
  const suppressionActive = boss && !calibrated;
  const race = createRaceState(round);
  const maxTicks = race.raceLength + 16;
  const rivals = buildRivals({ seed, round, table, raceLength: race.raceLength, speedMult: Number(m.rivalSpeedMult) || 1 });
  const isTimeTrial = race.archetype === "time-trial";
  const parGhost = isTimeTrial ? makeParGhost(race.raceLength, round.parPace) : null;
  const replayGhost = isTimeTrial ? ghostFromRecording(prevGhost, "G") : null;
  const recorder = isTimeTrial ? createRecorder() : null;
  const bumpReady = rivals.map(() => 0);
  const rivalDrag = rivals.map(() => 0);
  const rivalLate = rivals.map(() => 0);
  const buffs = { shieldUntil: -1, overclockUntil: -1 };
  const effDist = (i) => Math.max(0, rivals[i].distAt(tick) - rivalDrag[i]);
  const run = state.run;
  run.lane = clampLane3(run.lane);
  run.roundIdx = roundIdx;
  run.roundComplete = false;
  run.integrity = tuning.maxIntegrity;
  run.maxIntegrity = tuning.maxIntegrity;
  run.onBeatCount = 0;
  run.totalSwitches = 0;
  run.gatesThisRound = 0;
  run.lap = 1;
  run.distance = 0;
  run.position = rivals.length + 1;
  run.channel = "lo";
  run.forkRoutes = 0;
  let tick = 0;
  let done = false;
  let outcome = null;
  let channel = "lo";
  let replaying = false;
  const pathLanes = [];
  const pathChan = [];
  function rowAt(t) {
    return table[race.rowIndex(t, table.length)];
  }
  function activeRow(t) {
    return resolveRow(rowAt(t), channel);
  }
  function inForkSpan(t) {
    const r = rowAt(t);
    return Boolean(r && r.fork);
  }
  function routeLocked(t) {
    const r = rowAt(t);
    return Boolean(r && r.fork && !r.forkEntry);
  }
  function setChannel(next) {
    if (done || routeLocked(tick)) return;
    const target = next === "hi" ? "hi" : "lo";
    if (target === channel) return;
    channel = target;
    run.channel = channel;
    paint();
  }
  function rivalView() {
    const view = rivals.map((r, i) => ({
      glyph: r.glyph,
      lane: r.laneAt(tick),
      ahead: Math.round(effDist(i) - race.distance)
    }));
    for (const g of [parGhost, replayGhost]) {
      if (!g) continue;
      view.push({ glyph: g.glyph, lane: g.laneAt(tick), ahead: Math.round(g.distAt(tick) - race.distance), ghost: true });
    }
    return view;
  }
  function resolveBumps() {
    let slow = 0;
    rivals.forEach((r, i) => {
      if (tick < bumpReady[i]) return;
      if (Math.round(effDist(i) - race.distance) !== 0) return;
      if (r.laneAt(tick) !== run.lane) return;
      run.integrity -= tuning.bumpDamage;
      bumpReady[i] = tick + BUMP_COOLDOWN;
      slow = tuning.bumpSlow;
    });
    return slow;
  }
  function empNearestRival() {
    let best = -1;
    let bestGap = Infinity;
    rivals.forEach((r, i) => {
      const gap = effDist(i) - race.distance;
      if (gap > 0 && gap < bestGap) {
        bestGap = gap;
        best = i;
      }
    });
    if (best >= 0) {
      rivalDrag[best] += POWERUPS.emp.drag;
      rivalLate[best] += POWERUPS.emp.finishTicks;
    }
  }
  function collectPowerup(type) {
    run.powerupsCollected = Number(run.powerupsCollected || 0) + 1;
    if (type === "shield") buffs.shieldUntil = tick + durationTicks("shield", tickMs);
    else if (type === "overclock") buffs.overclockUntil = tick + durationTicks("overclock", tickMs, tuning.overclockBonusMs);
    else if (type === "repair") run.integrity = Math.min(tuning.maxIntegrity, run.integrity + POWERUPS.repair.amount);
    else if (type === "cache") {
      const p = POWERUPS.cache.amount;
      state.packets = Number(state.packets || 0) + p;
      run.cachePackets = Number(run.cachePackets || 0) + p;
    } else if (type === "emp") empNearestRival();
  }
  function paint() {
    if (replaying) return;
    onPaint?.({
      table,
      tick,
      lane: run.lane,
      round,
      integrity: run.integrity,
      gates: run.gatesThisRound,
      suppressionActive,
      lookAhead: tuning.lookAhead,
      race,
      lap: race.lap(),
      laps: race.laps,
      progress: race.progress(),
      archetype: race.archetype,
      rivals: rivalView(),
      position: run.position,
      fieldSize: rivals.length + 1,
      channel,
      inFork: inForkSpan(tick),
      hasFork: Boolean(round.hasFork),
      beatOpen: Boolean(activeRow(tick)?.beatOpen)
      // drives the beat-pulse glow (matches the '*' marker)
    });
  }
  function damageFor(glyph) {
    const base = glyph === "▓" ? GLYPH_DAMAGE["▓"] : tuning.noiseDamage;
    return suppressionActive && glyph === "▓" ? base * 2 : base;
  }
  function setLane(next) {
    const target = clampLane3(next);
    if (done || target === run.lane) return;
    run.totalSwitches += 1;
    const row = rowAt(tick);
    if (row && row.beatOpen === false) run.integrity -= tuning.offBeatPenalty;
    else run.onBeatCount += 1;
    run.lane = target;
    paint();
  }
  function handleKey(key) {
    if (key === "ArrowLeft") setLane(run.lane - 1);
    else if (key === "ArrowRight") setLane(run.lane + 1);
    else if (key === "ArrowUp") setChannel("hi");
    else if (key === "ArrowDown") setChannel("lo");
  }
  function step() {
    if (done) return outcome;
    const row = activeRow(tick);
    if (rowAt(tick)?.forkEntry) run.forkRoutes += 1;
    if (row) {
      const glyph = row.lanes[run.lane];
      const shielded = row.counterPhaseLane === run.lane || tick < buffs.shieldUntil;
      if (isBlock(glyph) && !shielded) run.integrity -= damageFor(glyph);
      else if (isGate(glyph)) run.gatesThisRound += 1;
      else if (isPowerup(glyph)) collectPowerup(powerupType(glyph));
    }
    if (suppressionActive) run.integrity -= 1;
    const slow = resolveBumps();
    if (run.integrity <= 0) {
      run.integrity = 0;
      finish("fail");
      return outcome;
    }
    race.advance(Math.max(0, speedFor() - slow));
    pathLanes.push(run.lane);
    pathChan.push(channel === "hi" ? "h" : "l");
    recorder?.sample(run.lane, race.distance);
    run.distance = race.distance;
    run.lap = race.lap();
    run.position = 1 + rivals.filter((_, i) => effDist(i) > race.distance).length;
    tick += 1;
    if (race.finished() || tick >= maxTicks) {
      finish("clear");
      return outcome;
    }
    paint();
    return null;
  }
  function speedFor() {
    return tick < buffs.overclockUntil ? tuning.overclockSpeed : tuning.topSpeed;
  }
  function finish(result) {
    if (done) return;
    done = true;
    let res = result;
    let medal = null;
    let ghostRecording = null;
    if (isTimeTrial) {
      if (res === "clear" && (!race.finished() || tick > parGhost.finishTick)) res = "fail";
      if (res === "clear") {
        medal = medalFor(tick, parGhost.finishTick);
        ghostRecording = recorder.finalize(tick);
        run.medal = medal;
      }
    }
    outcome = res;
    run.roundComplete = res === "clear";
    let packets = 0;
    let position = run.position;
    if (res === "clear") {
      const effRivals = rivals.map((r, i) => ({ finishTick: r.finishTick + rivalLate[i] }));
      position = effRivals.length ? finishPosition(effRivals, tick) : 1;
      run.position = position;
      const onBeatPct = run.totalSwitches > 0 ? run.onBeatCount / run.totalSwitches : 1;
      const multiplier = positionMultiplier(position, rivals.length + 1) * tuning.packetMult;
      packets = calcRoundPackets({
        roundId: round.id,
        onBeatPct,
        integrityRemaining: run.integrity,
        gatesCollected: run.gatesThisRound,
        gateValue: tuning.gateValue,
        multiplier
      });
      state.packets = Number(state.packets || 0) + packets;
    }
    onEnd?.({
      result: res,
      round,
      roundIdx,
      integrity: run.integrity,
      packets,
      gates: run.gatesThisRound,
      position,
      fieldSize: rivals.length + 1,
      finishTick: tick,
      parTick: parGhost ? parGhost.finishTick : null,
      medal,
      ghostRecording
    });
  }
  function path() {
    return { roundIdx, tick, lanes: pathLanes.join(""), channels: pathChan.join("") };
  }
  const api = {
    round,
    table,
    isBoss: boss,
    suppressionActive,
    race,
    rivals,
    maxTicks,
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
    get channel() {
      return channel;
    },
    get lane() {
      return run.lane;
    },
    rawRowAt: rowAt,
    activeRowAt: activeRow,
    commitLane(l) {
      run.lane = clampLane3(l);
    },
    setReplaying(b) {
      replaying = Boolean(b);
    },
    handleKey,
    setChannel,
    step,
    paint,
    rivalView,
    path,
    autoSolve: (limit) => autoSolve(api, limit)
  };
  if (resume) replayResume(api, resume);
  return api;
}
function clampLane3(lane) {
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
    acc = Math.min(acc, 8 * getTickMs());
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
var CELL = {
  empty: " · ",
  "░": " ░ ",
  "▒": " ▒ ",
  "▓": " ▓ ",
  ">>": ">> ",
  // powerup pickups (placed by powerups.js into clear lanes)
  U: " U ",
  O: " O ",
  E: " E ",
  "+": " + ",
  $: " $ ",
  // time-trial ghosts (overlaid like rivals, drawn faint with parentheses)
  P: "(P)",
  G: "(G)"
};
function renderTrackGrid({ table, tick, lane, lookAhead = 8, wrap = false, rivals = [], channel = "lo" }) {
  const rows = [];
  const raw = (t) => {
    if (wrap && table.length) return table[(t % table.length + table.length) % table.length];
    return table[t];
  };
  const at = (t) => {
    const r = raw(t);
    if (!r || !r.fork) return r;
    return { ...r, lanes: (channel === "hi" ? r.forkHi : r.forkLo) || r.lanes };
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
  "a recording of your last clean lap rides beside you. beat the clock — and yourself.",
  "the channel forks again and again — commit HI for the gates, LO to stay alive, then merge.",
  "jammer signal collapses into silence. the channel is yours."
];
function roundLogLine(roundIdx) {
  return roundLogLines[Math.max(0, Math.min(roundLogLines.length - 1, Number(roundIdx) || 0))];
}
var roundIntros = [
  "this round: slide off the static — any clear lane survives.",
  "this round: switch on the beat gap, not against the burst.",
  "this round: read the looping pattern ahead and hold a clear line.",
  "this round: the ~ shield lane phases through noise — ride it.",
  "this round: grab >> boost gates on the beat for extra packets.",
  "this round: the channel splits — pick a route and hold it to the merge.",
  "this round: beat the par ghost (P) to the line — survival alone is not a clear.",
  "this round: forks come fast — commit ↑HI for gates or ↓LO to stay alive.",
  "this round: the jammer races every verb at once. only a calibrated counter-wave wins."
];
function roundIntro(roundIdx) {
  return roundIntros[Math.max(0, Math.min(roundIntros.length - 1, Number(roundIdx) || 0))];
}
var GLYPH_LEGEND = [
  ["░", "static (−2)"],
  ["▒", "pulse (−2, off-beat hurts)"],
  ["▓", "dense block (−5)"],
  [">>", "boost gate (+packets)"],
  ["~", "shield lane (phase through)"],
  ["o", "rival racer (bump = −integrity)"],
  ["U", "shield buff"],
  ["O", "overclock (speed burst)"],
  ["+", "repair (+12 hull)"],
  ["$", "packet cache (+15p)"],
  ["E", "EMP (set a rival back)"],
  ["P", "par ghost (the clock to beat)"],
  ["G", "your prior-best ghost"],
  ["↑↓", "commit HI / LO route at a fork"]
];

// ../../docs/games/metagame/stages/stage5/calibration.js
function isTransmissionHum(path) {
  const normalized = String(path || "").replace(/\\/g, "/");
  return normalized === TRANSMISSION_HUM_PATH || normalized.endsWith("/stage5/transmission_hum.mp3");
}
function calibrationProgressStr(state) {
  const calibration = state && state.calibration || {};
  if (calibration.calibrated) return "LOCKED-IN";
  const loopMs = Number(calibration.loopMs) || LOOP_DURATION_MS;
  const ms = Math.max(0, Math.min(loopMs, Number(calibration.continuousMs) || 0));
  const total = Math.max(1, Math.round(loopMs / 1e3));
  if (ms <= 0) return "uncalibrated";
  return `uncalibrated (${Math.floor(ms / 1e3)} / ${total}s)`;
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

// ../../docs/games/metagame/stages/stage5/renderer.js
import { createAscension } from "../../shared/ascension.js";
import { createRun } from "../../shared/run-state.js";

// ../../docs/games/metagame/stages/stage5/ascension-mods.js
var BASE_ASCENSION_CONFIG = {
  rivalSpeedMult: 1,
  // ×rival top speed (faster ghosts)
  integrityMult: 1,
  // ×starting hull cap (less room for mistakes)
  densityBonus: 0,
  // +obstacle density per lane (more hazards)
  noiseDamageBonus: 0
  // +static hit damage
};
var ASCENSION_MODS = [
  {
    level: 1,
    id: "fasterField",
    label: "A1 · Faster Field",
    desc: "The rival field runs noticeably quicker.",
    apply: (c) => {
      c.rivalSpeedMult *= 1.07;
      return c;
    }
  },
  {
    level: 2,
    id: "hairlineHull",
    label: "A2 · Hairline Hull",
    desc: "Less integrity to spend on mistakes (−15% hull).",
    apply: (c) => {
      c.integrityMult *= 0.85;
      return c;
    }
  },
  {
    level: 3,
    id: "denserNoise",
    label: "A3 · Denser Noise",
    desc: "More static crowds every lane.",
    apply: (c) => {
      c.densityBonus += 0.06;
      return c;
    }
  },
  {
    level: 4,
    id: "sharpStatic",
    label: "A4 · Sharp Static",
    desc: "Static bites harder (+1 damage per ░).",
    apply: (c) => {
      c.noiseDamageBonus += 1;
      return c;
    }
  }
];

// ../../docs/games/metagame/stages/stage5/panels.js
function shopButtonEls({ shop = {}, packets = 0, playing = false }) {
  return UPGRADES.map((u) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.buy = u.id;
    const level = levelOf(shop, u.id);
    const max = maxLevelOf(u.id);
    const maxed = isMaxed(shop, u.id);
    const cost = costOf(shop, u.id);
    btn.disabled = maxed || playing || Number(packets) < cost;
    btn.title = u.desc;
    btn.textContent = maxed ? `${u.label} ${level}/${max} ✓` : `${u.label} ${level}/${max} (${cost}p)`;
    return btn;
  });
}
function roundEstEl(low, high) {
  const span = document.createElement("span");
  span.className = "s5-round-est";
  span.textContent = ` ~${low}–${high}p`;
  return span;
}
function ascensionPanelEls({ ascension, defeated = false, playing = false, mods = [] }) {
  const unlocked = ascension.maxUnlocked();
  if (!defeated || unlocked <= 0 || ascension.maxLevel <= 0) return [];
  const head = document.createElement("div");
  head.className = "s5-asc-head";
  head.textContent = `ASCENSION (cleared A${ascension.maxCleared()})`;
  const sel = ascension.level();
  const buttons = [];
  for (let lvl = 0; lvl <= unlocked; lvl += 1) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.ascend = String(lvl);
    btn.disabled = playing;
    btn.textContent = `A${lvl}${sel === lvl ? " ✓" : ""}`;
    const mod = mods.find((m) => m.level === lvl);
    if (mod) btn.title = `${mod.label} — ${mod.desc}`;
    if (sel === lvl) btn.classList.add("s5-asc-active");
    buttons.push(btn);
  }
  return [head, ...buttons];
}

// ../../docs/games/metagame/stages/stage5/debug-hook.js
function installDebugHook(h) {
  window.__fvStage5 = {
    state: () => h.state,
    startRound: h.startRound,
    solveRound() {
      const loop = h.getLoop();
      if (loop && h.getMode() === "playing") return loop.autoSolve();
      return null;
    },
    solveRun() {
      for (let i = 0; i < h.bossIdx; i += 1) {
        h.startRound(i);
        const loop = h.getLoop();
        if (loop && h.getMode() === "playing") loop.autoSolve();
      }
      return Number(h.state.run.clearedRounds || 0);
    },
    calibrate() {
      const samples = Array.from({ length: 16 }, (_, i) => ({ atMs: i * 1e3, active: true, seeking: false }));
      runCalibrationTimeline({ state: h.state, actions: h.actions, achievements: h.achievements, bell: h.bell, file: TRANSMISSION_HUM_PATH, samples });
      h.persistAndPaint();
      return h.calibrated();
    },
    solveBoss() {
      h.startRound(h.bossIdx);
      const loop = h.getLoop();
      if (loop && h.getMode() === "playing") return loop.autoSolve();
      return null;
    },
    ascension: () => ({ ...h.ascension.state(), mods: h.ascensionMods() }),
    setAscension(n) {
      h.ascension.setLevel(n);
      h.persistAndPaint();
      return h.ascension.level();
    },
    raceCheckpoint: () => h.raceRun.restore()
  };
}

// ../../docs/games/metagame/stages/stage5/renderer.js
var BOSS_IDX = ROUNDS.length - 1;
function renderStage5(ctx) {
  const { host, state, actions, achievements, bell, bts, viewer, save, onStageComplete, orchestrator } = ctx;
  const ascension = createAscension({ save: orchestrator?.save || null, stageId: 5, modifiers: ASCENSION_MODS });
  const ascensionMods = () => ascension.applyModifiers(BASE_ASCENSION_CONFIG, ascension.level());
  const raceRun = createRun({ save: orchestrator?.save || null, stageId: 5, slot: "race", debounceMs: 400 });
  const root = document.createElement("section");
  root.className = "stage5-signal-racer";
  root.tabIndex = 0;
  root.innerHTML = `
    <header class="s5-hud">
      <strong>SIGNAL RACER</strong>
      <span>ROUND <span data-field="round"></span></span>
      <span data-field="raceBox">RACE <span data-field="race"></span></span>
      <span data-field="posBox">POS <span data-field="position"></span></span>
      <span>INTEGRITY <span data-field="integrity"></span></span>
      <span>PACKETS <span data-field="packets"></span></span>
      <span>CALIBRATION <span data-field="calib"></span></span>
    </header>
    <div class="s5-layout">
      <pre class="s5-track-grid" data-field="arena" aria-label="signal racer track"></pre>
      <aside class="s5-side">
        <div class="s5-rounds" data-field="rounds"></div>
        <div class="s5-shop" data-field="shop"></div>
        <div class="s5-ascension" data-field="ascension"></div>
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
      <button type="button" data-action="resume" hidden>resume race</button>
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
  function pendingResume() {
    const ck = raceRun.restore();
    if (!ck || typeof ck.lanes !== "string" || !ck.lanes.length) return null;
    if (ck.ascLevel !== ascension.level() || ck.seed !== state.calibration.seed) return null;
    const idx = Number(ck.roundIdx);
    if (!(idx >= 0) || idx > unlockedRounds() || isBossRound(idx)) return null;
    return { ...ck, roundIdx: idx };
  }
  function startRound(idx, opts = {}) {
    if (mode === "playing") return;
    const roundIdx = Math.max(0, Math.min(BOSS_IDX, Number(idx) || 0));
    if (roundIdx > unlockedRounds()) return;
    if (isBossRound(roundIdx) && state.run.clearedRounds < BOSS_IDX) return;
    const round = roundByIdx(roundIdx);
    const prevGhost = state.timeTrial?.[round.id] || null;
    pushLog3(roundIntro(roundIdx));
    loop = createGameLoop({
      state,
      seed: state.calibration.seed,
      roundIdx,
      calibrated: calibrated(),
      prevGhost,
      mods: ascensionMods(),
      resume: opts.resume || null,
      onPaint: paintArena,
      onEnd: handleEnd
    });
    mode = "playing";
    engine = createEngine({ onTick: () => loop.step(), getTickMs: () => loop.round.tickMs });
    engine.start();
    loop.paint();
    repaint();
  }
  function checkpointRace(view) {
    if (!loop || view.tick % 24 !== 0) return;
    raceRun.checkpoint({ ...loop.path(), ascLevel: ascension.level(), seed: state.calibration.seed });
  }
  function handleEnd({ result, round, roundIdx, packets, medal, finishTick, parTick, ghostRecording }) {
    engine?.stop();
    engine = null;
    mode = "result";
    raceRun.reset();
    if (result === "clear") {
      const medalNote = medal ? ` [${medal} · ${finishTick} vs par ${parTick}]` : "";
      pushLog3(roundLogLine(roundIdx) + (packets ? ` (+${packets} packets)` : "") + medalNote);
      if (ghostRecording) {
        const prev = state.timeTrial?.[round.id] || null;
        if (!prev || Number(ghostRecording.tick) < Number(prev.tick)) {
          state.timeTrial = { ...state.timeTrial || {}, [round.id]: ghostRecording };
        }
      }
      if (!isBossRound(roundIdx)) {
        state.run.clearedRounds = Math.max(Number(state.run.clearedRounds || 0), roundIdx + 1);
      } else {
        const r = raceTheJammer({ state, actions });
        if (r.defeated) {
          ascension.recordClear(ascension.level());
          completeOnce({ stage: 5, defeated: true, btsPath: BTS_PATH });
        }
      }
    } else if (round.id === FINAL_ROUND_ID) {
      pushLog3("the jammer held the throttle down. the counter-wave is not calibrated.");
    } else if (round.archetype === "time-trial") {
      pushLog3("the par ghost had the channel — run faster next time.");
    } else {
      pushLog3("signal integrity collapsed. recalibrate and run it again.");
    }
    persistAndPaint();
  }
  function paintArena(view) {
    checkpointRace(view);
    fields.arena.textContent = renderTrackGrid({
      table: view.table,
      tick: view.tick,
      lane: view.lane,
      lookAhead: view.lookAhead,
      wrap: view.archetype === "circuit",
      rivals: view.rivals || [],
      channel: view.channel || "lo"
    });
    fields.arena.classList.toggle("s5-beat-open", Boolean(view.beatOpen));
    fields.integrity.textContent = `${Math.round(view.integrity)}%`;
    const pct = Math.round((view.progress || 0) * 100);
    const fork = view.hasFork ? ` · ${view.channel === "hi" ? "HI" : "LO"}${view.inFork ? "◆" : ""}` : "";
    fields.race.textContent = view.archetype === "circuit" ? `${view.archetype} · lap ${view.lap}/${view.laps}${fork}` : `${view.archetype} · ${pct}%${fork}`;
    fields.position.textContent = view.fieldSize > 1 ? `${view.position}/${view.fieldSize}` : "—";
  }
  function repaint() {
    const lock = getBossLockState({ actions, state });
    const idx = Number(state.run.roundIdx || 0);
    const r = roundByIdx(idx);
    fields.round.textContent = `${r.id}/${FINAL_ROUND_ID} ${r.label}`;
    const playing = mode === "playing";
    fields.raceBox.hidden = !playing;
    fields.posBox.hidden = !playing;
    if (!playing) {
      fields.integrity.textContent = `${Math.round(state.run.integrity)}%`;
      fields.race.textContent = r.archetype || "sprint";
      fields.position.textContent = "—";
      fields.arena.classList.remove("s5-beat-open");
    }
    fields.packets.textContent = String(state.packets);
    fields.calib.textContent = lock.unlocked ? "LOCKED-IN" : calibrationProgressStr(state);
    fields.bossState.textContent = state.boss.defeated ? "defeated. BTS trace available." : `${lock.jammerSuppression} / ${lock.unlocked ? "beatable" : "suppression dominant"}`;
    fields.hint.textContent = lock.hint;
    renderRoundButtons();
    renderShop();
    renderAscension();
    root.querySelector('[data-action="bts"]').hidden = !state.boss.defeated;
    const resumeBtn = root.querySelector('[data-action="resume"]');
    const ck = mode === "playing" ? null : pendingResume();
    resumeBtn.hidden = !ck;
    if (ck) resumeBtn.textContent = `resume race (round ${roundByIdx(ck.roundIdx).id}, lap-saved)`;
    log.replaceChildren(...state.log.slice(-6).map((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      return li;
    }));
  }
  function renderRoundButtons() {
    const unlocked = unlockedRounds();
    const cleared = Number(state.run.clearedRounds || 0);
    const tuning = applyUpgrades(state.shop || {});
    fields.rounds.replaceChildren(...ROUNDS.map((round, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.startRound = String(i);
      const boss = isBossRound(i);
      const locked = boss ? cleared < BOSS_IDX : i > unlocked;
      btn.disabled = locked || mode === "playing";
      const { low, high } = estimateRoundPackets(round, tuning);
      btn.append(
        `${round.id}. ${round.label}${i < cleared ? " ✓" : ""}${locked ? " 🔒" : ""}`,
        roundEstEl(low, high)
      );
      if (boss) btn.classList.add("s5-boss-btn");
      return btn;
    }));
  }
  function renderShop() {
    fields.shop.replaceChildren(...shopButtonEls({ shop: state.shop || {}, packets: state.packets, playing: mode === "playing" }));
  }
  function renderAscension() {
    fields.ascension.replaceChildren(...ascensionPanelEls({
      ascension,
      defeated: state.boss.defeated,
      playing: mode === "playing",
      mods: ASCENSION_MODS
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
    const ascBtn = event.target.closest("button[data-ascend]");
    if (ascBtn) {
      ascension.setLevel(Number(ascBtn.dataset.ascend));
      persistAndPaint();
      return;
    }
    const action = event.target.closest("button[data-action]");
    if (!action) return;
    if (action.dataset.action === "resume") {
      const ck = pendingResume();
      if (ck) {
        startRound(ck.roundIdx, { resume: ck });
        return;
      }
    }
    if (action.dataset.action === "audio") {
      viewer?.openFile?.(TRANSMISSION_HUM_PATH, { mime: "audio/mpeg", source: "stage5" });
    }
    if (action.dataset.action === "bts") bts?.open?.(5);
    persistAndPaint();
  });
  const onKey = (event) => {
    if (mode !== "playing" || !loop) return;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      loop.handleKey(event.key);
    }
  };
  root.addEventListener("keydown", onKey);
  repaint();
  installDebugHook({
    state,
    startRound,
    getLoop: () => loop,
    getMode: () => mode,
    bossIdx: BOSS_IDX,
    actions,
    achievements,
    bell,
    persistAndPaint,
    calibrated,
    ascension,
    ascensionMods,
    raceRun
  });
  return {
    repaint,
    destroy() {
      engine?.stop();
      raceRun.destroy();
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
    // vehicle shop: per-part rank levels { [partId]: level }. Empty = a stock racer.
    shop: {},
    // time-trial: prior-best ghost transcripts keyed by round id { [id]: { tick, lanes, dist } }.
    timeTrial: {},
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
  target.timeTrial = target.timeTrial && typeof target.timeTrial === "object" ? target.timeTrial : {};
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
  let view = null;
  const unsubscribe = subscribeStage5Actions(ctx.actions, (detail) => {
    if (detail.action === ACTION_NAME) {
      state.calibration.calibrated = true;
    } else if (detail.action === PROGRESS_ACTION) {
      if (state.calibration.calibrated) return;
      state.calibration.continuousMs = Math.max(0, Number(detail.continuousMs) || 0);
    } else {
      return;
    }
    view?.repaint?.();
  });
  view = renderStage5({ ...ctx, state });
  return {
    repaint: view.repaint,
    destroy() {
      unsubscribe();
      view?.destroy?.();
    }
  };
}
function subscribeStage5Actions(actions, handler) {
  const matches = (detail) => Boolean(detail) && Number(detail.stage) === 5;
  if (actions && typeof actions.subscribeToActions === "function") {
    return actions.subscribeToActions((detail) => {
      if (matches(detail)) handler(detail);
    }) || (() => {
    });
  }
  const onEvent = (event) => {
    if (matches(event.detail)) handler(event.detail);
  };
  if (typeof window !== "undefined") {
    window.addEventListener("fv:games:action", onEvent);
    return () => window.removeEventListener("fv:games:action", onEvent);
  }
  return () => {
  };
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
  calibrationProgressStr,
  defaultState2 as defaultState,
  getBossLockState,
  hasCounterWave,
  mountStage,
  raceTheJammer,
  roundIntro,
  roundLogLine,
  runCalibrationTimeline,
  stageMeta
};
