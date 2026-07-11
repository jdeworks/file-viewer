// GENERATED — DO NOT EDIT BY HAND.
// Bundled from docs/games/metagame/stages/stage8/index.js (+ its local modules) by
// build/metagame/build.mjs. Rebuild:  node build/metagame/build.mjs  (run by scripts/check.sh).
// Exports stageMeta / defaultState / mountStage. Shared ../../*.js singletons + ./styles.css stay
// external (NOT inlined). The hub's stage-manifest.js LOADERS import THIS file.


// ../../docs/games/metagame/stages/stage8/messages.js
var ACTION_NAME = "offline_mode_activated";
var REQUIRED_ACTION = "8.offline_mode_activated";
var ACHIEVEMENT_ID = "stage8.offline_mode_activated";
var ACHIEVEMENT_TEXT = "I learned the shape of the silence.";
var BTS_PATH = "/docs/bts/observer_state.bts";
var NOTES_PATH = "/docs/examples/metagame/stage8/service-worker-notes.txt";
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
  "read service-worker-notes.txt, then activate Offline Mode for Stage 8."
];
var btsSummary = [
  "The compact slice simulates the seed endpoint in stage logic.",
  "The intended browser mapping is a service worker fetch that falls back to the cached default seed when the network is unavailable.",
  "Once offline mode is active, the boss seed becomes fixed at 0 so the rotating gap is learnable."
];

// ../../docs/games/metagame/stages/stage8/rng.js
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

// ../../docs/games/metagame/stages/stage8/ring.js
function ringAngle(seed, elapsedMs, rotSpeedDegPerSec = 30) {
  const base = makeRng(seed).float() * 360;
  return mod360(base + rotSpeedDegPerSec * (Number(elapsedMs) || 0) / 1e3);
}
function mod360(a) {
  return (a % 360 + 360) % 360;
}

// ../../docs/games/metagame/stages/stage8/modes.js
var TWO_PI = Math.PI * 2;
function mod3602(a) {
  return (a % 360 + 360) % 360;
}
function angularDist(a, b) {
  return Math.abs(((a - b) % 360 + 540) % 360 - 180);
}
function ringSpeed(cfg, seed) {
  return (cfg.speed || 30) + makeRng(`${seed}s`).float() * (cfg.speedVar || 0);
}
function effectiveDarkZone(cfg, ref = 0) {
  if (!cfg.darkZone) return null;
  const halfSpan = angularDist(cfg.darkZone.end, 0);
  return { start: mod3602(ref - halfSpan), end: mod3602(ref + halfSpan) };
}
function scanSolve(angleAt, tol, { maxMs = 4e4, step = 4 } = {}) {
  let bestT = 0;
  let bestD = Infinity;
  for (let t = 0; t <= maxMs; t += step) {
    const d = angularDist(angleAt(t), 0);
    if (d <= tol / 2) return t;
    if (d < bestD) {
      bestD = d;
      bestT = t;
    }
  }
  return bestT;
}
var simple = {
  angleAt(cfg, seed, ms) {
    return ringAngle(seed, ms, ringSpeed(cfg, seed));
  },
  evaluate(cfg, seed, ms, ref = 0) {
    const angle = this.angleAt(cfg, seed, ms);
    const distance = angularDist(angle, ref);
    return { hit: distance <= cfg.tolerance / 2, angle, distance, tolerance: cfg.tolerance };
  },
  solveMoment(cfg, seed) {
    const speed = ringSpeed(cfg, seed);
    const base = ringAngle(seed, 0, speed);
    return Math.round(((360 - base) % 360 + 360) % 360 / speed * 1e3);
  }
};
function oscParams(cfg, seed) {
  const r = makeRng(`${seed}o`);
  return { base: r.float() * 360, phase: r.float() * TWO_PI, b: cfg.oscBase || 35, amp: Math.min(cfg.oscAmp || 18, (cfg.oscBase || 35) - 5), Tp: (cfg.oscPeriod || 4e3) / 1e3 };
}
var oscillating = {
  angleAt(cfg, seed, ms) {
    const { base, phase, b, amp, Tp } = oscParams(cfg, seed);
    const t = ms / 1e3;
    const integral = b * t - amp * Tp / TWO_PI * (Math.cos(TWO_PI * t / Tp + phase) - Math.cos(phase));
    return mod3602(base + integral);
  },
  evaluate(cfg, seed, ms, ref = 0) {
    const angle = this.angleAt(cfg, seed, ms);
    const distance = angularDist(angle, ref);
    return { hit: distance <= cfg.tolerance / 2, angle, distance, tolerance: cfg.tolerance };
  },
  solveMoment(cfg, seed) {
    return scanSolve((t) => this.angleAt(cfg, seed, t), cfg.tolerance);
  }
};
function revSegments(cfg, seed) {
  const r = makeRng(`${seed}r`);
  const speed = ringSpeed(cfg, seed);
  const segs = [];
  let dir = 1;
  for (let i = 0; i < 10; i++) {
    const sweepDeg = dir > 0 ? 360 * 1.3 : 150;
    const dur = sweepDeg / speed * (0.8 + r.float() * 0.4) * 1e3;
    segs.push({ dir, dur, speed });
    dir *= -1;
  }
  return { base: r.float() * 360, segs };
}
var reversing = {
  angleAt(cfg, seed, ms) {
    const { base, segs } = revSegments(cfg, seed);
    let angle = base;
    let left = ms;
    for (const s of segs) {
      const span = Math.min(left, s.dur);
      angle += s.dir * s.speed * span / 1e3;
      left -= span;
      if (left <= 0) break;
    }
    return mod3602(angle);
  },
  evaluate(cfg, seed, ms, ref = 0) {
    const angle = this.angleAt(cfg, seed, ms);
    const distance = angularDist(angle, ref);
    return { hit: distance <= cfg.tolerance / 2, angle, distance, tolerance: cfg.tolerance };
  },
  solveMoment(cfg, seed) {
    return scanSolve((t) => this.angleAt(cfg, seed, t), cfg.tolerance, { maxMs: 6e4 });
  }
};
function dualParams(cfg, seed) {
  const r = makeRng(`${seed}d`);
  const si = cfg.speedInner || 45;
  const so = cfg.speedOuter || 30;
  const tAlign = 1500 + Math.floor(r.float() * 4e3);
  return { si, so, tAlign, bi: mod3602(-si * tAlign / 1e3), bo: mod3602(-so * tAlign / 1e3) };
}
var dual = {
  anglesAt(cfg, seed, ms) {
    const { si, so, bi, bo } = dualParams(cfg, seed);
    return { inner: mod3602(bi + si * ms / 1e3), outer: mod3602(bo + so * ms / 1e3) };
  },
  evaluate(cfg, seed, ms, ref = 0) {
    const { inner, outer } = this.anglesAt(cfg, seed, ms);
    const di = angularDist(inner, ref);
    const dou = angularDist(outer, ref);
    const distance = Math.max(di, dou);
    return { hit: di <= cfg.tolerance / 2 && dou <= cfg.tolerance / 2, distance, inner, outer, tolerance: cfg.tolerance };
  },
  solveMoment(cfg, seed) {
    return dualParams(cfg, seed).tAlign;
  }
};
function multiParams(cfg, seed) {
  const r = makeRng(`${seed}m`);
  const count = Math.max(2, cfg.gaps || 3);
  const speed = ringSpeed(cfg, seed);
  const base = r.float() * 360;
  const realIdx = r.int(0, count - 1);
  const step = 360 / count;
  return { count, speed, base, realIdx, step };
}
var multigap = {
  gapsAt(cfg, seed, ms) {
    const { count, speed, base, step } = multiParams(cfg, seed);
    return Array.from({ length: count }, (_, i) => mod3602(base + i * step + speed * ms / 1e3));
  },
  realAngle(cfg, seed, ms) {
    const { speed, base, realIdx, step } = multiParams(cfg, seed);
    return mod3602(base + realIdx * step + speed * ms / 1e3);
  },
  evaluate(cfg, seed, ms, ref = 0) {
    const angle = this.realAngle(cfg, seed, ms);
    const distance = angularDist(angle, ref);
    return { hit: distance <= cfg.tolerance / 2, distance, angle, tolerance: cfg.tolerance };
  },
  solveMoment(cfg, seed) {
    const { speed, base, realIdx, step } = multiParams(cfg, seed);
    const start = mod3602(base + realIdx * step);
    return Math.round(((360 - start) % 360 + 360) % 360 / speed * 1e3);
  }
};
function simpleSolve(cfg, seed) {
  const speed = ringSpeed(cfg, seed);
  const base = ringAngle(seed, 0, speed);
  return Math.round(((360 - base) % 360 + 360) % 360 / speed * 1e3);
}
var ghostecho = {
  angleAt(cfg, seed, ms) {
    return ringAngle(seed, ms, ringSpeed(cfg, seed));
  },
  evaluate(cfg, seed, ms, ref = 0) {
    const angle = this.angleAt(cfg, seed, ms);
    const distance = angularDist(angle, ref);
    return { hit: distance <= cfg.tolerance / 2, angle, distance, tolerance: cfg.tolerance };
  },
  solveMoment(cfg, seed) {
    return simpleSolve(cfg, seed);
  }
};
function rhythmParams(cfg, seed) {
  const speed = ringSpeed(cfg, seed);
  const period = 36e4 / speed;
  return { speed, period, base: simpleSolve(cfg, seed), chain: Math.max(2, cfg.chain || 3) };
}
var rhythm = {
  angleAt(cfg, seed, ms) {
    return ringAngle(seed, ms, ringSpeed(cfg, seed));
  },
  evaluate(cfg, seed, ms, ref = 0) {
    const angle = this.angleAt(cfg, seed, ms);
    const distance = angularDist(angle, ref);
    return { hit: distance <= cfg.tolerance / 2, angle, distance, tolerance: cfg.tolerance };
  },
  // Press-time array: the gap faces the top on every beat; chain N of them in a row to clear.
  solveMoment(cfg, seed) {
    const { period, base, chain } = rhythmParams(cfg, seed);
    return Array.from({ length: chain }, (_, k) => Math.round(base + k * period));
  }
};
function stealthParams(cfg, seed) {
  return { speed: ringSpeed(cfg, seed), eyeSpeed: cfg.eyeSpeed || 22, blind: cfg.blind || 60 };
}
var stealth = {
  gapAngle(cfg, seed, ms) {
    return ringAngle(seed, ms, ringSpeed(cfg, seed));
  },
  eyeAngle(cfg, seed, ms) {
    return ringAngle(`${seed}eye`, ms, stealthParams(cfg, seed).eyeSpeed);
  },
  evaluate(cfg, seed, ms, ref = 0) {
    const gap = this.gapAngle(cfg, seed, ms);
    const eye = this.eyeAngle(cfg, seed, ms);
    const distance = angularDist(gap, ref);
    const watched = angularDist(eye, ref) <= (cfg.blind || 60) / 2;
    return { hit: distance <= cfg.tolerance / 2 && !watched, distance, gap, eye, watched, tolerance: cfg.tolerance };
  },
  solveMoment(cfg, seed) {
    for (let t = 0; t <= 6e4; t += 4) if (this.evaluate(cfg, seed, t).hit) return t;
    return 0;
  }
};
var darkzone = {
  angleAt(cfg, seed, ms) {
    return ringAngle(seed, ms, ringSpeed(cfg, seed));
  },
  evaluate(cfg, seed, ms, ref = 0) {
    const angle = this.angleAt(cfg, seed, ms);
    const distance = angularDist(angle, ref);
    return { hit: distance <= cfg.tolerance / 2, angle, distance, tolerance: cfg.tolerance };
  },
  solveMoment(cfg, seed) {
    return simpleSolve(cfg, seed);
  }
};
var MODES = { simple, oscillating, reversing, dual, multigap, ghostecho, rhythm, stealth, darkzone };
function getMode(name) {
  return MODES[name] || simple;
}

