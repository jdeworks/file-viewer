// GENERATED — DO NOT EDIT BY HAND.
// Bundled from docs/games/metagame/stages/stage2/index.js (+ its local modules) by
// build/metagame/build.mjs. Rebuild:  node build/metagame/build.mjs  (run by scripts/check.sh).
// Exports stageMeta / defaultState / mountStage. Shared ../../*.js singletons + ./styles.css stay
// external (NOT inlined). The hub's stage-manifest.js LOADERS import THIS file.


// ../../docs/games/metagame/stages/stage2/messages.js
var ACTION_NAME = "search_passage";
var REQUIRED_ACTION = "2.search_passage";
var ACHIEVEMENT_ID = "stage2.search_passage";
var ACHIEVEMENT_TEXT = "the passage was marked.";
var BTS_PATH = "/docs/bts/glyph_dungeon.bts";
var CIPHER_PATH = "/docs/examples/metagame/stage2/cipher.txt";
var bellMessages = {
  start: "tokens. not bits. different.",
  unlock: "there was something in the text that I wouldn't have found otherwise.",
  phase2: "it changed form. I waited.",
  phase3: "it changed again. faster now. I have to be faster.",
  defeated: "I parsed it correctly. the grammar held."
};
var lockedHintLadder = [
  "the arena has structure. you cannot cross a pattern without understanding it.",
  "there is a passage. it is written down.",
  "cipher.txt knows the way.",
  "search cipher.txt for PASSAGE. mark PASSAGE:247, then return."
];
var combatLines = {
  floorAdvance: [
    "floor grammar accepted.",
    "glyph shard recovered.",
    "a door becomes a sentence."
  ],
  lockedDeath: "the pattern closes. no route remains.",
  unlocked: "north pillar active. a two-tile passage opens.",
  defeated: "the expression resolves to one meaning."
};

// ../../docs/games/metagame/stages/stage2/boss.js
function hasSearchPassage(actions) {
  return Boolean(actions && typeof actions.hasAction === "function" && actions.hasAction(2, ACTION_NAME));
}
function getBossLockState({ actions, state }) {
  const unlocked = hasSearchPassage(actions);
  const boss = state?.run?.boss || {};
  const hintIndex = Math.min(Math.max(Number(boss.lockHintStep || 0), 0), lockedHintLadder.length - 1);
  return {
    unlocked,
    defeated: Boolean(boss.defeated),
    phase: unlocked ? Math.max(Number(boss.phase || 1), 2) : Number(boss.phase || 1),
    northPillar: unlocked ? "active" : "silent",
    projectileGapTiles: unlocked ? 2 : 0,
    defeatPossible: unlocked,
    hint: unlocked ? combatLines.unlocked : lockedHintLadder[hintIndex]
  };
}
function recordLockedBossAttempt(state) {
  const boss = state.run.boss;
  boss.reached = true;
  boss.attempts = Number(boss.attempts || 0) + 1;
  boss.lockHintStep = Math.min(Number(boss.lockHintStep || 0) + 1, lockedHintLadder.length - 1);
  state.meta.bossAttempts = Number(state.meta.bossAttempts || 0) + 1;
  pushCombatLine(state, combatLines.lockedDeath);
  return getBossLockState({ actions: null, state });
}
function applySearchPassageUnlock({ state, achievements, bell }) {
  const boss = state.run.boss;
  const firstUnlock = !boss.unlocked;
  boss.unlocked = true;
  boss.phase = Math.max(Number(boss.phase || 1), 2);
  if (firstUnlock) {
    pushCombatLine(state, combatLines.unlocked);
    notifyBell(bell, bellMessages.unlock, "stage2.search_passage");
    unlockAchievement(achievements, ACHIEVEMENT_ID, {
      id: ACHIEVEMENT_ID,
      stage: 2,
      text: ACHIEVEMENT_TEXT,
      action: "2.search_passage"
    });
  }
  return firstUnlock;
}
function damageUnlockedBoss({ state, amount = 50 }) {
  const boss = state.run.boss;
  if (!boss.unlocked || boss.defeated) return { defeated: false, phaseChanged: false };
  const beforePhase = boss.phase;
  boss.hp = Math.max(0, Number(boss.hp || 150) - amount);
  if (boss.hp === 0 && boss.phase < 3) {
    boss.phase += 1;
    boss.hp = boss.phase === 3 ? 100 : 150;
    pushCombatLine(state, boss.phase === 3 ? bellMessages.phase3 : bellMessages.phase2);
  } else if (boss.hp === 0) {
    boss.defeated = true;
    state.meta.firstClearComplete = true;
    state.meta.glyphsBanked = Number(state.meta.glyphsBanked || 0) + 25;
    pushCombatLine(state, combatLines.defeated);
  }
  return { defeated: boss.defeated, phaseChanged: beforePhase !== boss.phase };
}
function pushCombatLine(state, line) {
  state.run.combatLog = [...state.run.combatLog || [], line].slice(-6);
}
function notifyBell(bell, text, id) {
  if (bell && typeof bell.push === "function") bell.push({ id, stage: 2, text });
  else if (bell && typeof bell.say === "function") bell.say(text, { id, stage: 2 });
  else if (bell && typeof bell.add === "function") bell.add(text, { id, stage: 2 });
}
function unlockAchievement(achievements, id, detail) {
  if (achievements && typeof achievements.unlockAchievement === "function") {
    achievements.unlockAchievement(id, detail);
  } else if (achievements && typeof achievements.unlock === "function") {
    achievements.unlock(id, detail);
  }
}

