// GENERATED — DO NOT EDIT BY HAND.
// Bundled from docs/games/metagame/stages/stage9/index.js (+ its local modules) by
// build/metagame/build.mjs. Rebuild:  node build/metagame/build.mjs  (run by scripts/check.sh).
// Exports stageMeta / defaultState / mountStage. Shared ../../*.js singletons + ./styles.css stay
// external (NOT inlined). The hub's stage-manifest.js LOADERS import THIS file.


// ../../docs/games/metagame/stages/stage9/messages.js
var ACTION_NAME = "offline_mode_activated";
var REQUIRED_ACTION = "9.offline_mode_activated";
var ACHIEVEMENT_ID = "stage9.offline_mode_activated";
var ACHIEVEMENT_TEXT = "I learned the shape of the silence.";
var BTS_PATH = "/docs/bts/observer_state.bts";
var NOTES_PATH = "/docs/examples/metagame/stage9/service-worker-notes.txt";
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
  "read service-worker-notes.txt, then activate Offline Mode for Stage 9."
];
var btsSummary = [
  "The compact slice simulates the seed endpoint in stage logic.",
  "The intended browser mapping is a service worker fetch that falls back to the cached default seed when the network is unavailable.",
  "Once offline mode is active, the boss seed becomes fixed at 0 so the rotating gap is learnable."
];

// ../../docs/games/metagame/stages/stage9/rng.js
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

// ../../docs/games/metagame/stages/stage9/ring.js
var RING_W = 25;
var RING_H = 13;
var DEFAULT_GAP_DEG = 20;
function ringAngle(seed, elapsedMs, rotSpeedDegPerSec = 30) {
  const base = makeRng(seed).float() * 360;
  return mod360(base + rotSpeedDegPerSec * (Number(elapsedMs) || 0) / 1e3);
}
function renderRing(gapAngleDeg, opts = {}) {
  const { gapWidth = DEFAULT_GAP_DEG, darkZone = null, ghosts = [], hidden = false } = opts;
  const grid = Array.from({ length: RING_H }, () => Array(RING_W).fill(" "));
  const cx = (RING_W - 1) / 2;
  const cy = (RING_H - 1) / 2;
  for (let a = 0; a < 360; a += 3) {
    const rad = (a - 90) * Math.PI / 180;
    const x = Math.round(cx + cx * Math.cos(rad));
    const y = Math.round(cy + cy * Math.sin(rad));
    if (y < 0 || y >= RING_H || x < 0 || x >= RING_W) continue;
    let ch = hidden ? "?" : ringChar(a);
    if (!hidden && inArc(a, gapAngleDeg, gapWidth)) ch = " ";
    for (const g of ghosts) if (inArc(a, g.angle, 6)) ch = g.result === "hit" || g.hit ? "⊕" : "·";
    if (darkZone && inZone(a, darkZone)) ch = "█";
    grid[y][x] = ch;
  }
  return grid.map((row) => row.join("")).join("\n");
}
function ringChar(a) {
  const d = mod360(a);
  if (inArc(d, 0, 60) || inArc(d, 180, 60)) return "─";
  if (inArc(d, 90, 60) || inArc(d, 270, 60)) return "│";
  return "+";
}
function mod360(a) {
  return (a % 360 + 360) % 360;
}
function angularDist(a, b) {
  return Math.abs(((a - b) % 360 + 540) % 360 - 180);
}
function inArc(a, center, width) {
  return angularDist(a, center) <= width / 2;
}
function inZone(a, zone) {
  const x = mod360(a);
  const s = mod360(zone.start);
  const e = mod360(zone.end);
  return s <= e ? x >= s && x <= e : x >= s || x <= e;
}