// ../../docs/games/metagame/stages/stage8/movements.js
var BOSS_LEVEL = 16;
var MOVEMENTS = [
  { id: 1, name: "Signal", verb: "watch & time", levels: [1, 2] },
  { id: 2, name: "Drift", verb: "read a changing speed", levels: [3, 4] },
  { id: 3, name: "Echo", verb: "read your own error", levels: [5, 6] },
  { id: 4, name: "Cadence", verb: "hold the beat", levels: [7, 8] },
  { id: 5, name: "Interference", verb: "hold two rhythms", levels: [9, 10] },
  { id: 6, name: "Surveillance", verb: "wait for the blind window", levels: [11] },
  { id: 7, name: "Reversal", verb: "track the flips (offline)", levels: [12] },
  { id: 8, name: "Decoys", verb: "pick the real gap (offline)", levels: [13, 14] },
  { id: 9, name: "Blackout", verb: "extrapolate the occluded gap (offline)", levels: [15] },
  { id: 10, name: "Observer", verb: "the full effect (offline)", levels: [16] }
];
var LEVEL_TABLE = {
  // Signal (simple) — gentlest intro, then L2 escalates SPEED only.
  1: { mode: "simple", speed: 36, speedVar: 0, tolerance: 30, display: "open" },
  2: { mode: "simple", speed: 50, speedVar: 0, tolerance: 30, display: "open" },
  // Drift (oscillating) — gentle intro (slow base, small swing, wide window), then L4 escalates oscAmp only.
  3: { mode: "oscillating", oscBase: 38, oscAmp: 14, oscPeriod: 4600, tolerance: 28, display: "open" },
  4: { mode: "oscillating", oscBase: 38, oscAmp: 26, oscPeriod: 4600, tolerance: 28, display: "open" },
  // Echo (ghostecho) — gentle intro, then L6 tightens TOLERANCE only (the ghosts help you close it).
  5: { mode: "ghostecho", speed: 38, speedVar: 0, tolerance: 26, display: "open" },
  6: { mode: "ghostecho", speed: 38, speedVar: 0, tolerance: 19, display: "open" },
  // Cadence (rhythm) — gentle intro (chain 3), then L8 lengthens CHAIN only.
  7: { mode: "rhythm", speed: 36, speedVar: 0, chain: 3, tolerance: 25, display: "open" },
  8: { mode: "rhythm", speed: 36, speedVar: 0, chain: 4, tolerance: 25, display: "open" },
  // Interference (dual) — gentle intro, then L10 speeds the INNER ring only.
  9: { mode: "dual", speedInner: 46, speedOuter: 32, tolerance: 25, display: "dual" },
  10: { mode: "dual", speedInner: 60, speedOuter: 32, tolerance: 25, display: "dual" },
  // Surveillance (stealth) — single gentle level (last learnable-online).
  11: { mode: "stealth", speed: 40, speedVar: 0, eyeSpeed: 26, blind: 60, tolerance: 24, display: "open" },
  // Back third (onlineUnstable): each is a single gentle archetype intro; the difficulty here is the
  // un-cheat, not the tuning. Reversal.
  12: { mode: "reversing", speed: 54, speedVar: 0, tolerance: 22, display: "open", onlineUnstable: true },
  // Decoys (multigap) — gentle intro (3 gaps), then L14 adds one GAP only.
  13: { mode: "multigap", speed: 50, speedVar: 0, gaps: 3, tolerance: 22, display: "open", onlineUnstable: true },
  14: { mode: "multigap", speed: 50, speedVar: 0, gaps: 4, tolerance: 22, display: "open", onlineUnstable: true },
  // Blackout (darkzone) — single gentle level.
  15: { mode: "darkzone", speed: 48, speedVar: 0, tolerance: 20, display: "dark", darkZone: { start: 312, end: 48 }, onlineUnstable: true },
  // Observer (boss) — the final movement, tightest window (already tight; nudged, not overhauled).
  16: { mode: "simple", speed: 48, speedVar: 0, tolerance: 14, display: "dark", darkZone: { start: 300, end: 60 }, onlineUnstable: true }
};
function movementForLevel(level) {
  const lvl = Number(level) || 1;
  return MOVEMENTS.find((m) => m.levels.includes(lvl)) || MOVEMENTS[0];
}
var MODE_HINTS = {
  simple: "watch the gap; steer your ship under it and CROSS when it lines up.",
  oscillating: "the rotation speed breathes in and out — steer to meet the gap and CROSS as it arrives.",
  ghostecho: "faint ghosts mark your last two presses — read how early/late you were and correct.",
  dual: "two rings now — steer to where BOTH gaps will align, and CROSS at that instant.",
  stealth: "an eye sweeps the ring — CROSS only where the gap is AND the eye is looking away.",
  reversing: "the ring keeps flipping direction — track the flips and CROSS where it lines up with your ship.",
  darkzone: "a blackout always hides your own crossing point — extrapolate from the speed, not sight."
};
function modeHint(cfg) {
  if (!cfg) return MODE_HINTS.simple;
  if (cfg.mode === "rhythm") return `hold the beat — land ${Math.max(2, cfg.chain || 3)} crosses in a row; one miss resets the chain.`;
  if (cfg.mode === "multigap") return `${Math.max(2, cfg.gaps || 3)} gaps look identical — only one is real. find it run by run.`;
  return MODE_HINTS[cfg.mode] || MODE_HINTS.simple;
}
function levelConfig(level) {
  const lvl = Math.max(1, Math.min(BOSS_LEVEL, Number(level) || 1));
  const base = LEVEL_TABLE[lvl] || LEVEL_TABLE[1];
  const movement = movementForLevel(lvl);
  return { ...base, level: lvl, movement: movement.id, movementName: movement.name, isBoss: lvl === BOSS_LEVEL };
}