// ../../docs/games/metagame/stages/stage2/content.js
function rect(rows) {
  const width = Math.max(...rows.map((r) => r.length));
  return rows.map((r) => {
    if (r.length >= width) return r;
    if (/^#+$/.test(r)) return r.padEnd(width, "#");
    const last = r[r.length - 1];
    return r.slice(0, -1).padEnd(width - 1, ".") + last;
  });
}
var bossArenaLocked = rect([
  "##############################",
  "#............##............#",
  "#............##............#",
  "#....O.......##.......O....#",
  "#............##............#",
  "#..........................#",
  "#..........................#",
  "#..........????????........#",
  "#..........????????........#",
  "#..........????????........#",
  "#..........????????........#",
  "#..........................#",
  "#..........................#",
  "#....O................O....#",
  "#............##............#",
  "#............##............#",
  "#............##............#",
  "#............##............#",
  "#............@.............#",
  "##############################"
]);
var bossArenaUnlocked = rect([
  "##############################",
  "#............[]............#",
  "#............[]............#",
  "#....O.......[].......O....#",
  "#............[]............#",
  "#............  ............#",
  "#............  ............#",
  "#..........????????........#",
  "#..........????????........#",
  "#..........????????........#",
  "#..........????????........#",
  "#............  ............#",
  "#............  ............#",
  "#....O.......  .......O....#",
  "#............  ............#",
  "#............  ............#",
  "#............  ............#",
  "#............  ............#",
  "#............@.............#",
  "##############################"
]);

// ../../docs/games/metagame/stages/stage2/rng.js
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

// ../../docs/games/metagame/stages/stage2/generate.js
function carveRoom(grid, room) {
  for (let y = room.y; y < room.y + room.h; y += 1) {
    for (let x = room.x; x < room.x + room.w; x += 1) grid[y][x] = ".";
  }
}
function carveH(grid, x1, x2, y) {
  const y2 = y + 1 < grid.length - 1 ? y + 1 : y;
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) {
    grid[y][x] = ".";
    grid[y2][x] = ".";
  }
}
function carveV(grid, y1, y2, x) {
  const x2 = x + 1 < grid[0].length - 1 ? x + 1 : x;
  for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1) {
    grid[y][x] = ".";
    grid[y][x2] = ".";
  }
}
function connect(grid, a, b, rng) {
  if (rng.chance(0.5)) {
    carveH(grid, a.cx, b.cx, a.cy);
    carveV(grid, a.cy, b.cy, b.cx);
  } else {
    carveV(grid, a.cy, b.cy, a.cx);
    carveH(grid, a.cx, b.cx, b.cy);
  }
}
function splitNode(node, rng, minLeaf) {
  const canV = node.w >= 2 * minLeaf;
  const canH = node.h >= 2 * minLeaf;
  if (!canV && !canH) return;
  let vertical;
  if (canV && canH) vertical = node.w > node.h * 1.25 ? true : node.h > node.w * 1.25 ? false : rng.chance(0.5);
  else vertical = canV;
  if (vertical) {
    const cut = rng.int(minLeaf, node.w - minLeaf);
    node.left = { x: node.x, y: node.y, w: cut, h: node.h };
    node.right = { x: node.x + cut, y: node.y, w: node.w - cut, h: node.h };
  } else {
    const cut = rng.int(minLeaf, node.h - minLeaf);
    node.left = { x: node.x, y: node.y, w: node.w, h: cut };
    node.right = { x: node.x, y: node.y + cut, w: node.w, h: node.h - cut };
  }
  splitNode(node.left, rng, minLeaf);
  splitNode(node.right, rng, minLeaf);
}
function carveAndConnect(node, grid, rng, rooms, minRoom) {
  if (!node.left) {
    const maxW = Math.max(minRoom, node.w - 2);
    const maxH = Math.max(minRoom, node.h - 2);
    const rw = Math.min(maxW, Math.max(minRoom, rng.int(Math.floor(maxW * 0.7), maxW)));
    const rh = Math.min(maxH, Math.max(minRoom, rng.int(Math.floor(maxH * 0.7), maxH)));
    const rx = node.x + 1 + rng.int(0, Math.max(0, node.w - rw - 2));
    const ry = node.y + 1 + rng.int(0, Math.max(0, node.h - rh - 2));
    const room = { x: rx, y: ry, w: rw, h: rh, cx: rx + (rw >> 1), cy: ry + (rh >> 1) };
    carveRoom(grid, room);
    rooms.push(room);
    node.room = room;
    return room;
  }
  const a = carveAndConnect(node.left, grid, rng, rooms, minRoom);
  const b = carveAndConnect(node.right, grid, rng, rooms, minRoom);
  if (a && b) connect(grid, a, b, rng);
  node.room = a || b;
  return node.room;
}
function generate(rng, { width, height, minLeaf = 18, minRoom = 5 }) {
  const grid = Array.from({ length: height }, () => Array(width).fill("#"));
  const root = { x: 1, y: 1, w: width - 2, h: height - 2 };
  splitNode(root, rng, Math.max(minRoom + 2, minLeaf));
  const rooms = [];
  carveAndConnect(root, grid, rng, rooms, minRoom);
  return { grid: grid.map((row) => row.join("")), rooms };
}
function floodDistances(gridRows, start) {
  const height = gridRows.length;
  const width = gridRows[0].length;
  const dist = new Int32Array(width * height).fill(-1);
  const order = new Int32Array(width * height);
  let count = 0;
  let head = 0;
  const si = start.y * width + start.x;
  dist[si] = 0;
  order[count++] = si;
  while (head < count) {
    const cur = order[head++];
    const cx = cur % width;
    const cy = (cur - cx) / width;
    const d = dist[cur];
    if (cy > 0 && dist[cur - width] === -1 && gridRows[cy - 1][cx] !== "#") {
      dist[cur - width] = d + 1;
      order[count++] = cur - width;
    }
    if (cy < height - 1 && dist[cur + width] === -1 && gridRows[cy + 1][cx] !== "#") {
      dist[cur + width] = d + 1;
      order[count++] = cur + width;
    }
    if (cx > 0 && dist[cur - 1] === -1 && gridRows[cy][cx - 1] !== "#") {
      dist[cur - 1] = d + 1;
      order[count++] = cur - 1;
    }
    if (cx < width - 1 && dist[cur + 1] === -1 && gridRows[cy][cx + 1] !== "#") {
      dist[cur + 1] = d + 1;
      order[count++] = cur + 1;
    }
  }
  return { width, height, dist, order, count };
}

// ../../docs/games/metagame/stages/stage2/data.js
var BASE_STATS = { hp: 30, maxHp: 30, atk: 5, def: 2, sight: 7 };
var MONSTERS = [
  { id: "mite", glyph: "m", name: "parse mite", hp: 16, atk: 5, xp: 2, drop: 1, minFloor: 1 },
  { id: "spider", glyph: "s", name: "syntax spider", hp: 20, atk: 6, xp: 3, drop: 1, minFloor: 1 },
  { id: "null", glyph: "n", name: "null pointer", hp: 18, atk: 9, xp: 4, drop: 2, minFloor: 2 },
  { id: "race", glyph: "r", name: "race condition", hp: 22, atk: 7, xp: 6, drop: 2, minFloor: 3, fast: true },
  { id: "leak", glyph: "L", name: "memory leak", hp: 40, atk: 6, xp: 5, drop: 3, minFloor: 3 },
  { id: "overflow", glyph: "O", name: "stack overflow", hp: 52, atk: 13, xp: 9, drop: 4, minFloor: 4 }
];
var WEAPONS = [
  { name: "hand_cursor", atk: 0 },
  { name: "parser_blade", atk: 3 },
  { name: "regex_lance", atk: 5 },
  { name: "compiler_axe", atk: 8 },
  { name: "kernel_scythe", atk: 12 }
];
var SHOP_UPGRADES = [
  { id: "vitality", name: "Vitality", desc: "+8 starting max HP", max: 8, apply: (s, n) => {
    s.maxHp += 8 * n;
    s.hp = s.maxHp;
  } },
  { id: "hp_level", name: "Cell Growth", desc: "+2 max HP per level", max: 5, apply: (s, n) => {
    s.hpPerLevel = 2 * n;
  } },
  { id: "edge", name: "Sharper Cursor", desc: "+1 starting ATK", max: 8, apply: (s, n) => {
    s.atk += n;
  } },
  { id: "atk_level", name: "Adaptive Edge", desc: "+1 ATK per level", max: 4, apply: (s, n) => {
    s.atkPerLevel = n;
  } },
  { id: "guard", name: "Hardened Types", desc: "+1 starting DEF", max: 6, apply: (s, n) => {
    s.def += n;
  } },
  { id: "def_level", name: "Tempered Types", desc: "+1 DEF per level", max: 4, apply: (s, n) => {
    s.defPerLevel = n;
  } },
  { id: "greed", name: "Glyph Magnet", desc: "+25% glyphs", max: 4, apply: (s, n) => {
    s.glyphMult = 1 + 0.25 * n;
  } },
  { id: "compass", name: "Stairwell Sense", desc: "reveals the way to the stairs (HUD compass)", max: 1, apply: () => {
  } }
];
var SHOP_BASE = { vitality: 8, hp_level: 20, edge: 12, atk_level: 30, guard: 10, def_level: 25, greed: 15, compass: 1e3 };
var SHOP_GROWTH = { vitality: 1.6, hp_level: 1.8, edge: 1.7, atk_level: 1.9, guard: 1.7, def_level: 1.9, greed: 1.9, compass: 1 };
function upgradeCost(id, level) {
  return Math.round((SHOP_BASE[id] || 10) * (SHOP_GROWTH[id] || 1.7) ** level);
}
function xpForLevel(level) {
  return 6 + (level - 1) * 5;
}
function rollEntity(shopUpgrades = {}) {
  const stats = { ...BASE_STATS, level: 1, xp: 0, glyphsThisRun: 0, glyphMult: 1, equipment: { weapon: "hand_cursor" } };
  for (const up of SHOP_UPGRADES) {
    const n = Number(shopUpgrades[up.id] || 0);
    if (n > 0) up.apply(stats, n);
  }
  stats.hp = stats.maxHp;
  return stats;
}
function spawnMonster(rng, floor, index) {
  const eligible = MONSTERS.filter((m) => m.minFloor <= floor);
  const def = rng.pick(eligible.length ? eligible : MONSTERS);
  const scale = 1 + (floor - 1) * 0.35;
  const hp = Math.round(def.hp * scale) + index % 2;
  return {
    id: def.id,
    glyph: def.glyph,
    name: def.name,
    fast: Boolean(def.fast),
    xp: def.xp,
    drop: def.drop,
    hp,
    maxHp: hp,
    atk: Math.round(def.atk * scale),
    alive: true,
    x: 0,
    y: 0,
    // Patrol heading + how far it can spot @ (set at generation; fast foes are more alert).
    dir: rng.pick(["up", "down", "left", "right"]),
    sight: def.fast ? 7 : 5,
    chasing: false,
    // Which of the 5 shared real-time movement clocks this monster ticks on (0=fastest .4s).
    bucket: rng.int(0, 4)
  };
}

