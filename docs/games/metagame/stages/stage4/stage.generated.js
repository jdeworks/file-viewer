// GENERATED — DO NOT EDIT BY HAND.
// Bundled from docs/games/metagame/stages/stage4/index.js (+ its local modules) by
// build/metagame/build.mjs. Rebuild:  node build/metagame/build.mjs  (run by scripts/check.sh).
// Exports stageMeta / defaultState / mountStage. Shared ../../*.js singletons + ./styles.css stay
// external (NOT inlined). The hub's stage-manifest.js LOADERS import THIS file.


// ../../docs/games/metagame/stages/stage4/messages.js
var ACTION_NAME = "recursion_blueprint_read";
var REQUIRED_ACTION = "4.recursion_blueprint_read";
var ACHIEVEMENT_ID = "stage4.recursion_blueprint_read";
var ACHIEVEMENT_TEXT = "I looked deeper.";
var BTS_PATH = "/docs/bts/fractal_bastion.bts";
var RECURSION_BLUEPRINT_PATH = "/docs/examples/metagame/stage4/towers/upgrades/tier3_blueprints/recursion_points.json";
var bellMessages = {
  start: "the path repeats at every scale.",
  unlock: "the recursion points are no longer guesses.",
  // Shown once the blueprint is read but no tower yet covers a recursion point — teaches the
  // second step of the two-step gate so the ladder doesn't dead-end on a congratulation.
  needsCoverage: "the points are mapped, but nothing holds them. place a tower so its range covers a marked recursion point, then fight.",
  covered: "a tower anchors the repeating point.",
  defeated: "the loop reached its own beginning and stopped."
};
var lockedHintLadder = [
  "the bastion folds damage away before it arrives.",
  "the weak points are not on the surface of the tower list.",
  "follow the tower upgrade folders all the way down.",
  "open towers/upgrades/tier3_blueprints/recursion_points.json before fighting The Infinite Loop."
];

// ../../docs/games/metagame/stages/stage4/content.js
function recursionBlueprintContent(state) {
  return `${JSON.stringify(recursionBlueprintData(state), null, 2)}
`;
}
function recursionBlueprintData(state) {
  return {
    blueprint_id: "recursion_points",
    name: "Recursion Point Targeting",
    file: RECURSION_BLUEPRINT_PATH,
    status: "UNLOCKED",
    boss_vulnerability: {
      boss: "The Infinite Loop",
      rule: "Towers placed within radius of any persisted recursion point can damage the boss.",
      point_set_id: state.recursion.pointSetId
    },
    note: "These coordinates are generated for this run and persisted in stage state. Do not target copied coordinates from another run.",
    recursion_points: state.recursion.points.map((point) => ({ ...point }))
  };
}
function isRecursionBlueprintPath(path) {
  const normalized = String(path || "").replace(/\\/g, "/");
  return normalized === RECURSION_BLUEPRINT_PATH || normalized.endsWith("/stage4/towers/upgrades/tier3_blueprints/recursion_points.json");
}

// ../../docs/games/metagame/stages/stage4/towers.js
var TOWER_TYPES = {
  pulse_node: { glyph: "[P]", cost: 80, range: 3, fireRate: 1, damage: 20, damageType: "kinetic", role: "baseline single-target — cheap kinetic DPS, weak vs armor", ability: "emp_burst" },
  scatter_array: { glyph: "[S]", cost: 150, range: 2, fireRate: 0.8, damage: 12, damageType: "kinetic", aoe: 2, role: "kinetic splash — clears swarms, falls off vs armor/shields", ability: "overcharge" },
  null_spike: { glyph: "[N]", cost: 200, range: 4, fireRate: 0.5, damage: 40, damageType: "null", ignoresArmor: true, role: "null cannon — ignores armor AND shields, slow cadence", ability: "null_wave" },
  attractor_field: { glyph: "[A]", cost: 120, range: 3, fireRate: 0, damage: 0, slow: 0.5, role: "support — slows everything in range (the original slow field)" },
  resonance_hub: { glyph: "[H]", cost: 250, range: 5, fireRate: 0, damage: 0, adjacencyBonus: 0.3, role: "support — +30% damage to each adjacent tower" },
  cycle_extractor: { glyph: "[E]", cost: 250, range: 0, fireRate: 0, damage: 0, incomePerWave: 25, role: "economy — pays Cycles every wave clear" }
};
var TARGET_MODES = ["first", "last", "closest", "strongest", "weakest"];

// ../../docs/games/metagame/stages/stage4/boss.js
function hasRecursionBlueprint(actions) {
  return Boolean(actions && typeof actions.hasAction === "function" && actions.hasAction(4, ACTION_NAME));
}
function getBossLockState({ actions, state }) {
  const unlocked = hasRecursionBlueprint(actions);
  const boss = state?.boss || {};
  const coverage = getTowerCoverage(state);
  const hintIndex = Math.min(Math.max(Number(boss.lockHintStep || 0), 0), lockedHintLadder.length - 1);
  return {
    unlocked,
    defeated: Boolean(boss.defeated),
    coveredPoints: coverage.covered.length,
    totalPoints: coverage.total,
    vulnerability: unlocked ? "mapped" : "unread",
    defeatPossible: unlocked && coverage.covered.length > 0,
    hint: !unlocked ? lockedHintLadder[hintIndex] : coverage.covered.length > 0 ? bellMessages.unlock : bellMessages.needsCoverage
  };
}
function applyRecursionBlueprintOpen({ state, actions, achievements, bell, path }) {
  if (!isRecursionBlueprintPath(path)) return false;
  actions?.setAction?.(4, ACTION_NAME, {
    source: "file-tree",
    file: "recursion_points.json",
    path: "/stage4/towers/upgrades/tier3_blueprints/recursion_points.json",
    pointSetId: state.recursion.pointSetId
  });
  achievements?.unlockAchievement?.(ACHIEVEMENT_ID, {
    stage: 4,
    title: ACHIEVEMENT_TEXT,
    action: "4.recursion_blueprint_read",
    pointSetId: state.recursion.pointSetId
  });
  notifyBell(bell, "stage4.recursion_blueprint_read", bellMessages.unlock);
  pushLog(state, bellMessages.unlock);
  return true;
}
function placeTower(state, { x, y, type = "pulse_node", targetMode = "first" }) {
  const cost = type === "scatter_array" ? 150 : 80;
  if (Number(state.cycles || 0) < cost) return { ok: false, reason: "cycles" };
  const tower = {
    id: `tower-${state.towers.length + 1}`,
    type,
    x: Math.trunc(Number(x)),
    y: Math.trunc(Number(y)),
    targetMode: TARGET_MODES.includes(targetMode) ? targetMode : "first"
  };
  if (!Number.isFinite(tower.x) || !Number.isFinite(tower.y)) return { ok: false, reason: "position" };
  state.cycles -= cost;
  state.towers.push(tower);
  const coverage = getTowerCoverage(state);
  pushLog(state, `${type} placed at ${tower.x},${tower.y}. ${coverage.covered.length}/${coverage.total} recursion points covered.`);
  return { ok: true, tower, coverage };
}
function cycleTowerTarget(state, id) {
  const tower = (state?.towers || []).find((t) => t.id === id);
  if (!tower) return null;
  const i = TARGET_MODES.indexOf(tower.targetMode || "first");
  tower.targetMode = TARGET_MODES[(i + 1) % TARGET_MODES.length];
  pushLog(state, `${tower.type} now targets ${tower.targetMode.toUpperCase()}.`);
  return tower.targetMode;
}
function getTowerCoverage(state) {
  const points = state?.recursion?.points || [];
  const towers = state?.towers || [];
  const covered = points.filter((point) => towers.some((tower) => distance(tower, point) <= Number(point.radius || 2)));
  return {
    total: points.length,
    covered,
    uncovered: points.filter((point) => !covered.includes(point))
  };
}
function fightInfiniteLoop({ state, actions }) {
  const lock = getBossLockState({ actions, state });
  state.boss.reached = true;
  state.boss.attempts = Number(state.boss.attempts || 0) + 1;
  if (!lock.unlocked) {
    state.boss.lockHintStep = Math.min(Number(state.boss.lockHintStep || 0) + 1, lockedHintLadder.length - 1);
    pushLog(state, "the loop regenerates before damage resolves.");
    return { defeated: false, locked: true, damage: 0 };
  }
  if (!lock.coveredPoints) {
    pushLog(state, "the blueprint is read, but no tower touches a recursion point.");
    return { defeated: false, locked: false, damage: 0 };
  }
  const damage = lock.coveredPoints * 120;
  state.boss.hp = Math.max(0, Number(state.boss.hp || 300) - damage);
  if (state.boss.hp === 0) {
    state.boss.defeated = true;
    pushLog(state, bellMessages.defeated);
  } else {
    pushLog(state, `recursion damage landed: ${damage}.`);
  }
  return { defeated: state.boss.defeated, locked: false, damage };
}
function pushLog(state, line) {
  state.log = [...state.log || [], line].slice(-8);
}
function distance(a, b) {
  return Math.hypot(Number(a.x) - Number(b.x), Number(a.y) - Number(b.y));
}
function notifyBell(bell, id, text) {
  if (bell && typeof bell.showBell === "function") bell.showBell(id, text, { stage: 4 });
  else if (bell && typeof bell.push === "function") bell.push({ id, stage: 4, text });
}