// ../../docs/games/metagame/stages/stage8/game.js
function crossOutcome(result) {
  if (!result || !result.hit) return "miss";
  const tol = Number(result.tolerance) || 0;
  return tol > 0 && Number(result.distance) <= tol / 4 ? "perfect" : "hit";
}
function crossAttempt({ seed, elapsedMs, level, toleranceMult = 1, shipAngle = 0 }) {
  let cfg = levelConfig(level);
  if (toleranceMult !== 1) cfg = { ...cfg, tolerance: cfg.tolerance * toleranceMult };
  return { ...getMode(cfg.mode).evaluate(cfg, seed, Number(elapsedMs) || 0, Number(shipAngle) || 0), level: cfg.level };
}
function solveMoment(seed, level) {
  const cfg = levelConfig(level);
  return getMode(cfg.mode).solveMoment(cfg, seed);
}
function missDelta({ seed, elapsedMs, level, shipAngle = 0 }) {
  const ref = Number(shipAngle) || 0;
  const r = crossAttempt({ seed, elapsedMs, level, shipAngle: ref });
  const speed = Math.abs(rotSpeedFor(seed, level)) || 30;
  const a = Number.isFinite(r.angle) ? r.angle : r.distance;
  const signed = ((a - ref) % 360 + 540) % 360 - 180;
  return { deltaMs: Math.round(Math.abs(signed) / speed * 1e3), dir: signed >= 0 ? "late" : "early", offsetDeg: signed };
}
function rotSpeedFor(seed, level) {
  return ringSpeed(levelConfig(level), seed);
}
function sublevelSeed(level) {
  return (Number(level) || 1) * 31 + 7;
}