// ../../docs/games/metagame/stages/stage2/engine.js
var DIRS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 }
};
var GROWTH = 1.35;
function floorDims(runSeed, floorNum) {
  const dimRng = makeRng(`${runSeed}:dims`);
  const baseW = dimRng.int(200, 250);
  const baseH = dimRng.int(200, 250);
  const g = Math.pow(GROWTH, floorNum - 1);
  const width = Math.min(900, Math.round(baseW * g));
  const height = Math.min(900, Math.round(baseH * g));
  const minLeaf = Math.max(16, Math.min(70, Math.round(width / 9)));
  return { width, height, minLeaf, minRoom: 6 };
}
function buildGrid(runSeed, floorNum) {
  const dims = floorDims(runSeed, floorNum);
  const rng = makeRng(`${runSeed}:${floorNum}`);
  const { grid, rooms } = generate(rng, dims);
  return { grid, rooms, dims, rng };
}
function defineGrid(world, grid) {
  Object.defineProperty(world, "grid", { value: grid, enumerable: false, writable: true, configurable: true });
}
function attachGrid(world, runSeed, floorNum) {
  defineGrid(world, buildGrid(runSeed, floorNum).grid);
  return world;
}
function buildFloor(runSeed, floorNum) {
  const { grid, rooms, dims, rng } = buildGrid(runSeed, floorNum);
  const width = dims.width;
  const height = dims.height;
  const start = { x: rooms[0].cx, y: rooms[0].cy };
  const flood = floodDistances(grid, start);
  let exit = start;
  let far = -1;
  for (let i = 0; i < flood.count; i += 1) {
    const idx = flood.order[i];
    if (flood.dist[idx] > far) {
      far = flood.dist[idx];
      exit = { x: idx % width, y: Math.floor(idx / width) };
    }
  }
  const order = flood.order;
  for (let i = flood.count - 1; i > 0; i -= 1) {
    const j = Math.floor(rng.float() * (i + 1));
    const t = order[i];
    order[i] = order[j];
    order[j] = t;
  }
  let ci = 0;
  const take = () => {
    while (ci < flood.count) {
      const idx = order[ci++];
      const x = idx % width;
      const y = Math.floor(idx / width);
      if ((x !== start.x || y !== start.y) && (x !== exit.x || y !== exit.y)) return { x, y };
    }
    return null;
  };
  const roomN = rooms.length;
  const monsterCount = Math.max(16, Math.min(400, Math.round(roomN * 2.4)));
  const monsters = [];
  for (let i = 0; i < monsterCount; i += 1) {
    const c = take();
    if (!c) break;
    const m = spawnMonster(rng, floorNum, i);
    m.x = c.x;
    m.y = c.y;
    m.home = { x: c.x, y: c.y };
    monsters.push(m);
  }
  const maxTier = Math.min(WEAPONS.length - 1, Math.floor(floorNum / 2) + 1);
  const weapons = [];
  const weaponCount = Math.max(2, Math.min(24, Math.round(roomN * 0.18)));
  for (let i = 0; i < weaponCount; i += 1) {
    const wc = take();
    if (wc) weapons.push({ x: wc.x, y: wc.y, ...WEAPONS[rng.int(1, maxTier)], taken: false });
  }
  const potions = [];
  const potionCount = Math.max(3, Math.min(30, Math.round(roomN * 0.22)));
  for (let i = 0; i < potionCount; i += 1) {
    const c = take();
    if (c) potions.push({ x: c.x, y: c.y, taken: false });
  }
  const glyphs = [];
  const glyphCount = Math.max(6, Math.min(60, Math.round(roomN * 0.3)));
  for (let i = 0; i < glyphCount; i += 1) {
    const c = take();
    if (!c) break;
    glyphs.push({ x: c.x, y: c.y, taken: false });
  }
  const world = { floor: floorNum, width, height, pos: { ...start }, exit, monsters, weapons, potions, glyphs };
  defineGrid(world, grid);
  return world;
}
function gainGlyphs(player, base) {
  const mult = Number(player.glyphMult || 1);
  const got = Math.max(1, Math.round(base * mult));
  player.glyphsThisRun = Number(player.glyphsThisRun || 0) + got;
  return got;
}
function awardXp(player, amount, events) {
  player.xp = Number(player.xp || 0) + amount;
  while (player.xp >= xpForLevel(player.level)) {
    player.xp -= xpForLevel(player.level);
    player.level += 1;
    player.maxHp += 5 + Number(player.hpPerLevel || 0);
    player.atk += 1 + Number(player.atkPerLevel || 0);
    player.def += Number(player.defPerLevel || 0);
    player.hp = Math.min(player.maxHp, player.hp + 3);
    events.log.push(`LVL ${player.level}. ATK ${player.atk}, HP ${player.hp}/${player.maxHp}.`);
  }
}
function bite(foe, player, events) {
  const dmg = Math.max(1, foe.atk - Number(player.def || 0));
  player.hp = Math.max(0, player.hp - dmg);
  events.damageTaken += dmg;
  if (player.hp <= 0) events.died = true;
  return dmg;
}
function step(world, player, dir) {
  const move = DIRS[dir];
  const events = { moved: false, log: [], damageTaken: 0, killed: false, pickup: null, descend: false, died: false };
  if (!move) return events;
  const nx = world.pos.x + move.dx;
  const ny = world.pos.y + move.dy;
  if (ny < 0 || nx < 0 || ny >= world.grid.length || nx >= world.width) return events;
  if (world.grid[ny][nx] === "#") return events;
  const foeIndex = world.monsters.findIndex((m) => m.alive && m.x === nx && m.y === ny);
  const foe = foeIndex >= 0 ? world.monsters[foeIndex] : null;
  if (foe) {
    events.attack = { x: nx, y: ny, foeIndex, killed: false };
    foe.hp -= Math.max(1, player.atk);
    if (foe.hp <= 0) {
      foe.alive = false;
      events.killed = true;
      events.attack.killed = true;
      const got = gainGlyphs(player, foe.drop);
      events.log.push(`${foe.name} unparsed. +${got} glyph${got === 1 ? "" : "s"}.`);
      awardXp(player, foe.xp, events);
    } else {
      const dmg = bite(foe, player, events);
      events.log.push(`${foe.name} hits for ${dmg}.`);
      if (foe.fast && player.hp > 0) {
        const d2 = bite(foe, player, events);
        events.log.push(`${foe.name} strikes again for ${d2}.`);
      }
    }
    return events;
  }
  world.pos = { x: nx, y: ny };
  events.moved = true;
  const weapon = world.weapons.find((wp) => !wp.taken && wp.x === nx && wp.y === ny);
  if (weapon && weapon.atk > 0) {
    weapon.taken = true;
    player.atk += weapon.atk;
    player.equipment = { ...player.equipment || {}, weapon: weapon.name };
    events.pickup = "weapon";
    events.log.push(`found ${weapon.name.replace(/_/g, " ")}. +${weapon.atk} ATK.`);
  }
  const glyph = world.glyphs.find((g) => !g.taken && g.x === nx && g.y === ny);
  if (glyph) {
    glyph.taken = true;
    const got = gainGlyphs(player, 3);
    events.pickup = events.pickup || "glyph";
    events.log.push(`glyph shard recovered. +${got} glyphs.`);
  }
  const potion = world.potions && world.potions.find((p) => !p.taken && p.x === nx && p.y === ny);
  if (potion && player.hp < player.maxHp) {
    potion.taken = true;
    const heal = Math.max(8, Math.round(player.maxHp * 0.35));
    player.hp = Math.min(player.maxHp, player.hp + heal);
    events.pickup = events.pickup || "potion";
    events.log.push(`parse potion. +${heal} HP.`);
  }
  if (nx === world.exit.x && ny === world.exit.y) events.descend = true;
  return events;
}
var DIR_LIST = ["up", "down", "left", "right"];
function isOpen(world, x, y) {
  return y >= 0 && x >= 0 && y < world.grid.length && x < world.width && world.grid[y][x] !== "#";
}
function freeCell(world, x, y, occupied) {
  return isOpen(world, x, y) && !occupied.has(y * world.width + x) && !(x === world.pos.x && y === world.pos.y);
}
function hasLOS(world, x0, y0, x1, y1) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  for (let guard = 0; guard < 80; guard += 1) {
    if (x === x1 && y === y1) return true;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
    if (world.grid[y] && world.grid[y][x] === "#") return false;
  }
  return false;
}
function monsterBite(m, player, events) {
  const dmg = Math.max(1, m.atk - Number(player.def || 0));
  player.hp = Math.max(0, player.hp - dmg);
  events.damageTaken += dmg;
  if (player.hp <= 0) events.died = true;
  events.log.push(`${m.name} bites for ${dmg}.`);
  return dmg;
}
function greedyStep(world, m, px, py, occupied) {
  const ddx = px - m.x;
  const ddy = py - m.y;
  const order = Math.abs(ddx) >= Math.abs(ddy) ? [[Math.sign(ddx), 0], [0, Math.sign(ddy)]] : [[0, Math.sign(ddy)], [Math.sign(ddx), 0]];
  for (const [sx, sy] of order) {
    if (!sx && !sy) continue;
    if (freeCell(world, m.x + sx, m.y + sy, occupied)) return { x: m.x + sx, y: m.y + sy };
  }
  return null;
}
function patrolStep(world, m, occupied) {
  const dirs = [m.dir, ...DIR_LIST.filter((d) => d !== m.dir)];
  for (const d of dirs) {
    const mv = DIRS[d];
    if (!mv) continue;
    if (freeCell(world, m.x + mv.dx, m.y + mv.dy, occupied)) return { x: m.x + mv.dx, y: m.y + mv.dy, dir: d };
  }
  return null;
}
function monsterTurn(world, player, events, filter) {
  const px = world.pos.x;
  const py = world.pos.y;
  const occupied = /* @__PURE__ */ new Set();
  for (const m of world.monsters) if (m.alive) occupied.add(m.y * world.width + m.x);
  for (const m of world.monsters) {
    if (!m.alive) continue;
    if (filter && !filter(m)) continue;
    const sight = m.sight || 5;
    const adjacent = Math.abs(px - m.x) + Math.abs(py - m.y) === 1;
    const sees = Math.max(Math.abs(px - m.x), Math.abs(py - m.y)) <= sight && hasLOS(world, m.x, m.y, px, py);
    if (adjacent && (sees || m.chasing)) {
      m.chasing = true;
      monsterBite(m, player, events);
      if (m.fast && player.hp > 0) monsterBite(m, player, events);
      if (player.hp <= 0) {
        events.died = true;
        return;
      }
      continue;
    }
    const target = sees ? (m.chasing = true, greedyStep(world, m, px, py, occupied)) : (m.chasing = false, patrolStep(world, m, occupied));
    if (target) {
      occupied.delete(m.y * world.width + m.x);
      m.x = target.x;
      m.y = target.y;
      if (target.dir) m.dir = target.dir;
      occupied.add(m.y * world.width + m.x);
    }
  }
}

