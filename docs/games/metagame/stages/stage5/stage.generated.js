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
  "the jammer bleeds your integrity the whole race. a maxed rig can outrun it — barely.",
  "its suppression wave has a rhythm. the rhythm can be answered.",
  "transmission_hum.mp3 carries the counter-signal.",
  "play transmission_hum.mp3 continuously for one full 14-second loop to cancel the suppression entirely."
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
    // 2026-07-11 playtest fix: calibration is a buff (it cancels the suppression drain outright, see
    // game-loop.js), not a hard requirement — the boss race is always attemptable/winnable, just far
    // harder (near-maxed Hull + Engine, near-flawless play) without it.
    defeatPossible: true,
    hint: unlocked ? bellMessages.unlock : lockedHintLadder[hintIndex]
  };
}
function raceTheJammer({ state, actions }) {
  const lock = getBossLockState({ actions, state });
  state.boss.reached = true;
  state.boss.attempts = Number(state.boss.attempts || 0) + 1;
  if (!lock.unlocked) {
    state.boss.lockHintStep = Math.min(Number(state.boss.lockHintStep || 0) + 1, lockedHintLadder.length - 1);
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
  let safeLane = rng.int(0, LANES - 1);
  const table = [];
  for (let tick = 0; tick < count; tick += 1) {
    const beatOpen = burst ? burst[tick % burst.length] === 0 : true;
    const counterPhaseLane = shift > 0 ? Math.floor(tick / shift) % LANES : null;
    if (beatOpen && rng.chance(0.4)) {
      safeLane = Math.max(0, Math.min(LANES - 1, safeLane + rng.pick([-1, 1])));
    }
    const lanes = [null, null, null];
    for (let lane = 0; lane < LANES; lane += 1) {
      if (lane === safeLane) continue;
      if (rng.chance(density)) lanes[lane] = rng.pick(obstacleGlyphs);
    }
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
    desc: "Speed & overclock — faster top speed and stronger, longer bursts.",
    cost: 45,
    costScale: 1.45,
    maxLevel: 7,
    effect: (t, l) => {
      t.topSpeed = +(1 + 0.04 * l).toFixed(3);
      t.overclockSpeed = +(1.6 + 0.06 * l).toFixed(3);
      t.overclockBonusMs = 250 * l;
    }
  },
  {
    id: "hull",
    label: "Hull",
    desc: "Integrity & collisions — more hull, and hits/off-beat switches cost less.",
    cost: 50,
    costScale: 1.45,
    maxLevel: 7,
    effect: (t, l) => {
      t.maxIntegrity = 100 + 8 * l;
      t.offBeatPenalty = +Math.max(0, 1 - 0.13 * l).toFixed(3);
      t.bumpDamage = +Math.max(0, 1 - l / 7).toFixed(3);
      t.bumpSlow = +Math.max(0.1, 0.5 - 0.055 * l).toFixed(3);
    }
  },
  {
    id: "signal",
    label: "Signal",
    desc: "One clean signal curve — more packets, longer read, tougher against static.",
    cost: 48,
    costScale: 1.4,
    maxLevel: 8,
    effect: (t, l) => {
      t.gateValue = 5 + 2 * l;
      t.packetMult = +(1 + 0.05 * l).toFixed(3);
      t.lookAhead = 8 + Math.floor(l / 2);
      t.noiseDamage = +Math.max(0.5, 2 - 0.12 * l).toFixed(3);
    }
  }
];
var byId = new Map(UPGRADES.map((u) => [u.id, u]));
var LEGACY_GROUPS = {
  engine: ["engine", "cooling"],
  hull: ["chassis", "traction"],
  signal: ["navArray", "signalAmp", "noiseFilter"]
};
var LEGACY_ONLY = ["cooling", "chassis", "traction", "navArray", "signalAmp", "noiseFilter"];
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
function migrateShop(shop) {
  if (!shop || typeof shop !== "object") return {};
  const lv = (k) => Math.max(0, Math.floor(Number(shop[k]) || 0));
  const hasLegacy = LEGACY_ONLY.some((k) => Object.prototype.hasOwnProperty.call(shop, k));
  const out = {};
  for (const id of ["engine", "hull", "signal"]) {
    const raw = hasLegacy ? LEGACY_GROUPS[id].reduce((s, k) => s + lv(k), 0) : lv(id);
    const clamped = Math.min(maxLevelOf(id), raw);
    if (clamped > 0) out[id] = clamped;
  }
  return out;
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
    // Playtest fix (2026-07-11, "visuals/pacing not usable, best margin needed"): this range used to
    // be 0.90-1.18 — up to 18% FASTER than the player's own base 1.0, contradicting this module's own
    // documented intent above ("sub-1 = slower than the player's base"). A fresh (zero-Engine-upgrade)
    // player racing a rival rolled near the top of that range had no guaranteed pace advantage at all.
    // Capped below 1.0 with a real, checked-in margin (see tests/rival-pacing.test.mjs): even the
    // WORST-case roll (0.96) still leaves a fresh player's base pace (1.0) ahead by ~4%, growing with
    // any Engine investment (shop.js tops out at topSpeed 1.28).
    topSpeed: 0.82 + rng.float() * 0.14,
    // 0.82–0.96 (always below the player's base 1.0)
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
function buildLanes(rng, density, glyphs, beatOpen, withGates, safeLane) {
  const lanes = [null, null, null];
  for (let l = 0; l < LANES2; l += 1) {
    if (l === safeLane) continue;
    if (rng.chance(density)) lanes[l] = rng.pick(glyphs);
  }
  if (withGates && beatOpen && rng.chance(0.5)) {
    const open = [0, 1, 2].filter((l) => lanes[l] === null);
    if (open.length) lanes[rng.pick(open)] = ">>";
  }
  return lanes;
}
function driftSafe(rng, safeLane, beatOpen) {
  if (!beatOpen || !rng.chance(0.4)) return safeLane;
  return Math.max(0, Math.min(LANES2 - 1, safeLane + rng.pick([-1, 1])));
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
    let safeHi = 1;
    let safeLo = 1;
    for (let i = 0; i < span; i += 1) {
      const t = start + i;
      const row = table[t];
      if (!row) continue;
      const beatOpen = row.beatOpen !== false;
      const entryClear = i === 0;
      if (!entryClear) {
        safeHi = driftSafe(rng, safeHi, beatOpen);
        safeLo = driftSafe(rng, safeLo, beatOpen);
      }
      const forkHi = entryClear ? [null, null, null] : buildLanes(rng, HI_DENSITY, hiGlyphs, beatOpen, true, safeHi);
      const forkLo = entryClear ? [null, null, null] : buildLanes(rng, LO_DENSITY, loGlyphs, beatOpen, false, safeLo);
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
var SUPPRESSION_DRAIN_INTERVAL = 6;
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
      beatOpen: Boolean(activeRow(tick)?.beatOpen),
      // drives the beat-pulse glow (matches the '*' marker)
      packets: Number(state.packets || 0),
      // for race-fx: a $ cache pickup pops a float
      powerups: Number(run.powerupsCollected || 0)
      // for race-fx: a buff/repair pickup pops a float
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
    if (suppressionActive && tick % SUPPRESSION_DRAIN_INTERVAL === 0) run.integrity -= 1;
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
import { createFrameLoop } from "../../shared/frame-loop.js";
function createEngine({ onTick, onRender, getTickMs }) {
  let last = null;
  let acc = 0;
  let tick = 0;
  const loop = createFrameLoop({
    onFrame(ts) {
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
        if (!loop.running) return;
      }
      if (onRender) onRender(Math.max(0, Math.min(1, acc / getTickMs())));
    }
  });
  return {
    start() {
      if (loop.running) return;
      last = null;
      acc = 0;
      loop.start();
    },
    stop() {
      loop.stop();
    },
    get running() {
      return loop.running;
    }
  };
}

// ../../docs/games/metagame/stages/stage5/road.js
var SEGMENT_LENGTH = 200;
var ROAD_WIDTH = 2e3;
var CAMERA_HEIGHT = 1e3;
var FOV = 100;
var CAMERA_DEPTH = 1 / Math.tan(FOV / 2 * Math.PI / 180);
var DRAW_DISTANCE = 120;
var RUMBLE_LENGTH = 3;
var ROAD_SEGMENTS = 480;
var LANE_OFFSETS = [-2 / 3, 0, 2 / 3];
var SEG_PER_ROW = 3;
var ROW_SPACING_Z = SEG_PER_ROW * SEGMENT_LENGTH;
function easeInOut(a, b, p) {
  return a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5);
}
function makePoint(z) {
  return {
    world: { x: 0, y: 0, z },
    camera: { x: 0, y: 0, z: 0 },
    screen: { x: 0, y: 0, w: 0, scale: 0 }
  };
}
function buildCurves(seed) {
  const rng = makeRng(`${seed}:road`);
  const CURVES = [2, -2, 3, -3, 4, -4, 5, -5];
  const out = [];
  const addTween = (len, from, to) => {
    for (let i = 0; i < len; i += 1) out.push(easeInOut(from, to, i / len));
  };
  const TAIL = 24;
  addTween(24, 0, 0);
  while (out.length < ROAD_SEGMENTS - TAIL) {
    const c = rng.pick(CURVES);
    const enter = rng.int(16, 40);
    const hold = rng.int(20, 60);
    const leave = rng.int(16, 40);
    addTween(enter, 0, c);
    for (let i = 0; i < hold; i += 1) out.push(c);
    addTween(leave, c, 0);
  }
  const curves = out.slice(0, ROAD_SEGMENTS);
  for (let i = ROAD_SEGMENTS - TAIL; i < ROAD_SEGMENTS; i += 1) curves[i] = 0;
  return curves;
}
function buildRoad(seed) {
  const curves = buildCurves(seed);
  const n = curves.length;
  const segments = [];
  for (let i = 0; i < n; i += 1) {
    segments.push({
      index: i,
      curve: curves[i],
      dark: Math.floor(i / RUMBLE_LENGTH) % 2 === 1,
      // alternating rumble/road shade band
      looped: false,
      p1: makePoint(i * SEGMENT_LENGTH),
      p2: makePoint((i + 1) * SEGMENT_LENGTH)
    });
  }
  const length = n * SEGMENT_LENGTH;
  function findSegment(z) {
    const i = Math.floor(z / SEGMENT_LENGTH);
    return segments[(i % n + n) % n];
  }
  return { segments, length, findSegment };
}
function project(p, cameraX, cameraY, cameraZ, width, height) {
  p.camera.x = (p.world.x || 0) - cameraX;
  p.camera.y = (p.world.y || 0) - cameraY;
  p.camera.z = (p.world.z || 0) - cameraZ;
  p.screen.scale = CAMERA_DEPTH / p.camera.z;
  p.screen.x = Math.round(width / 2 + p.screen.scale * p.camera.x * width / 2);
  p.screen.y = Math.round(height / 2 - p.screen.scale * p.camera.y * height / 2);
  p.screen.w = Math.round(p.screen.scale * ROAD_WIDTH * width / 2);
  return p;
}
function fog(distanceRatio, density) {
  return 1 / Math.exp(Math.pow(distanceRatio, 2) * density);
}

// ../../docs/games/metagame/stages/stage5/draw-road.js
var LANES3 = 3;
function polygon(ctx, x1, y1, x2, y2, x3, y3, x4, y4, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.lineTo(x4, y4);
  ctx.closePath();
  ctx.fill();
}
function drawSky(ctx, width, horizonY, bgOffset, palette) {
  const grad = ctx.createLinearGradient(0, 0, 0, horizonY);
  grad.addColorStop(0, palette.skyTop);
  grad.addColorStop(1, palette.skyBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, horizonY);
  drawRidge(ctx, width, horizonY, bgOffset * 0.12, 0.01, horizonY * 0.32, palette.ridgeFar);
  drawRidge(ctx, width, horizonY, bgOffset * 0.28, 0.016, horizonY * 0.2, palette.ridgeNear);
}
function drawRidge(ctx, width, horizonY, offset, freq, amp, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  for (let sx = 0; sx <= width; sx += 8) {
    const phase = (sx + offset) * freq;
    const y = horizonY - amp * (0.55 + 0.45 * Math.sin(phase) * Math.sin(phase * 0.37 + 1.3));
    ctx.lineTo(sx, y);
  }
  ctx.lineTo(width, horizonY);
  ctx.closePath();
  ctx.fill();
}
function renderRoad(ctx, road, position, width, height, palette) {
  const segments = road.segments;
  const n = segments.length;
  const baseSegment = road.findSegment(position);
  const basePercent = position % SEGMENT_LENGTH / SEGMENT_LENGTH;
  let dx = -(baseSegment.curve * basePercent);
  let x = 0;
  let maxy = height;
  const projected = new Array(DRAW_DISTANCE);
  for (let i = 0; i < DRAW_DISTANCE; i += 1) {
    const seg = segments[(baseSegment.index + i) % n];
    seg.looped = seg.index < baseSegment.index;
    const camZ = position - (seg.looped ? road.length : 0);
    project(seg.p1, -x, CAMERA_HEIGHT, camZ, width, height);
    project(seg.p2, -x - dx, CAMERA_HEIGHT, camZ, width, height);
    x += dx;
    dx += seg.curve;
    projected[i] = seg;
    if (seg.p1.camera.z <= CAMERA_DEPTH || seg.p2.screen.y >= maxy) continue;
    drawSegment(ctx, seg, width, fog(i / DRAW_DISTANCE, palette.fogDensity), palette);
    maxy = seg.p2.screen.y;
  }
  return projected;
}
function rumbleWidth(w) {
  return w / Math.max(6, 2 * LANES3);
}
function laneMarkerWidth(w) {
  return w / Math.max(32, 8 * LANES3);
}
function drawSegment(ctx, seg, width, fogFactor, palette) {
  const s1 = seg.p1.screen;
  const s2 = seg.p2.screen;
  const dark = seg.dark;
  const grass = dark ? palette.grassDark : palette.grassLight;
  const rumble = dark ? palette.rumbleDark : palette.rumbleLight;
  const road = dark ? palette.roadDark : palette.roadLight;
  const r1 = rumbleWidth(s1.w);
  const r2 = rumbleWidth(s2.w);
  ctx.fillStyle = grass;
  ctx.fillRect(0, s2.y, width, s1.y - s2.y);
  polygon(ctx, s1.x - s1.w - r1, s1.y, s1.x - s1.w, s1.y, s2.x - s2.w, s2.y, s2.x - s2.w - r2, s2.y, rumble);
  polygon(ctx, s1.x + s1.w + r1, s1.y, s1.x + s1.w, s1.y, s2.x + s2.w, s2.y, s2.x + s2.w + r2, s2.y, rumble);
  polygon(ctx, s1.x - s1.w, s1.y, s1.x + s1.w, s1.y, s2.x + s2.w, s2.y, s2.x - s2.w, s2.y, road);
  if (!dark) {
    const l1 = laneMarkerWidth(s1.w);
    const l2 = laneMarkerWidth(s2.w);
    const lw1 = s1.w * 2 / LANES3;
    const lw2 = s2.w * 2 / LANES3;
    let lx1 = s1.x - s1.w + lw1;
    let lx2 = s2.x - s2.w + lw2;
    for (let lane = 1; lane < LANES3; lane += 1, lx1 += lw1, lx2 += lw2) {
      polygon(ctx, lx1 - l1 / 2, s1.y, lx1 + l1 / 2, s1.y, lx2 + l2 / 2, s2.y, lx2 - l2 / 2, s2.y, palette.lane);
    }
  }
  if (fogFactor < 1) {
    ctx.globalAlpha = 1 - fogFactor;
    ctx.fillStyle = palette.fog;
    ctx.fillRect(0, s2.y, width, s1.y - s2.y);
    ctx.globalAlpha = 1;
  }
}

// ../../docs/games/metagame/stages/stage5/draw-sprites.js
var TAU = Math.PI * 2;
function carShape(ctx, cx, baseY, w, body, glass, lean = 0) {
  const h = w * 0.82;
  const top = baseY - h;
  const sk = lean * w * 0.18;
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(cx, baseY, w * 0.5, w * 0.13, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#0b0713";
  ctx.fillRect(cx - w * 0.5, baseY - h * 0.46, w * 0.15, h * 0.46);
  ctx.fillRect(cx + w * 0.35, baseY - h * 0.46, w * 0.15, h * 0.46);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.42, baseY);
  ctx.lineTo(cx + w * 0.42, baseY);
  ctx.lineTo(cx + w * 0.3 + sk, top);
  ctx.lineTo(cx - w * 0.3 + sk, top);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = glass;
  ctx.fillRect(cx - w * 0.18 + sk, top + h * 0.16, w * 0.36, h * 0.26);
  ctx.fillStyle = glass;
  ctx.fillRect(cx - w * 0.3, baseY - h * 0.14, w * 0.6, h * 0.07);
}
function drawPlayerCar(ctx, cx, baseY, w, palette, lean = 0) {
  carShape(ctx, cx, baseY, w, palette.playerBody, palette.playerGlass, lean);
}
function drawRivalCar(ctx, cx, baseY, w, palette) {
  carShape(ctx, cx, baseY, w, palette.rivalBody, palette.rivalGlass, 0);
}
function drawGhostCar(ctx, cx, baseY, w, palette) {
  ctx.globalAlpha = 0.35;
  carShape(ctx, cx, baseY, w, palette.ghost, palette.ghost, 0);
  ctx.globalAlpha = 1;
}
var BLOCK_COLOR = { "░": "blockStatic", "▒": "blockPulse", "▓": "blockDense" };
function drawBlock(ctx, cx, baseY, w, glyph, palette) {
  const heavy = glyph === "▓";
  const h = w * (heavy ? 1.05 : 0.85);
  const top = baseY - h;
  const color = palette[BLOCK_COLOR[glyph] || "blockStatic"];
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(cx, baseY, w * 0.45, w * 0.12, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillRect(cx - w * 0.4, top, w * 0.8, h);
  ctx.fillStyle = "rgba(255,255,255,0.20)";
  ctx.fillRect(cx - w * 0.4, top, w * 0.8, h * 0.14);
  if (heavy) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(cx - w * 0.16, top + h * 0.3, w * 0.32, h * 0.4);
  }
}
function drawGate(ctx, cx, baseY, w, palette) {
  const h = w * 1.15;
  const top = baseY - h;
  const pw = w * 0.15;
  ctx.fillStyle = palette.gatePost;
  ctx.fillRect(cx - w * 0.58, top, pw, h);
  ctx.fillRect(cx + w * 0.58 - pw, top, pw, h);
  ctx.fillStyle = palette.gateBanner;
  ctx.fillRect(cx - w * 0.58, top, w * 1.16, h * 0.22);
  ctx.fillStyle = "rgba(9,5,18,0.75)";
  ctx.fillRect(cx - w * 0.1, top + h * 0.05, w * 0.2, h * 0.06);
}
var PICKUP_COLOR = {
  shield: "pickupBuff",
  overclock: "pickupBuff",
  emp: "pickupBuff",
  repair: "pickupRepair",
  cache: "pickupCache"
};
function drawPickup(ctx, cx, baseY, w, ptype, palette) {
  const s = w * 0.42;
  const cy = baseY - w * 0.62;
  ctx.fillStyle = palette[PICKUP_COLOR[ptype] || "pickupBuff"];
  ctx.beginPath();
  ctx.moveTo(cx, cy - s);
  ctx.lineTo(cx + s, cy);
  ctx.lineTo(cx, cy + s);
  ctx.lineTo(cx - s, cy);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(9,5,18,0.55)";
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.4, 0, TAU);
  ctx.fill();
}
function drawEntitySprite(ctx, entity, cx, baseY, w, palette) {
  switch (entity.kind) {
    case "block":
      return drawBlock(ctx, cx, baseY, w, entity.glyph, palette);
    case "gate":
      return drawGate(ctx, cx, baseY, w, palette);
    case "pickup":
      return drawPickup(ctx, cx, baseY, w, entity.ptype, palette);
    case "rival":
      return drawRivalCar(ctx, cx, baseY, w, palette);
    case "ghost":
      return drawGhostCar(ctx, cx, baseY, w, palette);
    default:
      return void 0;
  }
}

// ../../docs/games/metagame/stages/stage5/road-entities.js
function laneToOffset(lane) {
  return LANE_OFFSETS[Math.max(0, Math.min(2, Number(lane) || 0))];
}
function classifyGlyph(glyph) {
  if (glyph == null) return null;
  if (isGate(glyph)) return { kind: "gate" };
  if (isBlock(glyph)) return { kind: "block", glyph };
  if (isPowerup(glyph)) return { kind: "pickup", ptype: powerupType(glyph) };
  return null;
}
function rowReader(view) {
  const table = view.table || [];
  const len = table.length;
  const wrap = view.archetype === "circuit";
  const channel = view.channel || "lo";
  return (t) => {
    let r;
    if (wrap && len) r = table[(t % len + len) % len];
    else r = table[t];
    return resolveRow(r, channel);
  };
}
function collectTrackEntities(view) {
  const lookAhead = Math.max(1, Number(view.lookAhead) || 8);
  const at = rowReader(view);
  const tick = Number(view.tick) || 0;
  const out = [];
  for (let ahead = 0; ahead < lookAhead; ahead += 1) {
    const row = at(tick + ahead);
    if (!row) continue;
    for (let lane = 0; lane < 3; lane += 1) {
      const info = classifyGlyph(row.lanes[lane]);
      if (info) out.push({ ...info, ahead, lane });
    }
  }
  return out;
}

// ../../docs/games/metagame/stages/stage5/canvas-race.js
var CAMERA_LAG = 1.2;
var MIN_SPRITE_W = 2;
var KIND_W = { block: 0.55, gate: 0.62, pickup: 0.42, rival: 0.5, ghost: 0.5 };
var PLAYER_W_CAP = 0.16;
var ENTITY_W_CAP = 0.22;
var PALETTE = {
  skyTop: "#0a0612",
  skyBottom: "#1a1030",
  ridgeFar: "#160c2a",
  ridgeNear: "#20143f",
  grassDark: "#0f0720",
  grassLight: "#140a2a",
  roadDark: "#1a1030",
  roadLight: "#241748",
  rumbleDark: "#7a2090",
  rumbleLight: "#a340c0",
  lane: "#5dcaa5",
  fog: "#0d0815",
  fogDensity: 5,
  playerBody: "#5dcaa5",
  playerGlass: "#eafff7",
  rivalBody: "#ef9f27",
  rivalGlass: "#ffe6b0",
  ghost: "#7b7ba6",
  blockStatic: "#ff8a5b",
  blockPulse: "#ff5d7e",
  blockDense: "#ff2f2f",
  gatePost: "#57e0ff",
  gateBanner: "#d4537e",
  pickupBuff: "#b98cff",
  pickupRepair: "#5fe08a",
  pickupCache: "#ffd24d"
};
var lerp = (a, b, f) => a + (b - a) * f;
function createCanvasRace(seed) {
  const canvas = document.createElement("canvas");
  canvas.className = "s5-track-canvas";
  canvas.setAttribute("aria-label", "signal racer track");
  const ctx = canvas.getContext("2d");
  let road = buildRoad(seed);
  let w = 0;
  let h = 0;
  let redraw = null;
  function measure() {
    const rect = canvas.getBoundingClientRect();
    const cssW = Math.max(1, Math.round(rect.width));
    const cssH = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(2, typeof window !== "undefined" && window.devicePixelRatio || 1);
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    w = cssW;
    h = cssH;
  }
  function onResize() {
    measure();
    if (redraw) redraw();
  }
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null;
  ro?.observe(canvas);
  function anchorAt(projected, segIndex) {
    const i = Math.floor(segIndex);
    if (i < 1 || i >= projected.length - 1) return null;
    const a = projected[i];
    if (a.p1.camera.z <= CAMERA_DEPTH) return null;
    const b = projected[i + 1];
    const f = segIndex - i;
    const s = a.p1.screen;
    const t = b.p1.screen;
    return { x: lerp(s.x, t.x, f), y: lerp(s.y, t.y, f), w: lerp(s.w, t.w, f) };
  }
  function bendAt(position) {
    const base = road.findSegment(position);
    const n = road.segments.length;
    let bend = 0;
    for (let i = 0; i < 40; i += 1) bend += road.segments[(base.index + i) % n].curve;
    return bend;
  }
  function rivalEntities(prevView, curView, alpha) {
    const prevR = prevView && prevView.rivals || [];
    const curR = curView && curView.rivals || [];
    const out = [];
    for (let i = 0; i < Math.max(prevR.length, curR.length); i += 1) {
      const p = prevR[i];
      const c = curR[i];
      const src = c || p;
      if (!src) continue;
      const aheadI = p && c ? lerp(p.ahead, c.ahead, alpha) : src.ahead;
      const oP = laneToOffset((p || src).lane);
      const oC = laneToOffset((c || src).lane);
      out.push({
        kind: src.ghost ? "ghost" : "rival",
        glyph: src.glyph,
        seg: (aheadI + CAMERA_LAG) * SEG_PER_ROW,
        offset: lerp(oP, oC, alpha)
      });
    }
    return out;
  }
  function drawScene({ baseTick, alpha, obsView, prevView, curView, playerOffset, suppressed }) {
    if (!w || !h) measure();
    if (!w || !h) return;
    const rawPos = (baseTick + alpha - CAMERA_LAG) * ROW_SPACING_Z;
    const position = (rawPos % road.length + road.length) % road.length;
    const bend = bendAt(position);
    ctx.clearRect(0, 0, w, h);
    drawSky(ctx, w, Math.round(h / 2), position * 0.2 + bend * 6, PALETTE);
    const projected = renderRoad(ctx, road, position, w, h, PALETTE);
    const entities = collectTrackEntities(obsView).map((e) => ({
      ...e,
      seg: (e.ahead - alpha + CAMERA_LAG) * SEG_PER_ROW,
      offset: laneToOffset(e.lane)
    }));
    entities.push(...rivalEntities(prevView, curView, alpha));
    entities.sort((p, q) => q.seg - p.seg);
    for (const e of entities) {
      const anchor = anchorAt(projected, e.seg);
      if (!anchor || anchor.w < MIN_SPRITE_W) continue;
      const ew = Math.min(anchor.w * (KIND_W[e.kind] || 0.5), w * ENTITY_W_CAP);
      drawEntitySprite(ctx, e, anchor.x + e.offset * anchor.w, anchor.y, ew, PALETTE);
    }
    const pa = anchorAt(projected, CAMERA_LAG * SEG_PER_ROW);
    if (pa) {
      const lean = Math.max(-1, Math.min(1, bend * 0.02 + playerOffset * 0.25));
      const py = Math.min(pa.y, h - 8);
      drawPlayerCar(ctx, pa.x + playerOffset * pa.w, py, Math.min(pa.w * 0.5, w * PLAYER_W_CAP), PALETTE, lean);
    }
    if (suppressed) drawSuppression(ctx, w, h);
  }
  return {
    el: canvas,
    setSeed(s) {
      road = buildRoad(s);
    },
    resize: measure,
    // Draw one interpolated race frame. prevView/curView are consecutive tick snapshots; alpha ∈ [0,1).
    renderFrame(prevView, curView, alpha) {
      const cur = curView || prevView;
      if (!cur) return;
      redraw = null;
      const prev = prevView || cur;
      const a = prevView ? Math.max(0, Math.min(1, alpha)) : 0;
      drawScene({
        baseTick: Number(prev.tick) || 0,
        alpha: a,
        obsView: prev,
        prevView: prev,
        curView: cur,
        playerOffset: lerp(laneToOffset(prev.lane), laneToOffset(cur.lane), a),
        suppressed: Boolean(cur.suppressionActive)
      });
    },
    // A single static frame of the empty road for the attract / select screen (replayed on resize).
    drawAttract(lane = 1) {
      redraw = () => drawScene({
        baseTick: 0,
        alpha: 0,
        obsView: { table: [], tick: 0, lookAhead: 0 },
        prevView: { rivals: [] },
        curView: { rivals: [] },
        playerOffset: laneToOffset(lane),
        suppressed: false
      });
      redraw();
    },
    destroy() {
      ro?.disconnect();
    }
  };
}
function drawSuppression(ctx, w, h) {
  ctx.save();
  const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
  grad.addColorStop(0, "rgba(239,159,39,0)");
  grad.addColorStop(1, "rgba(239,159,39,0.32)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
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
  "this round: the jammer races every verb at once, and bleeds your integrity the whole way — a calibrated counter-wave cancels that outright; a maxed rig can outrun it uncalibrated, but barely."
];
function roundIntro(roundIdx) {
  return roundIntros[Math.max(0, Math.min(roundIntros.length - 1, Number(roundIdx) || 0))];
}

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
  const solve = (fn) => h.solve ? h.solve(fn) : fn();
  window.__fvStage5 = {
    state: () => h.state,
    startRound: h.startRound,
    solveRound() {
      const loop = h.getLoop();
      if (loop && h.getMode() === "playing") return solve(() => loop.autoSolve());
      return null;
    },
    solveRun() {
      for (let i = 0; i < h.bossIdx; i += 1) {
        h.startRound(i);
        const loop = h.getLoop();
        if (loop && h.getMode() === "playing") solve(() => loop.autoSolve());
      }
      h.dismissResult?.();
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
      if (loop && h.getMode() === "playing") return solve(() => loop.autoSolve());
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

// ../../docs/games/metagame/stages/stage5/s5dev.js
var BOSS_IDX = ROUND_COUNT - 1;
function devGivePackets(state, amount = 200) {
  state.packets = Number(state.packets || 0) + amount;
}
function devRepair(state) {
  state.run.integrity = 100;
}
function devClearAllRounds(state, bossIdx = BOSS_IDX) {
  state.run.clearedRounds = bossIdx;
}
function devInstantCalibrate(state, actions) {
  const loopMs = Number(state.calibration?.loopMs) || 14e3;
  state.calibration.calibrated = true;
  state.calibration.continuousMs = loopMs;
  actions?.setAction?.(5, ACTION_NAME, {
    source: "dev-cheat",
    file: "transmission_hum.mp3",
    durationMs: loopMs,
    loopCompleted: true
  });
}
function applyDev(id, state, actions) {
  if (id === "calibrate") {
    devInstantCalibrate(state, actions);
    return true;
  }
  if (id === "clear-runs") {
    devClearAllRounds(state);
    return true;
  }
  if (id === "packets") {
    devGivePackets(state);
    return true;
  }
  if (id === "repair") {
    devRepair(state);
    return true;
  }
  return false;
}

// ../../docs/games/metagame/stages/stage5/steer.js
import { createTouchControls } from "../../touch-controls.js";
var STEER_DPAD = {
  up: { id: "ArrowUp", label: "HI", ariaLabel: "fork high" },
  down: { id: "ArrowDown", label: "LO", ariaLabel: "fork low" },
  left: { id: "ArrowLeft", label: "◀", ariaLabel: "lane left" },
  right: { id: "ArrowRight", label: "▶", ariaLabel: "lane right" }
};
function steerAction({ getMode, getLoop }, key) {
  if (getMode() !== "playing") return;
  getLoop()?.handleKey(key);
}
function createSteer(deps) {
  const controls = createTouchControls({
    className: "s5-steer",
    ariaLabel: "steering",
    dpad: STEER_DPAD,
    onAction: (key) => steerAction(deps, key)
  });
  controls.el.hidden = true;
  return controls;
}

// ../../docs/games/metagame/stages/stage5/disclosure.js
function disclosure(state) {
  const cleared = Math.max(0, Number(state?.run?.clearedRounds || 0));
  const defeated = Boolean(state?.boss?.defeated);
  return {
    cleared,
    attract: cleared === 0 && !defeated,
    // fresh: just the road + START ROUND 1
    showRoundList: cleared >= 1 || defeated,
    // the full round grid arrives after round 1
    showEstimates: cleared >= 1 || defeated,
    // per-round packet bands after the first clear
    bossFull: cleared >= 6 || defeated,
    // JAMMER panel (R6) — a locked chip before that
    showCalibration: cleared >= 6 || defeated,
    // the calibration HUD chip rides with the boss reveal
    showAscension: defeated
    // opt-in replay depth only once beaten
  };
}

// ../../docs/games/metagame/stages/stage5/pitstop.js
var STAT_IDS = UPGRADES.map((u) => u.id);
function pitStopOffer({ seed, roundIdx, shop = {} }) {
  const avail = STAT_IDS.filter((id) => !isMaxed(shop, id));
  if (avail.length <= 2) return avail;
  const rng = makeRng(`${String(seed)}:pit:${Number(roundIdx) || 0}`);
  return rng.shuffle(avail).slice(0, 2);
}

// ../../docs/games/metagame/stages/stage5/overlay.js
var STAT = new Map(UPGRADES.map((u) => [u.id, u]));
function priceSpan(cost) {
  const s = document.createElement("span");
  s.className = "s5-pit-price";
  s.textContent = Number.isFinite(cost) ? ` ${cost}p` : " —";
  return s;
}
function buildResultOverlay({ summary, offers = [], shop = {}, packets = 0, canRetry = false, resolvedNote = "" }) {
  const card = document.createElement("div");
  card.className = "s5-overlay-card";
  const head = document.createElement("div");
  head.className = "s5-overlay-head";
  head.textContent = summary.title;
  const sub = document.createElement("div");
  sub.className = "s5-overlay-sub";
  sub.textContent = summary.detail || "";
  card.append(head, sub);
  if (offers.length) {
    const pit = document.createElement("div");
    pit.className = "s5-pit";
    const ph = document.createElement("div");
    ph.className = "s5-pit-head";
    ph.textContent = `PIT STOP — pick 1 (${packets}p)`;
    pit.append(ph);
    const row = document.createElement("div");
    row.className = "s5-pit-offers";
    for (const id of offers) {
      const def = STAT.get(id);
      if (!def) continue;
      const cost = costOf(shop, id);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.pit = id;
      btn.className = "s5-pit-btn";
      btn.title = def.desc;
      btn.disabled = isMaxed(shop, id) || Number(packets) < cost;
      btn.append(`${def.label} ${levelOf(shop, id)}→${levelOf(shop, id) + 1}/${maxLevelOf(id)}`, priceSpan(cost));
      row.append(btn);
    }
    pit.append(row);
    const skip = document.createElement("button");
    skip.type = "button";
    skip.className = "s5-pit-skip";
    skip.dataset.pitSkip = "1";
    skip.textContent = "skip pit";
    pit.append(skip);
    card.append(pit);
  } else if (resolvedNote) {
    const note = document.createElement("div");
    note.className = "s5-pit-note";
    note.textContent = resolvedNote;
    card.append(note);
  }
  const actions = document.createElement("div");
  actions.className = "s5-overlay-actions";
  const cont = document.createElement("button");
  cont.type = "button";
  cont.dataset.overlay = "continue";
  cont.className = "s5-overlay-continue";
  cont.textContent = summary.continueLabel || "continue";
  actions.append(cont);
  if (canRetry) {
    const retry = document.createElement("button");
    retry.type = "button";
    retry.dataset.overlay = "retry";
    retry.textContent = "retry";
    actions.append(retry);
  }
  card.append(actions);
  return card;
}

// ../../docs/games/metagame/stages/stage5/race-fx.js
import { floatNum } from "../../shared/feedback.js";
function createRaceFx({ trackCol }) {
  let prev = null;
  return {
    reset() {
      prev = null;
    },
    onPaint(view) {
      if (!view) return;
      if (prev) {
        if ((view.gates || 0) > (prev.gates || 0)) floatNum(trackCol, "»", "good");
        if ((view.packets || 0) > (prev.packets || 0)) floatNum(trackCol, "$", "warn");
        if ((view.powerups || 0) > (prev.powerups || 0)) floatNum(trackCol, "+", "good");
      }
      prev = {
        gates: view.gates || 0,
        packets: view.packets || 0,
        powerups: view.powerups || 0
      };
    }
  };
}

// ../../docs/games/metagame/stages/stage5/renderer.js
var BOSS_IDX2 = ROUNDS.length - 1;
var CK_SCHEMA = 2;
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
      <span>ROUND <b data-field="round"></b></span>
      <span data-field="raceBox">RACE <b data-field="race"></b></span>
      <span data-field="posBox">POS <b data-field="position"></b></span>
      <span data-field="integrityBox">INTEGRITY <b data-field="integrity"></b></span>
      <span data-field="packetsBox">PACKETS <b data-field="packets"></b></span>
      <span data-field="calibBox">CALIBRATION <b data-field="calib"></b></span>
      <div class="s5-progress" data-field="progressBox"><i class="s5-progress-fill" data-field="progressFill"></i></div>
    </header>
    <div class="s5-layout">
      <div class="s5-track-col" data-field="trackCol">
        <div class="s5-jammer" data-field="jammer" hidden></div>
        <div class="s5-track-stage" data-field="stage"></div>
      </div>
      <aside class="s5-side">
        <div class="s5-primary" data-field="primary"></div>
        <div class="s5-rounds" data-field="rounds"></div>
        <div class="s5-ascension" data-field="ascension"></div>
      </aside>
    </div>
    <section class="s5-boss-panel" data-field="bossPanel">
      <strong>THE JAMMER</strong>
      <div data-field="bossState"></div>
      <div class="s5-hint" data-field="hint"></div>
    </section>
    <div class="s5-boss-chip" data-field="bossChip"></div>
    <ol class="s5-log"></ol>
    <div class="s5-controls">
      <button type="button" data-action="resume" hidden>resume race</button>
      <button type="button" data-action="audio" hidden>open transmission_hum.mp3</button>
      <button type="button" data-action="bts" hidden>open signal_racer.bts</button>
    </div>
    <div class="s5-overlay" data-field="overlay"></div>
  `;
  host.replaceChildren(root);
  const fields = Object.fromEntries([...root.querySelectorAll("[data-field]")].map((el) => [el.dataset.field, el]));
  const log = root.querySelector(".s5-log");
  const completeOnce = once((result) => onStageComplete?.(result));
  let loop = null;
  let engine = null;
  let mode = "select";
  let resultCtx = null;
  const canvasRace = createCanvasRace(state.calibration.seed);
  fields.stage.append(canvasRace.el);
  let renderPrev = null;
  let renderCur = null;
  let autoSolving = false;
  const steer = createSteer({ getMode: () => mode, getLoop: () => loop });
  fields.trackCol.append(steer.el);
  const fx = createRaceFx({ trackCol: fields.trackCol });
  function calibrated() {
    return getBossLockState({ actions, state }).unlocked;
  }
  function unlockedRounds() {
    return Math.min(BOSS_IDX2, Number(state.run.clearedRounds || 0));
  }
  function pendingResume() {
    const ck = raceRun.restore();
    if (!ck || typeof ck.lanes !== "string" || !ck.lanes.length) return null;
    if (ck.schema !== CK_SCHEMA) return null;
    if (ck.ascLevel !== ascension.level() || ck.seed !== state.calibration.seed) return null;
    const idx = Number(ck.roundIdx);
    if (!(idx >= 0) || idx > unlockedRounds() || isBossRound(idx)) return null;
    return { ...ck, roundIdx: idx };
  }
  function startRound(idx, opts = {}) {
    if (mode === "playing") return;
    const roundIdx = Math.max(0, Math.min(BOSS_IDX2, Number(idx) || 0));
    if (roundIdx > unlockedRounds()) return;
    if (isBossRound(roundIdx) && state.run.clearedRounds < BOSS_IDX2) return;
    resultCtx = null;
    renderOverlay();
    const round = roundByIdx(roundIdx);
    const prevGhost = state.timeTrial?.[round.id] || null;
    pushLog3(roundIntro(roundIdx));
    fx.reset();
    renderPrev = null;
    renderCur = null;
    canvasRace.setSeed(`${state.calibration.seed}:${round.id}`);
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
    engine = createEngine({
      onTick: () => {
        renderPrev = renderCur;
        loop.step();
      },
      onRender: (alpha) => {
        if (!autoSolving && mode === "playing") canvasRace.renderFrame(renderPrev, renderCur, alpha);
      },
      getTickMs: () => loop.round.tickMs
    });
    engine.start();
    canvasRace.resize();
    loop.paint();
    repaint();
  }
  function checkpointRace(view) {
    if (!loop || view.tick % 24 !== 0) return;
    raceRun.checkpoint({ ...loop.path(), schema: CK_SCHEMA, ascLevel: ascension.level(), seed: state.calibration.seed });
  }
  function handleEnd({ result, round, roundIdx, packets, medal, finishTick, parTick, ghostRecording, position, fieldSize }) {
    engine?.stop();
    engine = null;
    mode = "result";
    raceRun.reset();
    const boss = isBossRound(roundIdx);
    if (result === "clear") {
      const medalNote = medal ? ` [${medal} · ${finishTick} vs par ${parTick}]` : "";
      pushLog3(roundLogLine(roundIdx) + (packets ? ` (+${packets} packets)` : "") + medalNote);
      if (ghostRecording) {
        const prev = state.timeTrial?.[round.id] || null;
        if (!prev || Number(ghostRecording.tick) < Number(prev.tick)) {
          state.timeTrial = { ...state.timeTrial || {}, [round.id]: ghostRecording };
        }
      }
      if (!boss) {
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
    if (!boss) showResult({ result, round, roundIdx, packets, medal, finishTick, parTick, position, fieldSize });
    persistAndPaint();
  }
  function showResult(info) {
    const { result, round, roundIdx, packets, medal, finishTick, parTick, position, fieldSize } = info;
    let title;
    let detail;
    const clear = result === "clear";
    if (clear) {
      title = fieldSize > 1 ? `FINISH — P${position}/${fieldSize}` : "ROUND CLEAR";
      detail = `+${packets} packets` + (medal ? ` · ${medal} (${finishTick} vs par ${parTick})` : "");
    } else if (round.archetype === "time-trial") {
      title = "MISSED PAR";
      detail = "beat the clock next time — survival alone is not a clear.";
    } else {
      title = "SIGNAL LOST";
      detail = "integrity collapsed — take the offer and run it again.";
    }
    resultCtx = {
      roundIdx,
      resolved: false,
      note: "",
      summary: { title, detail, continueLabel: clear ? "continue" : "back to rounds" },
      canRetry: true
    };
    renderOverlay();
  }
  function renderOverlay() {
    fields.overlay.replaceChildren();
    root.classList.toggle("s5-has-overlay", Boolean(resultCtx));
    if (!resultCtx) return;
    const offers = resultCtx.resolved ? [] : pitStopOffer({ seed: state.calibration.seed, roundIdx: resultCtx.roundIdx, shop: state.shop || {} });
    fields.overlay.append(buildResultOverlay({
      summary: resultCtx.summary,
      offers,
      shop: state.shop || {},
      packets: state.packets,
      canRetry: resultCtx.canRetry,
      resolvedNote: resultCtx.note
    }));
  }
  function paintArena(view) {
    renderCur = view;
    if (renderPrev === null) renderPrev = view;
    if (autoSolving) return;
    checkpointRace(view);
    paintJammer(view);
    fx.onPaint(view);
    updateHud(view);
  }
  function updateHud(view) {
    fields.integrity.textContent = `${Math.round(view.integrity)}%`;
    const pct = Math.round((view.progress || 0) * 100);
    fields.progressFill.style.width = `${pct}%`;
    const fork = view.hasFork ? ` · ${view.channel === "hi" ? "HI" : "LO"}${view.inFork ? "◆" : ""}` : "";
    fields.race.textContent = view.archetype === "circuit" ? `${view.archetype} · lap ${view.lap}/${view.laps}${fork}` : `${view.archetype} · ${pct}%${fork}`;
    fields.position.textContent = view.fieldSize > 1 ? `${view.position}/${view.fieldSize}` : "—";
  }
  function paintJammer(view) {
    const boss = view.archetype === "boss";
    fields.jammer.hidden = !boss;
    if (!boss) return;
    const closing = Math.max(0, Math.min(1, view.progress || 0));
    fields.jammer.style.setProperty("--s5-close", String(closing));
    fields.jammer.textContent = `⟪ THE JAMMER ${"▓".repeat(2 + Math.round(closing * 6))} ⟫`;
  }
  function repaint() {
    const disc = disclosure(state);
    const lock = getBossLockState({ actions, state });
    const idx = Number(state.run.roundIdx || 0);
    const r = roundByIdx(idx);
    const playing = mode === "playing";
    root.classList.toggle("s5-mode-playing", playing);
    root.classList.toggle("s5-mode-result", mode === "result");
    root.classList.toggle("s5-mode-select", mode === "select");
    fields.round.textContent = `${r.id}/${FINAL_ROUND_ID} ${r.label}`;
    fields.raceBox.hidden = !playing;
    fields.posBox.hidden = !playing;
    fields.progressBox.hidden = !playing;
    fields.packetsBox.hidden = playing;
    fields.calibBox.hidden = playing || !disc.showCalibration;
    steer.el.hidden = !playing;
    if (!playing) {
      canvasRace.setSeed(`${state.calibration.seed}:${r.id}`);
      canvasRace.resize();
      canvasRace.drawAttract(state.run.lane);
      fields.jammer.hidden = true;
      fields.integrity.textContent = `${Math.round(state.run.integrity)}%`;
      fields.race.textContent = r.archetype || "sprint";
      fields.position.textContent = "—";
    }
    fields.packets.textContent = String(state.packets);
    fields.calib.textContent = lock.unlocked ? "LOCKED-IN" : calibrationProgressStr(state);
    fields.bossPanel.hidden = !disc.bossFull;
    fields.bossChip.hidden = disc.bossFull || playing;
    fields.bossChip.textContent = state.boss.defeated ? "THE JAMMER — defeated" : "THE JAMMER — locked (clear round 6 to reveal)";
    fields.bossState.textContent = state.boss.defeated ? "defeated. BTS trace available." : `${lock.jammerSuppression} / ${lock.unlocked ? "beatable" : "suppression dominant"}`;
    fields.hint.textContent = lock.hint;
    renderPrimary(disc);
    renderRoundButtons(disc);
    renderAscension();
    const controls = root.querySelector(".s5-controls");
    controls.hidden = playing || disc.attract;
    root.querySelector('[data-action="audio"]').hidden = !disc.showCalibration;
    root.querySelector('[data-action="bts"]').hidden = !state.boss.defeated;
    const resumeBtn = root.querySelector('[data-action="resume"]');
    const ck = playing ? null : pendingResume();
    resumeBtn.hidden = !ck;
    if (ck) resumeBtn.textContent = `resume race (round ${roundByIdx(ck.roundIdx).id}, lap-saved)`;
    log.replaceChildren(...state.log.slice(-6).map((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      return li;
    }));
  }
  function renderPrimary(disc) {
    if (disc.showRoundList) {
      fields.primary.replaceChildren();
      return;
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.startRound = "0";
    btn.className = "s5-primary-btn";
    btn.disabled = mode === "playing";
    btn.textContent = `START ROUND 1 — ${roundByIdx(0).label}`;
    fields.primary.replaceChildren(btn);
  }
  function renderRoundButtons(disc) {
    if (!disc.showRoundList) {
      fields.rounds.replaceChildren();
      return;
    }
    const unlocked = unlockedRounds();
    const cleared = Number(state.run.clearedRounds || 0);
    const tuning = applyUpgrades(state.shop || {});
    fields.rounds.replaceChildren(...ROUNDS.map((round, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.startRound = String(i);
      const boss = isBossRound(i);
      const locked = boss ? cleared < BOSS_IDX2 : i > unlocked;
      btn.disabled = locked || mode === "playing";
      const label = `${round.id}. ${round.label}${i < cleared ? " ✓" : ""}${locked ? " 🔒" : ""}`;
      if (disc.showEstimates && !locked) {
        const { low, high } = estimateRoundPackets(round, tuning);
        btn.append(label, roundEstEl(low, high));
      } else {
        btn.append(label);
      }
      if (boss) btn.classList.add("s5-boss-btn");
      return btn;
    }));
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
    const pitBtn = event.target.closest("button[data-pit]");
    if (pitBtn && resultCtx) {
      const res = buyUpgrade(state, pitBtn.dataset.pit);
      resultCtx.resolved = true;
      resultCtx.note = res.bought ? `upgraded ${pitBtn.dataset.pit.toUpperCase()} (−${res.cost}p)` : "could not upgrade";
      save?.();
      renderOverlay();
      repaint();
      return;
    }
    if (event.target.closest("button[data-pit-skip]") && resultCtx) {
      resultCtx.resolved = true;
      resultCtx.note = "pit skipped";
      renderOverlay();
      return;
    }
    const overlayBtn = event.target.closest("button[data-overlay]");
    if (overlayBtn && resultCtx) {
      const idx = resultCtx.roundIdx;
      if (overlayBtn.dataset.overlay === "retry") {
        resultCtx = null;
        renderOverlay();
        startRound(idx);
        return;
      }
      resultCtx = null;
      mode = "select";
      renderOverlay();
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
  canvasRace.el.addEventListener("click", (event) => {
    if (mode !== "playing" || !loop) return;
    const rect = canvasRace.el.getBoundingClientRect();
    loop.handleKey(event.clientX - rect.left < rect.width / 2 ? "ArrowLeft" : "ArrowRight");
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
    bossIdx: BOSS_IDX2,
    actions,
    achievements,
    bell,
    persistAndPaint,
    calibrated,
    ascension,
    ascensionMods,
    raceRun,
    dismissResult: () => {
      resultCtx = null;
      renderOverlay();
      repaint();
    },
    // Run a synchronous full-round solve with per-frame canvas draws + per-tick HUD churn suppressed
    // (the round completes in one burst; drawing each intermediate frame would be pure waste).
    solve: (fn) => {
      autoSolving = true;
      try {
        return fn();
      } finally {
        autoSolving = false;
      }
    }
  });
  function dev(id) {
    if (applyDev(id, state, actions)) persistAndPaint();
  }
  return {
    repaint,
    dev,
    destroy() {
      engine?.stop();
      raceRun.destroy();
      steer.destroy();
      canvasRace.destroy();
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
  target.shop = migrateShop(mergePlain(fresh.shop, target.shop));
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
  requiredAction: REQUIRED_ACTION,
  // Dev-menu controls wired in metagame.js → mounted.dev(id).
  devControls: [
    { id: "calibrate", label: "Instant-calibrate (unlock boss)" },
    { id: "clear-runs", label: "Clear all rounds (boss button)" },
    { id: "packets", label: "+200 packets" },
    { id: "repair", label: "Full repair (integrity)" }
  ]
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
    devControls: stageMeta.devControls,
    dev(id) {
      view?.dev?.(id);
    },
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
  ensureLink("stage5-signal-racer-styles", new URL("./styles.css", import.meta.url).href);
  ensureLink("stage5-signal-racer-race-styles", new URL("./styles-race.css", import.meta.url).href);
}
function ensureLink(id, href) {
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
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