// ../../docs/games/metagame/stages/stage8/boss.js
function hasOfflineModeActivated(actions) {
  return Boolean(actions && typeof actions.hasAction === "function" && actions.hasAction(8, ACTION_NAME));
}
function readServiceWorkerNotes({ state, bell }) {
  const firstRead = !state.notesRead;
  state.notesRead = true;
  state.offlineControlVisible = true;
  if (firstRead) {
    pushLog(state, "service-worker-notes.txt read. offline control revealed.");
    notifyBell(bell, bellMessages.notesRead, "stage8.service_worker_notes_read");
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
    actions.setAction(8, ACTION_NAME, {
      source,
      file: state.notesRead ? "service-worker-notes.txt" : null,
      mode: browserOffline ? "browser-offline-cache" : "simulated-cache"
    });
  }
  if (firstActivation) {
    notifyBell(bell, bellMessages.offline, "stage8.offline_mode_activated");
    unlockAchievement(achievements, ACHIEVEMENT_ID, {
      id: ACHIEVEMENT_ID,
      stage: 8,
      text: ACHIEVEMENT_TEXT,
      action: "8.offline_mode_activated"
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
    defeatPossible: true,
    hint: unlocked ? "the seed is fixed. cross using the learned rotation." : lockedHintLadder[hintIndex]
  };
}
function recordObserverBossAttempt({ state, actions, elapsedMs = 0, seed, shipAngle = 0 }) {
  state.boss.reached = true;
  const lock = getBossLockState({ actions, state });
  const activeSeed = lock.unlocked ? FIXED_OFFLINE_SEED : Number.isFinite(seed) ? seed : getBossSeed({ state, actions });
  const result = crossAttempt({ seed: activeSeed, elapsedMs: Number(elapsedMs) || 0, level: BOSS_LEVEL, shipAngle });
  state.boss.attempts = Number(state.boss.attempts || 0) + 1;
  if (!result.hit) {
    if (!lock.unlocked) {
      state.boss.lockHintStep = Math.min(Number(state.boss.lockHintStep || 0) + 1, lockedHintLadder.length - 1);
      getBossSeed({ state, actions });
      pushLog(state, `online, mistimed the live gap (off by ${Math.round(result.distance)}deg). it reseeds again.`);
      return { defeated: false, unlocked: false, hit: false, seedMode: "live-random", distance: result.distance };
    }
    pushLog(state, `offline, but the cross was mistimed (off by ${Math.round(result.distance)}deg).`);
    return { defeated: false, unlocked: true, hit: false, seedMode: "fixed-cache", distance: result.distance };
  }
  state.boss.defeated = true;
  state.meta.firstClearComplete = true;
  state.meta.btsAvailable = true;
  state.clarity = Number(state.clarity || 0) + 25;
  pushLog(state, lock.unlocked ? bellMessages.defeated : "a live read landed it — the gap held just long enough.");
  return { defeated: true, unlocked: lock.unlocked, hit: true, seedMode: lock.unlocked ? "fixed-cache" : "live-random", seed: activeSeed };
}
function pushLog(state, line) {
  state.log = [...state.log || [], line].slice(-6);
}
function notifyBell(bell, text, id) {
  if (bell && typeof bell.push === "function") bell.push({ id, stage: 8, text });
  else if (bell && typeof bell.say === "function") bell.say(text, { id, stage: 8 });
  else if (bell && typeof bell.add === "function") bell.add(text, { id, stage: 8 });
}
function unlockAchievement(achievements, id, detail) {
  if (achievements && typeof achievements.unlockAchievement === "function") achievements.unlockAchievement(id, detail);
  else if (achievements && typeof achievements.unlock === "function") achievements.unlock(id, detail);
}

// ../../docs/games/metagame/stages/stage8/content.js
var serviceWorkerNotesText = [
  "service-worker-notes.txt",
  "",
  "The service worker caches level parameters for offline use.",
  "Offline mode always uses the default starting configuration: seed 0.",
  "When the connection is quiet, the observer starts from the same place every time.",
  "",
  "Activate Offline Mode (Stage 8) after reading this note."
].join("\n");

// ../../docs/games/metagame/stages/stage8/loop.js
function startLoop(onFrame) {
  const now = () => typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
  const hasRAF = typeof requestAnimationFrame === "function";
  let last = now();
  let stopped = false;
  let handle = null;
  function frame() {
    if (stopped) return;
    const t = now();
    let dt = t - last;
    last = t;
    if (!(dt >= 0)) dt = 0;
    if (dt > 100) dt = 100;
    try {
      onFrame(dt);
    } catch {
    }
    schedule();
  }
  function schedule() {
    if (stopped) return;
    handle = hasRAF ? requestAnimationFrame(frame) : setTimeout(frame, 16);
  }
  schedule();
  return {
    stop() {
      stopped = true;
      if (handle == null) return;
      if (hasRAF) cancelAnimationFrame(handle);
      else clearTimeout(handle);
    }
  };
}

// ../../docs/games/metagame/stages/stage8/aids.js
var AIDS = [
  { id: "stabilizer", label: "Stabilizer Lens", cost: 20, desc: "+60% tolerance on your next CROSS (one charge)." },
  { id: "tachometer", label: "Tachometer", cost: 30, desc: "permanent numeric readout: gap angle + speed." },
  { id: "peek", label: "Single-Frame", cost: 15, desc: "reveal the gap's angle right now.", offlineOnly: true }
];
var STABILIZER_TOLERANCE_MULT = 1.6;
function aidById(id) {
  return AIDS.find((a) => a.id === id) || null;
}
function defaultAids() {
  return { stabilizer: 0, tachometer: false };
}
function normalizeAids(aids) {
  const t = aids && typeof aids === "object" ? aids : {};
  const stabilizer = Number.isFinite(Number(t.stabilizer)) ? Math.max(0, Math.floor(Number(t.stabilizer))) : 0;
  return { stabilizer, tachometer: Boolean(t.tachometer) };
}
function buyAid(state, id, { offline = false } = {}) {
  const aid = aidById(id);
  if (!aid) return { ok: false, reason: "unknown" };
  state.aids = normalizeAids(state.aids);
  if (id === "peek" && !offline) return { ok: false, reason: "offline-only", aid };
  if (id === "tachometer" && state.aids.tachometer) return { ok: false, reason: "owned", aid };
  const clarity = Number(state.clarity || 0);
  if (clarity < aid.cost) return { ok: false, reason: "insufficient", aid };
  state.clarity = clarity - aid.cost;
  if (id === "stabilizer") state.aids.stabilizer += 1;
  if (id === "tachometer") state.aids.tachometer = true;
  return { ok: true, aid };
}
function shouldRevealAids(state) {
  if (!state) return false;
  const aids = normalizeAids(state.aids);
  return Boolean(state.aidsRevealed) || Number(state.clarity || 0) > 0 || aids.stabilizer > 0 || aids.tachometer;
}
function shouldRevealPeek(offlineUnlocked) {
  return Boolean(offlineUnlocked);
}
function consumeStabilizer(state) {
  state.aids = normalizeAids(state.aids);
  if (state.aids.stabilizer > 0) {
    state.aids.stabilizer -= 1;
    return STABILIZER_TOLERANCE_MULT;
  }
  return 1;
}

// ../../docs/games/metagame/stages/stage8/overlay.js
function markerIntensity(distance, readyDeg = 30) {
  const d = Number(distance);
  if (!Number.isFinite(d) || d >= readyDeg || readyDeg <= 0) return 0;
  return 1 - d / readyDeg;
}

// ../../docs/games/metagame/stages/stage8/markup.js
function aidCard(a) {
  return `
    <button type="button" class="s8-aid-card" data-action="aid" data-aid="${a.id}" data-field="aid-${a.id}">
      <span class="s8-aid-head"><span class="s8-aid-name">${a.label}</span><span class="s8-aid-cost">${a.cost}</span></span>
      <span class="s8-aid-desc">${a.desc}</span>
      ${a.offlineOnly ? '<span class="s8-aid-tag">offline only</span>' : ""}
    </button>`;
}
function stage8Markup(AIDS2, BOSS_LEVEL2) {
  return `
    <header class="s8-hud">
      <strong>OBSERVER STATE</strong>
      <span>level <b data-field="level"></b>/${BOSS_LEVEL2}</span>
      <span>movement <b data-field="movement"></b></span>
      <span>clarity <b data-field="clarity"></b></span>
      <span data-field="tachWrap" hidden>tach <b data-field="tach"></b></span>
      <span class="s8-seed" data-field="seedWrap" hidden><b data-field="seed"></b></span>
    </header>
    <div class="s8-layout">
      <div class="s8-arena-wrap">
        <!-- 2026-07-11: a single <canvas> replaces the old ASCII <pre> (rebuilt from scratch every
             rAF frame) + CSS conic-gradient wheel (the actual visual) dual-rendering pipeline — one
             draw call per frame, and a natural surface for the new steerable ship + path trail. See
             canvas-ring.js / canvas-modes.js. Keyboard CROSS still works via Space/Enter (renderer.js
             listens on document); tabindex/role/aria-label preserve the tap-to-CROSS affordance. -->
        <canvas class="s8-canvas" data-field="arena" tabindex="0" role="button" aria-label="observer ring — steer with the arrow keys, tap or press Space to CROSS"></canvas>
        <span class="s8-beat" data-field="beat" hidden aria-hidden="true"></span>
        <span class="s8-streak" data-field="streak" hidden></span>
        <div class="s8-readout" data-field="readout" aria-live="polite"></div>
      </div>
      <div class="s8-actions">
        <button type="button" class="s8-cross" data-action="cross">CROSS<kbd class="s8-kbd">Space</kbd></button>
        <button type="button" class="s8-observe" data-action="observe"><span data-field="observeLabel">OBSERVE</span><kbd class="s8-kbd">R</kbd></button>
      </div>
      <aside class="s8-side">
        <div class="s8-aids" data-field="aids" hidden>
          <strong>calibration (spend clarity)</strong>
          ${AIDS2.map(aidCard).join("")}
        </div>
        <hr>
        <button type="button" data-action="notes">open service-worker-notes.txt</button>
        <button type="button" data-action="offline" hidden>Activate Offline Mode (Stage 8)</button>
        <pre data-field="notes" hidden></pre>
      </aside>
    </div>
    <div class="s8-boss" data-field="bossPanel">
      <div class="s8-boss-chip" data-field="bossChip"></div>
      <div class="s8-boss-full">
        <strong>THE OBSERVER EFFECT (FULL)</strong>
        <div data-field="boss"></div>
        <div data-field="hint"></div>
      </div>
    </div>
    <div class="s8-log-row">
      <ol class="s8-log" data-field="log"></ol>
      <button type="button" class="s8-log-more" data-action="log">full log</button>
    </div>
    <div class="s8-controls">
      <button type="button" data-action="bts" hidden>open observer_state.bts</button>
    </div>
  `;
}

// ../../docs/games/metagame/stages/stage8/testhook.js
function installTestHook(api) {
  const hook = {
    state: () => api.state,
    config: (level) => levelConfig(level ?? api.state.currentLevel),
    aids: () => ({ clarity: api.state.clarity, ...api.getAids() }),
    buyAid: (id) => api.buyAid(id),
    crossAt(ms) {
      api.crossAt(Number(ms) || 0);
    },
    geometry: () => api.geometry(),
    steerTo: (angleDeg) => api.steerTo(angleDeg),
    // CROSS the current level at its perfect moment(s) for the seed it actually uses right now.
    solveLevel() {
      const sol = solveMoment(api.activeSeed(), api.state.currentLevel);
      for (const t of Array.isArray(sol) ? sol : [sol]) api.crossAt(t);
      return api.state.currentLevel;
    },
    // Clear the learnable front. Online this STALLS at the first onlineUnstable level (its gap reseeds
    // on every commit) — proving the back third demands the offline un-cheat.
    solveStableBody() {
      let guard = 0;
      while (api.state.currentLevel < BOSS_LEVEL && !levelConfig(api.state.currentLevel).onlineUnstable && guard++ < 96) {
        const before = api.state.currentLevel;
        this.solveLevel();
        if (api.state.currentLevel === before) break;
      }
      return api.state.currentLevel;
    },
    // Full run to defeat (assumes Offline Mode already activated by the player/smoke).
    solveOffline() {
      let guard = 0;
      while (api.state.currentLevel < BOSS_LEVEL && guard++ < 96) {
        const before = api.state.currentLevel;
        this.solveLevel();
        if (api.state.currentLevel === before) break;
      }
      api.reobserve();
      api.crossAt(solveMoment(FIXED_OFFLINE_SEED, BOSS_LEVEL));
      return Boolean(api.state.boss.defeated);
    }
  };
  window.__fvStage8 = hook;
  return () => {
    if (window.__fvStage8 === hook) delete window.__fvStage8;
  };
}

// ../../docs/games/metagame/stages/stage8/s8dev.js
var DEV_CONTROLS = [
  { id: "add-clarity", label: "+100 clarity" },
  { id: "stabilizer-3", label: "Arm 3 Stabilizers" },
  { id: "unlock-offline", label: "Force offline mode" },
  { id: "skip-to-boss", label: "Skip to boss (offline)" },
  { id: "reveal-pattern", label: "Log solve moment" }
];
function pushLog2(state, line) {
  state.log = [...state.log || [], line].slice(-6);
}
function devAddClarity(state) {
  state.clarity = Number(state.clarity || 0) + 100;
  pushLog2(state, "[dev] +100 clarity.");
}
function devStabilizer3(state) {
  state.aids = state.aids && typeof state.aids === "object" ? state.aids : {};
  state.aids.stabilizer = Number(state.aids.stabilizer || 0) + 3;
  pushLog2(state, "[dev] 3 stabilizer charges armed.");
}
function devUnlockOffline(state) {
  state.offlineMode = true;
  state.offlineControlVisible = true;
  state.notesRead = true;
  state.boss.fixedSeed = FIXED_OFFLINE_SEED;
  pushLog2(state, "[dev] offline mode forced — seed fixed to 0.");
}
function devSkipToBoss(state) {
  devUnlockOffline(state);
  state.currentLevel = BOSS_LEVEL;
  pushLog2(state, `[dev] jumped to level ${BOSS_LEVEL} (offline, seed fixed).`);
}
function devRevealPattern(state, seed) {
  const sol = solveMoment(seed, state.currentLevel);
  const text = Array.isArray(sol) ? `[dev] level ${state.currentLevel} beats: [${sol.join(", ")}] ms` : `[dev] level ${state.currentLevel} solve at ${sol} ms`;
  pushLog2(state, text);
  return sol;
}
function applyDevControl(id, state, { seed = 0 } = {}) {
  switch (id) {
    case "add-clarity":
      devAddClarity(state);
      return true;
    case "stabilizer-3":
      devStabilizer3(state);
      return true;
    case "unlock-offline":
      devUnlockOffline(state);
      return true;
    case "skip-to-boss":
      devSkipToBoss(state);
      return true;
    case "reveal-pattern":
      devRevealPattern(state, seed);
      return true;
    default:
      return false;
  }
}

// ../../docs/games/metagame/stages/stage8/canvas-modes.js
var RING_COLOR = "#5dcaa5";
var RING_COLOR_DIM = "#2a2a2a";
var GAP_BG = "#000";
var DARKZONE_COLOR = "#f5a623";
var GHOST_HIT = "#8ef7d1";
var GHOST_MISS = "#666";
var EYE_COLOR = "rgba(93, 202, 165, 0.28)";
var EYE_DOT = "#dfffef";
function toRad(deg) {
  return (deg - 90) * Math.PI / 180;
}
function mod3603(a) {
  return (a % 360 + 360) % 360;
}
function strokeFullRing(ctx, { cx, cy, r }, color, lineWidth) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
}
function paintWedge(ctx, { cx, cy, r }, centerDeg, widthDeg, lineWidth, color) {
  const half = Math.max(1, widthDeg) / 2;
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth + 2;
  ctx.arc(cx, cy, r, toRad(centerDeg - half), toRad(centerDeg + half));
  ctx.stroke();
}
function ringLineWidth(r) {
  return Math.max(4, r * 0.13);
}
function drawSingleGap(ctx, geom, opts) {
  const { angle, tolerance, darkZone, ghosts = [] } = opts;
  const lw = ringLineWidth(geom.r);
  strokeFullRing(ctx, geom, RING_COLOR, lw);
  paintWedge(ctx, geom, angle, tolerance, lw, GAP_BG);
  if (darkZone) {
    const span = angularSpan(darkZone);
    paintWedge(ctx, geom, span.center, span.width, lw, DARKZONE_COLOR);
  }
  for (const g of ghosts) {
    const p = polarPoint(geom, g.angle, geom.r);
    ctx.beginPath();
    ctx.fillStyle = g.result === "hit" || g.hit ? GHOST_HIT : GHOST_MISS;
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}
function drawDualGap(ctx, geom, opts) {
  const { inner, outer, tolerance } = opts;
  const outerGeom = geom;
  const innerGeom = { cx: geom.cx, cy: geom.cy, r: geom.r * 0.55 };
  const lwOuter = ringLineWidth(outerGeom.r);
  const lwInner = ringLineWidth(innerGeom.r);
  strokeFullRing(ctx, outerGeom, RING_COLOR, lwOuter);
  paintWedge(ctx, outerGeom, outer, tolerance, lwOuter, GAP_BG);
  strokeFullRing(ctx, innerGeom, RING_COLOR_DIM, lwInner);
  ctx.globalAlpha = 0.8;
  strokeFullRing(ctx, innerGeom, RING_COLOR, lwInner * 0.7);
  ctx.globalAlpha = 1;
  paintWedge(ctx, innerGeom, inner, tolerance + 6, lwInner, GAP_BG);
}
function drawMultiGap(ctx, geom, opts) {
  const { gaps, tolerance } = opts;
  const lw = ringLineWidth(geom.r);
  strokeFullRing(ctx, geom, RING_COLOR, lw);
  for (const g of gaps) paintWedge(ctx, geom, g, tolerance, lw, GAP_BG);
}
function drawStealthGap(ctx, geom, opts) {
  const { gap, eye, tolerance, blind } = opts;
  const lw = ringLineWidth(geom.r);
  strokeFullRing(ctx, geom, RING_COLOR, lw);
  paintWedge(ctx, geom, gap, tolerance, lw, GAP_BG);
  ctx.beginPath();
  ctx.strokeStyle = EYE_COLOR;
  ctx.lineWidth = lw + 6;
  const half = blind / 2;
  ctx.arc(geom.cx, geom.cy, geom.r, toRad(eye - half), toRad(eye + half));
  ctx.stroke();
  const p = polarPoint(geom, eye, geom.r);
  ctx.beginPath();
  ctx.fillStyle = EYE_DOT;
  ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
  ctx.fill();
}
function angularSpan(zone) {
  const s = mod3603(zone.start);
  const e = mod3603(zone.end);
  const width = mod3603(e - s);
  const center = mod3603(s + width / 2);
  return { center, width: Math.max(width, 1) };
}
function polarPoint({ cx, cy, r }, deg, radius = r) {
  const rad = toRad(deg);
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}

// ../../docs/games/metagame/stages/stage8/canvas-ring.js
var UNKNOWN_RING_COLOR = "#444";
var SHIP_COLOR = "#8ef7d1";
var SHIP_GLOW = "rgba(142, 247, 209, 0.9)";
var TRAIL_COLOR = "142, 247, 209";
var TRAIL_MS = 4e3;
var LAUNCH_MS = 380;
function prepCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (w === 0 || h === 0) return null;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}
function drawArena(canvas, frame) {
  const prepped = prepCanvas(canvas);
  if (!prepped) return;
  const { ctx, w, h } = prepped;
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  const r = Math.max(8, Math.min(w, h) / 2 - 10);
  const geom = { cx, cy, r };
  const { cfg, seed, ms, shipAngle = 0, shipPath = [], launchAnim = null, ghosts = [], shipIntensity = 0 } = frame;
  if (cfg.display === "hidden") {
    drawUnknownRing(ctx, geom);
  } else {
    drawGapGeometry(ctx, geom, cfg, seed, ms, shipAngle, ghosts);
  }
  drawTrail(ctx, geom, shipPath, ms);
  drawShip(ctx, geom, shipAngle, shipIntensity);
  if (launchAnim) drawLaunchAnim(ctx, geom, launchAnim, ms);
}
function drawGapGeometry(ctx, geom, cfg, seed, ms, shipAngle, ghosts) {
  const mode = getMode(cfg.mode);
  if (cfg.mode === "dual") {
    const { inner, outer } = mode.anglesAt(cfg, seed, ms);
    drawDualGap(ctx, geom, { inner, outer, tolerance: cfg.tolerance });
    return;
  }
  if (cfg.mode === "multigap") {
    drawMultiGap(ctx, geom, { gaps: mode.gapsAt(cfg, seed, ms), tolerance: cfg.tolerance });
    return;
  }
  if (cfg.mode === "stealth") {
    const gap = mode.gapAngle(cfg, seed, ms);
    const eye = mode.eyeAngle(cfg, seed, ms);
    drawStealthGap(ctx, geom, { gap, eye, tolerance: cfg.tolerance, blind: cfg.blind || 60 });
    return;
  }
  const angle = mode.angleAt(cfg, seed, ms);
  const darkZone = effectiveDarkZone(cfg, shipAngle);
  drawSingleGap(ctx, geom, { angle, tolerance: cfg.tolerance, darkZone, ghosts });
}
function drawUnknownRing(ctx, { cx, cy, r }) {
  ctx.beginPath();
  ctx.strokeStyle = UNKNOWN_RING_COLOR;
  ctx.lineWidth = Math.max(4, r * 0.13);
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
}
function drawShip(ctx, geom, shipAngle, intensity) {
  const p = polarPoint(geom, shipAngle, geom.r);
  const rad = (shipAngle - 90) * Math.PI / 180;
  const size = 9;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(rad + Math.PI / 2);
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.7, size * 0.7);
  ctx.lineTo(-size * 0.7, size * 0.7);
  ctx.closePath();
  const glow = Math.max(0, Math.min(1, Number(intensity) || 0));
  ctx.fillStyle = glow > 0.05 ? SHIP_GLOW : SHIP_COLOR;
  if (glow > 0.05) {
    ctx.shadowColor = SHIP_GLOW;
    ctx.shadowBlur = 6 + glow * 10;
  }
  ctx.fill();
  ctx.restore();
}
function drawTrail(ctx, geom, shipPath, nowMs) {
  for (const sample of shipPath) {
    const age = nowMs - sample.ms;
    if (age < 0 || age > TRAIL_MS) continue;
    const alpha = 0.5 * (1 - age / TRAIL_MS);
    if (alpha <= 0.01) continue;
    const p = polarPoint(geom, sample.angle, geom.r);
    ctx.beginPath();
    ctx.fillStyle = `rgba(${TRAIL_COLOR}, ${alpha.toFixed(3)})`;
    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
function drawLaunchAnim(ctx, geom, launchAnim, nowMs) {
  const t = nowMs - launchAnim.startMs;
  if (t < 0 || t > LAUNCH_MS) return;
  const progress = t / LAUNCH_MS;
  const p = polarPoint(geom, launchAnim.fromAngle, geom.r);
  const color = launchAnim.hit ? "142, 247, 209" : "192, 57, 43";
  ctx.beginPath();
  ctx.strokeStyle = `rgba(${color}, ${(1 - progress).toFixed(3)})`;
  ctx.lineWidth = 2.5;
  ctx.arc(p.x, p.y, 4 + progress * 22, 0, Math.PI * 2);
  ctx.stroke();
}
function launchAnimExpired(launchAnim, nowMs) {
  return !launchAnim || nowMs - launchAnim.startMs > LAUNCH_MS;
}

// ../../docs/games/metagame/stages/stage8/hud.js
import { banner } from "../../shared/feedback.js";
function paintBossPanel({ fields, arenaWrap, lock, state, bossLevel, revealLevel, bossRevealedRef }) {
  const reveal = state.currentLevel >= revealLevel || state.boss.defeated;
  fields.bossPanel.classList.toggle("s8-boss--chip", !reveal);
  fields.bossChip.textContent = `OBSERVER — level ${bossLevel} · ${state.boss.defeated ? "defeated" : "locked"}`;
  if (reveal && !bossRevealedRef.value) {
    bossRevealedRef.value = true;
    banner(arenaWrap, "THE OBSERVER STIRS");
  }
  if (state.boss.defeated) fields.boss.textContent = "defeated. BTS trace available.";
  else if (state.currentLevel < bossLevel) fields.boss.textContent = `clear levels to reach the Observer (level ${bossLevel}).`;
  else fields.boss.textContent = `${lock.unlocked ? "UNLOCKED — cross on the learned timing" : "reachable — read the live gap, or go offline to learn it"} / ${lock.seedMode}`;
}
function paintStreak({ fields, cfg, rhythmChain }) {
  const isRhythm = cfg.mode === "rhythm";
  fields.streak.hidden = !isRhythm;
  if (isRhythm) fields.streak.textContent = `hits ${rhythmChain}/${Math.max(2, cfg.chain || 3)}`;
}
function paintTach({ fields, state, cfg, seed, elapsedMs, level, shipAngle }) {
  const owned = Boolean(state.aids && state.aids.tachometer);
  fields.tachWrap.hidden = !owned;
  if (!owned) return;
  const r = crossAttempt({ seed, elapsedMs, level, shipAngle });
  const ang = Number.isFinite(r.angle) ? `${Math.round(r.angle)}deg` : `${Math.round(r.distance)}deg off`;
  fields.tach.textContent = `${ang} @ ${Math.round(cfg.speed || cfg.speedInner || cfg.oscBase || 0)}deg/s`;
}
function paintAids({ root, fields, arenaWrap, state, offline, shouldRevealAids: shouldRevealAids2, shouldRevealPeek: shouldRevealPeek2 }) {
  const reveal = shouldRevealAids2(state);
  if (reveal && !state.aidsRevealed) {
    state.aidsRevealed = true;
    banner(arenaWrap, "clarity can be spent — calibration available");
  }
  fields.aids.hidden = !reveal;
  const showPeek = shouldRevealPeek2(offline);
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

// ../../docs/games/metagame/stages/stage8/renderer.js
import { banner as banner2, floatNum } from "../../shared/feedback.js";
import { openModal } from "../../shared/modal.js";
var MARKER_READY_DEG = 30;
var BOSS_REVEAL_LEVEL = 13;
var MISS_CLARITY_COST = 4;
var SHIP_TURN_SPEED_DEG_PER_SEC = 150;
var TRAIL_SAMPLE_MS = 40;
var TRAIL_KEEP_MS = 4e3;
function renderStage9({ host, state, actions, achievements, bell, bts, viewer, save, onStageComplete }) {
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
  const bossRevealedRef = { value: state.currentLevel >= BOSS_REVEAL_LEVEL };
  const completeOnce = once((result) => {
    if (typeof onStageComplete === "function") onStageComplete(result);
  });
  let elapsedMs = 0;
  let liveSeed = null;
  let rhythmChain = 0;
  let attempts = [];
  let shipAngle = 0;
  const keysHeld = { left: false, right: false };
  let shipPath = [];
  let launchAnim = null;
  let lastTrailSampleMs = -Infinity;
  function offlineUnlocked() {
    return hasOfflineModeActivated(actions) || Boolean(state.offlineMode);
  }
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
    const cfg = levelConfig(state.currentLevel);
    if (cfg.mode !== prevMode && !state.boss.defeated) {
      const mv = movementForLevel(state.currentLevel);
      banner2(arenaWrap, `${mv.name.toUpperCase()} — ${mv.verb}`);
    }
    if (state.currentLevel >= BOSS_LEVEL) pushLog3(`level ${BOSS_LEVEL}: THE OBSERVER EFFECT. the gap will not hold still while live.`);
  }
  function resetShip() {
    shipAngle = 0;
    shipPath = [];
    lastTrailSampleMs = -Infinity;
    launchAnim = null;
  }
  function crossSublevel() {
    const level = state.currentLevel;
    const cfg = levelConfig(level);
    if (cfg.onlineUnstable && !offlineUnlocked()) {
      state.clarity = Math.max(0, Number(state.clarity || 0) - MISS_CLARITY_COST);
      liveSeed = getBossSeed({ state, actions });
      state.boss.lockHintStep = Math.min(Number(state.boss.lockHintStep || 0) + 1, 3);
      pushLog3("the gap reseeded the instant you committed. nothing holds while live. (go offline.)");
      return "miss";
    }
    const seed = activeSeed();
    const toleranceMult = consumeStabilizer(state);
    if (toleranceMult > 1) pushLog3("stabilizer lens engaged (+tolerance for this cross).");
    const result = crossAttempt({ seed, elapsedMs, level, toleranceMult, shipAngle });
    if (cfg.mode === "ghostecho") attempts = [...attempts, { ms: elapsedMs, hit: result.hit }].slice(-2);
    if (cfg.mode === "rhythm") {
      const need = Math.max(2, cfg.chain || 3);
      if (result.hit) {
        rhythmChain += 1;
        if (rhythmChain >= need) {
          state.clarity = Number(state.clarity || 0) + cfg.movement * 5;
          pushLog3(`cadence held — ${need} crosses on the beat. advancing.`);
          advanceFrom(level);
        } else {
          pushLog3(`on beat (${rhythmChain}/${need}). hold the cadence.`);
        }
        return crossOutcome(result);
      }
      rhythmChain = 0;
      state.clarity = Math.max(0, Number(state.clarity || 0) - MISS_CLARITY_COST);
      pushLog3(`chain broken (off by ${Math.round(result.distance)}deg). cadence reset.`);
      return "miss";
    }
    if (result.hit) {
      state.clarity = Number(state.clarity || 0) + cfg.movement * 5;
      pushLog3(`level ${level} crossed (gap at top). advancing.`);
      advanceFrom(level);
      return crossOutcome(result);
    }
    state.clarity = Math.max(0, Number(state.clarity || 0) - MISS_CLARITY_COST);
    pushLog3(`mistimed (off by ${Math.round(result.distance)}deg). clarity -${MISS_CLARITY_COST}.`);
    return "miss";
  }
  function challengeBoss() {
    const result = recordObserverBossAttempt({ state, actions, elapsedMs, seed: activeSeed(), shipAngle });
    if (!result.unlocked && !result.hit) liveSeed = state.boss.lastLockedSeed;
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
    if (gained > 0) floatNum(arenaWrap, `+${gained} clarity`, "good");
  }
  function updateReadout(outcome, seed, level, pressMs) {
    const cfg = levelConfig(level);
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
  function flashArena(outcome) {
    if (!outcome) return;
    const el = fields.arena;
    el.classList.remove(...FLASH_CLASSES);
    void el.offsetWidth;
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
        case "observe":
          reobserve();
          break;
        case "cross":
          doCross();
          break;
        case "aid":
          buyAidAction(button.dataset.aid);
          break;
        case "notes":
          openNotes();
          break;
        case "offline":
          activateOfflineMode({ state, actions, achievements, bell });
          break;
        case "log":
          openLog();
          break;
        case "bts":
          openBts({ bts, viewer });
          break;
      }
      persistAndPaint();
      return;
    }
    if (event.target.closest(".s8-canvas")) {
      doCross();
      persistAndPaint();
    }
  });
  function onKey(event) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (!root.isConnected || document.querySelector(".mg-modal-backdrop")) return;
    const t = event.target;
    if (t && typeof t.closest === "function" && t.closest("button, input, textarea, select, [contenteditable]")) return;
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      doCross();
      persistAndPaint();
    } else if (event.key === "r" || event.key === "R") {
      event.preventDefault();
      reobserve();
      persistAndPaint();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      keysHeld.left = true;
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      keysHeld.right = true;
    }
  }
  function onKeyUp(event) {
    if (event.key === "ArrowLeft") keysHeld.left = false;
    else if (event.key === "ArrowRight") keysHeld.right = false;
  }
  function onBlur() {
    keysHeld.left = false;
    keysHeld.right = false;
  }
  document.addEventListener("keydown", onKey);
  document.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  function buyAidAction(id) {
    const offline = offlineUnlocked();
    const res = buyAid(state, id, { offline });
    if (!res.ok) {
      const why = { "offline-only": "single-frame only works in Offline Mode (online the seed reseeds).", insufficient: "not enough clarity.", owned: "already owned." }[res.reason] || "cannot buy that.";
      pushLog3(why);
      return res;
    }
    if (id === "stabilizer") pushLog3("stabilizer lens armed: your next CROSS gets a wider window.");
    if (id === "tachometer") pushLog3("tachometer online: numeric gap readout enabled.");
    if (id === "peek") doPeek();
    return res;
  }
  function doPeek() {
    const r = crossAttempt({ seed: activeSeed(), elapsedMs, level: state.currentLevel, shipAngle });
    const ang = Number.isFinite(r.angle) ? `gap at ${Math.round(r.angle)}deg` : "two gaps to align";
    pushLog3(`single-frame: ${ang} (${Math.round(r.distance)}deg from your ship).`);
  }
  const loop = startLoop((dt) => {
    if (!state.boss.defeated) elapsedMs += dt;
    if (!state.boss.defeated) {
      if (keysHeld.left) shipAngle -= SHIP_TURN_SPEED_DEG_PER_SEC * dt / 1e3;
      if (keysHeld.right) shipAngle += SHIP_TURN_SPEED_DEG_PER_SEC * dt / 1e3;
      shipAngle = (shipAngle % 360 + 360) % 360;
      if (elapsedMs - lastTrailSampleMs >= TRAIL_SAMPLE_MS) {
        shipPath = [...shipPath, { angle: shipAngle, ms: elapsedMs }].filter((s) => elapsedMs - s.ms <= TRAIL_KEEP_MS);
        lastTrailSampleMs = elapsedMs;
      }
    }
    if (launchAnimExpired(launchAnim, elapsedMs)) launchAnim = null;
    paintArena();
  });
  repaint();
  const uninstallHook = installTestHook({
    state,
    activeSeed,
    reobserve,
    getAids: () => ({ ...state.aids }),
    buyAid: (id) => buyAidAction(id),
    crossAt(ms) {
      elapsedMs = Number(ms) || 0;
      doCross();
      persistAndPaint();
    },
    geometry: () => ({ shipAngle, elapsedMs, level: state.currentLevel }),
    steerTo(angleDeg) {
      shipAngle = ((Number(angleDeg) || 0) % 360 + 360) % 360;
    }
  });
  return {
    repaint,
    dev(id) {
      applyDevControl(id, state, { seed: activeSeed() });
      persistAndPaint();
    },
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
  function openLog() {
    const list = document.createElement("ol");
    list.className = "s8-log-full";
    for (const line of state.log || []) {
      const li = document.createElement("li");
      li.textContent = line;
      list.appendChild(li);
    }
    openModal({ title: "observer log", contentEl: list, className: "s8-log-modal" });
  }
  function pushLog3(line) {
    state.log = [...state.log || [], line].slice(-6);
  }
  function paintArena() {
    const seed = activeSeed();
    const level = state.currentLevel;
    const cfg = levelConfig(level);
    const r = crossAttempt({ seed, elapsedMs, level, shipAngle });
    const intensity = markerIntensity(r.distance, MARKER_READY_DEG);
    const ghosts = cfg.mode === "ghostecho" ? attempts.map((at) => ({ angle: crossAttempt({ seed, elapsedMs: at.ms, level }).angle, result: at.hit ? "hit" : "miss" })) : [];
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
    if (!unstable) fields.seedWrap.hidden = true;
    else {
      fields.seedWrap.hidden = false;
      fields.seed.textContent = lock.unlocked ? "seed 0 · fixed cache" : "live-random — unlearnable online";
    }
    hud.classList.toggle("s8-hud--unstable", unstable && !lock.unlocked);
    fields.arena.classList.toggle("s8-canvas--unstable", unstable && !lock.unlocked);
    fields.observeLabel.textContent = unstable ? "OBSERVE (reseeds online)" : "OBSERVE (reset rotation)";
    paintBossPanel({ fields, arenaWrap, lock, state, bossLevel: BOSS_LEVEL, revealLevel: BOSS_REVEAL_LEVEL, bossRevealedRef });
    paintStreak({ fields, cfg, rhythmChain });
    paintTach({ fields, state, cfg, seed: activeSeed(), elapsedMs, level: state.currentLevel, shipAngle });
    paintAids({ root, fields, arenaWrap, state, offline: offlineUnlocked(), shouldRevealAids, shouldRevealPeek });
    paintArena();
    fields.hint.textContent = unstable && !lock.unlocked ? lock.hint : modeHint(cfg);
    root.querySelector('[data-action="offline"]').hidden = !state.offlineControlVisible;
    root.querySelector('[data-action="bts"]').hidden = !state.boss.defeated;
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

// ../../docs/games/metagame/stages/stage8/state.js
function defaultState() {
  return {
    version: 2,
    notesRead: false,
    offlineControlVisible: false,
    offlineMode: false,
    clarity: 0,
    aids: defaultAids(),
    aidsRevealed: false,
    currentLevel: 1,
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
  const staleV1 = Number(target.version) === 1;
  target.version = 2;
  target.notesRead = Boolean(target.notesRead);
  target.offlineControlVisible = Boolean(target.offlineControlVisible);
  target.offlineMode = Boolean(target.offlineMode);
  target.clarity = Number.isFinite(Number(target.clarity)) ? Number(target.clarity) : fresh.clarity;
  target.aids = normalizeAids(target.aids);
  target.aidsRevealed = Boolean(target.aidsRevealed);
  const lvl = Number.isFinite(Number(target.currentLevel)) ? Number(target.currentLevel) : fresh.currentLevel;
  target.currentLevel = staleV1 ? fresh.currentLevel : Math.max(1, Math.min(BOSS_LEVEL, lvl));
  target.lockedSeedSamples = Array.isArray(target.lockedSeedSamples) ? target.lockedSeedSamples : fresh.lockedSeedSamples;
  target.log = Array.isArray(target.log) ? target.log : fresh.log;
  target.boss = { ...fresh.boss, ...target.boss && typeof target.boss === "object" ? target.boss : {} };
  target.meta = { ...fresh.meta, ...target.meta && typeof target.meta === "object" ? target.meta : {} };
  return target;
}

// ../../docs/games/metagame/stages/stage8/index.js
var stageMeta = {
  id: 8,
  slug: "observer-state",
  name: "Observer State",
  btsPath: BTS_PATH,
  requiredAction: REQUIRED_ACTION,
  // Dev-menu controls for this stage (wired in metagame.js → mounted.dev(id)).
  devControls: DEV_CONTROLS
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
    devControls: stageMeta.devControls,
    dev(id) {
      if (view && typeof view.dev === "function") view.dev(id);
    },
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
  return Boolean(detail && Number(detail.stage) === 8 && detail.action === ACTION_NAME);
}
function ensureStyles() {
  const id = "stage8-observer-state-styles";
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