// ../../docs/games/metagame/stages/stage2/shop.js
function buildShopPanel({ state, save, onClose }) {
  const box = document.createElement("div");
  box.className = "s2-shop";
  function rowHtml(up) {
    const lvl = Number((state.meta.shopUpgrades || {})[up.id] || 0);
    const maxed = lvl >= up.max;
    const cost = upgradeCost(up.id, lvl);
    const banked = Number(state.meta.glyphsBanked || 0);
    const afford = !maxed && banked >= cost;
    const label = maxed ? "MAX" : `${cost} glyphs`;
    return `<div class="s2-shop-row">
      <div class="s2-shop-info">
        <strong>${up.name}</strong> <span class="s2-shop-lv">Lv ${lvl}/${up.max}</span>
        <div class="s2-shop-desc">${up.desc}</div>
      </div>
      <button type="button" data-buy="${up.id}" ${maxed || !afford ? "disabled" : ""}>${label}</button>
    </div>`;
  }
  function paint() {
    const banked = Number(state.meta.glyphsBanked || 0);
    box.innerHTML = `
      <div class="s2-shop-head">GLYPH SHOP
        <span class="s2-shop-bank"><span class="s2-c-glyph">${banked}</span> banked</span>
        <button type="button" data-shop="close" class="s2-shop-x" aria-label="close shop">&#10005;</button>
      </div>
      <div class="s2-shop-note">applies when your next run begins (after death / retreat). only banked glyphs spend.</div>
      <div class="s2-shop-list">${SHOP_UPGRADES.map(rowHtml).join("")}</div>`;
    box.querySelectorAll("[data-buy]").forEach((b) => b.addEventListener("click", () => buy(b.dataset.buy)));
    box.querySelector('[data-shop="close"]').addEventListener("click", () => onClose());
  }
  function buy(id) {
    const up = SHOP_UPGRADES.find((u) => u.id === id);
    if (!up) return;
    const meta = state.meta;
    meta.shopUpgrades = meta.shopUpgrades || {};
    const lvl = Number(meta.shopUpgrades[id] || 0);
    if (lvl >= up.max) return;
    const cost = upgradeCost(id, lvl);
    if (Number(meta.glyphsBanked || 0) < cost) return;
    meta.glyphsBanked = Number(meta.glyphsBanked || 0) - cost;
    meta.shopUpgrades[id] = lvl + 1;
    if (typeof save === "function") save();
    paint();
  }
  paint();
  return { el: box, paint };
}

// ../../docs/games/metagame/stages/stage2/help.js
var SECTIONS = [
  ["Goal", "Descend 5 floors, then beat THE AMBIGUOUS EXPRESSION at the bottom."],
  ["Move", "Arrow keys, WASD, or the on-screen d-pad. One tile per press."],
  ["Fight", "Walk into a foe to attack (your ATK vs its HP). It hits back — watch your HP. Fast foes (race conditions) strike twice."],
  ["Foes", "s m n r are light; L O are heavy. Deeper floors spawn tougher ones."],
  ["Loot", "Step on / weapons to raise ATK and % glyph shards to earn glyphs. Kills drop glyphs and XP (level up = more HP & ATK)."],
  ["Stairs", "Reach the > stairs to descend. Deeper = harder, better loot."],
  ["Runs", "Dying or 'retreat' banks the run's glyphs and draws a fresh dungeon. Banked glyphs are permanent."],
  ["Shop", "Spend banked glyphs on permanent upgrades — they apply on your next run."],
  ["Boss", "It starts LOCKED. Open cipher.txt and read it to find the PASSAGE — that opens the boss. Then 'challenge boss'."]
];
function buildHelpPanel({ onClose }) {
  const box = document.createElement("div");
  box.className = "s2-help";
  box.innerHTML = `
    <div class="s2-help-head">HOW TO PLAY
      <button type="button" data-help="close" class="s2-help-x" aria-label="close help">&#10005;</button>
    </div>
    <dl class="s2-help-list">
      ${SECTIONS.map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join("")}
    </dl>`;
  box.querySelector('[data-help="close"]').addEventListener("click", () => onClose());
  return { el: box };
}