// ../../docs/games/metagame/stages/stage4/lsystem.js
var GRID = 40;
var MARGIN = 2;
var LO = MARGIN;
var HI = GRID - 1 - MARGIN;
var AXIOM = "F";
var RULE = "F+F-F-F+F";
function buildPath(seed, depth = 1) {
  const d = Math.max(1, Math.min(3, Math.trunc(Number(depth)) || 1));
  const instructions = expand(d);
  const DX = [1, 0, -1, 0];
  const DY = [0, 1, 0, -1];
  let x = 0, y = 0, dir = 0;
  const raw = [{ x, y }];
  for (const ch of instructions) {
    if (ch === "+") dir = dir + 1 & 3;
    else if (ch === "-") dir = dir + 3 & 3;
    else if (ch === "F") {
      x += DX[dir];
      y += DY[dir];
      raw.push({ x, y });
    }
  }
  const xs = raw.map((p) => p.x);
  const ys = raw.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const span = HI - LO;
  const sx = maxX > minX ? span / (maxX - minX) : 0;
  const sy = maxY > minY ? span / (maxY - minY) : 0;
  const mapped = raw.map((p) => ({
    x: LO + Math.round((p.x - minX) * sx),
    y: LO + Math.round((p.y - minY) * sy)
  }));
  const visits = /* @__PURE__ */ new Map();
  const tiles = [];
  for (const p of mapped) {
    const k = `${p.x},${p.y}`;
    visits.set(k, (visits.get(k) || 0) + 1);
    const last = tiles[tiles.length - 1];
    if (!last || last.x !== p.x || last.y !== p.y) tiles.push({ x: p.x, y: p.y, branch: null });
  }
  const recurveTiles = /* @__PURE__ */ new Set();
  for (const [k, count] of visits) if (count > 1) recurveTiles.add(k);
  for (const t of tiles) if (recurveTiles.has(`${t.x},${t.y}`)) t.recurve = true;
  return { tiles, entry: tiles[0], exit: tiles[tiles.length - 1], recurveTiles };
}
function expand(depth) {
  let s = AXIOM;
  for (let i = 0; i < depth; i++) {
    let out = "";
    for (const ch of s) out += ch === "F" ? RULE : ch;
    s = out;
  }
  return s;
}

// ../../docs/games/metagame/stages/stage4/board.js
var EMPTY = ".";
var TOWER_CHAR = {
  pulse_node: "P",
  scatter_array: "S",
  null_spike: "N",
  attractor_field: "A",
  resonance_hub: "H",
  cycle_extractor: "E"
};
var ENEMY_CHAR = {
  recursion: "o",
  pattern_crawler: "x",
  null_packet: "=",
  resonance_ghost: "%",
  fractal_host: "@",
  depth_crawler: "#"
};
function boardText(state, pathTiles, width = 40, height = 40) {
  const grid = Array.from({ length: height }, () => Array.from({ length: width }, () => EMPTY));
  const put = (x, y, ch) => {
    if (y >= 0 && y < height && x >= 0 && x < width) grid[y][x] = ch;
  };
  const tiles = pathTiles || [];
  tiles.forEach((t, i) => {
    if (i === 0) return put(t.x, t.y, ">");
    if (i === tiles.length - 1) return put(t.x, t.y, "X");
    if (t.recurve) return put(t.x, t.y, "~");
    put(t.x, t.y, pathGlyph(tiles[i - 1], t, tiles[i + 1]));
  });
  for (const p of state?.recursion?.points || []) {
    if (grid[p.y]?.[p.x] === EMPTY) put(p.x, p.y, "R");
  }
  for (const t of state?.towers || []) put(t.x, t.y, TOWER_CHAR[t.type] || "?");
  for (const e of state?.enemies || []) put(e.x, e.y, ENEMY_CHAR[e.type] || "*");
  return grid.map((row) => row.join("")).join("\n");
}
function pathGlyph(prev, here, next) {
  if (!prev || !next) return "+";
  if (prev.y === here.y && next.y === here.y) return "-";
  if (prev.x === here.x && next.x === here.x) return "|";
  return "+";
}

// ../../docs/games/metagame/stages/stage4/enemies.js
var ENEMY_TYPES = {
  recursion: { glyph: "[ ]", hp: 50, speed: 1, armor: 0, reward: 8, integrityDrain: 5 },
  pattern_crawler: { glyph: "/\\", hp: 30, speed: 2, armor: 0, reward: 6, integrityDrain: 4, fast: true },
  null_packet: { glyph: "<>", hp: 60, speed: 1, armor: 0.5, reward: 10, integrityDrain: 6 },
  resonance_ghost: { glyph: "<>", hp: 40, speed: 1.5, armor: 0, reward: 9, integrityDrain: 5, slowImmune: true },
  fractal_host: { glyph: "[[ ]]", hp: 120, speed: 0.8, armor: 0, reward: 16, integrityDrain: 8, spawnsOnDeath: { type: "recursion", count: 2 } },
  depth_crawler: { glyph: "[##]", hp: 200, speed: 1.2, armor: 0.3, reward: 24, integrityDrain: 10, elite: true }
};
function spawnEnemy(type, seed, idCounter) {
  const def = ENEMY_TYPES[type] || ENEMY_TYPES.recursion;
  return {
    id: `e${idCounter}`,
    type: ENEMY_TYPES[type] ? type : "recursion",
    hp: def.hp,
    maxHp: def.hp,
    x: 0,
    y: 0,
    pathIndex: 0,
    speed: def.speed,
    armor: def.armor,
    slowImmune: Boolean(def.slowImmune)
  };
}

// ../../docs/games/metagame/stages/stage4/damage.js
var DAMAGE_TYPES = ["kinetic", "thermal", "arc", "null", "pure"];
function resolveDamage(enemy, amount, type = "kinetic", opts = {}) {
  let dmg = Math.max(0, Number(amount) || 0);
  if (!enemy || dmg <= 0) return { hp: 0, shield: 0 };
  const dtype = DAMAGE_TYPES.includes(type) ? type : "kinetic";
  if (dtype !== "pure" && enemy.resist) dmg *= 1 - clampResist(enemy.resist[dtype]);
  if (dtype === "kinetic") {
    const armor = opts.armor != null ? Number(opts.armor) : enemy.armor || 0;
    dmg *= 1 - clamp01(armor);
  }
  let shieldHit = 0;
  if (dtype !== "null" && (enemy.shield || 0) > 0 && dmg > 0) {
    const mult = dtype === "arc" ? 1.5 : 1;
    const effective = dmg * mult;
    shieldHit = Math.min(enemy.shield, effective);
    enemy.shield = Math.max(0, enemy.shield - shieldHit);
    dmg = (effective - shieldHit) / mult;
  }
  enemy.hp -= dmg;
  return { hp: dmg, shield: shieldHit };
}
function clamp01(v) {
  const n = Number(v) || 0;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}
function clampResist(v) {
  const n = Number(v) || 0;
  return n > 1 ? 1 : n;
}

// ../../docs/games/metagame/stages/stage4/waves.js
var SPAWN_INTERVAL_MS = 700;
var WAVES = {
  1: { enemies: [{ type: "recursion", count: 6 }] },
  2: { enemies: [{ type: "recursion", count: 9 }] },
  3: { enemies: [{ type: "recursion", count: 12 }] },
  4: { enemies: [{ type: "recursion", count: 15 }] },
  5: { enemies: [{ type: "recursion", count: 18 }], note: "cover the corner tiles" },
  // Waves 6–10 (MATCH): fast pattern-crawlers expose sparse coverage; armored null-packets blunt
  // low-damage towers. The enemy types already exist (enemies.js) — this is composition only.
  6: { enemies: [{ type: "recursion", count: 8 }, { type: "pattern_crawler", count: 4 }], note: "pattern crawlers sprint through gaps" },
  7: { enemies: [{ type: "recursion", count: 6 }, { type: "pattern_crawler", count: 8 }] },
  8: { enemies: [{ type: "recursion", count: 10 }, { type: "null_packet", count: 4 }], note: "null packets are armored" },
  9: { enemies: [{ type: "recursion", count: 8 }, { type: "null_packet", count: 6 }, { type: "pattern_crawler", count: 2 }] },
  10: { enemies: [{ type: "recursion", count: 6 }, { type: "null_packet", count: 6 }, { type: "pattern_crawler", count: 6 }] },
  // Waves 11–15 (PORTFOLIO): fractal hosts split on death — punish thin coverage.
  11: { enemies: [{ type: "recursion", count: 10 }, { type: "fractal_host", count: 1 }], note: "fractal hosts split when they fall" },
  12: { enemies: [{ type: "recursion", count: 8 }, { type: "pattern_crawler", count: 4 }, { type: "fractal_host", count: 1 }] },
  13: { enemies: [{ type: "recursion", count: 8 }, { type: "null_packet", count: 4 }, { type: "fractal_host", count: 2 }] },
  14: { enemies: [{ type: "recursion", count: 6 }, { type: "pattern_crawler", count: 6 }, { type: "fractal_host", count: 2 }] },
  15: { enemies: [{ type: "recursion", count: 6 }, { type: "null_packet", count: 6 }, { type: "fractal_host", count: 3 }] },
  // Waves 16–20 (REPAIR): resonance ghosts are slow-immune; wave 20 fields three depth-crawler elites.
  16: { enemies: [{ type: "recursion", count: 8 }, { type: "resonance_ghost", count: 4 }], note: "ghosts ignore the attractor field" },
  17: { enemies: [{ type: "recursion", count: 6 }, { type: "resonance_ghost", count: 6 }, { type: "pattern_crawler", count: 4 }] },
  18: { enemies: [{ type: "recursion", count: 6 }, { type: "null_packet", count: 6 }, { type: "resonance_ghost", count: 4 }] },
  19: { enemies: [{ type: "recursion", count: 8 }, { type: "resonance_ghost", count: 6 }, { type: "fractal_host", count: 2 }] },
  20: { enemies: [{ type: "recursion", count: 6 }, { type: "depth_crawler", count: 3 }], note: "three depth-crawler elites" },
  // Waves 21–30 (ANTICIPATE): everything mixed and scaling; wave 25 fields all six types.
  21: { enemies: [{ type: "recursion", count: 8 }, { type: "pattern_crawler", count: 6 }, { type: "null_packet", count: 4 }] },
  22: { enemies: [{ type: "resonance_ghost", count: 8 }, { type: "fractal_host", count: 3 }] },
  23: { enemies: [{ type: "null_packet", count: 8 }, { type: "pattern_crawler", count: 6 }, { type: "depth_crawler", count: 1 }] },
  24: { enemies: [{ type: "recursion", count: 10 }, { type: "resonance_ghost", count: 6 }, { type: "fractal_host", count: 3 }] },
  25: { enemies: [{ type: "recursion", count: 6 }, { type: "pattern_crawler", count: 6 }, { type: "null_packet", count: 6 }, { type: "resonance_ghost", count: 6 }, { type: "fractal_host", count: 3 }, { type: "depth_crawler", count: 1 }], note: "every protocol at once" },
  26: { enemies: [{ type: "null_packet", count: 10 }, { type: "depth_crawler", count: 2 }] },
  27: { enemies: [{ type: "resonance_ghost", count: 10 }, { type: "fractal_host", count: 4 }] },
  28: { enemies: [{ type: "pattern_crawler", count: 12 }, { type: "null_packet", count: 8 }] },
  29: { enemies: [{ type: "recursion", count: 10 }, { type: "resonance_ghost", count: 8 }, { type: "depth_crawler", count: 2 }] },
  30: { enemies: [{ type: "depth_crawler", count: 3 }, { type: "fractal_host", count: 4 }, { type: "null_packet", count: 8 }], note: "the bastion's last stand before the loop" },
  // Wave 31 = The Infinite Loop. Not a spawn wave — fought via the confront path (boss.js).
  31: { isBoss: true, enemies: [] }
};
function waveComposition(waveNum, seed) {
  const n = Math.max(1, Math.trunc(Number(waveNum)) || 1);
  const authored = WAVES[n];
  if (authored) return { leftFraction: null, ...authored };
  return { enemies: [{ type: "recursion", count: 6 + n * 3 }], leftFraction: null };
}