// ../../docs/games/metagame/stages/stage9/rings.js
var RING_W2 = 25;
var RING_H2 = 13;
function renderConcentric(innerAngleDeg, outerAngleDeg, opts = {}) {
  const { gapWidth = 22, darkZone = null } = opts;
  const grid = blankGrid();
  const cx = (RING_W2 - 1) / 2;
  const cy = (RING_H2 - 1) / 2;
  plotRing(grid, cx, cy, cx, cy, outerAngleDeg, gapWidth, "─", "│", darkZone);
  plotRing(grid, cx, cy, cx * 0.55, cy * 0.55, innerAngleDeg, gapWidth + 6, "=", "‖", darkZone);
  return gridToString(grid);
}
function renderStealth(gapAngleDeg, eyeAngleDeg, opts = {}) {
  const { gapWidth = 20, blind = 60 } = opts;
  const grid = blankGrid();
  const cx = (RING_W2 - 1) / 2;
  const cy = (RING_H2 - 1) / 2;
  for (let a = 0; a < 360; a += 3) {
    const { x, y } = project(cx, cy, cx, cy, a);
    if (offGrid(x, y)) continue;
    const inGap = inArc2(a, gapAngleDeg, gapWidth);
    let ch = inGap ? " " : ringChar2(a);
    if (inArc2(a, eyeAngleDeg, blind)) ch = inGap ? "▒" : "▓";
    grid[y][x] = ch;
  }
  const ep = project(cx, cy, cx, cy, eyeAngleDeg);
  if (!offGrid(ep.x, ep.y)) grid[ep.y][ep.x] = "@";
  return gridToString(grid);
}
function renderMultiGap(gapAngles = [], opts = {}) {
  const { gapWidth = 20, darkZone = null } = opts;
  const grid = blankGrid();
  const cx = (RING_W2 - 1) / 2;
  const cy = (RING_H2 - 1) / 2;
  for (let a = 0; a < 360; a += 3) {
    const { x, y } = project(cx, cy, cx, cy, a);
    if (offGrid(x, y)) continue;
    let ch = ringChar2(a);
    for (const g of gapAngles) if (inArc2(a, g, gapWidth)) ch = " ";
    if (darkZone && inZone2(a, darkZone)) ch = "█";
    grid[y][x] = ch;
  }
  return gridToString(grid);
}
function plotRing(grid, cx, cy, rx, ry, gapAngle, gapWidth, hChar, vChar, darkZone) {
  for (let a = 0; a < 360; a += 3) {
    const { x, y } = project(cx, cy, rx, ry, a);
    if (offGrid(x, y)) continue;
    let ch = inArc2(a, 0, 60) || inArc2(a, 180, 60) ? hChar : inArc2(a, 90, 60) || inArc2(a, 270, 60) ? vChar : "+";
    if (inArc2(a, gapAngle, gapWidth)) ch = " ";
    if (darkZone && inZone2(a, darkZone)) ch = "█";
    grid[y][x] = ch;
  }
}
function project(cx, cy, rx, ry, a) {
  const rad = (a - 90) * Math.PI / 180;
  return { x: Math.round(cx + rx * Math.cos(rad)), y: Math.round(cy + ry * Math.sin(rad)) };
}
function blankGrid() {
  return Array.from({ length: RING_H2 }, () => Array(RING_W2).fill(" "));
}
function gridToString(grid) {
  return grid.map((row) => row.join("")).join("\n");
}
function offGrid(x, y) {
  return y < 0 || y >= RING_H2 || x < 0 || x >= RING_W2;
}
function ringChar2(a) {
  if (inArc2(a, 0, 60) || inArc2(a, 180, 60)) return "─";
  if (inArc2(a, 90, 60) || inArc2(a, 270, 60)) return "│";
  return "+";
}
function mod3602(a) {
  return (a % 360 + 360) % 360;
}
function angularDist2(a, b) {
  return Math.abs(((a - b) % 360 + 540) % 360 - 180);
}
function inArc2(a, center, width) {
  return angularDist2(a, center) <= width / 2;
}
function inZone2(a, zone) {
  const x = mod3602(a);
  const s = mod3602(zone.start);
  const e = mod3602(zone.end);
  return s <= e ? x >= s && x <= e : x >= s || x <= e;
}