// ../../docs/games/metagame/stages/stage2/view.js
var VIEW_W = 48;
var VIEW_H = 22;
var ORIGIN = 11;
var REDUCE = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
var LUNGE_IN = 95;
var LUNGE_OUT = 130;
var CELL_CLASS = {
  "#": "s2-c-wall",
  ".": "s2-c-floor",
  " ": "s2-c-void",
  "/": "s2-c-item",
  "[": "s2-c-item",
  "]": "s2-c-item",
  "%": "s2-c-glyph",
  "?": "s2-c-glyph",
  "!": "s2-c-potion",
  ">": "s2-c-exit"
};
var HEAVY_FOES = /* @__PURE__ */ new Set(["L", "O"]);
var clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function hpBar(cur, max, width) {
  const ratio = max > 0 ? clamp(cur / max, 0, 1) : 0;
  let filled = Math.round(ratio * width);
  if (cur > 0 && filled === 0) filled = 1;
  if (cur >= max) filled = width;
  return { filled, empty: Math.max(0, width - filled) };
}
function renderHpBar(el, cur, max, width) {
  const { filled, empty } = hpBar(cur, max, width);
  el.innerHTML = `<span class="s2-hpb-fill">${"#".repeat(filled)}</span><span class="s2-hpb-empty">${".".repeat(empty)}</span>`;
  el.classList.toggle("s2-hp-low", max > 0 && cur / max <= 0.4 && cur > 0);
}
function createView(screenEl) {
  const map = document.createElement("pre");
  map.className = "s2-grid";
  map.setAttribute("aria-label", "ASCII dungeon map");
  const sprites = document.createElement("div");
  sprites.className = "s2-sprites";
  sprites.setAttribute("aria-hidden", "true");
  const flash = document.createElement("div");
  flash.className = "s2-flash";
  flash.setAttribute("aria-hidden", "true");
  const ruler = document.createElement("pre");
  ruler.className = "s2-grid s2-ruler";
  ruler.textContent = "MMMMMMMMMM\nMMMMMMMMMM";
  screenEl.replaceChildren(map, sprites, flash, ruler);
  let chW = 8.4;
  let chH = 17.5;
  const cam = { x: 0, y: 0 };
  const playerEl = makeSprite("@", "s2-c-player");
  sprites.append(playerEl);
  const mobEls = /* @__PURE__ */ new Map();
  function measure() {
    const r = ruler.getBoundingClientRect();
    if (r.width > 0) chW = r.width / 10;
    if (r.height > 0) chH = r.height / 2;
  }
  measure();
  let lastWorld = null;
  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(() => {
    const pw = chW, ph = chH;
    measure();
    if ((Math.abs(chW - pw) > 0.01 || Math.abs(chH - ph) > 0.01) && lastWorld) paintExplore(lastWorld);
  }) : null;
  if (observer) observer.observe(ruler);
  function pos(el, cx, cy, ms) {
    const tf = `translate(${ORIGIN + (cx - cam.x) * chW}px, ${ORIGIN + (cy - cam.y) * chH}px)`;
    if (el._tf === tf) return;
    el._tf = tf;
    el.style.transition = ms ? `transform ${ms}ms ease-out` : "none";
    el.style.transform = tf;
  }
  function paintArena(lines) {
    lastWorld = null;
    sprites.replaceChildren();
    mobEls.clear();
    map.innerHTML = colorize(lines);
  }
  function paintExplore(world) {
    lastWorld = world;
    sprites.append(playerEl);
    cam.x = clamp(world.pos.x - (VIEW_W >> 1), 0, Math.max(0, world.width - VIEW_W));
    cam.y = clamp(world.pos.y - (VIEW_H >> 1), 0, Math.max(0, world.grid.length - VIEW_H));
    map.innerHTML = colorize(terrainSlice(world));
    reconcileSprites(world);
  }
  function terrainSlice(world) {
    const overlay = /* @__PURE__ */ new Map();
    for (const g of world.glyphs) if (!g.taken) overlay.set(key(g.x, g.y), "%");
    for (const w of world.weapons) if (!w.taken) overlay.set(key(w.x, w.y), "/");
    if (world.potions) {
      for (const p of world.potions) if (!p.taken) overlay.set(key(p.x, p.y), "!");
    }
    overlay.set(key(world.exit.x, world.exit.y), ">");
    const rows = [];
    for (let vy = 0; vy < VIEW_H; vy += 1) {
      const gy = cam.y + vy;
      let line = "";
      for (let vx = 0; vx < VIEW_W; vx += 1) {
        const gx = cam.x + vx;
        if (gy < 0 || gx < 0 || gy >= world.grid.length || gx >= world.width) {
          line += " ";
          continue;
        }
        line += overlay.get(key(gx, gy)) || world.grid[gy][gx];
      }
      rows.push(line);
    }
    return rows;
  }
  function reconcileSprites(world, mobMs) {
    pos(playerEl, world.pos.x, world.pos.y);
    const live = /* @__PURE__ */ new Set();
    world.monsters.forEach((m, i) => {
      if (!m.alive || !inView(m.x, m.y)) {
        dropMob(i);
        return;
      }
      live.add(i);
      let s = mobEls.get(i);
      let fresh = false;
      if (!s) {
        s = makeMob(m);
        mobEls.set(i, s);
        sprites.append(s.el);
        fresh = true;
      }
      if (s.glyph.textContent !== m.glyph) s.glyph.textContent = m.glyph;
      const cls = "s2-sprite " + (HEAVY_FOES.has(m.glyph) ? "s2-c-foe2" : "s2-c-foe");
      if (s.el.className !== cls) s.el.className = cls;
      if (m.hp < m.maxHp) {
        if (s.hp.hidden) s.hp.hidden = false;
        if (s.lastHp !== m.hp || s.lastMaxHp !== m.maxHp) {
          renderHpBar(s.hp, m.hp, m.maxHp, 5);
          s.lastHp = m.hp;
          s.lastMaxHp = m.maxHp;
        }
      } else if (!s.hp.hidden) {
        s.hp.hidden = true;
      }
      pos(s.el, m.x, m.y, fresh ? 0 : mobMs);
    });
    for (const i of [...mobEls.keys()]) if (!live.has(i)) dropMob(i);
  }
  function tickMonsters(world) {
    reconcileSprites(world, 200);
  }
  function dropMob(i) {
    const s = mobEls.get(i);
    if (s) {
      s.el.remove();
      mobEls.delete(i);
    }
  }
  function inView(x, y) {
    return x >= cam.x && x < cam.x + VIEW_W && y >= cam.y && y < cam.y + VIEW_H;
  }
  function applyMove(world, events) {
    let dying = null;
    if (events.attack && events.attack.killed) {
      dying = mobEls.get(events.attack.foeIndex) || null;
      if (dying) mobEls.delete(events.attack.foeIndex);
    }
    paintExplore(world);
    if (events.attack) {
      const foe = events.attack.killed ? dying : mobEls.get(events.attack.foeIndex);
      lunge(world.pos, events.attack, foe);
    }
  }
  function lunge(p, attack, foe) {
    const dx = Math.sign(attack.x - p.x);
    const dy = Math.sign(attack.y - p.y);
    if (REDUCE) {
      if (attack.killed && foe) foe.el.remove();
      return;
    }
    pos(playerEl, p.x + dx * 0.5, p.y + dy * 0.5, LUNGE_IN);
    if (foe) pos(foe.el, attack.x - dx * 0.45, attack.y - dy * 0.45, LUNGE_IN);
    setTimeout(() => {
      pos(playerEl, p.x, p.y, LUNGE_OUT);
      if (!foe) return;
      if (attack.killed) {
        foe.el.classList.add("s2-sprite-die");
        setTimeout(() => foe.el.remove(), 360);
      } else {
        pos(foe.el, attack.x, attack.y, LUNGE_OUT);
      }
    }, LUNGE_IN + 10);
  }
  let fullMap = null;
  function toggleFullMap(world) {
    if (fullMap) {
      fullMap.remove();
      fullMap = null;
      return;
    }
    if (!world || !world.grid) return;
    fullMap = document.createElement("div");
    fullMap.className = "s2-fullmap";
    const cap = document.createElement("div");
    cap.className = "s2-fullmap-cap";
    cap.textContent = `FULL MAP (dev) — ${world.width}×${world.grid.length}, ${world.monsters.filter((m) => m.alive).length} foes · click to close`;
    const canvas = document.createElement("canvas");
    drawFullMap(canvas, world);
    fullMap.append(cap, canvas);
    fullMap.addEventListener("click", () => {
      if (fullMap) {
        fullMap.remove();
        fullMap = null;
      }
    });
    screenEl.appendChild(fullMap);
  }
  function drawFullMap(canvas, world) {
    const W = world.width;
    const H = world.grid.length;
    const scale = Math.min(640 / W, 440 / H, 4);
    const dispW = Math.max(1, Math.round(W * scale));
    const dispH = Math.max(1, Math.round(H * scale));
    canvas.width = dispW;
    canvas.height = dispH;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    const octx = off.getContext("2d");
    const img = octx.createImageData(W, H);
    const d = img.data;
    for (let y = 0; y < H; y += 1) {
      const row = world.grid[y];
      for (let x = 0; x < W; x += 1) {
        const i = (y * W + x) * 4;
        const wall = row[x] === "#";
        d[i] = wall ? 18 : 60;
        d[i + 1] = wall ? 14 : 46;
        d[i + 2] = wall ? 10 : 28;
        d[i + 3] = 255;
      }
    }
    octx.putImageData(img, 0, 0);
    ctx.drawImage(off, 0, 0, W, H, 0, 0, dispW, dispH);
    const dot = (x, y, color, sz) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x * scale) - (sz >> 1), Math.round(y * scale) - (sz >> 1), sz, sz);
    };
    for (const w of world.weapons) if (!w.taken) dot(w.x, w.y, "#ffd54a", 3);
    if (world.potions) {
      for (const p of world.potions) if (!p.taken) dot(p.x, p.y, "#6effa6", 3);
    }
    for (const g of world.glyphs) if (!g.taken) dot(g.x, g.y, "#d78bff", 3);
    dot(world.exit.x, world.exit.y, "#7fe07f", 4);
    for (const m of world.monsters) if (m.alive) dot(m.x, m.y, HEAVY_FOES.has(m.glyph) ? "#ff2bd0" : "#ff5a4a", 3);
    dot(world.pos.x, world.pos.y, "#79f0ff", 5);
  }
  function destroy() {
    if (observer) observer.disconnect();
    if (fullMap) {
      fullMap.remove();
      fullMap = null;
    }
  }
  return { mapEl: map, flashEl: flash, screenEl, paintExplore, paintArena, applyMove, tickMonsters, toggleFullMap, measure, destroy };
}
function key(x, y) {
  return x + "," + y;
}
function makeSprite(glyph, cls) {
  const el = document.createElement("span");
  el.className = "s2-sprite " + cls;
  el.textContent = glyph;
  return el;
}
function makeMob(m) {
  const el = document.createElement("span");
  el.className = "s2-sprite " + (HEAVY_FOES.has(m.glyph) ? "s2-c-foe2" : "s2-c-foe");
  const hp = document.createElement("span");
  hp.className = "s2-mob-hp";
  hp.hidden = true;
  const glyph = document.createElement("span");
  glyph.className = "s2-mob-glyph";
  glyph.textContent = m.glyph;
  el.append(hp, glyph);
  return { el, glyph, hp };
}
function colorize(lines) {
  return lines.map((line) => [...line].map((ch) => {
    const cls = CELL_CLASS[ch] || "s2-c-floor";
    return `<span class="${cls}">${escapeChar(ch)}</span>`;
  }).join("")).join("\n");
}
function escapeChar(ch) {
  if (ch === "&") return "&amp;";
  if (ch === "<") return "&lt;";
  if (ch === ">") return "&gt;";
  return ch;
}