// ../../docs/games/metagame/stages/stage4/maps.js
var MAPS = [
  {
    id: "outer-shell",
    name: "Outer Shell",
    glyph: "◇",
    theme: "the thin perimeter where the recursion first leaks in",
    waveCount: 5,
    depth: 1,
    startCycles: 240,
    startIntegrity: 100,
    subBosses: { 5: "shell-warden" }
  },
  {
    id: "recursion-halls",
    name: "Recursion Halls",
    glyph: "◆",
    theme: "corridors that repeat the corridor you just left",
    waveCount: 10,
    depth: 1,
    startCycles: 280,
    startIntegrity: 100,
    subBosses: { 5: "echo-sentinel", 10: "hall-keeper" }
  },
  {
    id: "fractal-atrium",
    name: "Fractal Atrium",
    glyph: "✦",
    theme: "an open court that folds back on itself at the edges",
    waveCount: 20,
    depth: 2,
    startCycles: 340,
    startIntegrity: 110,
    subBosses: { 10: "mirror-prefect", 20: "atrium-regent" }
  },
  {
    id: "depth-cascade",
    name: "Depth Cascade",
    glyph: "❈",
    theme: "a stairwell that descends faster than you climb it",
    waveCount: 45,
    depth: 2,
    startCycles: 420,
    startIntegrity: 120,
    subBosses: { 15: "cascade-anchor", 30: "descent-marshal", 45: "cascade-sovereign" }
  },
  {
    id: "infinite-approach",
    name: "Infinite Approach",
    glyph: "∞",
    theme: "the last span before the loop — it never quite arrives",
    waveCount: 70,
    depth: 3,
    startCycles: 520,
    startIntegrity: 140,
    subBosses: { 20: "approach-vanguard", 40: "event-horizon", 60: "penultimate-knot", 70: "final-bastion" }
  }
];
var MAP_COUNT = MAPS.length;
function mapByIndex(index) {
  const i = Math.max(0, Math.min(MAP_COUNT - 1, Math.trunc(Number(index)) || 0));
  return MAPS[i];
}
function mapPathSeed(pointSetId, mapIndex) {
  return `${pointSetId || "x"}-m${Math.max(0, Math.trunc(Number(mapIndex)) || 0)}`;
}
function subBossIdForWave(mapIndex, waveNum) {
  const map = mapByIndex(mapIndex);
  return map.subBosses?.[Math.trunc(Number(waveNum)) || 0] || null;
}

// ../../docs/games/metagame/stages/stage4/wavegen.js
var UNLOCKS = [
  ["recursion"],
  ["recursion", "pattern_crawler"],
  ["recursion", "pattern_crawler", "null_packet"],
  ["recursion", "pattern_crawler", "null_packet", "resonance_ghost", "fractal_host"],
  ["recursion", "pattern_crawler", "null_packet", "resonance_ghost", "fractal_host", "depth_crawler"]
];
function mapEnemyPool(mapIndex) {
  const i = Math.max(0, Math.min(UNLOCKS.length - 1, Math.trunc(Number(mapIndex)) || 0));
  return UNLOCKS[i];
}
function mapWaveComposition(mapIndex, waveNum) {
  const map = mapByIndex(mapIndex);
  const w = Math.max(1, Math.trunc(Number(waveNum)) || 1);
  const subBoss = subBossIdForWave(mapIndex, w);
  const pool = mapEnemyPool(mapIndex);
  const ramp = 5 + Math.floor(w * (1.1 + 0.15 * mapIndex)) + mapIndex * 2;
  const budget = subBoss ? Math.max(4, Math.round(ramp * 0.55)) : ramp;
  const weights = pool.map((type) => typeWeight(type, w, map.waveCount, mapIndex));
  const total = weights.reduce((s, x) => s + x, 0) || 1;
  const enemies = [];
  let assigned = 0;
  pool.forEach((type, idx) => {
    const heavyDiv = type === "fractal_host" ? 6 : type === "depth_crawler" ? 10 : 1;
    let count = Math.round(budget * weights[idx] / total / heavyDiv);
    if (idx === pool.length - 1) count = Math.max(count, 0);
    if (count > 0) {
      enemies.push({ type, count });
      assigned += count;
    }
  });
  if (!subBoss && assigned === 0) enemies.push({ type: "recursion", count: Math.max(3, Math.round(budget / 2)) });
  const comp = { enemies, subBoss: subBoss || null, leftFraction: null };
  if (subBoss) comp.note = "a guardian holds the line";
  return comp;
}
function typeWeight(type, w, waveCount, mapIndex) {
  const p = Math.min(1, w / Math.max(1, waveCount));
  switch (type) {
    case "recursion":
      return 6 - 3 * p;
    // always present, fades a bit late
    case "pattern_crawler":
      return 1 + 4 * p;
    // ramps up
    case "null_packet":
      return 1 + 3 * p;
    case "resonance_ghost":
      return p > 0.25 ? 1 + 3 * p : 0.2;
    case "fractal_host":
      return p > 0.4 ? 1 + 2 * p : 0.1;
    case "depth_crawler":
      return p > 0.6 ? 1 + 2 * p : 0.05;
    default:
      return 1;
  }
}

