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
function placeTower(state, { x, y, type = "pulse_node" }) {
  const cost = type === "scatter_array" ? 150 : 80;
  if (Number(state.cycles || 0) < cost) return { ok: false, reason: "cycles" };
  const tower = {
    id: `tower-${state.towers.length + 1}`,
    type,
    x: Math.trunc(Number(x)),
    y: Math.trunc(Number(y))
  };
  if (!Number.isFinite(tower.x) || !Number.isFinite(tower.y)) return { ok: false, reason: "position" };
  state.cycles -= cost;
  state.towers.push(tower);
  const coverage = getTowerCoverage(state);
  pushLog(state, `${type} placed at ${tower.x},${tower.y}. ${coverage.covered.length}/${coverage.total} recursion points covered.`);
  return { ok: true, tower, coverage };
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
function waveGroupDepth(waveNum) {
  const n = Number(waveNum) || 1;
  if (n <= 10) return 1;
  if (n <= 20) return 2;
  return 3;
}
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

// ../../docs/games/metagame/stages/stage4/towers.js
var TOWER_TYPES = {
  pulse_node: { glyph: "[P]", cost: 80, range: 3, fireRate: 1, damage: 20, ability: "emp_burst" },
  scatter_array: { glyph: "[S]", cost: 150, range: 2, fireRate: 0.8, damage: 12, aoe: 2, ability: "overcharge" },
  null_spike: { glyph: "[N]", cost: 200, range: 4, fireRate: 0.5, damage: 40, ignoresArmor: true, ability: "null_wave" },
  attractor_field: { glyph: "[A]", cost: 120, range: 3, fireRate: 0, damage: 0, slow: 0.5 },
  resonance_hub: { glyph: "[H]", cost: 250, range: 5, fireRate: 0, damage: 0, adjacencyBonus: 0.3 },
  cycle_extractor: { glyph: "[E]", cost: 250, range: 0, fireRate: 0, damage: 0, incomePerWave: 25 }
};

// ../../docs/games/metagame/stages/stage4/waves.js
var SPAWN_INTERVAL_MS = 1500;
var FINAL_WAVE = 31;
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
function startWave(state, waveNum, pathTiles) {
  const comp = waveComposition(waveNum, state.recursion?.pointSetId || "x");
  const queue = [];
  for (const grp of comp.enemies) for (let i = 0; i < grp.count; i++) queue.push(grp.type);
  state.waveNumber = waveNum;
  state.waveActive = true;
  state.waveFailed = false;
  state.enemies = [];
  state.spawnQueue = queue;
  state.spawnTimerMs = SPAWN_INTERVAL_MS;
  state.combatClockMs = 0;
  state.enemyNextId = 1;
  for (const t of state.towers) t.lastFiredMs = -Infinity;
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
  const def = ENEMY_TYPES[enemy.type] || ENEMY_TYPES.recursion;
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
    const e = spawnEnemy(type, state.recursion?.pointSetId || "x", state.enemyNextId++);
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
      const def = ENEMY_TYPES[e.type] || ENEMY_TYPES.recursion;
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
    const targets = def.aoe ? inRange : [leader(inRange)];
    for (const e of targets) applyDamage(state, tower, def, e, bonus, pathTiles);
  }
}
function applyDamage(state, tower, def, enemy, bonus, pathTiles) {
  let dmg = def.damage * bonus;
  const tile = pathTiles[Math.floor(enemy.pathIndex)];
  if (tile?.recurve) dmg *= 2;
  if (!def.ignoresArmor) dmg *= 1 - (enemy.armor || 0);
  enemy.hp -= dmg;
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
function leader(enemies) {
  return enemies.reduce((best, e) => e.pathIndex > best.pathIndex ? e : best, enemies[0]);
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

// ../../docs/games/metagame/stages/stage4/renderer.js
var PLACEABLE = ["pulse_node", "scatter_array", "null_spike", "attractor_field"];
function renderStage4(ctx) {
  const { host, state, actions, bts, viewer, save, onStageComplete } = ctx;
  const root = document.createElement("section");
  root.className = "stage4-fractal-bastion";
  root.innerHTML = `
    <header class="s4-hud">
      <strong>FRACTAL BASTION</strong>
      <span>CYCLES <span data-field="cycles"></span></span>
      <span>INTEGRITY <span data-field="integrity"></span></span>
      <span>WAVE <span data-field="wave"></span></span>
      <span>POINTS <span data-field="coverage"></span></span>
    </header>
    <div class="s4-layout">
      <pre class="s4-board" aria-label="fractal bastion board"></pre>
      <section class="s4-panel">
        <div class="s4-boss-title">THE INFINITE LOOP</div>
        <div data-field="bossStatus"></div>
        <div class="s4-hint" data-field="hint"></div>
        <div class="s4-shop" data-field="shop"></div>
      </section>
    </div>
    <ol class="s4-log"></ol>
    <div class="s4-controls">
      <button type="button" data-action="start-wave">start wave</button>
      <button type="button" data-action="confront" hidden>confront The Infinite Loop</button>
      <button type="button" data-action="blueprint">open recursion_points.json</button>
      <button type="button" data-action="bts" hidden>open fractal_bastion.bts</button>
    </div>
  `;
  host.replaceChildren(root);
  const fields = Object.fromEntries([...root.querySelectorAll("[data-field]")].map((el) => [el.dataset.field, el]));
  const log = root.querySelector(".s4-log");
  const board = root.querySelector(".s4-board");
  const completeOnce = once((result) => onStageComplete?.(result));
  let selected = "pulse_node";
  let path = rebuildPath();
  let raf = null;
  function rebuildPath() {
    return buildPath(state.recursion?.pointSetId || "x", waveGroupDepth(state.waveNumber || 1));
  }
  function repaint() {
    const lock = getBossLockState({ actions, state });
    const atBoss = (state.waveNumber || 1) >= FINAL_WAVE && !state.boss.defeated;
    fields.cycles.textContent = String(state.cycles);
    fields.integrity.textContent = String(state.integrity);
    fields.wave.textContent = `${Math.min(state.waveNumber || 1, FINAL_WAVE)}/${FINAL_WAVE}`;
    fields.coverage.textContent = `${lock.coveredPoints}/${lock.totalPoints}`;
    fields.bossStatus.textContent = `${lock.unlocked ? "UNLOCKED" : "LOCKED"} / hp ${state.boss.hp}`;
    fields.hint.textContent = lock.hint;
    fields.shop.replaceChildren(...shopRows());
    board.textContent = boardText(state, path.tiles);
    root.querySelector('[data-action="start-wave"]').hidden = atBoss || state.boss.defeated;
    root.querySelector('[data-action="confront"]').hidden = !atBoss;
    root.querySelector('[data-action="bts"]').hidden = !state.boss.defeated;
    log.replaceChildren(...(state.log || []).slice(-6).map((line) => {
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
  function startWaveAction() {
    if (state.waveActive || state.boss.defeated || (state.waveNumber || 1) >= FINAL_WAVE) return;
    path = rebuildPath();
    startWave(state, state.waveNumber, path.tiles);
    runLoop();
  }
  function runLoop() {
    stopLoop();
    let last = null;
    const step = (ts) => {
      const dt = last == null ? 16 : Math.min(100, ts - last);
      last = ts;
      tick(state, dt, path.tiles);
      if (settleWave()) {
        raf = null;
        return;
      }
      repaint();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
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
      repaint();
      save?.();
      return true;
    }
    if (waveComplete(state)) {
      onWaveCleared();
      repaint();
      save?.();
      return true;
    }
    return false;
  }
  function onWaveCleared() {
    const prevDepth = waveGroupDepth(state.waveNumber);
    state.waveNumber = (state.waveNumber || 1) + 1;
    state.integrity = Math.min(100, (state.integrity || 0) + 10);
    if (waveGroupDepth(state.waveNumber) !== prevDepth) path = rebuildPath();
  }
  function confront() {
    if ((state.waveNumber || 1) < FINAL_WAVE) return;
    const result = fightInfiniteLoop({ state, actions });
    if (result.defeated) completeOnce({ stage: 4, defeated: true, btsPath: BTS_PATH });
  }
  function place(x, y, type) {
    const r = placeTower(state, { x, y, type: type || selected });
    repaint();
    save?.();
    return r;
  }
  root.addEventListener("click", (event) => {
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
      case "confront":
        confront();
        break;
      case "blueprint":
        viewer?.openFile?.(RECURSION_BLUEPRINT_PATH, { mime: "application/json", source: "stage4" });
        break;
      case "bts":
        bts?.open?.(4);
        break;
      default:
        return;
    }
    save?.();
    repaint();
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
  window.__fvStage4 = {
    state: () => state,
    startWave: startWaveAction,
    // Advance the active wave synchronously (no rAF) for deterministic headless testing.
    advance(ms = 2e4, dt = 100) {
      let t = 0;
      while (t < ms && state.waveActive) {
        tick(state, dt, path.tiles);
        if (settleWave()) break;
        t += dt;
      }
      repaint();
    },
    setWave(n) {
      state.waveNumber = Math.max(1, Math.trunc(n) || 1);
      path = rebuildPath();
      repaint();
    },
    place,
    confront
  };
  repaint();
  return { repaint, destroy() {
    stopLoop();
    if (window.__fvStage4) delete window.__fvStage4;
    root.remove();
  } };
}
function once(fn) {
  let called = false;
  return (value) => {
    if (called) return;
    called = true;
    fn(value);
  };
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
    waveGroup: 1,
    waveActive: false,
    waveNumber: 1,
    enemies: [],
    towerNextId: 1,
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
  target.log = Array.isArray(target.log) ? target.log : [...fresh.log];
  return target;
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

// ../../docs/games/metagame/stages/stage4/index.js
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
  ensureStyles();
  if (hasRecursionBlueprint(ctx.actions)) state.log = [...state.log, "recursion blueprint already read."].slice(-8);
  return renderStage4({ ...ctx, state });
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