// ../../docs/games/metagame/stages/stage2/renderer.js
var MAX_FLOOR = 5;
var MOVE_KEYS = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  W: "up",
  S: "down",
  A: "left",
  D: "right"
};
function renderStage2({
  host,
  state,
  actions,
  bts,
  viewer,
  save,
  onStageComplete
}) {
  const root = document.createElement("section");
  root.className = "stage2-glyph-dungeon";
  root.innerHTML = `
    <div class="s2-board">
    <header class="s2-hud">
      <div><strong>FLOOR <span data-field="floor"></span>/${MAX_FLOOR}</strong></div>
      <div>HP <span class="s2-hp-bar" data-field="hpbar"></span> <span data-field="hp"></span>/<span data-field="maxHp"></span></div>
      <div>LVL <span data-field="level"></span> (<span data-field="xp"></span>xp)</div>
      <div>ATK <span data-field="atk"></span></div>
      <div>DEF <span data-field="def"></span></div>
      <div>GLYPHS <span data-field="glyphs"></span></div>
      <div class="s2-compass" data-field="compass" hidden></div>
    </header>
    <div class="s2-objective" data-field="objective"></div>
    <div class="s2-play">
      <div class="s2-stage">
        <div class="s2-screen"></div>
        <div class="s2-legend">
          <span class="s2-c-player">@</span> you
          <span class="s2-c-foe">s</span> foe
          <span class="s2-c-item">/</span> weapon
          <span class="s2-c-potion">!</span> potion
          <span class="s2-c-glyph">%</span> glyph
          <span class="s2-c-exit">&gt;</span> stairs
        </div>
      </div>
      <div class="s2-controls">
        <button type="button" data-action="help">how to play</button>
        <button type="button" data-action="shop">glyph shop</button>
        <button type="button" data-action="retreat">retreat (new run)</button>
        <button type="button" data-action="search" hidden>open cipher.txt</button>
        <button type="button" data-action="boss" hidden>challenge boss</button>
        <button type="button" data-action="bts" hidden>open trace.bts</button>
        <div class="s2-dpad" aria-label="move (touch)">
          <button type="button" data-move="up" aria-label="move up">&#9650;</button>
          <button type="button" data-move="left" aria-label="move left">&#9664;</button>
          <button type="button" data-move="down" aria-label="move down">&#9660;</button>
          <button type="button" data-move="right" aria-label="move right">&#9654;</button>
        </div>
      </div>
    </div>
    <ol class="s2-log" aria-label="combat log"></ol>
    </div>
    <div class="s2-bossmeta" hidden>
      <span data-field="bossStatus"></span><span class="s2-hint" data-field="hint"></span>
    </div>
  `;
  host.replaceChildren(root);
  const fields = Object.fromEntries([...root.querySelectorAll("[data-field]")].map((el) => [el.dataset.field, el]));
  const view = createView(root.querySelector(".s2-screen"));
  const log = root.querySelector(".s2-log");
  const setText = (el, v) => {
    const s = String(v);
    if (el.textContent !== s) el.textContent = s;
  };
  const setHidden = (el, h) => {
    if (el.hidden !== h) el.hidden = h;
  };
  const searchBtn = root.querySelector('[data-action="search"]');
  const bossBtn = root.querySelector('[data-action="boss"]');
  const btsBtn = root.querySelector('[data-action="bts"]');
  let lastHp = -1;
  let lastMaxHp = -1;
  let lastLogSig = "";
  let flashTimer = null;
  let overlay = null;
  let monsterClocks = [];
  const completeOnce = once((result) => {
    if (typeof onStageComplete === "function") onStageComplete(result);
  });
  ensureWorld(state);
  function paintHud() {
    const e = state.run.entity;
    const lock = getBossLockState({ actions, state });
    setText(fields.floor, state.run.floor);
    setText(fields.hp, e.hp);
    setText(fields.maxHp, e.maxHp);
    if (e.hp !== lastHp || e.maxHp !== lastMaxHp) {
      renderHpBar(fields.hpbar, e.hp, e.maxHp, 10);
      lastHp = e.hp;
      lastMaxHp = e.maxHp;
    }
    setText(fields.level, e.level);
    setText(fields.xp, e.xp || 0);
    setText(fields.atk, e.atk);
    setText(fields.def, e.def);
    setText(fields.glyphs, `${state.meta.glyphsBanked} +${e.glyphsThisRun}`);
    setText(fields.bossStatus, state.run.boss.defeated ? "defeated. BTS trace available." : `${lock.unlocked ? "UNLOCKED" : "LOCKED"} / north pillar ${lock.northPillar} / gap ${lock.projectileGapTiles}`);
    setText(fields.hint, lock.hint);
    setText(fields.objective, state.run.boss.reached ? lock.unlocked ? "the passage is open. challenge the boss." : "blocked. find PASSAGE in cipher.txt to open the way." : `reach the stairs > (floor ${state.run.floor}/${MAX_FLOOR}). fight foes, grab weapons & glyphs.`);
    updateCompass();
    const sig = state.run.combatLog.slice(-4).join("\n");
    if (sig !== lastLogSig) {
      lastLogSig = sig;
      log.replaceChildren(...state.run.combatLog.slice(-4).map((line) => {
        const item = document.createElement("li");
        item.textContent = line;
        return item;
      }));
    }
    const atBoss = state.run.boss.reached && !state.run.boss.defeated;
    setHidden(searchBtn, !atBoss);
    setHidden(bossBtn, !atBoss);
    setHidden(btsBtn, !state.run.boss.defeated);
  }
  function updateCompass() {
    const owned = Number((state.meta.shopUpgrades || {}).compass || 0) > 0;
    const w = state.run.world;
    if (!owned || !w || state.run.boss.reached) {
      setHidden(fields.compass, true);
      return;
    }
    const dx = w.exit.x - w.pos.x;
    const dy = w.exit.y - w.pos.y;
    setHidden(fields.compass, false);
    setText(fields.compass, `⇲ stairs ${compassArrow(dx, dy)} ${Math.abs(dx) + Math.abs(dy)}`);
  }
  function paintWorld() {
    if (state.run.boss.reached) {
      const lock = getBossLockState({ actions, state });
      view.paintArena(lock.unlocked ? bossArenaUnlocked : bossArenaLocked);
    } else {
      view.paintExplore(state.run.world);
    }
  }
  function repaint() {
    paintHud();
    paintWorld();
  }
  function persistAndPaint() {
    if (typeof save === "function") save();
    repaint();
  }
  function move(dir) {
    if (overlay || state.run.boss.reached || state.run.boss.defeated) return;
    const world = state.run.world;
    const events = step(world, state.run.entity, dir);
    for (const line of events.log) appendLog(state, line);
    if (events.damageTaken > 0) flashDamage(events.died);
    if (events.died) {
      appendLog(state, "@ was unparsed. run reset — banked glyphs survive.");
      resetRun(state, { banked: true, death: true });
      persistAndPaint();
      return;
    }
    if (events.descend) {
      descend(state);
      persistAndPaint();
      return;
    }
    if (typeof save === "function") save();
    view.applyMove(state.run.world, events);
    paintHud();
  }
  function flashDamage(fatal) {
    const flash = view.flashEl;
    flash.textContent = damageNoise(fatal);
    flash.classList.remove("s2-flash-on");
    void flash.offsetWidth;
    flash.classList.add("s2-flash-on");
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(() => flash.classList.remove("s2-flash-on"), fatal ? 520 : 240);
  }
  function closeOverlay() {
    if (overlay) {
      overlay.el.remove();
      overlay = null;
    }
  }
  function toggleOverlay(kind) {
    const wasKind = overlay && overlay.kind;
    closeOverlay();
    if (wasKind === kind) {
      repaint();
      return;
    }
    const onClose = () => {
      closeOverlay();
      repaint();
    };
    const panel = kind === "shop" ? buildShopPanel({ state, save, onClose }) : buildHelpPanel({ onClose });
    overlay = { el: panel.el, kind };
    root.querySelector(".s2-screen").appendChild(panel.el);
  }
  const onKey = (event) => {
    if (!root.isConnected) return;
    const tag = event.target && event.target.tagName || "";
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) || event.target?.isContentEditable) return;
    const dir = MOVE_KEYS[event.key];
    if (!dir) return;
    event.preventDefault();
    move(dir);
  };
  window.addEventListener("keydown", onKey);
  root.addEventListener("click", (event) => {
    const moveBtn = event.target.closest("button[data-move]");
    if (moveBtn) {
      move(moveBtn.dataset.move);
      return;
    }
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "shop") {
      toggleOverlay("shop");
      return;
    }
    if (action === "help") {
      toggleOverlay("help");
      return;
    }
    if (action === "boss") challengeBoss();
    if (action === "search") openCipher(viewer);
    if (action === "retreat") {
      appendLog(state, "retreat accepted. glyphs banked, fresh run drawn.");
      resetRun(state, { banked: true });
    }
    if (action === "bts") openBts({ bts, viewer });
    persistAndPaint();
  });
  repaint();
  startMonsterClocks();
  function dev(id) {
    const e = state.run.entity;
    if (id === "heal") e.hp = e.maxHp;
    else if (id === "atk") e.atk += 5;
    else if (id === "lvl") {
      e.level += 1;
      e.maxHp += 5;
      e.atk += 1;
      e.hp = e.maxHp;
    } else if (id === "glyphs") e.glyphsThisRun = Number(e.glyphsThisRun || 0) + 1e3;
    else if (id === "map") {
      view.toggleFullMap(state.run.world);
      return;
    }
    if (typeof save === "function") save();
    paintHud();
  }
  return {
    repaint,
    dev,
    destroy() {
      window.removeEventListener("keydown", onKey);
      if (flashTimer) clearTimeout(flashTimer);
      stopMonsterClocks();
      view.destroy();
      root.remove();
    }
  };
  function tickBucket(bucket) {
    if (overlay || state.run.boss.reached || state.run.boss.defeated) return;
    const world = state.run.world;
    if (!world || !world.grid) return;
    const events = { moved: false, log: [], damageTaken: 0, died: false };
    monsterTurn(world, state.run.entity, events, (m) => m.bucket === bucket);
    for (const line of events.log) appendLog(state, line);
    if (events.damageTaken > 0) flashDamage(events.died);
    if (events.died) {
      appendLog(state, "@ was unparsed. run reset — banked glyphs survive.");
      resetRun(state, { banked: true, death: true });
      persistAndPaint();
      return;
    }
    view.tickMonsters(world);
    paintHud();
  }
  function startMonsterClocks() {
    stopMonsterClocks();
    monsterClocks = [400, 500, 600, 700, 800].map((ms, b) => setInterval(() => tickBucket(b), ms));
  }
  function stopMonsterClocks() {
    for (const id of monsterClocks) clearInterval(id);
    monsterClocks = [];
  }
  function challengeBoss() {
    state.run.boss.reached = true;
    const lock = getBossLockState({ actions, state });
    if (!lock.unlocked) {
      recordLockedBossAttempt(state);
      return;
    }
    state.run.boss.unlocked = true;
    let result = damageUnlockedBoss({ state, amount: 999 });
    for (let i = 0; i < 5 && !result.defeated; i++) {
      result = damageUnlockedBoss({ state, amount: 999 });
    }
    if (result.defeated) {
      appendLog(state, bellMessages.defeated);
      completeOnce({ stage: 2, defeated: true, reward: { glyphs: 25 }, btsPath: BTS_PATH });
    }
  }
}
function ensureWorld(state) {
  const run = state.run;
  if (!run.seed) run.seed = `s2-run${state.meta.runCount || 0}`;
  if (!run.world || run.world.floor !== run.floor || !Array.isArray(run.world.monsters)) {
    run.world = buildFloor(run.seed, run.floor);
  } else if (!run.world.grid) {
    attachGrid(run.world, run.seed, run.world.floor);
  }
}
function descend(state) {
  const run = state.run;
  run.entity.glyphsThisRun += 3;
  run.active = true;
  state.meta.bestFloor = Math.max(Number(state.meta.bestFloor || 0), run.floor);
  state.meta.floorsCleared[run.floor] = true;
  if (run.floor >= MAX_FLOOR) {
    run.boss.reached = true;
    appendLog(state, "the stairs end at the boss syntax. it waits.");
    return;
  }
  run.floor += 1;
  run.world = buildFloor(run.seed, run.floor);
  appendLog(state, `floor ${run.floor - 1} parsed. descending. +3 glyphs.`);
}
function resetRun(state, { banked, death }) {
  const run = state.run;
  if (banked) {
    state.meta.glyphsBanked = Number(state.meta.glyphsBanked || 0) + Number(run.entity.glyphsThisRun || 0);
  }
  if (death) state.meta.deaths = Number(state.meta.deaths || 0) + 1;
  state.meta.runCount = Number(state.meta.runCount || 0) + 1;
  run.seed = `s2-run${state.meta.runCount}`;
  run.entity = rollEntity(state.meta.shopUpgrades);
  run.floor = 1;
  run.active = false;
  run.boss.reached = false;
  run.world = buildFloor(run.seed, 1);
}
function compassArrow(dx, dy) {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < ay / 2) return dy < 0 ? "↑" : "↓";
  if (ay < ax / 2) return dx < 0 ? "←" : "→";
  if (dx < 0) return dy < 0 ? "↖" : "↙";
  return dy < 0 ? "↗" : "↘";
}
var NOISE_CHARS = "╳✕X#▓░*/\\";
function damageNoise(fatal) {
  const rows = fatal ? 7 : 4;
  const cols = fatal ? 34 : 26;
  const lines = [];
  for (let y = 0; y < rows; y += 1) {
    let line = "";
    for (let x = 0; x < cols; x += 1) {
      line += Math.random() < 0.7 ? NOISE_CHARS[Math.floor(Math.random() * NOISE_CHARS.length)] : " ";
    }
    lines.push(line);
  }
  return lines.join("\n");
}
function appendLog(state, line) {
  state.run.combatLog = [...state.run.combatLog, line].slice(-6);
}
function openCipher(viewer) {
  if (viewer && typeof viewer.openFile === "function") viewer.openFile(CIPHER_PATH);
  else if (viewer && typeof viewer.openViewerFile === "function") viewer.openViewerFile(CIPHER_PATH);
}
function openBts({ bts, viewer }) {
  if (bts && typeof bts.open === "function") bts.open(2);
  else if (bts && typeof bts.openBts === "function") bts.openBts(2);
  else if (viewer && typeof viewer.openFile === "function") viewer.openFile(BTS_PATH);
  else if (viewer && typeof viewer.openViewerFile === "function") viewer.openViewerFile(BTS_PATH);
}
function once(fn) {
  let called = false;
  return (value) => {
    if (called) return;
    called = true;
    fn(value);
  };
}