// ../../docs/games/metagame/stages/stage9/modes.js
var TWO_PI = Math.PI * 2;
function mod3603(a) {
  return (a % 360 + 360) % 360;
}
function angularDist3(a, b) {
  return Math.abs(((a - b) % 360 + 540) % 360 - 180);
}
function ringSpeed(cfg, seed) {
  return (cfg.speed || 30) + makeRng(`${seed}s`).float() * (cfg.speedVar || 0);
}
function scanSolve(angleAt, tol, { maxMs = 4e4, step = 4 } = {}) {
  let bestT = 0;
  let bestD = Infinity;
  for (let t = 0; t <= maxMs; t += step) {
    const d = angularDist3(angleAt(t), 0);
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
  evaluate(cfg, seed, ms) {
    const angle = this.angleAt(cfg, seed, ms);
    const distance = angularDist3(angle, 0);
    return { hit: distance <= cfg.tolerance / 2, angle, distance, tolerance: cfg.tolerance };
  },
  solveMoment(cfg, seed) {
    const speed = ringSpeed(cfg, seed);
    const base = ringAngle(seed, 0, speed);
    return Math.round(((360 - base) % 360 + 360) % 360 / speed * 1e3);
  },
  render(cfg, seed, ms) {
    return renderRing(this.angleAt(cfg, seed, ms), {
      gapWidth: cfg.tolerance,
      hidden: cfg.display === "hidden",
      darkZone: cfg.darkZone || null
    });
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
    return mod3603(base + integral);
  },
  evaluate(cfg, seed, ms) {
    const angle = this.angleAt(cfg, seed, ms);
    const distance = angularDist3(angle, 0);
    return { hit: distance <= cfg.tolerance / 2, angle, distance, tolerance: cfg.tolerance };
  },
  solveMoment(cfg, seed) {
    return scanSolve((t) => this.angleAt(cfg, seed, t), cfg.tolerance);
  },
  render(cfg, seed, ms) {
    return renderRing(this.angleAt(cfg, seed, ms), { gapWidth: cfg.tolerance, darkZone: cfg.darkZone || null });
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
    return mod3603(angle);
  },
  evaluate(cfg, seed, ms) {
    const angle = this.angleAt(cfg, seed, ms);
    const distance = angularDist3(angle, 0);
    return { hit: distance <= cfg.tolerance / 2, angle, distance, tolerance: cfg.tolerance };
  },
  solveMoment(cfg, seed) {
    return scanSolve((t) => this.angleAt(cfg, seed, t), cfg.tolerance, { maxMs: 6e4 });
  },
  render(cfg, seed, ms) {
    return renderRing(this.angleAt(cfg, seed, ms), { gapWidth: cfg.tolerance, darkZone: cfg.darkZone || null });
  }
};
function dualParams(cfg, seed) {
  const r = makeRng(`${seed}d`);
  const si = cfg.speedInner || 45;
  const so = cfg.speedOuter || 30;
  const tAlign = 1500 + Math.floor(r.float() * 4e3);
  return { si, so, tAlign, bi: mod3603(-si * tAlign / 1e3), bo: mod3603(-so * tAlign / 1e3) };
}
var dual = {
  anglesAt(cfg, seed, ms) {
    const { si, so, bi, bo } = dualParams(cfg, seed);
    return { inner: mod3603(bi + si * ms / 1e3), outer: mod3603(bo + so * ms / 1e3) };
  },
  evaluate(cfg, seed, ms) {
    const { inner, outer } = this.anglesAt(cfg, seed, ms);
    const di = angularDist3(inner, 0);
    const dou = angularDist3(outer, 0);
    const distance = Math.max(di, dou);
    return { hit: di <= cfg.tolerance / 2 && dou <= cfg.tolerance / 2, distance, inner, outer, tolerance: cfg.tolerance };
  },
  solveMoment(cfg, seed) {
    return dualParams(cfg, seed).tAlign;
  },
  render(cfg, seed, ms) {
    const { inner, outer } = this.anglesAt(cfg, seed, ms);
    return renderConcentric(inner, outer, { gapWidth: cfg.tolerance, darkZone: cfg.darkZone || null });
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
    return Array.from({ length: count }, (_, i) => mod3603(base + i * step + speed * ms / 1e3));
  },
  realAngle(cfg, seed, ms) {
    const { speed, base, realIdx, step } = multiParams(cfg, seed);
    return mod3603(base + realIdx * step + speed * ms / 1e3);
  },
  evaluate(cfg, seed, ms) {
    const angle = this.realAngle(cfg, seed, ms);
    const distance = angularDist3(angle, 0);
    return { hit: distance <= cfg.tolerance / 2, distance, angle, tolerance: cfg.tolerance };
  },
  solveMoment(cfg, seed) {
    const { speed, base, realIdx, step } = multiParams(cfg, seed);
    const start = mod3603(base + realIdx * step);
    return Math.round(((360 - start) % 360 + 360) % 360 / speed * 1e3);
  },
  render(cfg, seed, ms) {
    return renderMultiGap(this.gapsAt(cfg, seed, ms), { gapWidth: cfg.tolerance, darkZone: cfg.darkZone || null });
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
  evaluate(cfg, seed, ms) {
    const angle = this.angleAt(cfg, seed, ms);
    const distance = angularDist3(angle, 0);
    return { hit: distance <= cfg.tolerance / 2, angle, distance, tolerance: cfg.tolerance };
  },
  solveMoment(cfg, seed) {
    return simpleSolve(cfg, seed);
  },
  render(cfg, seed, ms, ctx = {}) {
    return renderRing(this.angleAt(cfg, seed, ms), { gapWidth: cfg.tolerance, ghosts: ctx.ghosts || [] });
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
  evaluate(cfg, seed, ms) {
    const angle = this.angleAt(cfg, seed, ms);
    const distance = angularDist3(angle, 0);
    return { hit: distance <= cfg.tolerance / 2, angle, distance, tolerance: cfg.tolerance };
  },
  // Press-time array: the gap faces the top on every beat; chain N of them in a row to clear.
  solveMoment(cfg, seed) {
    const { period, base, chain } = rhythmParams(cfg, seed);
    return Array.from({ length: chain }, (_, k) => Math.round(base + k * period));
  },
  render(cfg, seed, ms) {
    return renderRing(this.angleAt(cfg, seed, ms), { gapWidth: cfg.tolerance });
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
  evaluate(cfg, seed, ms) {
    const gap = this.gapAngle(cfg, seed, ms);
    const eye = this.eyeAngle(cfg, seed, ms);
    const distance = angularDist3(gap, 0);
    const watched = angularDist3(eye, 0) <= (cfg.blind || 60) / 2;
    return { hit: distance <= cfg.tolerance / 2 && !watched, distance, gap, eye, watched, tolerance: cfg.tolerance };
  },
  solveMoment(cfg, seed) {
    for (let t = 0; t <= 6e4; t += 4) if (this.evaluate(cfg, seed, t).hit) return t;
    return 0;
  },
  render(cfg, seed, ms) {
    return renderStealth(this.gapAngle(cfg, seed, ms), this.eyeAngle(cfg, seed, ms), { gapWidth: cfg.tolerance, blind: cfg.blind || 60 });
  }
};
var darkzone = {
  angleAt(cfg, seed, ms) {
    return ringAngle(seed, ms, ringSpeed(cfg, seed));
  },
  evaluate(cfg, seed, ms) {
    const angle = this.angleAt(cfg, seed, ms);
    const distance = angularDist3(angle, 0);
    return { hit: distance <= cfg.tolerance / 2, angle, distance, tolerance: cfg.tolerance };
  },
  solveMoment(cfg, seed) {
    return simpleSolve(cfg, seed);
  },
  render(cfg, seed, ms) {
    return renderRing(this.angleAt(cfg, seed, ms), { gapWidth: cfg.tolerance, darkZone: cfg.darkZone || { start: 320, end: 40 } });
  }
};
var MODES = { simple, oscillating, reversing, dual, multigap, ghostecho, rhythm, stealth, darkzone };
function getMode(name) {
  return MODES[name] || simple;
}

// ../../docs/games/metagame/stages/stage9/movements.js
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
  1: { mode: "simple", speed: 30, speedVar: 0, tolerance: 42, display: "open" },
  2: { mode: "simple", speed: 40, speedVar: 8, tolerance: 36, display: "open" },
  3: { mode: "oscillating", oscBase: 36, oscAmp: 16, oscPeriod: 4200, tolerance: 34, display: "open" },
  4: { mode: "oscillating", oscBase: 46, oscAmp: 24, oscPeriod: 3400, tolerance: 30, display: "open" },
  5: { mode: "ghostecho", speed: 34, speedVar: 0, tolerance: 28, display: "open" },
  6: { mode: "ghostecho", speed: 42, speedVar: 6, tolerance: 24, display: "open" },
  7: { mode: "rhythm", speed: 34, speedVar: 0, chain: 3, tolerance: 30, display: "open" },
  8: { mode: "rhythm", speed: 44, speedVar: 0, chain: 4, tolerance: 26, display: "open" },
  9: { mode: "dual", speedInner: 44, speedOuter: 30, tolerance: 32, display: "dual" },
  10: { mode: "dual", speedInner: 56, speedOuter: 36, tolerance: 28, display: "dual" },
  11: { mode: "stealth", speed: 40, speedVar: 6, eyeSpeed: 24, blind: 64, tolerance: 26, display: "open" },
  12: { mode: "reversing", speed: 62, speedVar: 10, tolerance: 26, display: "open", onlineUnstable: true },
  13: { mode: "multigap", speed: 52, speedVar: 8, gaps: 3, tolerance: 24, display: "open", onlineUnstable: true },
  14: { mode: "multigap", speed: 60, speedVar: 10, gaps: 4, tolerance: 20, display: "open", onlineUnstable: true },
  15: { mode: "darkzone", speed: 50, speedVar: 8, tolerance: 22, display: "dark", darkZone: { start: 312, end: 48 }, onlineUnstable: true },
  16: { mode: "simple", speed: 46, speedVar: 0, tolerance: 16, display: "dark", darkZone: { start: 300, end: 60 }, onlineUnstable: true }
};
function movementForLevel(level) {
  const lvl = Number(level) || 1;
  return MOVEMENTS.find((m) => m.levels.includes(lvl)) || MOVEMENTS[0];
}
var MODE_HINTS = {
  simple: "watch the gap; CROSS when it faces the top (12 o'clock).",
  oscillating: "the rotation speed breathes in and out — CROSS as the gap reaches the top.",
  ghostecho: "faint ghosts mark your last two presses — read how early/late you were and correct.",
  dual: "two rings now — CROSS only when BOTH gaps face the top at the same instant.",
  stealth: "an eye sweeps the ring — CROSS only when the gap is up AND the eye is looking away.",
  reversing: "the ring keeps flipping direction — track the flips and CROSS at the top.",
  darkzone: "a blackout hides the top — extrapolate from the speed when the gap arrives there."
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

// ../../docs/games/metagame/stages/stage9/game.js
function crossOutcome(result) {
  if (!result || !result.hit) return "miss";
  const tol = Number(result.tolerance) || 0;
  return tol > 0 && Number(result.distance) <= tol / 4 ? "perfect" : "hit";
}
function crossAttempt({ seed, elapsedMs, level, toleranceMult = 1 }) {
  let cfg = levelConfig(level);
  if (toleranceMult !== 1) cfg = { ...cfg, tolerance: cfg.tolerance * toleranceMult };
  return { ...getMode(cfg.mode).evaluate(cfg, seed, Number(elapsedMs) || 0), level: cfg.level };
}
function solveMoment(seed, level) {
  const cfg = levelConfig(level);
  return getMode(cfg.mode).solveMoment(cfg, seed);
}
function renderLevel(seed, level, elapsedMs, ctx = {}) {
  const cfg = levelConfig(level);
  return getMode(cfg.mode).render(cfg, seed, Number(elapsedMs) || 0, ctx);
}
function sublevelSeed(level) {
  return (Number(level) || 1) * 31 + 7;
}

// ../../docs/games/metagame/stages/stage9/boss.js
function hasOfflineModeActivated(actions) {
  return Boolean(actions && typeof actions.hasAction === "function" && actions.hasAction(9, ACTION_NAME));
}
function readServiceWorkerNotes({ state, bell }) {
  const firstRead = !state.notesRead;
  state.notesRead = true;
  state.offlineControlVisible = true;
  if (firstRead) {
    pushLog(state, "service-worker-notes.txt read. offline control revealed.");
    notifyBell(bell, bellMessages.notesRead, "stage9.service_worker_notes_read");
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
    actions.setAction(9, ACTION_NAME, {
      source,
      file: state.notesRead ? "service-worker-notes.txt" : null,
      mode: browserOffline ? "browser-offline-cache" : "simulated-cache"
    });
  }
  if (firstActivation) {
    notifyBell(bell, bellMessages.offline, "stage9.offline_mode_activated");
    unlockAchievement(achievements, ACHIEVEMENT_ID, {
      id: ACHIEVEMENT_ID,
      stage: 9,
      text: ACHIEVEMENT_TEXT,
      action: "9.offline_mode_activated"
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
    defeatPossible: unlocked,
    hint: unlocked ? "the seed is fixed. cross using the learned rotation." : lockedHintLadder[hintIndex]
  };
}
function recordObserverBossAttempt({ state, actions, elapsedMs = 0 }) {
  state.boss.reached = true;
  const lock = getBossLockState({ actions, state });
  if (!lock.unlocked) {
    state.boss.attempts = Number(state.boss.attempts || 0) + 1;
    state.boss.lockHintStep = Math.min(Number(state.boss.lockHintStep || 0) + 1, lockedHintLadder.length - 1);
    getBossSeed({ state, actions });
    pushLog(state, "the gap changed again. no timing survived contact.");
    return { defeated: false, unlocked: false, hit: false, seedMode: "live-random" };
  }
  const result = crossAttempt({ seed: FIXED_OFFLINE_SEED, elapsedMs: Number(elapsedMs) || 0, level: BOSS_LEVEL });
  if (!result.hit) {
    state.boss.attempts = Number(state.boss.attempts || 0) + 1;
    pushLog(state, `offline, but the cross was mistimed (off by ${Math.round(result.distance)}deg).`);
    return { defeated: false, unlocked: true, hit: false, seedMode: "fixed-cache", distance: result.distance };
  }
  state.boss.defeated = true;
  state.meta.firstClearComplete = true;
  state.meta.btsAvailable = true;
  state.clarity = Number(state.clarity || 0) + 25;
  pushLog(state, bellMessages.defeated);
  return { defeated: true, unlocked: true, hit: true, seedMode: "fixed-cache", seed: FIXED_OFFLINE_SEED };
}
function pushLog(state, line) {
  state.log = [...state.log || [], line].slice(-6);
}
function notifyBell(bell, text, id) {
  if (bell && typeof bell.push === "function") bell.push({ id, stage: 9, text });
  else if (bell && typeof bell.say === "function") bell.say(text, { id, stage: 9 });
  else if (bell && typeof bell.add === "function") bell.add(text, { id, stage: 9 });
}
function unlockAchievement(achievements, id, detail) {
  if (achievements && typeof achievements.unlockAchievement === "function") achievements.unlockAchievement(id, detail);
  else if (achievements && typeof achievements.unlock === "function") achievements.unlock(id, detail);
}

// ../../docs/games/metagame/stages/stage9/content.js
var serviceWorkerNotesText = [
  "service-worker-notes.txt",
  "",
  "The service worker caches level parameters for offline use.",
  "Offline mode always uses the default starting configuration: seed 0.",
  "When the connection is quiet, the observer starts from the same place every time.",
  "",
  "Activate Offline Mode (Stage 9) after reading this note."
].join("\n");

// ../../docs/games/metagame/stages/stage9/loop.js
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

// ../../docs/games/metagame/stages/stage9/aids.js
var AIDS = [
  { id: "stabilizer", label: "Stabilizer Lens", cost: 20, desc: "+60% tolerance on your next CROSS (one charge)." },
  { id: "tachometer", label: "Tachometer", cost: 30, desc: "permanent numeric readout: gap angle + speed." },
  { id: "peek", label: "Single-Frame", cost: 15, desc: "offline only: reveal the gap's angle right now." }
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
function consumeStabilizer(state) {
  state.aids = normalizeAids(state.aids);
  if (state.aids.stabilizer > 0) {
    state.aids.stabilizer -= 1;
    return STABILIZER_TOLERANCE_MULT;
  }
  return 1;
}

// ../../docs/games/metagame/stages/stage9/testhook.js
function installTestHook(api) {
  const hook = {
    state: () => api.state,
    config: (level) => levelConfig(level ?? api.state.currentLevel),
    aids: () => ({ clarity: api.state.clarity, ...api.getAids() }),
    buyAid: (id) => api.buyAid(id),
    crossAt(ms) {
      api.crossAt(Number(ms) || 0);
    },
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
  window.__fvStage9 = hook;
  return () => {
    if (window.__fvStage9 === hook) delete window.__fvStage9;
  };
}

// ../../docs/games/metagame/stages/stage9/renderer.js
function renderStage9({ host, state, actions, achievements, bell, bts, viewer, save, onStageComplete }) {
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
  let elapsedMs = 0;
  let liveSeed = null;
  let rhythmChain = 0;
  let attempts = [];
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
    if (state.currentLevel >= BOSS_LEVEL) pushLog2(`level ${BOSS_LEVEL}: THE OBSERVER EFFECT. the gap will not hold still while live.`);
  }
  function crossSublevel() {
    const level = state.currentLevel;
    const cfg = levelConfig(level);
    if (cfg.onlineUnstable && !offlineUnlocked()) {
      state.clarity = Math.max(0, Number(state.clarity || 0) - 1);
      liveSeed = getBossSeed({ state, actions });
      state.boss.lockHintStep = Math.min(Number(state.boss.lockHintStep || 0) + 1, 3);
      pushLog2("the gap reseeded the instant you committed. nothing holds while live. (go offline.)");
      return "miss";
    }
    const seed = activeSeed();
    const toleranceMult = consumeStabilizer(state);
    if (toleranceMult > 1) pushLog2("stabilizer lens engaged (+tolerance for this cross).");
    const result = crossAttempt({ seed, elapsedMs, level, toleranceMult });
    if (cfg.mode === "ghostecho") attempts = [...attempts, { ms: elapsedMs, hit: result.hit }].slice(-2);
    if (cfg.mode === "rhythm") {
      const need = Math.max(2, cfg.chain || 3);
      if (result.hit) {
        rhythmChain += 1;
        if (rhythmChain >= need) {
          state.clarity = Number(state.clarity || 0) + cfg.movement * 5;
          pushLog2(`cadence held — ${need} crosses on the beat. advancing.`);
          advanceFrom(level);
        } else {
          pushLog2(`on beat (${rhythmChain}/${need}). hold the cadence.`);
        }
        return crossOutcome(result);
      }
      rhythmChain = 0;
      state.clarity = Math.max(0, Number(state.clarity || 0) - 1);
      pushLog2(`chain broken (off by ${Math.round(result.distance)}deg). cadence reset.`);
      return "miss";
    }
    if (result.hit) {
      state.clarity = Number(state.clarity || 0) + cfg.movement * 5;
      pushLog2(`level ${level} crossed (gap at top). advancing.`);
      advanceFrom(level);
      return crossOutcome(result);
    }
    state.clarity = Math.max(0, Number(state.clarity || 0) - 1);
    pushLog2(`mistimed (off by ${Math.round(result.distance)}deg). clarity -1.`);
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
  function flashArena(outcome) {
    if (!outcome) return;
    const el = fields.arena;
    el.classList.remove(...FLASH_CLASSES);
    void el.offsetWidth;
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
      case "bts":
        openBts({ bts, viewer });
        break;
    }
    persistAndPaint();
  });
  function buyAidAction(id) {
    const offline = offlineUnlocked();
    const res = buyAid(state, id, { offline });
    if (!res.ok) {
      const why = { "offline-only": "single-frame only works in Offline Mode (online the seed reseeds).", insufficient: "not enough clarity.", owned: "already owned." }[res.reason] || "cannot buy that.";
      pushLog2(why);
      return res;
    }
    if (id === "stabilizer") pushLog2("stabilizer lens armed: your next CROSS gets a wider window.");
    if (id === "tachometer") pushLog2("tachometer online: numeric gap readout enabled.");
    if (id === "peek") doPeek();
    return res;
  }
  function doPeek() {
    const r = crossAttempt({ seed: activeSeed(), elapsedMs, level: state.currentLevel });
    const ang = Number.isFinite(r.angle) ? `gap at ${Math.round(r.angle)}deg` : "two gaps to align";
    pushLog2(`single-frame: ${ang} (${Math.round(r.distance)}deg from the top).`);
  }
  const loop = startLoop((dt) => {
    if (!state.boss.defeated) elapsedMs += dt;
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
    }
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
  function pushLog2(line) {
    state.log = [...state.log || [], line].slice(-6);
  }
  function paintArena() {
    const seed = activeSeed();
    const level = state.currentLevel;
    const ctx = {};
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
    fields.seed.textContent = unstable ? lock.unlocked ? "0 (fixed cache)" : "live-random" : "stable";
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
  function paintTach(cfg) {
    const owned = Boolean(state.aids && state.aids.tachometer);
    fields.tachWrap.hidden = !owned;
    if (!owned) return;
    const r = crossAttempt({ seed: activeSeed(), elapsedMs, level: state.currentLevel });
    const ang = Number.isFinite(r.angle) ? `${Math.round(r.angle)}deg` : `${Math.round(r.distance)}deg off`;
    fields.tach.textContent = `${ang} @ ${Math.round(cfg.speed || cfg.speedInner || cfg.oscBase || 0)}deg/s`;
  }
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

// ../../docs/games/metagame/stages/stage9/state.js
function defaultState() {
  return {
    version: 2,
    notesRead: false,
    offlineControlVisible: false,
    offlineMode: false,
    clarity: 0,
    aids: defaultAids(),
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
  const lvl = Number.isFinite(Number(target.currentLevel)) ? Number(target.currentLevel) : fresh.currentLevel;
  target.currentLevel = staleV1 ? fresh.currentLevel : Math.max(1, Math.min(BOSS_LEVEL, lvl));
  target.lockedSeedSamples = Array.isArray(target.lockedSeedSamples) ? target.lockedSeedSamples : fresh.lockedSeedSamples;
  target.log = Array.isArray(target.log) ? target.log : fresh.log;
  target.boss = { ...fresh.boss, ...target.boss && typeof target.boss === "object" ? target.boss : {} };
  target.meta = { ...fresh.meta, ...target.meta && typeof target.meta === "object" ? target.meta : {} };
  return target;
}

// ../../docs/games/metagame/stages/stage9/index.js
var stageMeta = {
  id: 9,
  slug: "observer-state",
  name: "Observer State",
  btsPath: BTS_PATH,
  requiredAction: REQUIRED_ACTION
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
  return Boolean(detail && Number(detail.stage) === 9 && detail.action === ACTION_NAME);
}
function ensureStyles() {
  const id = "stage9-observer-state-styles";
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