// ../../docs/games/metagame/stages/stage4/subboss.js
var SUB_BOSSES = {
  // Map 0
  "shell-warden": { name: "Shell Warden", glyph: "Ω", hp: 600, speed: 0.7, armor: 0.2, reward: 80, drain: 20, trigger: 0.5, ability: "recurse", telegraph: "will RECURSE (spawn copies) at half integrity" },
  // Map 1
  "echo-sentinel": { name: "Echo Sentinel", glyph: "Ψ", hp: 800, speed: 0.9, armor: 0.1, reward: 90, drain: 20, trigger: 0.5, ability: "haste", telegraph: "will HASTE itself when wounded" },
  "hall-keeper": { name: "Hall Keeper", glyph: "Φ", hp: 1200, speed: 0.7, armor: 0.3, reward: 120, drain: 25, trigger: 0.5, ability: "recurse", telegraph: "will RECURSE at half integrity" },
  // Map 2
  "mirror-prefect": { name: "Mirror Prefect", glyph: "Δ", hp: 1800, speed: 0.8, armor: 0.2, reward: 150, drain: 25, trigger: 0.5, ability: "shield", telegraph: "will raise a SHIELD (armor surge) when wounded" },
  "atrium-regent": { name: "Atrium Regent", glyph: "Θ", hp: 2600, speed: 0.7, armor: 0.3, reward: 200, drain: 30, trigger: 0.5, ability: "recurse", telegraph: "will RECURSE at half integrity" },
  // Map 3
  "cascade-anchor": { name: "Cascade Anchor", glyph: "Λ", hp: 3e3, speed: 0.7, armor: 0.3, reward: 220, drain: 30, trigger: 0.5, ability: "shield", telegraph: "will raise a SHIELD when wounded" },
  "descent-marshal": { name: "Descent Marshal", glyph: "Ξ", hp: 4200, speed: 0.8, armor: 0.25, reward: 280, drain: 35, trigger: 0.5, ability: "haste", telegraph: "will HASTE when wounded" },
  "cascade-sovereign": { name: "Cascade Sovereign", glyph: "Σ", hp: 5600, speed: 0.7, armor: 0.35, reward: 360, drain: 40, trigger: 0.5, ability: "recurse", telegraph: "will RECURSE at half integrity" },
  // Map 4
  "approach-vanguard": { name: "Approach Vanguard", glyph: "Π", hp: 6e3, speed: 0.8, armor: 0.3, reward: 380, drain: 40, trigger: 0.5, ability: "shield", telegraph: "will raise a SHIELD when wounded" },
  "event-horizon": { name: "Event Horizon", glyph: "◉", hp: 8e3, speed: 0.7, armor: 0.35, reward: 460, drain: 45, trigger: 0.5, ability: "recurse", telegraph: "will RECURSE at half integrity" },
  "penultimate-knot": { name: "Penultimate Knot", glyph: "╬", hp: 1e4, speed: 0.7, armor: 0.4, reward: 560, drain: 50, trigger: 0.5, ability: "haste", telegraph: "will HASTE when wounded" },
  "final-bastion": { name: "Final Bastion", glyph: "█", hp: 14e3, speed: 0.6, armor: 0.4, reward: 720, drain: 60, trigger: 0.5, ability: "recurse", telegraph: "will RECURSE at half integrity" }
};
function subBossDef(id) {
  return SUB_BOSSES[id] || null;
}
function spawnSubBoss(id, idCounter) {
  const def = SUB_BOSSES[id];
  if (!def) return null;
  return {
    id: `sb${idCounter}`,
    type: "subboss",
    subBoss: id,
    hp: def.hp,
    maxHp: def.hp,
    x: 0,
    y: 0,
    pathIndex: 0,
    speed: def.speed,
    armor: def.armor,
    slowImmune: false,
    abilityFired: false
  };
}

// ../../docs/games/metagame/stages/stage4/upgrades.js
function applyExtractorIncome(state) {
  let income = 0;
  for (const tower of state.towers || []) {
    const def = TOWER_TYPES[tower.type];
    if (def?.incomePerWave) income += def.incomePerWave;
  }
  state.cycles = (state.cycles || 0) + income;
  return income;
}

// ../../docs/games/metagame/stages/stage4/engine.js
function enemyDef(enemy) {
  if (enemy?.subBoss) {
    const sb = subBossDef(enemy.subBoss);
    if (sb) return { glyph: sb.glyph, reward: sb.reward, integrityDrain: sb.drain };
  }
  return ENEMY_TYPES[enemy?.type] || ENEMY_TYPES.recursion;
}
function startWave(state, waveNum, pathTiles) {
  const comp = state.campaign ? mapWaveComposition(state.campaign.mapIndex || 0, waveNum) : waveComposition(waveNum, state.recursion?.pointSetId || "x");
  const queue = [];
  for (const grp of comp.enemies) for (let i = 0; i < grp.count; i++) queue.push(grp.type);
  if (comp.subBoss) queue.push(`subboss:${comp.subBoss}`);
  state.waveNumber = waveNum;
  state.waveActive = true;
  state.waveFailed = false;
  state.enemies = [];
  state.spawnQueue = queue;
  state.spawnTimerMs = SPAWN_INTERVAL_MS;
  state.combatClockMs = 0;
  state.enemyNextId = 1;
  for (const t of state.towers) t.lastFiredMs = -Infinity;
  if (comp.subBoss) {
    const sb = subBossDef(comp.subBoss);
    if (sb) pushLog2(state, `${sb.glyph} ${sb.name} approaches — it ${sb.telegraph}.`);
  }
  return state;
}
function queueWave(state, waveNum) {
  const comp = state.campaign ? mapWaveComposition(state.campaign.mapIndex || 0, waveNum) : waveComposition(waveNum, state.recursion?.pointSetId || "x");
  for (const grp of comp.enemies) for (let i = 0; i < grp.count; i++) state.spawnQueue.push(grp.type);
  if (comp.subBoss) {
    state.spawnQueue.push(`subboss:${comp.subBoss}`);
    const sb = subBossDef(comp.subBoss);
    if (sb) pushLog2(state, `${sb.glyph} ${sb.name} approaches — it ${sb.telegraph}.`);
  }
  return state;
}
function tick(state, deltaMs, pathTiles) {
  if (!state.waveActive || !Array.isArray(pathTiles) || pathTiles.length < 2) return state;
  const dt = Math.max(0, Number(deltaMs) || 0);
  const exitIndex = pathTiles.length - 1;
  state.combatClockMs = (state.combatClockMs || 0) + dt;
  spawnDueEnemies(state, dt, pathTiles);
  moveEnemies(state, dt, pathTiles, exitIndex);
  fireTowers(state, pathTiles);
  reap(state, pathTiles);
  return state;
}
function resolveDeath(state, enemy, pathTiles) {
  const def = enemyDef(enemy);
  state.cycles = (state.cycles || 0) + (def.reward || 0);
  if (def.spawnsOnDeath) {
    for (let i = 0; i < def.spawnsOnDeath.count; i++) {
      const child = spawnEnemy(def.spawnsOnDeath.type, state.recursion?.pointSetId || "x", state.enemyNextId++);
      child.pathIndex = enemy.pathIndex;
      placeOnPath(child, pathTiles);
      state.enemies.push(child);
    }
    pushLog2(state, `${def.glyph} fractures into ${def.spawnsOnDeath.count}.`);
  }
  return def.reward || 0;
}
function waveComplete(state) {
  if (!state.waveActive) return false;
  if ((state.spawnQueue?.length || 0) > 0 || state.enemies.length > 0) return false;
  state.waveActive = false;
  applyExtractorIncome(state);
  return true;
}
function spawnDueEnemies(state, dt, pathTiles) {
  state.spawnTimerMs = (state.spawnTimerMs || 0) + dt;
  while ((state.spawnQueue?.length || 0) > 0 && state.spawnTimerMs >= SPAWN_INTERVAL_MS) {
    state.spawnTimerMs -= SPAWN_INTERVAL_MS;
    const type = state.spawnQueue.shift();
    const e = String(type).startsWith("subboss:") ? spawnSubBoss(type.slice("subboss:".length), state.enemyNextId++) : spawnEnemy(type, state.recursion?.pointSetId || "x", state.enemyNextId++);
    if (!e) continue;
    placeOnPath(e, pathTiles);
    state.enemies.push(e);
  }
}
function moveEnemies(state, dt, pathTiles, exitIndex) {
  const survivors = [];
  for (const e of state.enemies) {
    const slowed = !e.slowImmune && inAttractorField(state, e, pathTiles);
    const eff = e.speed * (slowed ? 0.5 : 1);
    e.pathIndex += eff * (dt / 1e3);
    if (e.pathIndex >= exitIndex) {
      const def = enemyDef(e);
      state.integrity = Math.max(0, (state.integrity || 0) - (def.integrityDrain || 0));
      if (state.integrity <= 0) state.waveFailed = true;
      pushLog2(state, `${def.glyph} reached the core.`);
      continue;
    }
    placeOnPath(e, pathTiles);
    survivors.push(e);
  }
  state.enemies = survivors;
}
function fireTowers(state, pathTiles) {
  const now = state.combatClockMs;
  for (const tower of state.towers) {
    const def = TOWER_TYPES[tower.type];
    if (!def || !def.fireRate || !def.damage) continue;
    if (now - (tower.lastFiredMs ?? -Infinity) < 1e3 / def.fireRate) continue;
    const inRange = state.enemies.filter((e) => dist(tower, e) <= def.range);
    if (!inRange.length) continue;
    tower.lastFiredMs = now;
    const bonus = 1 + 0.3 * hubsCovering(state, tower);
    const targets = def.aoe ? inRange : [selectTarget(inRange, tower)];
    for (const e of targets) applyDamage(state, tower, def, e, bonus, pathTiles);
  }
}
function applyDamage(state, tower, def, enemy, bonus, pathTiles) {
  let dmg = def.damage * bonus * (state.damageMult || 1);
  const tile = pathTiles[Math.floor(enemy.pathIndex)];
  if (tile?.recurve) dmg *= 2;
  const type = def.damageType || (def.ignoresArmor ? "null" : "kinetic");
  resolveDamage(enemy, dmg, type, { armor: enemy.armor });
  if (enemy.subBoss && !enemy.abilityFired) maybeFireSubBossAbility(state, enemy, pathTiles);
}
function maybeFireSubBossAbility(state, enemy, pathTiles) {
  const sb = subBossDef(enemy.subBoss);
  if (!sb || enemy.hp > enemy.maxHp * sb.trigger) return;
  enemy.abilityFired = true;
  if (sb.ability === "recurse") {
    for (let i = 0; i < 3; i++) {
      const child = spawnEnemy("recursion", state.recursion?.pointSetId || "x", state.enemyNextId++);
      child.pathIndex = Math.max(0, enemy.pathIndex - (i + 1));
      placeOnPath(child, pathTiles);
      state.enemies.push(child);
    }
    pushLog2(state, `${sb.glyph} ${sb.name} RECURSES — copies pour out.`);
  } else if (sb.ability === "haste") {
    enemy.speed *= 1.6;
    pushLog2(state, `${sb.glyph} ${sb.name} HASTES — it surges forward.`);
  } else if (sb.ability === "shield") {
    enemy.armor = Math.min(0.9, (enemy.armor || 0) + 0.3);
    pushLog2(state, `${sb.glyph} ${sb.name} raises a SHIELD.`);
  }
}
function reap(state, pathTiles) {
  const survivors = [];
  for (const e of state.enemies) {
    if (e.hp <= 0) resolveDeath(state, e, pathTiles);
    else survivors.push(e);
  }
  state.enemies = survivors;
}
function inAttractorField(state, enemy, pathTiles) {
  for (const t of state.towers) {
    const def = TOWER_TYPES[t.type];
    if (def?.slow && dist(t, enemy) <= def.range) return true;
  }
  return false;
}
function hubsCovering(state, tower) {
  let n = 0;
  for (const t of state.towers) {
    if (t === tower) continue;
    const def = TOWER_TYPES[t.type];
    if (def?.adjacencyBonus && dist(t, tower) <= def.range) n += 1;
  }
  return n;
}
var TARGET_COMPARATORS = {
  first: (a, b) => a.pathIndex > b.pathIndex,
  last: (a, b) => a.pathIndex < b.pathIndex,
  strongest: (a, b) => a.hp > b.hp || a.hp === b.hp && a.pathIndex > b.pathIndex,
  weakest: (a, b) => a.hp < b.hp || a.hp === b.hp && a.pathIndex > b.pathIndex,
  closest: (a, b, tower) => {
    const da = dist(tower, a);
    const db = dist(tower, b);
    return da < db || da === db && a.pathIndex > b.pathIndex;
  }
};
function selectTarget(enemies, tower) {
  if (!Array.isArray(enemies) || !enemies.length) return null;
  const cmp = TARGET_COMPARATORS[tower?.targetMode] || TARGET_COMPARATORS.first;
  return enemies.reduce((best, e) => cmp(e, best, tower) ? e : best, enemies[0]);
}
function placeOnPath(enemy, pathTiles) {
  const tile = pathTiles[Math.min(pathTiles.length - 1, Math.max(0, Math.floor(enemy.pathIndex)))];
  if (tile) {
    enemy.x = tile.x;
    enemy.y = tile.y;
  }
}
function dist(a, b) {
  return Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0));
}
function pushLog2(state, line) {
  state.log = [...state.log || [], line].slice(-12);
}