// ../../docs/games/metagame/stages/stage2/state.js
function defaultState() {
  return {
    version: 1,
    run: {
      active: false,
      seed: "stage2-vertical-slice",
      floor: 1,
      floorSeed: "stage2-floor-1",
      generatedFloors: {},
      entity: {
        hp: 30,
        maxHp: 30,
        atk: 5,
        def: 2,
        spd: 1,
        sight: 7,
        level: 1,
        xp: 0,
        gold: 0,
        glyphsThisRun: 0,
        equipment: {
          weapon: "hand_cursor",
          armor: null,
          ring: null,
          amulet: null
        },
        inventory: ["minor_parse_potion"],
        hotbar: ["minor_parse_potion", null, null, null]
      },
      identifiedItems: {},
      combatLog: [
        "tokens. not bits. different.",
        "the first room draws itself around @."
      ],
      boss: {
        reached: false,
        phase: 1,
        unlocked: false,
        defeated: false,
        hp: 150,
        attempts: 0,
        lockHintStep: 0,
        unlockNotified: false
      }
    },
    meta: {
      glyphsBanked: 0,
      parseDepth: 0,
      shopUpgrades: {},
      bestFloor: 0,
      floorsCleared: {},
      deaths: 0,
      bossAttempts: 0,
      firstClearComplete: false
    }
  };
}
function normalizeState(state) {
  const fresh = defaultState();
  const target = state && typeof state === "object" ? state : {};
  target.version = 1;
  target.run = mergePlain(fresh.run, target.run);
  target.run.entity = mergePlain(fresh.run.entity, target.run.entity);
  target.run.entity.equipment = mergePlain(fresh.run.entity.equipment, target.run.entity.equipment);
  target.run.boss = mergePlain(fresh.run.boss, target.run.boss);
  target.meta = mergePlain(fresh.meta, target.meta);
  return target;
}
function mergePlain(base, override) {
  return { ...base, ...override && typeof override === "object" ? override : {} };
}