// ../../docs/games/metagame/stages/stage4/armory.js
var ARMORY_UPGRADES = [
  { id: "reinforced-core", label: "Reinforced Core", desc: "+25 starting integrity per level", baseCost: 30, costScale: 1.6, maxLevel: 4 },
  { id: "capital-reserves", label: "Capital Reserves", desc: "+60 starting cycles per level", baseCost: 30, costScale: 1.6, maxLevel: 4 },
  { id: "overclocked-emitters", label: "Overclocked Emitters", desc: "+8% tower damage per level", baseCost: 40, costScale: 1.8, maxLevel: 5 },
  { id: "glory-dividend", label: "Glory Dividend", desc: "+1 Glory per wave cleared", baseCost: 50, costScale: 2, maxLevel: 3 }
];
function armoryUpgradeById(id) {
  return ARMORY_UPGRADES.find((u) => u.id === id) || null;
}
function armoryLevel(campaign, id) {
  return Math.max(0, Math.trunc(Number(campaign?.armory?.[id]) || 0));
}
function armoryCost(campaign, id) {
  const def = armoryUpgradeById(id);
  if (!def) return Infinity;
  const lvl = armoryLevel(campaign, id);
  if (lvl >= def.maxLevel) return Infinity;
  return Math.floor(def.baseCost * Math.pow(def.costScale, lvl));
}
function canBuyArmory(campaign, id) {
  const cost = armoryCost(campaign, id);
  return Number.isFinite(cost) && Number(campaign?.glory || 0) >= cost;
}
function buyArmory(campaign, id) {
  const def = armoryUpgradeById(id);
  if (!def) return { ok: false, reason: "unknown" };
  const lvl = armoryLevel(campaign, id);
  if (lvl >= def.maxLevel) return { ok: false, reason: "maxed" };
  const cost = armoryCost(campaign, id);
  if (Number(campaign.glory || 0) < cost) return { ok: false, reason: "poor", cost };
  campaign.glory = Number(campaign.glory || 0) - cost;
  if (!campaign.armory || typeof campaign.armory !== "object") campaign.armory = {};
  campaign.armory[id] = lvl + 1;
  return { ok: true, level: lvl + 1, cost };
}
function armoryEffects(campaign) {
  return {
    integrityBonus: armoryLevel(campaign, "reinforced-core") * 25,
    cyclesBonus: armoryLevel(campaign, "capital-reserves") * 60,
    damageMult: 1 + armoryLevel(campaign, "overclocked-emitters") * 0.08,
    gloryPerWaveBonus: armoryLevel(campaign, "glory-dividend")
  };
}

// ../../docs/games/metagame/stages/stage4/run4.js
var GLORY_PER_WAVE_BASE = 2;
var GLORY_MAP_CLEAR_BASE = 12;
var WAVE_REGEN = 8;
var BOSS_ARENA_CYCLES = 600;
function createCampaign() {
  return {
    status: "map-select",
    // map-select | combat | armory | boss | won
    mapIndex: 0,
    // the active map while in combat / armory
    clearedMaps: [],
    // indices of cleared maps
    glory: 0,
    armory: {}
    // { upgradeId: level }
  };
}
function ensureCampaign(state) {
  const fresh = createCampaign();
  const c = state.campaign && typeof state.campaign === "object" ? state.campaign : {};
  c.status = ["map-select", "combat", "armory", "boss", "won"].includes(c.status) ? c.status : "map-select";
  c.mapIndex = clampIndex(c.mapIndex);
  c.clearedMaps = Array.isArray(c.clearedMaps) ? [...new Set(c.clearedMaps.map(clampIndex))].filter((i) => i >= 0).sort((a, b) => a - b) : [];
  c.glory = Number.isFinite(c.glory) ? Math.max(0, c.glory) : 0;
  c.armory = c.armory && typeof c.armory === "object" ? c.armory : {};
  state.campaign = c;
  return c;
}
function mapUnlocked(state, i) {
  const idx = clampIndex(i);
  if (idx === 0) return true;
  return (state.campaign?.clearedMaps || []).includes(idx - 1);
}
function mapCleared(state, i) {
  return (state.campaign?.clearedMaps || []).includes(clampIndex(i));
}
function allMapsCleared(state) {
  const cleared = state.campaign?.clearedMaps || [];
  return MAPS.every((_, i) => cleared.includes(i));
}
function bossUnlocked(state) {
  return allMapsCleared(state) && !state.boss?.defeated;
}
function selectMap(state, i) {
  const idx = clampIndex(i);
  if (!mapUnlocked(state, idx)) return { ok: false, reason: "locked" };
  const c = ensureCampaign(state);
  c.mapIndex = idx;
  c.status = "combat";
  resetCombatForMap(state, idx);
  return { ok: true, mapIndex: idx };
}
function resetCombatForMap(state, i) {
  const idx = clampIndex(i);
  const map = mapByIndex(idx);
  const fx = armoryEffects(state.campaign);
  state.cycles = map.startCycles + fx.cyclesBonus;
  state.integrity = map.startIntegrity + fx.integrityBonus;
  state.maxIntegrity = map.startIntegrity + fx.integrityBonus;
  state.damageMult = fx.damageMult;
  state.waveNumber = 1;
  state.waveActive = false;
  state.waveFailed = false;
  state.towers = [];
  state.enemies = [];
  state.spawnQueue = [];
  return state;
}
function recordWaveCleared(state) {
  const c = ensureCampaign(state);
  const idx = c.mapIndex;
  const map = mapByIndex(idx);
  const fx = armoryEffects(c);
  const gloryGain = GLORY_PER_WAVE_BASE + idx + fx.gloryPerWaveBonus;
  c.glory = Number(c.glory || 0) + gloryGain;
  state.integrity = Math.min(state.maxIntegrity || map.startIntegrity, (state.integrity || 0) + WAVE_REGEN);
  const wasFinal = (state.waveNumber || 1) >= map.waveCount;
  if (wasFinal) {
    const mapGlory = markMapCleared(state, idx);
    return { gloryGain, mapCleared: true, mapGlory };
  }
  state.waveNumber = (state.waveNumber || 1) + 1;
  return { gloryGain, mapCleared: false };
}
function markMapCleared(state, idx) {
  const c = ensureCampaign(state);
  if (!c.clearedMaps.includes(idx)) c.clearedMaps.push(idx);
  c.clearedMaps.sort((a, b) => a - b);
  const mapGlory = GLORY_MAP_CLEAR_BASE * (idx + 1);
  c.glory = Number(c.glory || 0) + mapGlory;
  state.waveActive = false;
  c.status = "armory";
  return mapGlory;
}
function leaveArmory(state) {
  ensureCampaign(state).status = "map-select";
  return { ok: true };
}
function enterBoss(state) {
  if (!bossUnlocked(state)) return { ok: false, reason: "locked" };
  const c = ensureCampaign(state);
  c.status = "boss";
  resetBossArena(state);
  return { ok: true };
}
function resetBossArena(state) {
  const fx = armoryEffects(state.campaign);
  state.cycles = BOSS_ARENA_CYCLES + fx.cyclesBonus;
  state.integrity = 100 + fx.integrityBonus;
  state.maxIntegrity = 100 + fx.integrityBonus;
  state.damageMult = fx.damageMult;
  state.waveNumber = 1;
  state.waveActive = false;
  state.towers = [];
  state.enemies = [];
  return state;
}
function winCampaign(state) {
  ensureCampaign(state).status = "won";
  return { ok: true };
}
function seatAtBoss(state) {
  const c = ensureCampaign(state);
  c.clearedMaps = MAPS.map((_, i) => i);
  return enterBoss(state);
}
function debugClearMap(state) {
  const c = ensureCampaign(state);
  return { ok: true, mapGlory: markMapCleared(state, c.mapIndex) };
}
function campaignProgress(state) {
  return { cleared: (state.campaign?.clearedMaps || []).length, total: MAP_COUNT };
}
function clampIndex(i) {
  return Math.max(0, Math.min(MAP_COUNT - 1, Math.trunc(Number(i)) || 0));
}

// ../../docs/games/metagame/stages/stage4/state.js
function defaultState(context = {}) {
  const seed = stageSeed(context);
  return {
    version: 1,
    cycles: 240,
    wave: 4,
    // Full-TD fields (engine.js reads/writes these; see stage4 buildplan A3). Enemies are ephemeral
    // (regenerated per wave, never persisted). towerNextId replaces any Math.random id generation.
    integrity: 100,
    maxIntegrity: 100,
    // per-map cap (set by run4.resetCombatForMap; integrity regen never exceeds it)
    damageMult: 1,
    // Armory "Overclocked Emitters" multiplier (applied by engine.applyDamage)
    waveGroup: 1,
    waveActive: false,
    waveNumber: 1,
    enemies: [],
    towerNextId: 1,
    // The 5-map campaign state machine (run4.js): status, mapIndex, clearedMaps, glory, armory.
    campaign: createCampaign(),
    recursion: {
      pointSetId: `fractal-${seed}`,
      points: generateRecursionPoints(seed)
    },
    towers: [],
    boss: {
      reached: false,
      hp: 300,
      attempts: 0,
      lockHintStep: 0,
      defeated: false
    },
    log: ["fractal bastion mounted.", "the path repeats before it explains itself."]
  };
}
function normalizeState(state, context = {}) {
  const fresh = defaultState(context);
  const target = state && typeof state === "object" ? state : {};
  target.version = 1;
  target.cycles = Number.isFinite(target.cycles) ? target.cycles : fresh.cycles;
  target.wave = Number.isFinite(target.wave) ? target.wave : fresh.wave;
  target.integrity = Number.isFinite(target.integrity) ? target.integrity : fresh.integrity;
  target.maxIntegrity = Number.isFinite(target.maxIntegrity) ? target.maxIntegrity : fresh.maxIntegrity;
  target.damageMult = Number.isFinite(target.damageMult) ? target.damageMult : fresh.damageMult;
  target.waveGroup = Number.isFinite(target.waveGroup) ? target.waveGroup : fresh.waveGroup;
  target.waveActive = Boolean(target.waveActive);
  target.waveNumber = Number.isFinite(target.waveNumber) ? target.waveNumber : fresh.waveNumber;
  target.enemies = [];
  target.towerNextId = Number.isFinite(target.towerNextId) ? target.towerNextId : fresh.towerNextId;
  target.recursion = mergePlain(fresh.recursion, target.recursion);
  target.recursion.pointSetId = String(target.recursion.pointSetId || fresh.recursion.pointSetId);
  target.recursion.points = normalizePoints(target.recursion.points, fresh.recursion.points);
  target.towers = Array.isArray(target.towers) ? target.towers.map(normalizeTower).filter(Boolean) : [];
  target.boss = mergePlain(fresh.boss, target.boss);
  ensureCampaign(target);
  target.log = Array.isArray(target.log) ? target.log : [...fresh.log];
  return target;
}
function snapshotWave(state) {
  return {
    waveNumber: state.waveNumber,
    wavePeak: Number.isFinite(state.wavePeak) ? state.wavePeak : state.waveNumber,
    waveActive: Boolean(state.waveActive),
    waveFailed: Boolean(state.waveFailed),
    integrity: state.integrity,
    cycles: state.cycles,
    enemies: (state.enemies || []).map((enemy) => ({ ...enemy })),
    spawnQueue: [...state.spawnQueue || []],
    spawnTimerMs: Number(state.spawnTimerMs) || 0,
    combatClockMs: Number(state.combatClockMs) || 0,
    enemyNextId: Number.isFinite(state.enemyNextId) ? state.enemyNextId : 1
  };
}
function restoreWave(state, snap) {
  if (!snap || typeof snap !== "object") return state;
  if (Number.isFinite(snap.waveNumber)) state.waveNumber = snap.waveNumber;
  state.wavePeak = Number.isFinite(snap.wavePeak) ? snap.wavePeak : state.waveNumber;
  state.waveActive = Boolean(snap.waveActive);
  state.waveFailed = Boolean(snap.waveFailed);
  if (Number.isFinite(snap.integrity)) state.integrity = snap.integrity;
  if (Number.isFinite(snap.cycles)) state.cycles = snap.cycles;
  state.enemies = Array.isArray(snap.enemies) ? snap.enemies.map((enemy) => ({ ...enemy })) : [];
  state.spawnQueue = Array.isArray(snap.spawnQueue) ? [...snap.spawnQueue] : [];
  state.spawnTimerMs = Number(snap.spawnTimerMs) || 0;
  state.combatClockMs = Number(snap.combatClockMs) || 0;
  state.enemyNextId = Number.isFinite(snap.enemyNextId) ? snap.enemyNextId : 1;
  return state;
}
function generateRecursionPoints(seed) {
  let value = hashSeed(seed);
  const points = [];
  const lanes = [
    { minX: 7, maxX: 14, minY: 8, maxY: 13 },
    { minX: 18, maxX: 25, minY: 16, maxY: 22 },
    { minX: 27, maxX: 34, minY: 25, maxY: 31 }
  ];
  for (let index = 0; index < lanes.length; index += 1) {
    value = lcg(value);
    const lane = lanes[index];
    const x = lane.minX + value % (lane.maxX - lane.minX + 1);
    value = lcg(value);
    const y = lane.minY + value % (lane.maxY - lane.minY + 1);
    points.push({ id: `R${index + 1}`, x, y, radius: 2 });
  }
  return points;
}
function normalizePoints(points, fallback) {
  if (!Array.isArray(points) || !points.length) return fallback.map((point) => ({ ...point }));
  return points.map((point, index) => ({
    id: String(point.id || `R${index + 1}`),
    x: clampInt(point.x, 0, 39),
    y: clampInt(point.y, 0, 39),
    radius: clampInt(point.radius || 2, 1, 5)
  }));
}
function normalizeTower(tower) {
  if (!tower || typeof tower !== "object") return null;
  const x = clampInt(tower.x, 0, 39);
  const y = clampInt(tower.y, 0, 39);
  const type = String(tower.type || "pulse_node");
  return {
    id: String(tower.id || `tower-${type}-${x}-${y}`),
    type,
    x,
    y,
    level: clampInt(tower.level || 1, 1, 3),
    targetMode: TARGET_MODES.includes(tower.targetMode) ? tower.targetMode : "first",
    abilityReady: tower.abilityReady !== false,
    abilityUsed: Boolean(tower.abilityUsed)
  };
}
function stageSeed(context) {
  return String(context.seed || "fractal-bastion").replace(/\W/g, "").slice(-8) || "stage4";
}
function hashSeed(seed) {
  let hash = 2166136261;
  for (const ch of String(seed)) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
function lcg(value) {
  return Math.imul(value, 1664525) + 1013904223 >>> 0;
}
function clampInt(value, min, max) {
  const number = Math.trunc(Number(value));
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}
function mergePlain(base, override) {
  return { ...base, ...override && typeof override === "object" ? override : {} };
}

// ../../docs/games/metagame/stages/stage4/ui-combat.js
var PLACEABLE = ["pulse_node", "scatter_array", "null_spike", "attractor_field"];
var PERSIST_THROTTLE_MS = 1e3;
var CALL_EARLY_BONUS = 20;
var SPEEDS = [1, 2, 3];
function mountCombat({ host, state, controller, mode = "map" }) {
  const isBoss = mode === "boss";
  const mapIndex = state.campaign?.mapIndex ?? 0;
  const map = mapByIndex(mapIndex);
  const root = document.createElement("section");
  root.className = "stage4-combat";
  root.innerHTML = `
    <header class="s4-hud">
      <strong>${isBoss ? "THE INFINITE LOOP" : `${map.glyph} ${map.name.toUpperCase()}`}</strong>
      <span>CYCLES <span data-field="cycles"></span></span>
      <span>INTEGRITY <span data-field="integrity"></span></span>
      <span>${isBoss ? "POINTS" : "WAVE"} <span data-field="progress"></span></span>
      <button type="button" data-action="leave" class="s4-leave">${isBoss ? "retreat" : "← maps"}</button>
    </header>
    <div class="s4-layout">
      <pre class="s4-board" aria-label="fractal bastion board"></pre>
      <section class="s4-panel">
        <div class="s4-hint" data-field="hint"></div>
        <div class="s4-shop" data-field="shop"></div>
        <div class="s4-roster" data-field="roster"></div>
      </section>
    </div>
    <ol class="s4-log"></ol>
    <div class="s4-controls">
      ${isBoss ? "" : `
        <button type="button" data-action="start-wave">start wave</button>
        <button type="button" data-action="call-early" hidden>call next wave (+${CALL_EARLY_BONUS})</button>
        <button type="button" data-action="speed">speed 1×</button>`}
      ${isBoss ? '<button type="button" data-action="confront">confront The Infinite Loop</button>' : ""}
      <button type="button" data-action="blueprint">open recursion_points.json</button>
    </div>
  `;
  host.replaceChildren(root);
  const fields = Object.fromEntries([...root.querySelectorAll("[data-field]")].map((el) => [el.dataset.field, el]));
  const logEl = root.querySelector(".s4-log");
  const board = root.querySelector(".s4-board");
  let selected = "pulse_node";
  let speed = 1;
  let raf = null;
  let lastPersistMs = -Infinity;
  let alive = true;
  let path = buildPath(isBoss ? state.recursion?.pointSetId || "x" : mapPathSeed(state.recursion?.pointSetId, mapIndex), isBoss ? 3 : map.depth);
  if (!Number.isFinite(state.wavePeak)) state.wavePeak = state.waveNumber || 1;
  function checkpointWave(overrides) {
    controller.checkpointWave?.({ ...snapshotWave(state), ...overrides });
  }
  function endWaveSnapshot() {
    controller.endWaveSnapshot?.();
  }
  function repaint() {
    if (!alive) return;
    const lock = getBossLockState({ actions: controller.actions, state });
    fields.cycles.textContent = String(state.cycles);
    fields.integrity.textContent = `${state.integrity}/${state.maxIntegrity || state.integrity}`;
    fields.progress.textContent = isBoss ? `${lock.coveredPoints}/${lock.totalPoints}` : `${Math.min(state.waveNumber || 1, map.waveCount)}/${map.waveCount}`;
    fields.hint.textContent = isBoss ? lock.hint : state.waveActive ? "hold the line — call the next wave early for bonus cycles" : "place towers, then start the wave";
    fields.shop.replaceChildren(...shopRows());
    fields.roster.replaceChildren(...rosterRows());
    board.textContent = boardText(state, path.tiles);
    if (!isBoss) {
      root.querySelector('[data-action="call-early"]').hidden = !state.waveActive || (state.wavePeak || 1) >= map.waveCount;
      root.querySelector('[data-action="speed"]').textContent = `speed ${speed}×`;
    }
    logEl.replaceChildren(...(state.log || []).slice(-6).map((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      return li;
    }));
  }
  function shopRows() {
    return PLACEABLE.map((type) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.tower = type;
      btn.className = type === selected ? "is-selected" : "";
      btn.textContent = `${TOWER_TYPES[type].glyph} ${type} (${TOWER_TYPES[type].cost})`;
      return btn;
    });
  }
  function rosterRows() {
    return (state.towers || []).map((tower) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.towerId = tower.id;
      const def = TOWER_TYPES[tower.type] || {};
      btn.textContent = `${def.glyph || "[?]"} ${tower.x},${tower.y} → ${String(tower.targetMode || "first").toUpperCase()}${def.aoe ? " (aoe)" : ""}`;
      return btn;
    });
  }
  function startWaveAction() {
    if (isBoss || state.waveActive || (state.waveNumber || 1) > map.waveCount) return;
    startWave(state, state.waveNumber, path.tiles);
    state.wavePeak = state.waveNumber;
    lastPersistMs = -Infinity;
    checkpointWave();
    controller.persist?.();
    runLoop();
  }
  function callEarly() {
    if (isBoss || !state.waveActive || (state.wavePeak || 1) >= map.waveCount) return;
    state.wavePeak = (state.wavePeak || state.waveNumber) + 1;
    queueWave(state, state.wavePeak);
    state.cycles = (state.cycles || 0) + CALL_EARLY_BONUS;
    pushLog(state, `wave ${state.wavePeak} called early (+${CALL_EARLY_BONUS} cycles).`);
    checkpointWave();
    repaint();
  }
  function setSpeed(n) {
    speed = SPEEDS.includes(Number(n)) ? Number(n) : SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    repaint();
    return speed;
  }
  function runLoop() {
    stopLoop();
    let last = null;
    const stepFn = (ts) => {
      const dt = (last == null ? 16 : Math.min(100, ts - last)) * speed;
      last = ts;
      tick(state, dt, path.tiles);
      checkpointWave();
      if (settleWave()) {
        raf = null;
        return;
      }
      if ((state.combatClockMs || 0) - lastPersistMs >= PERSIST_THROTTLE_MS) {
        lastPersistMs = state.combatClockMs;
        controller.persist?.();
      }
      repaint();
      raf = requestAnimationFrame(stepFn);
    };
    raf = requestAnimationFrame(stepFn);
  }
  function stopLoop() {
    if (raf != null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  }
  function settleWave() {
    if (state.waveFailed) {
      stopLoop();
      pushLog(state, "integrity collapsed — the bastion folds.");
      endWaveSnapshot();
      controller.onWaveFailed?.();
      repaint();
      controller.persist?.();
      return true;
    }
    if (waveComplete(state)) {
      const cleared = creditWaves();
      endWaveSnapshot();
      controller.persist?.();
      if (cleared) {
        stopLoop();
        controller.rerender();
        return true;
      }
      repaint();
      return true;
    }
    return false;
  }
  function creditWaves() {
    const target = Math.max(state.wavePeak || state.waveNumber, state.waveNumber);
    let cleared = false;
    while ((state.waveNumber || 1) <= target && !cleared) {
      const r = controller.recordWaveCleared();
      if (r.mapCleared) cleared = true;
    }
    if (!cleared) state.wavePeak = state.waveNumber;
    return cleared;
  }
  function confront() {
    if (!isBoss) return null;
    const result = fightInfiniteLoop({ state, actions: controller.actions });
    if (result.defeated) {
      controller.onBossWin();
      return result;
    }
    repaint();
    controller.persist?.();
    return result;
  }
  function place(x, y, type) {
    const r = placeTower(state, { x, y, type: type || selected });
    repaint();
    controller.persist?.();
    return r;
  }
  function cycleTarget(id) {
    const m = cycleTowerTarget(state, id);
    repaint();
    controller.persist?.();
    return m;
  }
  function setWave(n) {
    state.waveNumber = Math.max(1, Math.trunc(n) || 1);
    state.wavePeak = state.waveNumber;
    repaint();
  }
  root.addEventListener("click", (event) => {
    const rosterBtn = event.target.closest("button[data-tower-id]");
    if (rosterBtn) {
      cycleTarget(rosterBtn.dataset.towerId);
      return;
    }
    const towerBtn = event.target.closest("button[data-tower]");
    if (towerBtn) {
      selected = towerBtn.dataset.tower;
      repaint();
      return;
    }
    const cell = boardCell(event);
    if (cell) {
      place(cell.x, cell.y);
      return;
    }
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    switch (button.dataset.action) {
      case "start-wave":
        startWaveAction();
        break;
      case "call-early":
        callEarly();
        break;
      case "speed":
        setSpeed();
        break;
      case "confront":
        confront();
        break;
      case "leave":
        stopLoop();
        controller.leaveCombat?.();
        break;
      case "blueprint":
        controller.openBlueprint?.();
        break;
      default:
        break;
    }
  });
  function boardCell(event) {
    if (!event.target.closest(".s4-board")) return null;
    const rect = board.getBoundingClientRect();
    const cols = (board.textContent.split("\n")[0] || "").length || 40;
    const rows = board.textContent.split("\n").length || 40;
    const x = Math.floor((event.clientX - rect.left) / rect.width * cols);
    const y = Math.floor((event.clientY - rect.top) / rect.height * rows);
    if (x < 0 || y < 0 || x >= cols || y >= rows) return null;
    return { x, y };
  }
  if (!isBoss && state.waveActive && (state.waveNumber || 1) <= map.waveCount) runLoop();
  repaint();
  return {
    repaint,
    destroy() {
      alive = false;
      stopLoop();
      root.remove();
    },
    hook: {
      // Synchronous wave runner for the headless smoke (no rAF).
      advance(ms = 3e4, dt = 100) {
        let t = 0;
        while (t < ms && state.waveActive) {
          tick(state, dt * speed, path.tiles);
          checkpointWave();
          if (settleWave()) break;
          t += dt;
        }
        if (alive) repaint();
      },
      startWave: startWaveAction,
      callEarly,
      setSpeed,
      place,
      cycleTarget,
      setWave,
      confront
    }
  };
}