// ../../docs/games/metagame/stages/stage2/index.js
var stageMeta = {
  id: 2,
  slug: "glyph-dungeon",
  name: "Glyph Dungeon",
  btsPath: BTS_PATH,
  requiredAction: REQUIRED_ACTION,
  // Dev-menu controls for this stage (wired in metagame.js → mounted.dev(id)).
  devControls: [
    { id: "heal", label: "Full HP" },
    { id: "atk", label: "+5 ATK" },
    { id: "lvl", label: "+1 LVL" },
    { id: "glyphs", label: "+1k glyphs" },
    { id: "map", label: "Zoom out (full map)" }
  ]
};
function defaultState2(context) {
  return defaultState(context);
}
function mountStage(ctx) {
  const {
    host,
    actions,
    achievements,
    bell,
    save
  } = ctx;
  const state = normalizeState(ctx.state);
  let view = null;
  ensureStyles();
  if (hasSearchPassage(actions)) {
    applySearchPassageUnlock({ state, achievements, bell });
  }
  const unsubscribe = subscribeToSearchPassage(actions, () => {
    applySearchPassageUnlock({ state, achievements, bell });
    if (typeof save === "function") save();
    if (view && typeof view.repaint === "function") view.repaint();
  });
  view = renderStage2({ ...ctx, state });
  return {
    devControls: stageMeta.devControls,
    dev(id) {
      if (view && typeof view.dev === "function") view.dev(id);
    },
    destroy() {
      unsubscribe();
      if (view && typeof view.destroy === "function") view.destroy();
    }
  };
}
function subscribeToSearchPassage(actions, onUnlock) {
  if (actions && typeof actions.subscribeToActions === "function") {
    return actions.subscribeToActions((detail) => {
      if (isSearchPassageDetail(detail)) onUnlock(detail);
    }) || (() => {
    });
  }
  const handler = (event) => {
    if (isSearchPassageDetail(event.detail)) onUnlock(event.detail);
  };
  window.addEventListener("fv:games:action", handler);
  return () => window.removeEventListener("fv:games:action", handler);
}
function isSearchPassageDetail(detail) {
  return Boolean(detail && Number(detail.stage) === 2 && detail.action === ACTION_NAME);
}
function ensureStyles() {
  const id = "stage2-glyph-dungeon-styles";
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = new URL("./styles.css", import.meta.url).href;
  document.head.append(link);
}
export {
  applySearchPassageUnlock,
  defaultState2 as defaultState,
  getBossLockState,
  mountStage,
  recordLockedBossAttempt,
  stageMeta
};