// ../../docs/games/metagame/stages/stage4/ui-campaign.js
function renderMapSelect(host, controller) {
  const state = controller.state;
  const root = document.createElement("section");
  root.className = "stage4-mapselect";
  const won = state.campaign.status === "won" || state.boss?.defeated;
  function repaint() {
    const prog = campaignProgress(state);
    const bossReady = bossUnlocked(state);
    root.innerHTML = `
      <header class="s4-hud"><strong>FRACTAL BASTION — CAMPAIGN</strong>
        <span>GLORY ${state.campaign.glory}</span>
        <span>MAPS ${prog.cleared}/${prog.total}</span>
      </header>
      <p class="s4-hint">${won ? "The Infinite Loop has stopped. The bastion holds." : "Clear each map to unlock the next. The Infinite Loop opens only when all five are held."}</p>
      <ol class="s4-maplist">
        ${MAPS.map((m, i) => mapRow(m, i)).join("")}
      </ol>
      <div class="s4-controls">
        <button type="button" data-action="boss" ${bossReady ? "" : "disabled"}>${won ? "The Infinite Loop (cleared)" : "confront The Infinite Loop"}</button>
        ${won ? '<button type="button" data-action="bts">open fractal_bastion.bts</button>' : ""}
      </div>`;
  }
  function mapRow(m, i) {
    const unlocked = mapUnlocked(state, i);
    const cleared = mapCleared(state, i);
    const status = cleared ? "CLEARED" : unlocked ? "OPEN" : "LOCKED";
    return `<li class="s4-maprow ${cleared ? "is-cleared" : unlocked ? "is-open" : "is-locked"}">
      <span class="s4-mapglyph">${m.glyph}</span>
      <span class="s4-mapname">${m.name}</span>
      <span class="s4-mapwaves">${m.waveCount} waves</span>
      <span class="s4-maptheme">${m.theme}</span>
      <span class="s4-mapstatus">${status}</span>
      <button type="button" data-select="${i}" ${unlocked ? "" : "disabled"}>${cleared ? "replay" : "enter"}</button>
    </li>`;
  }
  root.addEventListener("click", (event) => {
    const sel = event.target.closest("button[data-select]");
    if (sel) {
      controller.selectMap(Number(sel.dataset.select));
      return;
    }
    const action = event.target.closest("button[data-action]");
    if (!action) return;
    if (action.dataset.action === "boss" && allMapsCleared(state)) controller.enterBoss();
    else if (action.dataset.action === "bts") controller.openBts();
  });
  repaint();
  host.replaceChildren(root);
  return { repaint, destroy() {
    root.remove();
  } };
}
function renderArmory(host, controller) {
  const state = controller.state;
  const root = document.createElement("section");
  root.className = "stage4-armory";
  function repaint() {
    root.innerHTML = `
      <header class="s4-hud"><strong>⚙ THE ARMORY</strong><span>GLORY ${state.campaign.glory}</span></header>
      <p class="s4-hint">Map cleared. Spend Glory on permanent campaign upgrades, then advance.</p>
      <ol class="s4-armorylist">${ARMORY_UPGRADES.map((u) => armoryRow(u)).join("")}</ol>
      <div class="s4-controls"><button type="button" data-action="continue">continue →</button></div>`;
  }
  function armoryRow(u) {
    const lvl = armoryLevel(state.campaign, u.id);
    const cost = armoryCost(state.campaign, u.id);
    const maxed = lvl >= u.maxLevel;
    const afford = canBuyArmory(state.campaign, u.id);
    return `<li class="s4-armoryrow">
      <span class="s4-armoryname">${u.label} <em>Lv ${lvl}/${u.maxLevel}</em></span>
      <span class="s4-armorydesc">${u.desc}</span>
      <button type="button" data-buy="${u.id}" ${maxed || !afford ? "disabled" : ""}>${maxed ? "MAX" : `buy (${cost})`}</button>
    </li>`;
  }
  root.addEventListener("click", (event) => {
    const buy = event.target.closest("button[data-buy]");
    if (buy) {
      const r = controller.buyArmory(buy.dataset.buy);
      if (r?.ok) repaint();
      return;
    }
    if (event.target.closest('button[data-action="continue"]')) controller.leaveArmory();
  });
  repaint();
  host.replaceChildren(root);
  return { repaint, destroy() {
    root.remove();
  } };
}

// ../../docs/games/metagame/stages/stage4/renderer.js
function renderStage4(ctx) {
  const { host, state, actions, bts, viewer, save, onStageComplete, run } = ctx;
  ensureCampaign(state);
  ensureStyles();
  const root = document.createElement("section");
  root.className = "stage4-fractal-bastion";
  root.innerHTML = '<div class="s4-screen" data-screen></div>';
  host.replaceChildren(root);
  const screen = root.querySelector("[data-screen]");
  const completeOnce = once((result) => onStageComplete?.(result));
  let active = null;
  function persistNow() {
    run?.flush?.();
    save?.();
  }
  function checkpointWave(snap) {
    if (run?.checkpoint) run.checkpoint({ ...snap, runTag: run.seed });
  }
  function endWaveSnapshot() {
    checkpointWave({ ...snapshotWave(state), waveActive: false });
    run?.flush?.();
  }
  const controller = {
    state,
    actions,
    persist: persistNow,
    checkpointWave,
    endWaveSnapshot,
    openBlueprint() {
      viewer?.openFile?.(RECURSION_BLUEPRINT_PATH, { mime: "application/json", source: "stage4" });
    },
    openBts() {
      bts?.open?.(4);
    },
    selectMap(i) {
      const r = selectMap(state, i);
      if (r.ok) {
        persistNow();
        render();
      }
      return r;
    },
    recordWaveCleared() {
      const r = recordWaveCleared(state);
      save?.();
      return r;
    },
    leaveArmory() {
      leaveArmory(state);
      save?.();
      render();
    },
    leaveCombat() {
      ensureCampaign(state).status = "map-select";
      persistNow();
      render();
    },
    buyArmory(id) {
      const r = buyArmory(state.campaign, id);
      if (r.ok) {
        save?.();
        active?.repaint?.();
      }
      return r;
    },
    enterBoss() {
      const r = enterBoss(state);
      if (r.ok) {
        run?.reset?.();
        persistNow();
        render();
      }
      return r;
    },
    onBossWin() {
      winCampaign(state);
      run?.reset?.();
      persistNow();
      render();
      completeOnce({ stage: 4, defeated: true, btsPath: BTS_PATH });
    },
    onWaveFailed() {
    },
    rerender() {
      render();
    },
    // debug-only (smoke); never a player affordance
    seatAtBoss() {
      seatAtBoss(state);
      persistNow();
      render();
    },
    debugClearMap() {
      debugClearMap(state);
      save?.();
      render();
    }
  };
  function destroyActive() {
    if (active?.destroy) active.destroy();
    active = null;
  }
  function render() {
    destroyActive();
    const status = state.campaign.status;
    if (status === "combat") active = mountCombat({ host: screen, state, controller, mode: "map" });
    else if (status === "boss") active = mountCombat({ host: screen, state, controller, mode: "boss" });
    else if (status === "armory") active = renderArmory(screen, controller);
    else active = renderMapSelect(screen, controller);
    refreshHook();
  }
  if (state.campaign.status === "combat" && run) {
    const snap = run.restore();
    if (snap && snap.runTag === run.seed && snap.waveActive && !state.boss?.defeated) restoreWave(state, snap);
  }
  function refreshHook() {
    window.__fvStage4 = {
      state: () => state,
      status: () => state.campaign.status,
      selectMap: (i) => controller.selectMap(i),
      startWave: () => active?.hook?.startWave?.(),
      advance: (ms, dt) => active?.hook?.advance?.(ms, dt),
      callEarly: () => active?.hook?.callEarly?.(),
      setSpeed: (n) => active?.hook?.setSpeed?.(n),
      place: (x, y, t) => active?.hook?.place?.(x, y, t),
      setWave: (n) => active?.hook?.setWave?.(n),
      cycleTarget: (id) => active?.hook?.cycleTarget?.(id),
      confront: () => active?.hook?.confront?.(),
      buyArmory: (id) => controller.buyArmory(id),
      leaveArmory: () => controller.leaveArmory(),
      enterBoss: () => controller.enterBoss(),
      seatAtBoss: () => controller.seatAtBoss(),
      debugClearMap: () => controller.debugClearMap(),
      bossUnlocked: () => bossUnlocked(state)
    };
  }
  const onHide = () => {
    if (typeof document === "undefined" || document.visibilityState === "hidden") persistNow();
  };
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", onHide);
  if (typeof window !== "undefined") window.addEventListener("pagehide", persistNow);
  render();
  return {
    repaint: () => active?.repaint?.(),
    destroy() {
      destroyActive();
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onHide);
      if (typeof window !== "undefined") window.removeEventListener("pagehide", persistNow);
      if (window.__fvStage4) delete window.__fvStage4;
      root.remove();
    }
  };
}
function ensureStyles() {
  const id = "stage4-fractal-bastion-styles";
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = new URL("./styles.css", import.meta.url).href;
  document.head.append(link);
}
function once(fn) {
  let called = false;
  return (value) => {
    if (called) return;
    called = true;
    fn(value);
  };
}

// ../../docs/games/metagame/stages/stage4/index.js
import { createRun } from "../../shared/run-state.js";
var stageMeta = {
  id: 4,
  slug: "fractal-bastion",
  name: "Fractal Bastion",
  btsPath: BTS_PATH,
  requiredAction: REQUIRED_ACTION
};
function defaultState2(context) {
  return defaultState(context);
}
function mountStage(ctx) {
  const state = normalizeState(ctx.state, ctx);
  ensureStyles2();
  if (hasRecursionBlueprint(ctx.actions)) state.log = [...state.log, "recursion blueprint already read."].slice(-8);
  const saveData = ctx.orchestrator?.save;
  const run = saveData ? createRun({ save: saveData, stageId: 4, slot: "runwave", debounceMs: 0 }) : null;
  const view = renderStage4({ ...ctx, state, run });
  return {
    repaint: view.repaint,
    destroy() {
      if (run && typeof run.destroy === "function") run.destroy();
      if (view && typeof view.destroy === "function") view.destroy();
    }
  };
}
function ensureStyles2() {
  const id = "stage4-fractal-bastion-styles";
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = new URL("./styles.css", import.meta.url).href;
  document.head.append(link);
}
export {
  applyRecursionBlueprintOpen,
  defaultState2 as defaultState,
  fightInfiniteLoop,
  getBossLockState,
  getTowerCoverage,
  hasRecursionBlueprint,
  mountStage,
  placeTower,
  recursionBlueprintContent,
  recursionBlueprintData,
  stageMeta
};
