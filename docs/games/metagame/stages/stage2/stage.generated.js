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
  "the arena has structure. cross it blind and it will cost you.",
  "there is an easier way through. it is written down.",
  "cipher.txt knows the way.",
  "search cipher.txt for PASSAGE. mark PASSAGE:247, then return — the crossing gets a lot safer."
];
var combatLines = {
  floorAdvance: [
    "floor grammar accepted.",
    "glyph shard recovered.",
    "a door becomes a sentence."
  ],
  // 2026-07-11 playtest fix: PASSAGE is a buff now, not a gate — a blind strike still lands, it
  // just costs a counter-hit back. "no route remains" is retired; see renderer.js's challengeBoss.
  lockedExchange: "the strike lands, but the pattern bites back.",
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
    // 2026-07-11 playtest fix: PASSAGE is now an optional buff, not a gate — defeatPossible is
    // always true once the boss is reached. `unlocked` still drives the one-hit clean-clear buff
    // (see damageBoss's caller in renderer.js) and the cosmetic pillar/gap status text above.
    defeatPossible: true,
    hint: unlocked ? combatLines.unlocked : lockedHintLadder[hintIndex]
  };
}
function recordBossAttempt(state) {
  const boss = state.run.boss;
  boss.reached = true;
  boss.attempts = Number(boss.attempts || 0) + 1;
  boss.lockHintStep = Math.min(Number(boss.lockHintStep || 0) + 1, lockedHintLadder.length - 1);
  state.meta.bossAttempts = Number(state.meta.bossAttempts || 0) + 1;
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
function damageBoss({ state, amount = 50 }) {
  const boss = state.run.boss;
  if (boss.defeated) return { defeated: false, phaseChanged: false };
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

// ../../docs/games/metagame/stages/stage2/structures.js
var STRUCTURES = [
  ["##", "##"],
  // solid pillar
  ["####"],
  // horizontal bar
  ["#", "#", "#", "#"],
  // vertical bar
  ["#.", "#.", "##"],
  // L corner
  ["###", ".#."],
  // T
  [".#.", "###", ".#."],
  // plus / cross
  ["#..", ".#.", "..#"],
  // diagonal
  ["#.#", "#.#", "###"],
  // U (open top)
  ["##..##", "#....#"],
  // brackets
  ["#.#", ".#.", "#.#"],
  // checker
  ["##.##", "##.##"],
  // twin pillars, central lane
  ["###", "#..", "#.."],
  // hooked corner
  ["..#..", ".###.", "#####"],
  // arrow / buttress
  ["#####", "#...#", "#...#", "##.##"],
  // sub-room (empty cover)
  ["#####", "#.s.#", "##.##"],
  // sub-room guarding a sword
  ["#.#", ".h.", "#.#"],
  // potion between pillars
  ["#.#", "###", "#.#"],
  // H frame
  ["###", "#g#", "#.#"],
  // glyph nook (open below)
  ["##..", ".##.", "..##"],
  // zigzag
  ["##", "s#"]
  // sword in a wall corner
];
var ITEM_CHANCE = { s: 0.22, h: 0.4, g: 0.5 };
var ITEM_KIND = { s: "weapon", h: "potion", g: "glyph" };
function decorateRoom(grid, room, rng) {
  const items = [];
  const innerW = room.w - 4;
  const innerH = room.h - 4;
  if (innerW < 2 || innerH < 2) return items;
  const budget = Math.max(1, Math.floor(room.w * room.h / 90));
  const placed = [];
  let attempts = budget * 5;
  while (placed.length < budget && attempts-- > 0) {
    const s = rng.pick(STRUCTURES);
    const sh = s.length;
    const sw = s[0].length;
    if (sw > innerW || sh > innerH) continue;
    const ox = room.x + 2 + rng.int(0, innerW - sw);
    const oy = room.y + 2 + rng.int(0, innerH - sh);
    const box = { x: ox - 1, y: oy - 1, w: sw + 2, h: sh + 2 };
    if (room.cx >= box.x && room.cx < box.x + box.w && room.cy >= box.y && room.cy < box.y + box.h) continue;
    if (placed.some((p) => box.x < p.x + p.w && box.x + box.w > p.x && box.y < p.y + p.h && box.y + box.h > p.y)) continue;
    for (let r = 0; r < sh; r += 1) {
      for (let c = 0; c < sw; c += 1) {
        const ch = s[r][c];
        const gx = ox + c;
        const gy = oy + r;
        if (ch === "#") grid[gy][gx] = "#";
        else if (ITEM_KIND[ch] && rng.chance(ITEM_CHANCE[ch])) items.push({ x: gx, y: gy, kind: ITEM_KIND[ch] });
      }
    }
    placed.push(box);
  }
  return items;
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
function carveAndConnect(node, grid, rng, rooms, minRoom, decor) {
  if (!node.left) {
    const maxW = Math.max(minRoom, node.w - 2);
    const maxH = Math.max(minRoom, node.h - 2);
    const rw = Math.min(maxW, Math.max(minRoom, rng.int(Math.floor(maxW * 0.7), maxW)));
    const rh = Math.min(maxH, Math.max(minRoom, rng.int(Math.floor(maxH * 0.7), maxH)));
    const rx = node.x + 1 + rng.int(0, Math.max(0, node.w - rw - 2));
    const ry = node.y + 1 + rng.int(0, Math.max(0, node.h - rh - 2));
    const room = { x: rx, y: ry, w: rw, h: rh, cx: rx + (rw >> 1), cy: ry + (rh >> 1) };
    carveRoom(grid, room);
    for (const it of decorateRoom(grid, room, rng)) decor.push(it);
    grid[room.cy][room.cx] = ".";
    rooms.push(room);
    node.room = room;
    return room;
  }
  const a = carveAndConnect(node.left, grid, rng, rooms, minRoom, decor);
  const b = carveAndConnect(node.right, grid, rng, rooms, minRoom, decor);
  if (a && b) connect(grid, a, b, rng);
  node.room = a || b;
  return node.room;
}
var HIDDEN_TYPES = ["treasure", "treasure", "trap", "trap", "teleport", "shrine", "vault", "captive"];
function attachHiddenRooms(grid, rooms, rng) {
  const height = grid.length;
  const width = grid[0].length;
  const want = Math.min(4, 1 + Math.floor(rooms.length / 10));
  const clamp2 = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const allWall = (x, y, w, h) => {
    if (x < 1 || y < 1 || x + w > width - 1 || y + h > height - 1) return false;
    for (let yy = y; yy < y + h; yy += 1) {
      const row = grid[yy];
      for (let xx = x; xx < x + w; xx += 1) if (row[xx] !== "#") return false;
    }
    return true;
  };
  const overlaps = (b, list) => list.some((p) => b.x < p.x + p.w && b.x + b.w > p.x && b.y < p.y + p.h && b.y + b.h > p.y);
  const hidden = [];
  const reserved = [];
  for (const r of rng.shuffle(rooms.slice())) {
    if (hidden.length >= want) break;
    const hw = rng.int(5, 8);
    const hh = rng.int(5, 8);
    const side = rng.int(0, 3);
    let hx;
    let hy;
    let door;
    let inner;
    if (side === 2 || side === 3) {
      hy = clamp2(r.cy - (hh >> 1), 1, height - 1 - hh);
      const lo = Math.max(r.y, hy);
      const hi = Math.min(r.y + r.h - 1, hy + hh - 1);
      if (hi < lo) continue;
      const dy = lo + hi >> 1;
      if (side === 3) {
        hx = r.x + r.w + 1;
        door = { x: r.x + r.w, y: dy };
        inner = { x: r.x + r.w - 1, y: dy };
      } else {
        hx = r.x - hw - 1;
        door = { x: r.x - 1, y: dy };
        inner = { x: r.x, y: dy };
      }
    } else {
      hx = clamp2(r.cx - (hw >> 1), 1, width - 1 - hw);
      const lo = Math.max(r.x, hx);
      const hi = Math.min(r.x + r.w - 1, hx + hw - 1);
      if (hi < lo) continue;
      const dx = lo + hi >> 1;
      if (side === 1) {
        hy = r.y + r.h + 1;
        door = { x: dx, y: r.y + r.h };
        inner = { x: dx, y: r.y + r.h - 1 };
      } else {
        hy = r.y - hh - 1;
        door = { x: dx, y: r.y - 1 };
        inner = { x: dx, y: r.y };
      }
    }
    const box = { x: hx, y: hy, w: hw, h: hh };
    if (!allWall(hx, hy, hw, hh) || overlaps(box, reserved)) continue;
    if (grid[door.y][door.x] !== "#" || grid[inner.y][inner.x] !== ".") continue;
    reserved.push(box);
    hidden.push({ x: hx, y: hy, w: hw, h: hh, entrance: door, type: rng.pick(HIDDEN_TYPES), revealed: false });
  }
  return hidden;
}
function carveHiddenRoom(grid, h) {
  for (let y = h.y; y < h.y + h.h && y < grid.length; y += 1) {
    let arr = null;
    const row = grid[y];
    for (let x = h.x; x < h.x + h.w && x < row.length; x += 1) if (row[x] !== ".") {
      arr = arr || row.split("");
      arr[x] = ".";
    }
    if (arr) grid[y] = arr.join("");
  }
  const e = h.entrance;
  if (grid[e.y] && grid[e.y][e.x] !== ".") grid[e.y] = grid[e.y].slice(0, e.x) + "." + grid[e.y].slice(e.x + 1);
}
function generate(rng, { width, height, minLeaf = 18, minRoom = 5 }) {
  const grid = Array.from({ length: height }, () => Array(width).fill("#"));
  const root = { x: 1, y: 1, w: width - 2, h: height - 2 };
  splitNode(root, rng, Math.max(minRoom + 2, minLeaf));
  const rooms = [];
  const decor = [];
  carveAndConnect(root, grid, rng, rooms, minRoom, decor);
  const hidden = attachHiddenRooms(grid, rooms, rng);
  return { grid: grid.map((row) => row.join("")), rooms, hidden, decor };
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
  { id: "ambusher", glyph: "a", name: "dangling ref", hp: 24, atk: 8, xp: 6, drop: 3, minFloor: 3, ambush: true },
  { id: "race", glyph: "r", name: "race condition", hp: 22, atk: 7, xp: 6, drop: 2, minFloor: 3, fast: true },
  { id: "leak", glyph: "L", name: "memory leak", hp: 40, atk: 6, xp: 5, drop: 3, minFloor: 3 },
  { id: "spitter", glyph: "y", name: "syntax spitter", hp: 18, atk: 7, xp: 6, drop: 3, minFloor: 4, ranged: true },
  { id: "exploder", glyph: "x", name: "segfault", hp: 16, atk: 6, xp: 5, drop: 3, minFloor: 4, explode: true },
  { id: "overflow", glyph: "O", name: "stack overflow", hp: 52, atk: 13, xp: 9, drop: 4, minFloor: 4 },
  { id: "summoner", glyph: "u", name: "fork bomb", hp: 30, atk: 5, xp: 8, drop: 4, minFloor: 5, summon: true },
  // Overflow act (darkness) foes — see overflow.js for their behaviour.
  { id: "lighteater", glyph: "e", name: "light eater", hp: 26, atk: 7, xp: 8, drop: 4, minFloor: 7, lighteater: true },
  { id: "mirror", glyph: "M", name: "mirror", hp: 34, atk: 6, xp: 9, drop: 4, minFloor: 7, mirror: true },
  // Phantom: leaves NO last-seen ghost (untrackable in the dark, view.js) and full speed in true
  // darkness, but torchlight pins it (phantomTick slows it). The pure stealth-vs-light foe.
  { id: "phantom", glyph: "ψ", name: "null phantom", hp: 28, atk: 9, xp: 9, drop: 4, minFloor: 8, fast: true, phantom: true },
  // Void ref (D3): the Act-III paranoia foe. While it sits in the dark it's invisible (like every
  // unlit foe); drift within 2 tiles and it SHADOW-STEPS to a cell beside @ and bites next turn —
  // so a dark cell is never safe. A lit torch reveals it AND freezes the step (see monsters.shadow).
  { id: "voidref", glyph: "v", name: "void ref", hp: 28, atk: 11, xp: 8, drop: 4, minFloor: 7, shadow: true }
];
var BEHAVIOURS = ["fast", "ranged", "summon", "explode", "ambush", "lighteater", "mirror", "phantom", "shadow"];
var ELITE_PREFIXES = [
  { key: "armored", name: "armored", hpMult: 1.8, atkMult: 1.1 },
  { key: "venomous", name: "venomous", hpMult: 1.3, atkMult: 1.3, venom: true },
  { key: "frenzied", name: "frenzied", hpMult: 1.4, atkMult: 1.5, fast: true }
];
function eliteChance(floor) {
  return Math.min(0.28, 0.04 + (floor - 1) * 0.05);
}
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
  { id: "torchcraft", name: "Torchbearer", desc: "+12 torch steps & start each run with a torch (per level)", max: 4, apply: (s, n) => {
    s.torchSteps = 12 * n;
    s.startTorches = n;
  } },
  { id: "acid_resist", name: "Acid Resistance", desc: "−1 acid-corrosion ATK penalty per level", max: 2, apply: (s, n) => {
    s.acidResist = n;
  } },
  // Stairwell Sense — two tiers (read by the renderer; apply is a no-op). L1 = the HUD next-step
  // compass; L2 additionally draws the full route to the stairs as a faint trail on the map.
  { id: "compass", name: "Stairwell Sense", desc: "L1: HUD compass to the stairs. L2: also draws the path on the map.", max: 2, apply: () => {
  } }
];
function stairTrailEnabled(compassLevel) {
  return Number(compassLevel || 0) >= 2;
}
var RUN_MODS = [
  { id: "swarm", name: "Swarm", desc: "+60% monsters", heatBonus: 0.25 },
  { id: "no_potions", name: "Drought", desc: "no health potions on the floor", heatBonus: 0.25 },
  { id: "elite_storm", name: "Elite Storm", desc: "far more elites", heatBonus: 0.25 },
  { id: "lights_out", name: "Lights Out", desc: "light radius −2 the whole run — a mastery test", heatBonus: 0.35, unlock: (meta) => Number((meta || {}).bestFloor || 0) >= 7 }
];
var HEAT_PER_MOD = 0.25;
function runHeat(runMods2 = {}) {
  return 1 + RUN_MODS.filter((m) => runMods2[m.id]).reduce((s, m) => s + (m.heatBonus || HEAT_PER_MOD), 0);
}
var SHOP_BASE = { vitality: 8, hp_level: 20, edge: 12, atk_level: 30, guard: 10, def_level: 25, greed: 15, torchcraft: 40, acid_resist: 18, compass: 1e3 };
var SHOP_GROWTH = { vitality: 1.6, hp_level: 1.8, edge: 1.7, atk_level: 1.9, guard: 1.7, def_level: 1.9, greed: 1.9, torchcraft: 1.8, acid_resist: 1.8, compass: 1.5 };
function upgradeCost(id, level) {
  return Math.round((SHOP_BASE[id] || 10) * (SHOP_GROWTH[id] || 1.7) ** level);
}
function xpForLevel(level) {
  return 6 + (level - 1) * 5;
}
function rollEntity(shopUpgrades = {}) {
  const stats = { ...BASE_STATS, level: 1, xp: 0, glyphsThisRun: 0, glyphMult: 1, equipment: { weapon: "hand_cursor" }, affix: null, inventory: {}, statuses: {} };
  for (const up of SHOP_UPGRADES) {
    const n = Number(shopUpgrades[up.id] || 0);
    if (n > 0) up.apply(stats, n);
  }
  stats.hp = stats.maxHp;
  if (stats.startTorches > 0) stats.inventory.torch = Number(stats.startTorches);
  return stats;
}
function spawnMonster(rng, floor, index) {
  const eligible = MONSTERS.filter((m2) => m2.minFloor <= floor);
  const def = rng.pick(eligible.length ? eligible : MONSTERS);
  const scale = 1 + (floor - 1) * 0.35;
  let hp = Math.round(def.hp * scale) + index % 2;
  let atk = Math.round(def.atk * scale);
  const m = {
    id: def.id,
    glyph: def.glyph,
    name: def.name,
    fast: Boolean(def.fast),
    xp: def.xp,
    drop: def.drop,
    alive: true,
    x: 0,
    y: 0,
    // Patrol heading + how far it can spot @ (set at generation; fast foes are more alert).
    dir: rng.pick(["up", "down", "left", "right"]),
    sight: def.fast || def.ranged ? 7 : 5,
    chasing: false,
    // Which of the 5 shared real-time movement clocks this monster ticks on (0=fastest .4s).
    bucket: rng.int(0, 4),
    // Faction (C5): two rival camps that fight each other when not engaged with @ — bait them.
    faction: rng.int(0, 1)
  };
  for (const b of BEHAVIOURS) if (def[b]) m[b] = true;
  if (m.ambush) m.hidden = true;
  if (floor >= 2 && rng.float() < eliteChance(floor)) {
    const p = rng.pick(ELITE_PREFIXES);
    hp = Math.round(hp * p.hpMult);
    atk = Math.round(atk * p.atkMult);
    m.elite = true;
    m.prefix = p.key;
    m.name = `${p.name} ${def.name}`;
    m.drop = def.drop + 2;
    m.xp = def.xp + 4;
    if (p.fast) m.fast = true;
    if (p.venom) m.venom = true;
    m.sight = Math.max(m.sight, 7);
  }
  m.hp = hp;
  m.maxHp = hp;
  m.atk = atk;
  return m;
}

// ../../docs/games/metagame/stages/stage2/dirs.js
var DIRS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 }
};
var DIR_LIST = ["up", "down", "left", "right"];

// ../../docs/games/metagame/stages/stage2/status.js
var DOT = { poison: true, burn: true, bleed: true };
var LABEL = { poison: "poison", burn: "burning", bleed: "bleeding" };
function applyStatus(ent, type, turns, power = 1) {
  if (!ent || turns <= 0) return;
  ent.statuses = ent.statuses || {};
  const cur = ent.statuses[type];
  ent.statuses[type] = {
    turns: Math.max(turns, cur ? cur.turns : 0),
    power: Math.max(power, cur ? cur.power : 0)
  };
}
function hasStatus(ent, type) {
  return Boolean(ent && ent.statuses && ent.statuses[type] && ent.statuses[type].turns > 0);
}
var ICON = { poison: "☣", burn: "♨", bleed: "✣", slow: "❄", stun: "✦", frozen: "❄", corroded: "≀" };
function statusSummary(ent) {
  if (!ent || !ent.statuses) return "";
  return Object.keys(ent.statuses).filter((t) => ent.statuses[t] && ent.statuses[t].turns > 0).map((t) => `${ICON[t] || "•"}${ent.statuses[t].turns}`).join(" ");
}
function tickStatuses(ent, events, isPlayer) {
  if (!ent || !ent.statuses) return 0;
  let dmg = 0;
  const sources = [];
  for (const type of Object.keys(ent.statuses)) {
    const st = ent.statuses[type];
    if (!st || st.turns <= 0) {
      delete ent.statuses[type];
      continue;
    }
    if (DOT[type]) {
      dmg += st.power;
      sources.push(LABEL[type] || type);
    }
    st.turns -= 1;
    if (st.turns <= 0) delete ent.statuses[type];
  }
  if (dmg > 0 && typeof ent.hp === "number") {
    ent.hp = Math.max(0, ent.hp - dmg);
    if (events) {
      if (isPlayer) {
        events.damageTaken = (events.damageTaken || 0) + dmg;
        if (ent.hp <= 0) events.died = true;
      }
      if (events.log) events.log.push(`${isPlayer ? "@" : ent.name || "foe"} takes ${dmg} from ${sources.join(" + ")}.`);
    }
  }
  return dmg;
}
function skipsTurn(ent) {
  if (hasStatus(ent, "stun") || hasStatus(ent, "frozen")) return true;
  if (hasStatus(ent, "slow")) {
    ent._slowPhase = !ent._slowPhase;
    return ent._slowPhase;
  }
  return false;
}

// ../../docs/games/metagame/stages/stage2/darkness.js
function lightRadius(floor) {
  if (floor <= 3) return null;
  if (floor <= 6) return { rx: 13, ry: 7 };
  if (floor <= 9) return { rx: 9, ry: 5 };
  return { rx: 7, ry: 4 };
}
var OVERFLOW_FLOOR = 7;
function isDarkAct(floor) {
  return floor >= OVERFLOW_FLOOR;
}
var DARK_RADIUS = { rx: 6, ry: 3 };
var TORCH_RADIUS = { rx: 15, ry: 8 };
var TORCH_STEPS = 28;
var TORCH_AGGRO = 4;
function effectiveLight(world) {
  const base = isDarkAct(world.floor) ? torchLit(world) ? TORCH_RADIUS : DARK_RADIUS : lightRadius(world.floor);
  const pen = Number(world && world._lightsOutPenalty || 0);
  if (!base || !pen) return base;
  return { rx: Math.max(2, base.rx - pen), ry: Math.max(1, base.ry - pen) };
}
function litCell(world, x, y) {
  const L = effectiveLight(world);
  return !L || Math.abs(x - world.pos.x) <= L.rx && Math.abs(y - world.pos.y) <= L.ry;
}
function torchLit(world) {
  return Number(world && world.torch) > 0;
}
function torchSightBonus(world) {
  return isDarkAct(world.floor) && torchLit(world) ? TORCH_AGGRO : 0;
}

// ../../docs/games/metagame/stages/stage2/overflow.js
var GROW_CAP = 10;
var GROW_HP = 5;
var GROW_ATK = 1;
function lightEaterTick(world, m, events) {
  const feeding = isDarkAct(world.floor) && !torchLit(world);
  if (feeding) {
    if ((m._grow || 0) < GROW_CAP) {
      m._grow = (m._grow || 0) + 1;
      m.maxHp += GROW_HP;
      m.hp += GROW_HP;
      m.atk += GROW_ATK;
      if (m._grow === GROW_CAP && events && events.log) events.log.push(`${m.name} has gorged on the dark.`);
    }
  } else if ((m._grow || 0) > 0) {
    m._grow -= 1;
    m.maxHp = Math.max(1, m.maxHp - GROW_HP);
    m.hp = Math.min(m.hp, m.maxHp);
    m.atk = Math.max(2, m.atk - GROW_ATK);
  }
}
function mirrorTick(m, player) {
  const copied = Math.round(Number(player.atk || 0) * 0.85);
  if (copied > m.atk) m.atk = copied;
}
function phantomTick(world, m) {
  if (isDarkAct(world.floor) && torchLit(world)) applyStatus(m, "slow", 2, 1);
}

// ../../docs/games/metagame/stages/stage2/hazards.js
var HAZARD_GLYPH = { lava: "≈", spores: "*", spikes: "^", chasm: ":", rift: "○", wet: "~", ice: "~", acid: "≀" };
var HAZARD_CLASS = { lava: "s2-c-lava", spores: "s2-c-spores", spikes: "s2-c-spikes", chasm: "s2-c-chasm", rift: "s2-c-chasm", wet: "s2-c-wet", ice: "s2-c-ice", acid: "s2-c-acid" };
function hazardPlan(floor) {
  if (floor <= 2) return { types: ["spikes"], density: 0.35 };
  if (floor <= 4) return { types: ["spikes", "spores", "chasm"], density: 0.8 };
  if (floor <= 6) return { types: ["spikes", "spores", "lava", "chasm", "acid"], density: 1.2 };
  return { types: ["lava", "spores", "chasm", "spikes", "rift", "acid"], density: 1.7 };
}
var ICE_ACT = { from: 4, to: 6 };
function placeHazards(rng, floor, roomN, takeCell) {
  const plan = hazardPlan(floor);
  const count = Math.round(roomN * 0.45 * plan.density);
  const hazards = [];
  for (let i = 0; i < count; i += 1) {
    const c = takeCell();
    if (!c) break;
    hazards.push({ x: c.x, y: c.y, type: rng.pick(plan.types) });
  }
  if (floor >= ICE_ACT.from && floor <= ICE_ACT.to) {
    const wet = 3 + Math.round(roomN * 0.35);
    for (let i = 0; i < wet; i += 1) {
      const c = takeCell();
      if (!c) break;
      hazards.push({ x: c.x, y: c.y, type: "wet" });
    }
  }
  return hazards;
}
function hazardIndex(world) {
  const map = /* @__PURE__ */ new Map();
  if (Array.isArray(world.hazards)) for (const h of world.hazards) map.set(h.y * world.width + h.x, h);
  return (x, y) => {
    const h = map.get(y * world.width + x);
    return h ? h.type : void 0;
  };
}
function iceSlide(world, x, y, dx, dy) {
  const sx = x + dx;
  const sy = y + dy;
  const grid = world.grid;
  if (!(grid[sy] && grid[sy][sx] && grid[sy][sx] !== "#")) return { wall: true };
  if (world.hazardAt && world.hazardAt(sx, sy) === "chasm") return { x: sx, y: sy, chasm: true };
  return { x: sx, y: sy };
}
function playerIceSlide(world, x, y, dx, dy, events) {
  if (!world.hazardAt || world.hazardAt(x, y) !== "ice") return { x, y };
  const sl = iceSlide(world, x, y, dx, dy);
  const blocked = sl.wall || sl.x != null && Array.isArray(world.monsters) && world.monsters.some((m) => m.alive && m.x === sl.x && m.y === sl.y);
  if (blocked) {
    events.log.push("you skid on the ice and bump the wall.");
    return { x, y };
  }
  events.slid = true;
  events.log.push(sl.chasm ? "you skid across the ice — straight toward a chasm!" : "you skid across the ice.");
  return { x: sl.x, y: sl.y };
}
function enterHazard(world, player, hz, events) {
  if (hz === "lava") {
    const dmg = 6 + world.floor * 2;
    player.hp = Math.max(0, player.hp - dmg);
    events.damageTaken = (events.damageTaken || 0) + dmg;
    applyStatus(player, "burn", 3, 2 + Math.floor(world.floor / 3));
    events.log.push(`lava! ${dmg} damage — you're burning.`);
    if (player.hp <= 0) events.died = true;
  } else if (hz === "spores") {
    applyStatus(player, "poison", 4, 1 + Math.floor(world.floor / 4));
    events.log.push("a spore cloud bursts — poisoned.");
  } else if (hz === "spikes") {
    const dmg = 3 + world.floor;
    player.hp = Math.max(0, player.hp - dmg);
    events.damageTaken = (events.damageTaken || 0) + dmg;
    applyStatus(player, "bleed", 3, 1);
    events.log.push(`spikes! ${dmg} damage — bleeding.`);
    if (player.hp <= 0) events.died = true;
  } else if (hz === "chasm") {
    const dmg = 4 + world.floor;
    player.hp = Math.max(0, player.hp - dmg);
    events.damageTaken = (events.damageTaken || 0) + dmg;
    if (player.hp <= 0) {
      events.died = true;
      return;
    }
    events.descend = true;
    events.fell = true;
    events.log.push(`you plunge through a chasm — ${dmg} fall damage — and drop a floor.`);
  } else if (hz === "acid") {
    const dmg = 2 + Math.floor(world.floor / 2);
    player.hp = Math.max(0, player.hp - dmg);
    events.damageTaken = (events.damageTaken || 0) + dmg;
    applyStatus(player, "corroded", 3, 1);
    events.log.push(`an acid pool! ${dmg} damage — your cursor corrodes (ATK down until it clears).`);
    if (player.hp <= 0) events.died = true;
  } else if (hz === "rift") {
    const dmg = 3 + world.floor;
    const hadTorch = Number(world.torch) > 0;
    world.torch = 0;
    player.hp = Math.max(0, player.hp - dmg);
    events.damageTaken = (events.damageTaken || 0) + dmg;
    applyStatus(player, "slow", 3, 1);
    events.riftSnuff = hadTorch;
    events.log.push(hadTorch ? `a void rift! your torch is swallowed — ${dmg} shadow damage, and you stumble blind.` : `a void rift! ${dmg} shadow damage drags at you — you stumble in the dark.`);
    if (player.hp <= 0) events.died = true;
  }
}

// ../../docs/games/metagame/stages/stage2/monsters.js
var SUMMON_CAP = 90;
var RANGED_COOLDOWN = 2;
var SUMMON_COOLDOWN = 4;
var EXPLODE_RADIUS = 2;
var SHADOW_RANGE = 9;
function isOpen(world, x, y) {
  return y >= 0 && x >= 0 && y < world.grid.length && x < world.width && world.grid[y][x] !== "#";
}
function freeCell(world, x, y, occupied) {
  if (!isOpen(world, x, y) || occupied.has(y * world.width + x)) return false;
  if (x === world.pos.x && y === world.pos.y) return false;
  if (world.hazardAt && world.hazardAt(x, y) && !world.hazardSafe) {
    const hz = world.hazardAt(x, y);
    if (hz === "lava" || hz === "spikes" || hz === "acid") return false;
  }
  return true;
}
function adjacentToPlayerFree(world, occupied) {
  for (const d of DIR_LIST) {
    const x = world.pos.x + DIRS[d].dx;
    const y = world.pos.y + DIRS[d].dy;
    if (freeCell(world, x, y, occupied)) return { x, y };
  }
  return null;
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
  events.damageTaken = (events.damageTaken || 0) + dmg;
  if (m.venom) applyStatus(player, "poison", 3, 1);
  if (player.hp <= 0) events.died = true;
  if (events.log) events.log.push(`${m.name} bites for ${dmg}.`);
  return dmg;
}
function slideMonster(world, m, fromX, fromY, occupied, events) {
  if (!world.hazardAt || world.hazardAt(m.x, m.y) !== "ice") return;
  const sl = iceSlide(world, m.x, m.y, m.x - fromX, m.y - fromY);
  if (sl.wall) {
    applyStatus(m, "stun", 2, 1);
    if (events.log) events.log.push(`${m.name} skids on the ice and slams into the wall!`);
    return;
  }
  if (sl.chasm) {
    occupied.delete(m.y * world.width + m.x);
    m.alive = false;
    m.hp = 0;
    if (events.log) events.log.push(`${m.name} skids across the ice into the chasm!`);
    return;
  }
  if (occupied.has(sl.y * world.width + sl.x) || sl.x === world.pos.x && sl.y === world.pos.y) return;
  occupied.delete(m.y * world.width + m.x);
  m.x = sl.x;
  m.y = sl.y;
  occupied.add(m.y * world.width + m.x);
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
function adjacentRival(world, m) {
  for (const d of DIR_LIST) {
    const x = m.x + DIRS[d].dx;
    const y = m.y + DIRS[d].dy;
    const o = world.monsters.find((q) => q.alive && !q.ally && q.x === x && q.y === y && q.faction !== m.faction && q !== m);
    if (o) return o;
  }
  return null;
}
function adjacentFree(world, m, occupied) {
  for (const d of DIR_LIST) {
    const x = m.x + DIRS[d].dx;
    const y = m.y + DIRS[d].dy;
    if (freeCell(world, x, y, occupied)) return { x, y };
  }
  return null;
}
function pressureSpawn(world) {
  if (world.stepCount == null) return 0;
  const interval = Math.max(12, 40 - world.floor * 4);
  const first = Math.max(20, 60 - world.floor * 5);
  if (world._nextWander == null) world._nextWander = first;
  if (world.stepCount < world._nextWander) return 0;
  if (world.monsters.filter((m2) => m2.alive).length >= SUMMON_CAP * 4) return 0;
  world._nextWander = world.stepCount + interval;
  world._wanderN = (world._wanderN || 0) + 1;
  const rng = makeRng(`${world.seed}:${world.floor}:wander:${world._wanderN}`);
  const spot = offscreenCell(world, rng);
  if (!spot) return 0;
  const m = spawnMonster(rng, world.floor, world.monsters.length);
  m.x = spot.x;
  m.y = spot.y;
  m.home = { x: spot.x, y: spot.y };
  m.chasing = true;
  m.bucket = world._wanderN % 5;
  if (m.ambush) {
    m.ambush = false;
    m.hidden = false;
  }
  world.monsters.push(m);
  return 1;
}
function offscreenCell(world, rng) {
  for (let t = 0; t < 60; t += 1) {
    const dx = rng.int(-44, 44);
    const dy = rng.int(-30, 30);
    if (Math.abs(dx) <= 26 && Math.abs(dy) <= 13) continue;
    const x = world.pos.x + dx;
    const y = world.pos.y + dy;
    if (isOpen(world, x, y) && !(world.hazardAt && world.hazardAt(x, y))) return { x, y };
  }
  return null;
}
function makeMinion(world) {
  const scale = 1 + (world.floor - 1) * 0.35;
  const hp = Math.round(12 * scale);
  world._summonN = (world._summonN || 0) + 1;
  return {
    id: "spawnling",
    glyph: "·",
    name: "fork spawn",
    hp,
    maxHp: hp,
    atk: Math.max(2, Math.round(4 * scale)),
    xp: 1,
    drop: 1,
    alive: true,
    x: 0,
    y: 0,
    dir: "down",
    sight: 6,
    chasing: true,
    bucket: world._summonN % 5,
    faction: 0
  };
}
function detonate(world, at, player, events) {
  const reach = EXPLODE_RADIUS;
  const power = Math.max(3, Math.round((at.atk || 6) * 1.2));
  const pd = Math.abs(world.pos.x - at.x) + Math.abs(world.pos.y - at.y);
  if (typeof player.hp === "number" && pd <= reach) {
    const dmg = Math.max(1, power - Number(player.def || 0));
    player.hp = Math.max(0, player.hp - dmg);
    events.damageTaken = (events.damageTaken || 0) + dmg;
    if (events.log) events.log.push(`${at.name} detonates for ${dmg}!`);
    if (player.hp <= 0) events.died = true;
  } else if (events.log) {
    events.log.push(`${at.name} detonates.`);
  }
  for (const o of world.monsters) {
    if (!o.alive || o === at) continue;
    if (Math.abs(o.x - at.x) + Math.abs(o.y - at.y) <= reach) {
      o.hp -= power;
      if (o.hp <= 0) o.alive = false;
    }
  }
  events.blast = { x: at.x, y: at.y };
}
function allyTurn(world, m, occupied, events) {
  let target = null;
  let bd = Infinity;
  for (const o of world.monsters) {
    if (!o.alive || o.ally || o === m) continue;
    const d = Math.abs(o.x - m.x) + Math.abs(o.y - m.y);
    if (d < bd) {
      bd = d;
      target = o;
    }
  }
  if (target && bd <= (m.sight || 6) + 4) {
    if (bd === 1) {
      target.hp -= Math.max(1, m.atk);
      if (target.hp <= 0) {
        target.alive = false;
        occupied.delete(target.y * world.width + target.x);
        if (target.explode) detonate(world, target, { hp: null }, events);
        if (events.log) events.log.push(`your ally fells ${target.name}.`);
      }
      return;
    }
    const t2 = greedyStep(world, m, target.x, target.y, occupied);
    if (t2) {
      occupied.delete(m.y * world.width + m.x);
      m.x = t2.x;
      m.y = t2.y;
      occupied.add(m.y * world.width + m.x);
    }
    return;
  }
  const t = patrolStep(world, m, occupied);
  if (t) {
    occupied.delete(m.y * world.width + m.x);
    m.x = t.x;
    m.y = t.y;
    m.dir = t.dir;
    occupied.add(m.y * world.width + m.x);
  }
}
function monsterTurn(world, player, events, filter) {
  const px = world.pos.x;
  const py = world.pos.y;
  const torchAggro = torchSightBonus(world);
  const occupied = /* @__PURE__ */ new Set();
  for (const m of world.monsters) if (m.alive) occupied.add(m.y * world.width + m.x);
  for (const m of world.monsters) {
    if (!m.alive) continue;
    if (filter && !filter(m)) continue;
    if (m.ally) {
      allyTurn(world, m, occupied, events);
      continue;
    }
    if (m.statuses) {
      tickStatuses(m, events, false);
      if (m.hp <= 0) {
        m.alive = false;
        occupied.delete(m.y * world.width + m.x);
        if (m.explode) detonate(world, m, player, events);
        if (player.hp <= 0) {
          events.died = true;
          return;
        }
        continue;
      }
    }
    if (skipsTurn(m)) continue;
    if (m.lighteater) lightEaterTick(world, m, events);
    if (m.mirror) mirrorTick(m, player);
    if (m.phantom) phantomTick(world, m);
    const dist = Math.abs(px - m.x) + Math.abs(py - m.y);
    const sight = (m.sight || 5) + torchAggro;
    const sees = Math.max(Math.abs(px - m.x), Math.abs(py - m.y)) <= sight && hasLOS(world, m.x, m.y, px, py);
    if (m.shadow && !litCell(world, m.x, m.y)) {
      if (dist <= SHADOW_RANGE) {
        const spot = adjacentToPlayerFree(world, occupied);
        if (spot) {
          occupied.delete(m.y * world.width + m.x);
          m.x = spot.x;
          m.y = spot.y;
          occupied.add(m.y * world.width + m.x);
          m.chasing = true;
          if (events.log) events.log.push(`${m.name} shadow-steps out of the dark beside you!`);
        }
      }
      continue;
    }
    if (m.ambush && m.hidden) {
      if (dist <= 2) {
        m.hidden = false;
        m.chasing = true;
        if (events.log) events.log.push(`${m.name} springs from the wall!`);
      } else continue;
    }
    const adjacent = dist === 1;
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
    if (m.ranged) {
      if (sees && dist > 1 && (m._cd || 0) <= 0) {
        const dmg = Math.max(1, Math.round(m.atk * 0.7) - Number(player.def || 0));
        player.hp = Math.max(0, player.hp - dmg);
        events.damageTaken = (events.damageTaken || 0) + dmg;
        applyStatus(player, "poison", 3, 1);
        if (events.log) events.log.push(`${m.name} spits for ${dmg}.`);
        m._cd = RANGED_COOLDOWN;
        m.chasing = true;
        if (player.hp <= 0) {
          events.died = true;
          return;
        }
        continue;
      }
      if (m._cd > 0) m._cd -= 1;
    }
    if (m.summon && sees) {
      if ((m._cd || 0) <= 0 && world.monsters.filter((o) => o.alive).length < SUMMON_CAP) {
        const spot = adjacentFree(world, m, occupied);
        if (spot) {
          const minion = makeMinion(world);
          minion.faction = m.faction;
          minion.x = spot.x;
          minion.y = spot.y;
          minion.home = { x: spot.x, y: spot.y };
          world.monsters.push(minion);
          occupied.add(spot.y * world.width + spot.x);
          m._cd = SUMMON_COOLDOWN;
          m.chasing = true;
          if (events.log) events.log.push(`${m.name} forks a spawn.`);
          continue;
        }
      } else if (m._cd > 0) {
        m._cd -= 1;
      }
    }
    if (!sees && !m.chasing) {
      const rival = adjacentRival(world, m);
      if (rival) {
        rival.hp -= Math.max(1, Math.round(m.atk * 0.8));
        if (rival.hp <= 0) {
          rival.alive = false;
          occupied.delete(rival.y * world.width + rival.x);
          if (rival.explode) detonate(world, rival, { hp: null }, events);
        }
        continue;
      }
    }
    const target = sees ? (m.chasing = true, greedyStep(world, m, px, py, occupied)) : (m.chasing = false, patrolStep(world, m, occupied));
    if (target) {
      const fromX = m.x;
      const fromY = m.y;
      occupied.delete(m.y * world.width + m.x);
      m.x = target.x;
      m.y = target.y;
      if (target.dir) m.dir = target.dir;
      occupied.add(m.y * world.width + m.x);
      slideMonster(world, m, fromX, fromY, occupied, events);
    }
  }
}

// ../../docs/games/metagame/stages/stage2/traps.js
var TRAP_GLYPH = { dart: "˙", alarm: "¡", pit: "o", blink: "✶" };
var TRAP_CLASS = "s2-c-trap";
function trapPlan(floor) {
  if (floor <= 2) return { types: ["dart"], density: 0.25 };
  if (floor <= 4) return { types: ["dart", "alarm", "blink"], density: 0.5 };
  if (floor <= 6) return { types: ["dart", "alarm", "blink", "pit"], density: 0.8 };
  return { types: ["dart", "alarm", "pit", "blink"], density: 1.1 };
}
function placeTraps(rng, floor, roomN, takeCell) {
  const plan = trapPlan(floor);
  const count = Math.round(roomN * 0.35 * plan.density);
  const traps = [];
  for (let i = 0; i < count; i += 1) {
    const c = takeCell();
    if (!c) break;
    traps.push({ x: c.x, y: c.y, type: rng.pick(plan.types), sprung: false });
  }
  return traps;
}
function trapIndex(world) {
  const map = /* @__PURE__ */ new Map();
  if (Array.isArray(world.traps)) for (const t of world.traps) map.set(t.y * world.width + t.x, t);
  return (x, y) => map.get(y * world.width + x);
}
function blinkCell(world, rng, rad) {
  for (let t = 0; t < 50; t += 1) {
    const x = world.pos.x + rng.int(-rad, rad);
    const y = world.pos.y + rng.int(-rad, rad);
    if (isOpen(world, x, y) && !(world.hazardAt && world.hazardAt(x, y))) return { x, y };
  }
  return null;
}
function springTrap(world, player, trap, events) {
  trap.sprung = true;
  events.trap = trap.type;
  if (trap.type === "dart") {
    const dmg = 4 + world.floor;
    player.hp = Math.max(0, player.hp - dmg);
    events.damageTaken = (events.damageTaken || 0) + dmg;
    applyStatus(player, "bleed", 2, 1);
    events.log.push(`a dart trap! ${dmg} damage — bleeding.`);
    if (player.hp <= 0) events.died = true;
  } else if (trap.type === "alarm") {
    let woke = 0;
    for (const m of world.monsters) {
      if (m.alive && !m.ally && Math.abs(m.x - world.pos.x) + Math.abs(m.y - world.pos.y) <= 16) {
        m.chasing = true;
        if (m.ambush) {
          m.hidden = false;
        }
        woke += 1;
      }
    }
    events.log.push(`an alarm trap! ${woke} foes wake and converge.`);
  } else if (trap.type === "blink") {
    const rng = makeBlinkRng(world, trap);
    const spot = blinkCell(world, rng, 8);
    if (spot) {
      world.pos = { x: spot.x, y: spot.y };
      events.moved = true;
      events.blinked = true;
    }
    events.log.push("a blink rune! you're flung across the floor.");
  } else if (trap.type === "pit") {
    const dmg = 4 + world.floor;
    player.hp = Math.max(0, player.hp - dmg);
    events.damageTaken = (events.damageTaken || 0) + dmg;
    if (player.hp <= 0) {
      events.died = true;
      return;
    }
    events.descend = true;
    events.fell = true;
    events.log.push(`a hidden pit — ${dmg} fall damage — you drop a floor.`);
  }
}
function makeBlinkRng(world, trap) {
  let h = trap.x * 73856093 ^ trap.y * 19349663 ^ (world.stepCount || 0);
  return { int: (lo, hi) => {
    h = h * 1103515245 + 12345 & 2147483647;
    return lo + h % (hi - lo + 1);
  } };
}

// ../../docs/games/metagame/stages/stage2/affixes.js
var WEAPON_AFFIXES = ["vampiric", "cleave", "burning", "knockback", "double", "frost", "acid"];
var LABEL2 = { vampiric: "vampiric", cleave: "cleaving", burning: "burning", knockback: "knockback", double: "double-strike", frost: "frost", acid: "corroding" };
function rollAffix(rng, floor) {
  const chance = Math.min(0.6, 0.12 + floor * 0.05);
  return rng.float() < chance ? rng.pick(WEAPON_AFFIXES) : null;
}
function affixLabel(a) {
  return a ? LABEL2[a] || a : "";
}
function affixDamage(player) {
  const base = Math.max(1, player.atk);
  return player.affix === "double" ? base * 2 : base;
}
function applyHitAffix(world, player, foe, dmg, events) {
  const a = player.affix;
  if (!a) return;
  if (a === "vampiric") {
    player.hp = Math.min(player.maxHp, player.hp + Math.max(1, Math.round(dmg * 0.2)));
  } else if (a === "burning") {
    applyStatus(foe, "burn", 3, 2);
  } else if (a === "frost") {
    if (foe.hp > 0) applyStatus(foe, "frozen", 2, 1);
  } else if (a === "acid") {
    if (foe.hp > 0) applyStatus(foe, "corroded", 4, 1);
  } else if (a === "knockback" && foe.hp > 0) {
    const tx = foe.x + Math.sign(foe.x - world.pos.x);
    const ty = foe.y + Math.sign(foe.y - world.pos.y);
    if (world.grid[ty] && world.grid[ty][tx] === "." && !world.monsters.some((m) => m.alive && m.x === tx && m.y === ty)) {
      foe.x = tx;
      foe.y = ty;
    }
  } else if (a === "cleave") {
    for (const o of world.monsters) {
      if (!o.alive || o === foe || o.ally) continue;
      if (Math.abs(o.x - world.pos.x) + Math.abs(o.y - world.pos.y) === 1) {
        o.hp -= Math.max(1, Math.round(dmg * 0.5));
        if (o.hp <= 0) o.alive = false;
      }
    }
  }
}

// ../../docs/games/metagame/stages/stage2/elements.js
var ELEMENTS = {
  fire: { id: "fire", status: "burn", turns: 3, power: 2, glyph: "▴", cls: "s2-c-fire" },
  frost: { id: "frost", status: "frozen", turns: 4, power: 1, glyph: "❄", cls: "s2-c-frost" },
  acid: { id: "acid", status: "corroded", turns: 5, power: 1, glyph: "≀", cls: "s2-c-acid" },
  gas: { id: "gas", status: "poison", turns: 4, power: 1, glyph: "*", cls: "s2-c-spores" }
};
var BRITTLE_MULT = 1.4;
var SHATTER_BONUS = 0.6;
var BRITTLE_SHATTER_BONUS = 1;
function applyElement(ent, elementId) {
  const el = ELEMENTS[elementId];
  if (!el) return false;
  applyStatus(ent, el.status, el.turns, el.power);
  return true;
}
function has(ent, type) {
  return Boolean(ent && ent.statuses && ent.statuses[type] && ent.statuses[type].turns > 0);
}
function elementStrike(foe, dmg) {
  let total = dmg;
  let shattered = false;
  const corroded = has(foe, "corroded");
  if (corroded) total = Math.round(total * BRITTLE_MULT);
  if (has(foe, "frozen")) {
    const bonus = corroded ? BRITTLE_SHATTER_BONUS : SHATTER_BONUS;
    total += Math.round(dmg * bonus);
    delete foe.statuses.frozen;
    shattered = true;
  }
  return { total, shattered };
}
function gasExplosion(world, x, y, player, events, power) {
  power = power != null ? power : 3 + (world.floor || 1);
  for (const m of world.monsters) {
    if (m.alive && Math.abs(m.x - x) + Math.abs(m.y - y) <= 1) {
      m.hp -= power;
      if (m.hp <= 0) m.alive = false;
    }
  }
  if (player && typeof player.hp === "number" && Math.abs(world.pos.x - x) + Math.abs(world.pos.y - y) <= 1) {
    player.hp = Math.max(0, player.hp - power);
    if (events) {
      events.damageTaken = (events.damageTaken || 0) + power;
      if (events.log) events.log.push(`the spore cloud detonates for ${power}!`);
      if (player.hp <= 0) events.died = true;
    }
  }
  if (events) events.gasExplode = (events.gasExplode || 0) + 1;
}

// ../../docs/games/metagame/stages/stage2/fire.js
var FIRE_GLYPH = ELEMENTS.fire.glyph;
var FIRE_LIFE = 5;
var MAX_FIRES = 400;
function burnedSet(world) {
  world.burned = world.burned || [];
  return world.burned;
}
function igniteCell(world, x, y, life = FIRE_LIFE) {
  if (!world.grid[y] || world.grid[y][x] === "#") return;
  world.fires = world.fires || [];
  if (world.fires.length >= MAX_FIRES || world.fires.some((f) => f.x === x && f.y === y)) return;
  world.fires.push({ x, y, life });
  const idx = y * world.width + x;
  if (!burnedSet(world).includes(idx)) world.burned.push(idx);
}
function tickFire(world, player, events) {
  if (!world.fires || !world.fires.length) return;
  const burned = burnedSet(world);
  const dmg = 4 + world.floor;
  const next = [];
  const fresh = [];
  for (const f of world.fires) {
    const F = ELEMENTS.fire;
    if (world.pos.x === f.x && world.pos.y === f.y) {
      player.hp = Math.max(0, player.hp - dmg);
      events.damageTaken = (events.damageTaken || 0) + dmg;
      applyStatus(player, F.status, F.turns, F.power);
      if (player.hp <= 0) events.died = true;
    }
    for (const m of world.monsters) {
      if (m.alive && m.x === f.x && m.y === f.y) {
        m.hp -= dmg;
        applyStatus(m, F.status, F.turns, F.power);
        if (m.hp <= 0) m.alive = false;
      }
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = f.x + dx;
      const ny = f.y + dy;
      const idx = ny * world.width + nx;
      if (world.hazardAt && world.hazardAt(nx, ny) === "spores" && !burned.includes(idx) && !fresh.some((g) => g.x === nx && g.y === ny)) {
        fresh.push({ x: nx, y: ny, life: FIRE_LIFE });
        burned.push(idx);
        gasExplosion(world, nx, ny, player, events);
      }
    }
    f.life -= 1;
    if (f.life > 0) next.push(f);
  }
  world.fires = next.concat(fresh);
  if (Array.isArray(world.gasPockets) && world.gasPockets.length) {
    const active = world.fires.slice();
    for (const g of world.gasPockets) {
      if (g.blown) continue;
      if (active.some((f) => Math.abs(f.x - g.x) + Math.abs(f.y - g.y) === 1)) {
        g.blown = true;
        gasExplosion(world, g.x, g.y, player, events, 8 + world.floor);
        igniteCell(world, g.x, g.y);
        events.blast = { x: g.x, y: g.y };
        events.gasPocket = (events.gasPocket || 0) + 1;
      }
    }
  }
  events.fireActive = world.fires.length;
}

// ../../docs/games/metagame/stages/stage2/consumables.js
var CONSUMABLES = {
  blink: { glyph: "♦", name: "blink rune", desc: "teleport across the room (escape)" },
  firebolt: { glyph: "♦", name: "firebolt", desc: "scorch + burn the nearest foe in sight" },
  freeze: { glyph: "♦", name: "freeze rune", desc: "freeze every foe around you — then SHATTER them" },
  torch: { glyph: "†", name: "torch", desc: "light the dark for a while — but the glare draws foes" },
  acid: { glyph: ELEMENTS.acid.glyph, name: "acid flask", desc: "corrode nearby foes — they take amplified damage" }
};
var CONSUMABLE_KEYS = ["blink", "firebolt", "freeze", "torch", "acid"];
function placeConsumables(rng, floor, roomN, takeCell) {
  const count = Math.max(1, Math.round(roomN * 0.05) + Math.floor(floor / 2));
  const pool = ["blink", "firebolt", "freeze"];
  if (floor >= 4) pool.push("acid");
  if (floor >= 5) pool.push("torch");
  if (floor >= 7) pool.push("torch", "torch");
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const c = takeCell();
    if (!c) break;
    out.push({ x: c.x, y: c.y, type: rng.pick(pool), taken: false });
  }
  return out;
}
function nearbyOpen(world, rad) {
  let h = world.pos.x * 73856093 ^ world.pos.y * 19349663 ^ (world.stepCount || 0) * 83492791;
  for (let t = 0; t < 60; t += 1) {
    h = h * 1103515245 + 12345 & 2147483647;
    const dx = h % (rad * 2 + 1) - rad;
    h = h * 1103515245 + 12345 & 2147483647;
    const dy = h % (rad * 2 + 1) - rad;
    const x = world.pos.x + dx;
    const y = world.pos.y + dy;
    if ((dx || dy) && isOpen(world, x, y) && !(world.hazardAt && world.hazardAt(x, y))) return { x, y };
  }
  return null;
}
function nearestVisibleFoe(world, rad) {
  let best = null;
  let bd = Infinity;
  for (const m of world.monsters) {
    if (!m.alive || m.ally) continue;
    const d = Math.abs(m.x - world.pos.x) + Math.abs(m.y - world.pos.y);
    if (d <= rad && d < bd && hasLOS(world, world.pos.x, world.pos.y, m.x, m.y)) {
      bd = d;
      best = m;
    }
  }
  return best;
}
function useConsumable(world, player, type, events) {
  const inv = player.inventory || (player.inventory = {});
  if (!inv[type] || inv[type] <= 0) return false;
  if (type === "blink") {
    const spot = nearbyOpen(world, 7);
    if (!spot) {
      events.log.push("the blink rune finds nowhere to land.");
      return false;
    }
    world.pos = { x: spot.x, y: spot.y };
    events.moved = true;
    events.blinked = true;
    events.log.push("blink rune — you flicker across the floor.");
  } else if (type === "firebolt") {
    const foe = nearestVisibleFoe(world, 10);
    if (!foe) {
      events.log.push("firebolt fizzles — no target in sight.");
      return false;
    }
    const dmg = 12 + world.floor * 3;
    foe.hp -= dmg;
    applyStatus(foe, "burn", 4, 2);
    if (foe.hp <= 0) foe.alive = false;
    igniteCell(world, foe.x, foe.y);
    events.log.push(`firebolt scorches ${foe.name} for ${dmg}${foe.hp <= 0 ? " — unparsed" : ""}.`);
  } else if (type === "freeze") {
    let n = 0;
    for (const m of world.monsters) {
      if (m.alive && !m.ally && Math.abs(m.x - world.pos.x) + Math.abs(m.y - world.pos.y) <= 5) {
        applyStatus(m, "frozen", 4, 1);
        if (m.ambush) m.hidden = false;
        n += 1;
      }
    }
    let iced = 0;
    if (Array.isArray(world.hazards)) {
      for (const h of world.hazards) {
        if (h.type === "wet" && Math.abs(h.x - world.pos.x) + Math.abs(h.y - world.pos.y) <= 5) {
          h.type = "ice";
          iced += 1;
        }
      }
    }
    events.log.push(`freeze rune — ${n} foe${n === 1 ? "" : "s"} locked in place${iced ? `; ${iced} wet cell${iced === 1 ? "" : "s"} glazed to ice` : ""}.`);
  } else if (type === "acid") {
    let n = 0;
    for (const m of world.monsters) {
      if (m.alive && !m.ally && Math.abs(m.x - world.pos.x) + Math.abs(m.y - world.pos.y) <= 4) {
        applyElement(m, "acid");
        n += 1;
      }
    }
    if (!n) {
      events.log.push("the acid flask hisses on empty stone — no foe to corrode.");
      return false;
    }
    events.log.push(`acid flask — ${n} foe${n === 1 ? "" : "s"} corroded; their integrity strips away.`);
  } else if (type === "torch") {
    world.torch = Math.max(Number(world.torch) || 0, TORCH_STEPS + Number(player.torchSteps || 0));
    events.log.push("you strike a torch — the dark peels back, but something stirs toward the light.");
  } else {
    return false;
  }
  inv[type] -= 1;
  events.used = type;
  return true;
}

// ../../docs/games/metagame/stages/stage2/acts.js
var ACTS = [
  { id: 1, name: "The Warrens", from: 1, to: 3, verb: "combat" },
  { id: 2, name: "Cisterns & Emberworks", from: 4, to: 6, verb: "hazard" },
  { id: 3, name: "The Overflow", from: 7, to: 9, verb: "darkness" }
];
var ACT_CAP_FLOORS = ACTS.map((a) => a.to);
var FINAL_FLOOR = ACTS[ACTS.length - 1].to;
function actForFloor(floor) {
  return ACTS.find((a) => floor >= a.from && floor <= a.to) || ACTS[ACTS.length - 1];
}
function isGuardianFloor(floor) {
  return ACT_CAP_FLOORS.includes(floor);
}

// ../../docs/games/metagame/stages/stage2/floor.js
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
  const { grid, rooms, hidden, decor } = generate(rng, dims);
  return { grid, rooms, hidden, decor, dims, rng };
}
function defineGrid(world, grid) {
  Object.defineProperty(world, "grid", { value: grid, enumerable: false, writable: true, configurable: true });
}
function attachGrid(world, runSeed, floorNum) {
  const grid = buildGrid(runSeed, floorNum).grid;
  if (Array.isArray(world.hidden)) {
    for (const h of world.hidden) if (h.revealed) carveHiddenRoom(grid, h);
  }
  defineGrid(world, grid);
  defineHazards(world);
  return world;
}
function defineHazards(world) {
  Object.defineProperty(world, "hazardAt", { value: hazardIndex(world), enumerable: false, writable: true, configurable: true });
  Object.defineProperty(world, "trapAt", { value: trapIndex(world), enumerable: false, writable: true, configurable: true });
}
function buildFloor(runSeed, floorNum, mods = {}) {
  const { grid, rooms, hidden, decor, dims, rng } = buildGrid(runSeed, floorNum);
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
  let branchExit = null;
  if (makeRng(`${runSeed}:${floorNum}:branchroll`).float() < 0.5) {
    let bf = -1;
    for (let i = 0; i < flood.count; i += 1) {
      const idx = flood.order[i];
      const x = idx % width;
      const y = Math.floor(idx / width);
      const awayFromExit = Math.abs(x - exit.x) + Math.abs(y - exit.y) > 24;
      if (awayFromExit && flood.dist[idx] > bf) {
        bf = flood.dist[idx];
        branchExit = { x, y };
      }
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
      const onStair = x === start.x && y === start.y || x === exit.x && y === exit.y || branchExit && x === branchExit.x && y === branchExit.y;
      if (!onStair) return { x, y };
    }
    return null;
  };
  const roomN = rooms.length;
  const run = mods.run || {};
  const danger = mods.branch ? 1.4 : 1;
  const bounty = mods.branch ? 1.5 : 1;
  const monsterCount = Math.max(16, Math.min(700, Math.round(roomN * 2.4 * danger * (run.swarm ? 1.6 : 1))));
  const monsters = [];
  for (let i = 0; i < monsterCount; i += 1) {
    const c = take();
    if (!c) break;
    const m = spawnMonster(rng, floorNum, i);
    if (run.elite_storm && !m.elite && rng.float() < 0.3) {
      m.elite = true;
      m.hp = Math.round(m.hp * 1.5);
      m.maxHp = m.hp;
      m.atk = Math.round(m.atk * 1.2);
      m.drop += 2;
      m.name = `elite ${m.name}`;
    }
    m.x = c.x;
    m.y = c.y;
    m.home = { x: c.x, y: c.y };
    monsters.push(m);
  }
  const maxTier = Math.min(WEAPONS.length - 1, Math.floor(floorNum / 2) + 1);
  const weapons = [];
  const weaponCount = Math.max(2, Math.min(36, Math.round(roomN * 0.18 * bounty)));
  for (let i = 0; i < weaponCount; i += 1) {
    const wc = take();
    if (wc) weapons.push({ x: wc.x, y: wc.y, ...WEAPONS[rng.int(1, maxTier)], affix: rollAffix(rng, floorNum), taken: false });
  }
  const potions = [];
  const potionCount = run.no_potions ? 0 : Math.max(3, Math.min(30, Math.round(roomN * 0.22)));
  for (let i = 0; i < potionCount; i += 1) {
    const c = take();
    if (c) potions.push({ x: c.x, y: c.y, taken: false });
  }
  const glyphs = [];
  const glyphCount = Math.max(6, Math.min(90, Math.round(roomN * 0.3 * bounty)));
  for (let i = 0; i < glyphCount; i += 1) {
    const c = take();
    if (!c) break;
    glyphs.push({ x: c.x, y: c.y, taken: false });
  }
  for (const d of decor || []) {
    const idx = d.y * width + d.x;
    if (flood.dist[idx] < 0) continue;
    if (d.x === start.x && d.y === start.y || d.x === exit.x && d.y === exit.y) continue;
    if (d.kind === "weapon") weapons.push({ x: d.x, y: d.y, ...WEAPONS[rng.int(1, maxTier)], affix: rollAffix(rng, floorNum), taken: false });
    else if (d.kind === "potion" && !run.no_potions) potions.push({ x: d.x, y: d.y, taken: false });
    else if (d.kind === "glyph") glyphs.push({ x: d.x, y: d.y, taken: false });
  }
  if (isGuardianFloor(floorNum)) {
    const g = makeGuardian(rng, floorNum, monsters.length);
    const spot = adjacentOpen(grid, exit) || take();
    if (spot) {
      g.x = spot.x;
      g.y = spot.y;
      g.home = { x: spot.x, y: spot.y };
      monsters.push(g);
    }
  }
  const hazards = placeHazards(rng, floorNum, roomN, take);
  const traps = placeTraps(rng, floorNum, roomN, take);
  const consumables = placeConsumables(rng, floorNum, roomN, take);
  const gasPockets = [];
  if (floorNum >= 5) {
    const gasN = Math.min(8, 2 + Math.round(roomN * 0.08));
    for (let i = 0; i < gasN; i += 1) {
      const c = take();
      if (!c) break;
      gasPockets.push({ x: c.x, y: c.y, blown: false });
    }
  }
  const world = {
    floor: floorNum,
    width,
    height,
    seed: runSeed,
    pos: { ...start },
    exit,
    branchExit,
    branch: Boolean(mods.branch),
    monsters,
    weapons,
    potions,
    glyphs,
    hidden,
    hazards,
    traps,
    consumables,
    gasPockets,
    // D4 Lights Out: shave the light radius for the whole run (darkness.effectiveLight reads this).
    _lightsOutPenalty: run.lights_out ? 2 : 0
  };
  defineGrid(world, grid);
  defineHazards(world);
  return world;
}
function makeGuardian(rng, floor, idx) {
  const g = spawnMonster(rng, floor, idx);
  g.hp = Math.round(g.maxHp * 3);
  g.maxHp = g.hp;
  g.atk = Math.round(g.atk * 1.5);
  g.glyph = "Ω";
  g.guardian = true;
  g.elite = true;
  g.drop += 6;
  g.xp += 12;
  g.sight = 9;
  g.chasing = false;
  g.ranged = false;
  g.ambush = false;
  g.hidden = false;
  g.explode = false;
  g.venom = false;
  g.summon = false;
  g.split = false;
  g.lighteater = false;
  g.mirror = false;
  g.phantom = false;
  const verb = actForFloor(floor).verb;
  if (verb === "hazard") {
    g.explode = true;
    g.split = true;
    g.name = "ember guardian";
  } else if (verb === "darkness") {
    g.lighteater = true;
    g.phantom = true;
    g.name = "overflow guardian";
  } else {
    if (rng.pick(["summon", "split"]) === "summon") g.summon = true;
    else g.split = true;
    g.name = "warren guardian";
  }
  return g;
}
function adjacentOpen(grid, p) {
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const x = p.x + dx;
    const y = p.y + dy;
    if (grid[y] && grid[y][x] === ".") return { x, y };
  }
  return null;
}

// ../../docs/games/metagame/stages/stage2/engine.js
var ACID_ATK_PENALTY = 2;
function exitDistanceField(world) {
  return floodDistances(world.grid, world.exit);
}
function stepToExit(world, field) {
  const W = world.width;
  const here = field.dist[world.pos.y * W + world.pos.x];
  if (here === 0) return { dir: null, steps: 0 };
  let best = null;
  let bestD = Infinity;
  for (const dir of DIR_LIST) {
    const nx = world.pos.x + DIRS[dir].dx;
    const ny = world.pos.y + DIRS[dir].dy;
    if (ny < 0 || nx < 0 || ny >= world.grid.length || nx >= W || world.grid[ny][nx] === "#") continue;
    const d = field.dist[ny * W + nx];
    if (d >= 0 && d < bestD) {
      bestD = d;
      best = dir;
    }
  }
  return best ? { dir: best, steps: here > 0 ? here : bestD + 1 } : null;
}
function reconstructRoute(world, field) {
  const W = world.width;
  const route = [];
  let x = world.pos.x;
  let y = world.pos.y;
  let d = field.dist[y * W + x];
  if (d == null || d < 0) return route;
  route.push({ x, y });
  let guard = 0;
  while (d > 0 && guard++ < field.count) {
    let nx = x;
    let ny = y;
    let nd = d;
    for (const dir of DIR_LIST) {
      const cx = x + DIRS[dir].dx;
      const cy = y + DIRS[dir].dy;
      if (cy < 0 || cx < 0 || cy >= world.grid.length || cx >= W || world.grid[cy][cx] === "#") continue;
      const cd = field.dist[cy * W + cx];
      if (cd >= 0 && cd < nd) {
        nd = cd;
        nx = cx;
        ny = cy;
      }
    }
    if (nd >= d) break;
    x = nx;
    y = ny;
    d = nd;
    route.push({ x, y });
  }
  return route;
}
function spawnSplit(world, foe) {
  let made = 0;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (made >= 2) break;
    const x = foe.x + dx;
    const y = foe.y + dy;
    if (world.grid[y] && world.grid[y][x] === "." && !world.monsters.some((m) => m.alive && m.x === x && m.y === y)) {
      const hp = Math.max(6, Math.round(foe.maxHp * 0.4));
      world.monsters.push({
        id: "shard",
        glyph: "ω",
        name: `shard of ${foe.name}`,
        hp,
        maxHp: hp,
        atk: Math.max(2, Math.round(foe.atk * 0.6)),
        xp: 2,
        drop: 1,
        alive: true,
        x,
        y,
        home: { x, y },
        dir: "down",
        sight: 7,
        chasing: true,
        bucket: (made + 1) % 5,
        statuses: {},
        faction: foe.faction || 0
      });
      made += 1;
    }
  }
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
function dropElite(world, foe, events) {
  if (!foe.elite) return;
  const maxTier = Math.min(WEAPONS.length - 1, Math.floor(world.floor / 2) + 2);
  world.weapons.push({ x: foe.x, y: foe.y, ...WEAPONS[Math.max(1, maxTier)], affix: WEAPON_AFFIXES[world.floor % WEAPON_AFFIXES.length], taken: false });
  let dropped = 0;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (dropped >= 3) break;
    const x = foe.x + dx;
    const y = foe.y + dy;
    if (world.grid[y] && world.grid[y][x] === "." && !(x === world.pos.x && y === world.pos.y)) {
      world.glyphs.push({ x, y, taken: false });
      dropped += 1;
    }
  }
  events.log.push(`${foe.name} drops a cache!`);
}
function tickPlayerStatus(player) {
  const events = { log: [], damageTaken: 0, died: false };
  tickStatuses(player, events, true);
  return events;
}
function bite(foe, player, events) {
  const dmg = Math.max(1, foe.atk - Number(player.def || 0));
  player.hp = Math.max(0, player.hp - dmg);
  events.damageTaken += dmg;
  if (foe.venom) applyStatus(player, "poison", 3, 1);
  if (player.hp <= 0) events.died = true;
  return dmg;
}
function step(world, player, dir) {
  const move = DIRS[dir];
  const events = { moved: false, log: [], damageTaken: 0, killed: false, pickup: null, descend: false, died: false };
  if (!move) return events;
  let nx = world.pos.x + move.dx;
  let ny = world.pos.y + move.dy;
  if (ny < 0 || nx < 0 || ny >= world.grid.length || nx >= world.width) return events;
  if (world.grid[ny][nx] === "#") {
    const door = world.hidden && world.hidden.find((h) => !h.revealed && h.entrance.x === nx && h.entrance.y === ny);
    if (door) revealHidden(world, player, door, events);
    return events;
  }
  const foeIndex = world.monsters.findIndex((m) => m.alive && m.x === nx && m.y === ny);
  const foe = foeIndex >= 0 ? world.monsters[foeIndex] : null;
  if (foe) {
    events.attack = { x: nx, y: ny, foeIndex, killed: false };
    let raw = affixDamage(player);
    if (hasStatus(player, "corroded")) raw = Math.max(1, raw - Math.max(0, ACID_ATK_PENALTY - Number(player.acidResist || 0)));
    const strike = elementStrike(foe, raw);
    const dmg = strike.total;
    foe.hp -= dmg;
    if (strike.shattered) {
      events.shattered = true;
      events.log.push(`${foe.name} SHATTERS for ${dmg}!`);
    }
    applyHitAffix(world, player, foe, dmg, events);
    if (foe.hp <= 0) {
      foe.alive = false;
      events.killed = true;
      events.attack.killed = true;
      const got = gainGlyphs(player, foe.drop);
      events.log.push(`${foe.name} unparsed. +${got} glyph${got === 1 ? "" : "s"}.`);
      awardXp(player, foe.xp, events);
      dropElite(world, foe, events);
      if (foe.split) {
        spawnSplit(world, foe);
        events.log.push(`${foe.name} splits apart!`);
      }
      if (foe.explode) detonate(world, foe, player, events);
      if (player.hp <= 0) {
        events.died = true;
        return events;
      }
    } else {
      const dmg2 = bite(foe, player, events);
      events.log.push(`${foe.name} hits for ${dmg2}.`);
      if (foe.fast && player.hp > 0) {
        const d2 = bite(foe, player, events);
        events.log.push(`${foe.name} strikes again for ${d2}.`);
      }
    }
    return events;
  }
  world.pos = { x: nx, y: ny };
  events.moved = true;
  world.stepCount = (world.stepCount || 0) + 1;
  if (world.torch > 0) {
    world.torch -= 1;
    if (world.torch === 0) events.log.push("your torch gutters out. the dark closes in.");
  }
  ({ x: nx, y: ny } = playerIceSlide(world, nx, ny, move.dx, move.dy, events));
  world.pos = { x: nx, y: ny };
  const hz = world.hazardAt && world.hazardAt(nx, ny);
  const burntSpore = hz === "spores" && Array.isArray(world.burned) && world.burned.includes(ny * world.width + nx);
  if (hz && !burntSpore) {
    enterHazard(world, player, hz, events);
    if (events.died) return events;
    if (events.descend) return events;
  }
  const tr = world.trapAt && world.trapAt(nx, ny);
  if (tr && !tr.sprung) {
    springTrap(world, player, tr, events);
    if (events.died) return events;
    if (events.descend) return events;
  }
  const weapon = world.weapons.find((wp) => !wp.taken && wp.x === nx && wp.y === ny);
  if (weapon && weapon.atk > 0) {
    weapon.taken = true;
    player.atk += weapon.atk;
    player.affix = weapon.affix || null;
    player.equipment = { ...player.equipment || {}, weapon: weapon.name };
    events.pickup = "weapon";
    events.log.push(`found ${weapon.name.replace(/_/g, " ")}${weapon.affix ? ` (${affixLabel(weapon.affix)})` : ""}. +${weapon.atk} ATK.`);
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
  const item = world.consumables && world.consumables.find((c) => !c.taken && c.x === nx && c.y === ny);
  if (item) {
    item.taken = true;
    const inv = player.inventory || (player.inventory = {});
    inv[item.type] = Number(inv[item.type] || 0) + 1;
    events.pickup = events.pickup || "consumable";
    events.rune = item.type;
    events.log.push(`picked up a ${item.type} rune.`);
  }
  if (nx === world.exit.x && ny === world.exit.y) events.descend = true;
  if (world.branchExit && nx === world.branchExit.x && ny === world.branchExit.y) {
    events.descend = true;
    events.branch = true;
  }
  return events;
}
function revealHidden(world, player, h, events) {
  h.revealed = true;
  carveHiddenRoom(world.grid, h);
  const rng = makeRng(`${world.seed}:reveal:${h.entrance.x},${h.entrance.y}`);
  const open = [];
  for (let y = h.y; y < h.y + h.h; y += 1) for (let x = h.x; x < h.x + h.w; x += 1) if (world.grid[y] && world.grid[y][x] === ".") open.push({ x, y });
  const cells = rng.shuffle(open);
  let ci = 0;
  const take = () => ci < cells.length ? cells[ci++] : { x: h.entrance.x, y: h.entrance.y };
  events.reveal = h.type;
  if (h.type === "treasure") {
    for (let i = 0; i < 3; i += 1) {
      const c = take();
      world.potions.push({ x: c.x, y: c.y, taken: false });
    }
    const ng = rng.int(3, 7);
    for (let i = 0; i < ng; i += 1) {
      const c = take();
      world.glyphs.push({ x: c.x, y: c.y, taken: false });
    }
    const nw = rng.int(2, 5);
    const maxTier = Math.min(WEAPONS.length - 1, Math.floor(world.floor / 2) + 1);
    for (let i = 0; i < nw; i += 1) {
      const c = take();
      world.weapons.push({ x: c.x, y: c.y, ...WEAPONS[rng.int(1, maxTier)], affix: rollAffix(rng, world.floor), taken: false });
    }
    events.log.push("hidden cache! potions, glyphs and weapons spill out.");
  } else if (h.type === "trap") {
    const n = rng.int(3, 5);
    for (let i = 0; i < n; i += 1) {
      const c = take();
      const m = spawnMonster(rng, world.floor, world.monsters.length + i);
      m.x = c.x;
      m.y = c.y;
      m.home = { x: c.x, y: c.y };
      m.chasing = true;
      world.monsters.push(m);
    }
    events.log.push(`ambush! ${n} foes pour out of the dark.`);
  } else if (h.type === "teleport") {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0]]) {
      const tx = world.exit.x + dx;
      const ty = world.exit.y + dy;
      if (world.grid[ty] && world.grid[ty][tx] === ".") {
        world.pos = { x: tx, y: ty };
        break;
      }
    }
    events.moved = true;
    events.log.push("a teleport sigil! flung straight to the stairwell.");
  } else if (h.type === "shrine") {
    const cost = Math.min(Math.max(0, player.hp - 1), Math.max(5, Math.round(player.maxHp * 0.15)));
    player.hp = Math.max(1, player.hp - cost);
    const boon = rng.pick(["atk", "def", "maxhp"]);
    if (boon === "atk") {
      player.atk += 2;
      events.log.push(`a shrine — you bleed ${cost} HP for +2 ATK.`);
    } else if (boon === "def") {
      player.def = Number(player.def || 0) + 1;
      events.log.push(`a shrine — you bleed ${cost} HP for +1 DEF.`);
    } else {
      player.maxHp += 8;
      events.log.push(`a shrine — you bleed ${cost} HP for +8 max HP.`);
    }
  } else if (h.type === "vault") {
    const cx = h.x + (h.w >> 1);
    const cy = h.y + (h.h >> 1);
    world.weapons.push({ x: cx, y: cy, ...WEAPONS[WEAPONS.length - 1], affix: rng.pick(WEAPON_AFFIXES), taken: false });
    const guards = rng.int(2, 3);
    for (let i = 0; i < guards; i += 1) {
      const c = take();
      const m = spawnMonster(rng, world.floor, world.monsters.length + i);
      m.x = c.x;
      m.y = c.y;
      m.home = { x: c.x, y: c.y };
      m.chasing = true;
      m.elite = true;
      m.hp = Math.round(m.hp * 1.5);
      m.maxHp = m.hp;
      m.atk = Math.round(m.atk * 1.2);
      m.name = `vault guard`;
      m.drop += 2;
      world.monsters.push(m);
    }
    events.log.push(`a vault! a prime weapon — but ${guards} elite guards stir.`);
  } else if (h.type === "captive") {
    const c = take();
    const ally = spawnMonster(rng, world.floor, world.monsters.length);
    ally.x = c.x;
    ally.y = c.y;
    ally.home = { x: c.x, y: c.y };
    ally.ally = true;
    ally.chasing = false;
    ally.ranged = false;
    ally.summon = false;
    ally.explode = false;
    ally.ambush = false;
    ally.hidden = false;
    ally.elite = false;
    ally.venom = false;
    ally.hp = Math.round(ally.hp * 1.6);
    ally.maxHp = ally.hp;
    ally.name = "freed process";
    world.monsters.push(ally);
    events.log.push("a captive process — freed, it fights at your side.");
  }
}

// ../../docs/games/metagame/stages/stage2/biome.js
var BIOMES = [
  { id: "warrens", name: "The Warrens", maxFloor: 3 },
  { id: "cisterns", name: "Flooded Cisterns", maxFloor: 5 },
  { id: "emberworks", name: "Emberworks", maxFloor: 6 },
  { id: "overflow", name: "The Overflow", maxFloor: Infinity }
];
function biomeForFloor(floor) {
  return BIOMES.find((b) => floor <= b.maxFloor) || BIOMES[BIOMES.length - 1];
}

// ../../docs/games/metagame/stages/stage2/shop.js
function buildShopPanel({ state, save, onClose }) {
  const box = document.createElement("div");
  box.className = "s2-shop";
  let tab = "buy";
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
  function modHtml(mod) {
    const on = Boolean((state.meta.runMods || {})[mod.id]);
    return `<div class="s2-shop-row">
      <div class="s2-shop-info">
        <strong>${mod.name}</strong> <span class="s2-shop-lv">+${Math.round((mod.heatBonus || HEAT_PER_MOD) * 100)}% glyphs</span>
        <div class="s2-shop-desc">${mod.desc}</div>
      </div>
      <button type="button" data-mod="${mod.id}" class="${on ? "s2-mod-on" : ""}">${on ? "ON" : "off"}</button>
    </div>`;
  }
  function paint() {
    const banked = Number(state.meta.glyphsBanked || 0);
    const heat = runHeat(state.meta.runMods || {});
    const onBuy = tab === "buy";
    const headExtra = onBuy ? `<span class="s2-shop-bank"><span class="s2-c-glyph">${banked}</span> banked</span>` : `<span class="s2-shop-bank">×${heat.toFixed(2)} glyphs</span>`;
    const note = onBuy ? "applies when your next run begins (after death / retreat). only banked glyphs spend." : "tougher runs bank more glyphs. takes effect next run.";
    const mods = RUN_MODS.filter((m) => !m.unlock || m.unlock(state.meta));
    const list = onBuy ? SHOP_UPGRADES.map(rowHtml).join("") : mods.map(modHtml).join("");
    box.innerHTML = `
      <div class="s2-shop-head">GLYPH SHOP
        ${headExtra}
        <button type="button" data-shop="close" class="s2-shop-x" aria-label="close shop">&#10005;</button>
      </div>
      <div class="s2-shop-tabs" role="tablist">
        <button type="button" data-tab="buy" class="s2-shop-tab${onBuy ? " s2-tab-on" : ""}" role="tab" aria-selected="${onBuy}">Buy</button>
        <button type="button" data-tab="heat" class="s2-shop-tab${onBuy ? "" : " s2-tab-on"}" role="tab" aria-selected="${!onBuy}">Heat</button>
      </div>
      <div class="s2-shop-note">${note}</div>
      <div class="s2-shop-list">${list}</div>`;
    box.querySelectorAll("[data-buy]").forEach((b) => b.addEventListener("click", () => buy(b.dataset.buy)));
    box.querySelectorAll("[data-mod]").forEach((b) => b.addEventListener("click", () => toggleMod(b.dataset.mod)));
    box.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => {
      tab = b.dataset.tab;
      paint();
    }));
    box.querySelector('[data-shop="close"]').addEventListener("click", () => onClose());
  }
  function toggleMod(id) {
    const meta = state.meta;
    meta.runMods = meta.runMods || {};
    meta.runMods[id] = !meta.runMods[id];
    if (typeof save === "function") save();
    paint();
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
  ["Goal", "Descend 9 floors across three acts — the Warrens, the Cisterns &amp; Emberworks, then the Overflow — and beat THE AMBIGUOUS EXPRESSION at the bottom. Each act ends with a Ω guardian on the stairs."],
  ["Move", "Arrow keys, WASD, or the on-screen d-pad. One tile per press."],
  ["Fight", "Walk into a foe to attack (your ATK vs its HP). It hits back — watch your HP. Fast foes (race conditions) strike twice."],
  ["Foes", "s m n are light, L O heavy. Deeper floors add behaviours: y spitters shoot from afar, x segfaults blast on death, a ambushers hide as walls, u fork bombs spawn minions."],
  ["Overflow foes", "Act III adds four dark-dwellers: e light eater — feeds on darkness and grows; torchlight starves it. M mirror — copies most of YOUR attack power back at you; don't out-gear yourself into a beating. ψ null phantom — fast and leaves NO ghost trail, but a lit torch pins (slows) it. v void ref — invisible while it lurks in the dark; drift too close and it SHADOW-STEPS to a cell beside you, then bites. A lit torch reveals every void ref in range AND freezes its step, so light is your only warning."],
  ["Elites", "Gilded, glowing foes (a prefix like armored/venomous) hit harder but drop a guaranteed weapon + glyph cache. Worth the risk."],
  ["Guardian", "Each act caps in a pink Ω guardian by the stairs — huge HP and a trick that escalates with the act: it forks/splits (Act I), explodes &amp; splits (Act II), or feeds on the dark &amp; leaves no ghost (Act III). Beat it to pass."],
  ["Factions", "Foes come in two rival camps (red vs orange). When they're not chasing you they fight each other — lead a pack past a rival and let them thin each other out."],
  ["Status", "Poison ☣ / burn ♨ / bleed ✣ tick HP over time even while you stand still — keep moving and heal. ❄ frozen/slowed and ✦ stunned keep a foe from acting."],
  ["Hazards", "≈ lava burns, * spores poison, ^ spikes bleed — step around them. A : chasm drops you straight to the next floor (a risky shortcut). From floor 5, ≀ acid pools corrode your cursor (ATK drops until it clears) — but foes refuse to step in acid, so a pool is a funnel: bait a pack around it. In the Overflow, ○ void rifts snuff your torch and leave you reeling in the dark."],
  ["Wych-gas (Emberworks)", 'Deep fire floors hang " wych-gas pockets from the ceiling — always visible, harmless on their own. But when spreading flame touches one it DETONATES straight down in a blast. Read the gas before you light a firebolt, or herd a foe beneath a pocket and ignite a spore trail to reach it.'],
  ["Ice (Cisterns)", "The flooded Cisterns (floors 4-6) are dotted with ~ wet cells. A freeze rune glazes nearby wet cells into ice. Anything that steps on ice SLIDES one more cell in its heading — slide a chasing foe into a : chasm for an instant kill, or into a wall to stun it. You slide too, so memorise the ice."],
  ["Traps", "Invisible until you trip them: dart (damage), alarm (wakes the floor), blink (flings you), pit (drops you a floor). Once sprung they're marked — denser deeper."],
  ["Loot", "Step on / weapons to raise ATK and % glyph shards to earn glyphs. Kills drop glyphs and XP (level up = more HP & ATK)."],
  ["Affixes", "Some weapons carry an on-hit affix — vampiric (lifesteal), cleaving (hit adjacent foes), burning, knockback, double-strike, frost or acid. The one you pick up last is active; deeper weapons roll affixes more often."],
  ["Secret rooms", "Bump a faint, off-colour wall to open a hidden room: a cache, an ambush, a teleport to the stairs, a shrine (trade HP for a buff), a vault (prime loot, elite guards) or a captive ally that fights for you."],
  ["Biomes", "Floors are grouped into bands — Warrens, Flooded Cisterns, Emberworks, the Overflow — each with its own look and rising danger."],
  ["Darkness", "From the Overflow act (floor 7+) your sight collapses to a tight ring around @. Foes beyond it are hidden — but a dim ? ghost marks the last tile you saw each one on, so spatial memory is the skill. Light a † torch to flood a wide ring."],
  ["Torches", "† torches are the Overflow's key tool (found from floor 5, common from floor 7). A lit torch widens your sight for a stretch of steps — but its glare draws foes from much farther, so light is a tradeoff, not a freebie. Save some for the boss approach; a void rift will snuff one instantly."],
  ["Stairs", "Reach the > stairs to descend. Deeper = harder, better loot. A purple ≣ branch stair (some floors) drops you to a deadlier but much richer floor — your call."],
  ["Runs", "Dying or 'retreat' banks the run's glyphs and draws a fresh dungeon. Banked glyphs are permanent."],
  ["Runes", "♦ runes are one-shot tools: pick them up, then press 1-5 (or the buttons). 1 blink (escape), 2 firebolt (scorch the nearest foe), 3 freeze (lock foes around you + glaze wet cells to ice), 4 † torch (light the dark), 5 acid flask (corrode foes so your next hit lands amplified)."],
  ["Combos", "Systems chain: firebolt a * spore field to roast a pack; freeze then SHATTER a frozen foe (or acid-corrode first for an even bigger crack); freeze a wet cell into ice and slide a chaser into a chasm."],
  ["Fire", "A firebolt lights its target's tile, and flames spread through * spore fields — chain a firebolt into a spore cluster to roast a whole pack (but mind your own footing)."],
  ["Shop", "Spend banked glyphs on permanent upgrades — they apply on your next run."],
  ["Heat", "In the shop you can toggle opt-in difficulty modifiers (more monsters, no potions, elite storm). Each active one multiplies the glyphs you bank — risk for reward. Once you've reached the Overflow, a mastery modifier unlocks: Lights Out shrinks your light radius for the whole run for the biggest multiplier of all."],
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

// ../../docs/games/metagame/stages/stage2/rune-pickup.js
function buildRunePickupPanel({ type, onClose }) {
  const def = CONSUMABLES[type];
  const slot = CONSUMABLE_KEYS.indexOf(type) + 1;
  const box = document.createElement("div");
  box.className = "s2-rune";
  box.innerHTML = `
    <div class="s2-rune-head">RUNE FOUND
      <button type="button" data-rune="close" class="s2-rune-x" aria-label="close rune card">&#10005;</button>
    </div>
    <div class="s2-rune-body">
      <span class="s2-rune-glyph">${def ? def.glyph : "♦"}</span>
      <div class="s2-rune-info">
        <div class="s2-rune-name">${def ? def.name : `${type} rune`}</div>
        <p class="s2-rune-desc">${def ? def.desc : ""}</p>
        <p class="s2-rune-key">banked to your pack${slot > 0 ? ` — press [${slot}] or its button to use` : ""}.</p>
      </div>
    </div>`;
  box.querySelector('[data-rune="close"]').addEventListener("click", () => onClose());
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
var HAZ_BASE = {
  lava: [120, 52, 20],
  spores: [52, 82, 35],
  spikes: [78, 84, 92],
  chasm: [42, 54, 96],
  rift: [40, 28, 60],
  acid: [70, 92, 40],
  wet: [34, 70, 92],
  ice: [120, 158, 184]
};
var clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function lit(world, x, y) {
  const L = effectiveLight(world);
  return !L || Math.abs(x - world.pos.x) <= L.rx && Math.abs(y - world.pos.y) <= L.ry;
}
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
  const trail = document.createElement("div");
  trail.className = "s2-trail";
  trail.setAttribute("aria-hidden", "true");
  const sprites = document.createElement("div");
  sprites.className = "s2-sprites";
  sprites.setAttribute("aria-hidden", "true");
  const flash = document.createElement("div");
  flash.className = "s2-flash";
  flash.setAttribute("aria-hidden", "true");
  const ruler = document.createElement("pre");
  ruler.className = "s2-grid s2-ruler";
  ruler.textContent = "MMMMMMMMMM\nMMMMMMMMMM";
  screenEl.replaceChildren(map, trail, sprites, flash, ruler);
  let chW = 8.4;
  let chH = 17.5;
  const cam = { x: 0, y: 0 };
  const playerEl = makeSprite("@", "s2-c-player");
  sprites.append(playerEl);
  const mobEls = /* @__PURE__ */ new Map();
  const itemEls = /* @__PURE__ */ new Map();
  const trailEls = /* @__PURE__ */ new Map();
  let trailFn = null;
  const ghostMem = /* @__PURE__ */ new Map();
  const ghostEls = /* @__PURE__ */ new Map();
  let lastFloor = null;
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
    itemEls.clear();
    ghostEls.clear();
    ghostMem.clear();
    clearTrail();
    map.innerHTML = colorize(lines);
  }
  function paintExplore(world) {
    lastWorld = world;
    if (world.floor !== lastFloor) {
      lastFloor = world.floor;
      clearGhosts();
    }
    sprites.append(playerEl);
    cam.x = clamp(world.pos.x - (VIEW_W >> 1), 0, Math.max(0, world.width - VIEW_W));
    cam.y = clamp(world.pos.y - (VIEW_H >> 1), 0, Math.max(0, world.grid.length - VIEW_H));
    map.textContent = terrainText(world);
    reconcileTrail(world);
    reconcileItems(world);
    reconcileSprites(world);
  }
  function reconcileTrail(world) {
    const route = trailFn ? trailFn(world) : null;
    const live = /* @__PURE__ */ new Set();
    if (route) for (const c of route) {
      if (!inView(c.x, c.y) || c.x === world.pos.x && c.y === world.pos.y) continue;
      const id = c.x + "," + c.y;
      live.add(id);
      let el = trailEls.get(id);
      if (!el) {
        el = document.createElement("span");
        el.className = "s2-trail-cell";
        el.textContent = "·";
        trailEls.set(id, el);
        trail.append(el);
      }
      pos(el, c.x, c.y);
    }
    for (const id of [...trailEls.keys()]) if (!live.has(id)) {
      trailEls.get(id).remove();
      trailEls.delete(id);
    }
  }
  function clearTrail() {
    for (const el of trailEls.values()) el.remove();
    trailEls.clear();
  }
  function terrainText(world) {
    const L = effectiveLight(world);
    const px = world.pos.x;
    const py = world.pos.y;
    const rows = [];
    for (let vy = 0; vy < VIEW_H; vy += 1) {
      const gy = cam.y + vy;
      let line = "";
      for (let vx = 0; vx < VIEW_W; vx += 1) {
        const gx = cam.x + vx;
        const dark = L && (Math.abs(gx - px) > L.rx || Math.abs(gy - py) > L.ry);
        line += dark || gy < 0 || gx < 0 || gy >= world.grid.length || gx >= world.width ? " " : world.grid[gy][gx];
      }
      rows.push(line);
    }
    return rows.join("\n");
  }
  function reconcileItems(world) {
    const live = /* @__PURE__ */ new Set();
    const place = (id, x, y, ch, cls) => {
      if (!inView(x, y) || !lit(world, x, y)) return;
      live.add(id);
      let el = itemEls.get(id);
      if (!el) {
        el = makeSprite(ch, cls);
        itemEls.set(id, el);
        sprites.append(el);
      }
      pos(el, x, y);
    };
    place("exit", world.exit.x, world.exit.y, ">", "s2-c-exit");
    if (world.branchExit) place("branch", world.branchExit.x, world.branchExit.y, "≣", "s2-c-branch");
    if (world.hazards) world.hazards.forEach((hz, i) => place("hz" + i, hz.x, hz.y, HAZARD_GLYPH[hz.type] || "^", HAZARD_CLASS[hz.type] || "s2-c-spikes"));
    if (world.traps) world.traps.forEach((tr, i) => {
      if (tr.sprung) place("tr" + i, tr.x, tr.y, TRAP_GLYPH[tr.type] || "˙", TRAP_CLASS);
    });
    world.weapons.forEach((w, i) => {
      if (!w.taken) place("w" + i, w.x, w.y, "/", "s2-c-item");
    });
    world.glyphs.forEach((g, i) => {
      if (!g.taken) place("g" + i, g.x, g.y, "%", "s2-c-glyph");
    });
    if (world.potions) world.potions.forEach((p, i) => {
      if (!p.taken) place("p" + i, p.x, p.y, "!", "s2-c-potion");
    });
    if (world.consumables) world.consumables.forEach((c, i) => {
      if (!c.taken) place("c" + i, c.x, c.y, (CONSUMABLES[c.type] || {}).glyph || "♦", "s2-c-consum");
    });
    if (world.fires) world.fires.forEach((f, i) => place("fire" + i, f.x, f.y, FIRE_GLYPH, "s2-c-fire"));
    if (world.gasPockets) world.gasPockets.forEach((g, i) => {
      const id = "gas" + i;
      if (g.blown || !inView(g.x, g.y)) return;
      live.add(id);
      let el = itemEls.get(id);
      if (!el) {
        el = makeSprite('"', "s2-c-gas");
        itemEls.set(id, el);
        sprites.append(el);
      }
      pos(el, g.x, g.y);
    });
    if (world.hidden) world.hidden.forEach((h, i) => {
      if (!h.revealed) place("h" + i, h.entrance.x, h.entrance.y, "#", "s2-c-secret");
    });
    for (const id of [...itemEls.keys()]) if (!live.has(id)) {
      itemEls.get(id).remove();
      itemEls.delete(id);
    }
  }
  function reconcileSprites(world, mobMs) {
    pos(playerEl, world.pos.x, world.pos.y);
    const dark = isDarkAct(world.floor);
    const live = /* @__PURE__ */ new Set();
    world.monsters.forEach((m, i) => {
      if (!m.alive) {
        dropMob(i);
        dropGhost(i);
        ghostMem.delete(i);
        return;
      }
      if (!inView(m.x, m.y) || !lit(world, m.x, m.y)) {
        dropMob(i);
        if (dark && ghostMem.has(i)) showGhost(i);
        else dropGhost(i);
        return;
      }
      dropGhost(i);
      live.add(i);
      let s = mobEls.get(i);
      let fresh = false;
      if (!s) {
        s = makeMob(m);
        mobEls.set(i, s);
        sprites.append(s.el);
        fresh = true;
      }
      const disguised = m.ambush && m.hidden;
      const glyph = disguised ? "#" : m.glyph;
      if (s.glyph.textContent !== glyph) s.glyph.textContent = glyph;
      const baseFoe = m.faction === 1 ? "s2-c-foe-b" : "s2-c-foe";
      const color = disguised ? "s2-c-ambush" : m.ally ? "s2-c-ally" : m.guardian ? "s2-c-guardian" : m.elite ? "s2-c-elite" : HEAVY_FOES.has(m.glyph) ? "s2-c-foe2" : baseFoe;
      const dot = !disguised && m.statuses && (m.statuses.burn || m.statuses.poison || m.statuses.bleed) ? " s2-foe-dot" : "";
      const cls = "s2-sprite " + color + dot;
      if (s.el.className !== cls) s.el.className = cls;
      if (!disguised && m.hp < m.maxHp) {
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
      if (dark && !m.phantom && !m.shadow) ghostMem.set(i, { x: m.x, y: m.y, glyph });
    });
    for (const i of [...mobEls.keys()]) if (!live.has(i)) dropMob(i);
  }
  function showGhost(i) {
    const mem = ghostMem.get(i);
    if (!mem || !inView(mem.x, mem.y)) {
      dropGhost(i);
      return;
    }
    let el = ghostEls.get(i);
    if (!el) {
      el = makeSprite(mem.glyph, "s2-c-foe");
      el.classList.add("s2-ghost");
      el.style.opacity = "0.3";
      el.style.filter = "grayscale(0.7)";
      ghostEls.set(i, el);
      sprites.append(el);
    }
    if (el.textContent !== mem.glyph) el.textContent = mem.glyph;
    pos(el, mem.x, mem.y);
  }
  function dropGhost(i) {
    const el = ghostEls.get(i);
    if (el) {
      el.remove();
      ghostEls.delete(i);
    }
  }
  function clearGhosts() {
    for (const el of ghostEls.values()) el.remove();
    ghostEls.clear();
    ghostMem.clear();
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
    const hazAt = /* @__PURE__ */ new Map();
    if (world.hazards) for (const hz of world.hazards) hazAt.set(hz.y * W + hz.x, hz.type);
    for (let y = 0; y < H; y += 1) {
      const row = world.grid[y];
      for (let x = 0; x < W; x += 1) {
        const i = (y * W + x) * 4;
        d[i + 3] = 255;
        if (row[x] === "#") {
          d[i] = 18;
          d[i + 1] = 14;
          d[i + 2] = 10;
          continue;
        }
        const c = HAZ_BASE[hazAt.get(y * W + x)];
        if (c) {
          d[i] = c[0];
          d[i + 1] = c[1];
          d[i + 2] = c[2];
        } else {
          d[i] = 60;
          d[i + 1] = 46;
          d[i + 2] = 28;
        }
      }
    }
    octx.putImageData(img, 0, 0);
    ctx.drawImage(off, 0, 0, W, H, 0, 0, dispW, dispH);
    if (world.hidden) for (const h of world.hidden) {
      ctx.fillStyle = h.revealed ? "rgba(110,255,166,0.30)" : "rgba(216,139,255,0.55)";
      ctx.fillRect(Math.round(h.x * scale), Math.round(h.y * scale), Math.max(2, Math.round(h.w * scale)), Math.max(2, Math.round(h.h * scale)));
    }
    const dot = (x, y, color, sz) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x * scale) - (sz >> 1), Math.round(y * scale) - (sz >> 1), sz, sz);
    };
    if (world.hidden) {
      for (const h of world.hidden) if (!h.revealed) dot(h.entrance.x, h.entrance.y, "#ff36c0", 4);
    }
    const HAZ_DOT = { lava: "#ff5a1e", spores: "#7dd44a", spikes: "#9aa4ad", chasm: "#6a7bb0", rift: "#3a2a55", acid: "#9ee04a", wet: "#3f8fb8", ice: "#b8ecff" };
    if (world.hazards) for (const hz of world.hazards) dot(hz.x, hz.y, HAZ_DOT[hz.type] || "#888", 2);
    if (world.fires) for (const f of world.fires) dot(f.x, f.y, "#ff7a1e", 2);
    if (world.gasPockets) {
      for (const g of world.gasPockets) if (!g.blown) dot(g.x, g.y, "#ffd24a", 2);
    }
    if (world.traps) for (const tr of world.traps) dot(tr.x, tr.y, tr.sprung ? "#c0563a" : "#7a3a2a", 2);
    for (const w of world.weapons) if (!w.taken) dot(w.x, w.y, "#ffd54a", 3);
    if (world.potions) {
      for (const p of world.potions) if (!p.taken) dot(p.x, p.y, "#6effa6", 3);
    }
    if (world.consumables) {
      for (const c of world.consumables) if (!c.taken) dot(c.x, c.y, "#ff7bf0", 3);
    }
    for (const g of world.glyphs) if (!g.taken) dot(g.x, g.y, "#d78bff", 3);
    dot(world.exit.x, world.exit.y, "#7fe07f", 4);
    if (world.branchExit) dot(world.branchExit.x, world.branchExit.y, "#c98bff", 4);
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
  function setTrailProvider(fn) {
    trailFn = fn;
  }
  return { mapEl: map, flashEl: flash, screenEl, paintExplore, paintArena, applyMove, tickMonsters, toggleFullMap, setTrailProvider, measure, destroy };
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
import { hiddenTab } from "../../shared/frame-loop.js";

// ../../docs/games/metagame/stages/stage2/runloop.js
var MAX_FLOOR = FINAL_FLOOR;
function runMods(state) {
  return state.meta && state.meta.runMods || {};
}
function ensureWorld(state) {
  const run = state.run;
  if (!run.seed) run.seed = `s2-run${state.meta.runCount || 0}`;
  if (!run.world || run.world.floor !== run.floor || !Array.isArray(run.world.monsters)) {
    run.world = buildFloor(run.seed, run.floor, { run: runMods(state) });
  } else if (!run.world.grid) {
    attachGrid(run.world, run.seed, run.world.floor);
  }
}
function descend(state, opts = {}) {
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
  run.world = buildFloor(run.seed, run.floor, { branch: Boolean(opts.branch), run: runMods(state) });
  if (opts.branch) appendLog(state, `you take the branching stair — a deadlier, richer floor ${run.floor}.`);
  else appendLog(state, `floor ${run.floor - 1} parsed. descending. +3 glyphs.`);
}
function resetRun(state, { banked, death }) {
  const run = state.run;
  if (banked) {
    const earned = Math.round(Number(run.entity.glyphsThisRun || 0) * runHeat(runMods(state)));
    state.meta.glyphsBanked = Number(state.meta.glyphsBanked || 0) + earned;
  }
  if (death) state.meta.deaths = Number(state.meta.deaths || 0) + 1;
  state.meta.runCount = Number(state.meta.runCount || 0) + 1;
  run.seed = `s2-run${state.meta.runCount}`;
  run.entity = rollEntity(state.meta.shopUpgrades);
  run.floor = 1;
  run.active = false;
  run.boss.reached = false;
  run.world = buildFloor(run.seed, 1, { run: runMods(state) });
}
var DIR_ARROW = { up: "↑", down: "↓", left: "←", right: "→" };
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

// ../../docs/games/metagame/stages/stage2/renderer.js
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
      <div class="s2-status" data-field="status" hidden></div>
    </header>
    <div class="s2-objective" data-field="objective"></div>
    <div class="s2-play">
      <div class="s2-stage">
        <div class="s2-screen"></div>
        <div class="s2-legend">
          <div class="s2-legend-row">
            <span class="s2-c-player">@</span> you
            <span class="s2-c-foe">s</span> foe
            <span class="s2-c-item">/</span> weapon
            <span class="s2-c-potion">!</span> potion
          </div>
          <div class="s2-legend-row">
            <span class="s2-c-glyph">%</span> glyph
            <span class="s2-c-consum">♦</span> rune
            <span class="s2-c-exit">&gt;</span> stairs
            <span class="s2-c-consum">†</span> torch
          </div>
          <div class="s2-legend-row">
            <span class="s2-c-lava">≈</span> lava
            <span class="s2-c-spikes">^</span> spikes
            <span class="s2-c-chasm">:</span> chasm
            <span class="s2-c-ice">~</span> water/ice
          </div>
          <div class="s2-legend-row">
            <span class="s2-c-acid">≀</span> acid
            <span class="s2-c-gas">&quot;</span> gas
            <span class="s2-c-chasm">○</span> rift
            <span class="s2-c-foe">?</span> ghost
            <span class="s2-c-foe">e</span><span class="s2-c-foe2">M</span><span class="s2-c-foe2">ψ</span><span class="s2-c-foe">v</span> dark foes
          </div>
        </div>
      </div>
      <div class="s2-controls">
        <div class="s2-compass" data-field="compass" hidden></div>
        <div class="s2-items" data-field="items"></div>
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
        <ol class="s2-log" aria-label="combat log"></ol>
      </div>
    </div>
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
  let lastItemSig = "";
  let flashTimer = null;
  let overlay = null;
  let monsterClocks = [];
  let routeCache = null;
  view.setTrailProvider((w) => {
    const lvl = Number((state.meta.shopUpgrades || {}).compass || 0);
    if (!stairTrailEnabled(lvl) || state.run.boss.reached || !w || !w.grid) return null;
    if (!routeCache || routeCache.world !== w) routeCache = { world: w, field: exitDistanceField(w) };
    return reconstructRoute(w, routeCache.field);
  });
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
    const status = statusSummary(e);
    setHidden(fields.status, !status);
    setText(fields.status, status);
    paintItems(e);
    setText(fields.bossStatus, state.run.boss.defeated ? "defeated. BTS trace available." : `${lock.unlocked ? "UNLOCKED" : "LOCKED"} / north pillar ${lock.northPillar} / gap ${lock.projectileGapTiles}`);
    setText(fields.hint, lock.hint);
    const biome = biomeForFloor(state.run.floor);
    if (root.dataset.biome !== biome.id) root.dataset.biome = biome.id;
    const w = state.run.world;
    const darkNote = !state.run.boss.reached && isDarkAct(state.run.floor) ? w && w.torch > 0 ? ` — torch lit (${w.torch} steps)` : " — DARK: foes hide beyond your light; ghosts mark where you last saw them" : "";
    setText(fields.objective, state.run.boss.reached ? lock.unlocked ? "the passage is open. challenge the boss." : "blocked. find PASSAGE in cipher.txt to open the way." : `${biome.name} — reach the stairs > (floor ${state.run.floor}/${MAX_FLOOR}). fight foes, grab weapons & glyphs.${darkNote}`);
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
    if (!owned || !w || !w.grid || state.run.boss.reached) {
      setHidden(fields.compass, true);
      return;
    }
    if (!routeCache || routeCache.world !== w) routeCache = { world: w, field: exitDistanceField(w) };
    const next = stepToExit(w, routeCache.field);
    setHidden(fields.compass, false);
    if (!next || next.steps === 0) {
      setText(fields.compass, "⇲ stairs — here");
      return;
    }
    setText(fields.compass, `⇲ stairs ${DIR_ARROW[next.dir]} ${next.steps}`);
  }
  function paintItems(e) {
    const inv = e.inventory || {};
    const sig = CONSUMABLE_KEYS.map((k) => inv[k] || 0).join(",");
    if (sig === lastItemSig) return;
    lastItemSig = sig;
    const total = CONSUMABLE_KEYS.reduce((s, k) => s + (inv[k] || 0), 0);
    setHidden(fields.items, total === 0);
    fields.items.innerHTML = CONSUMABLE_KEYS.map((k, i) => {
      const n = inv[k] || 0;
      const def = CONSUMABLES[k];
      return `<button type="button" data-use="${k}" title="${def.desc}" ${n > 0 ? "" : "disabled"}>[${i + 1}] ${def.glyph} ${k} ×${n}</button>`;
    }).join("");
  }
  function useItem(type) {
    if (overlay || state.run.boss.reached || state.run.boss.defeated) return;
    const world = state.run.world;
    const e = state.run.entity;
    if (!e.inventory || !(e.inventory[type] > 0)) return;
    const events = { moved: false, log: [], damageTaken: 0, died: false };
    const used = useConsumable(world, e, type, events);
    for (const line of events.log) appendLog(state, line);
    if (used) {
      if (typeof save === "function") save();
      view.paintExplore(world);
    }
    paintHud();
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
      descend(state, { branch: events.branch });
      persistAndPaint();
      return;
    }
    if (events.reveal) routeCache = null;
    const changed = events.moved || events.attack || events.reveal;
    if (changed) {
      if (typeof save === "function") save();
      view.applyMove(state.run.world, events);
    }
    paintHud();
    if (events.rune) openRunePickup(events.rune);
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
  function openRunePickup(type) {
    closeOverlay();
    const onClose = () => {
      closeOverlay();
      repaint();
    };
    const panel = buildRunePickupPanel({ type, onClose });
    overlay = { el: panel.el, kind: "rune" };
    root.querySelector(".s2-screen").appendChild(panel.el);
  }
  const onKey = (event) => {
    if (!root.isConnected) return;
    const tag = event.target && event.target.tagName || "";
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) || event.target?.isContentEditable) return;
    if (event.key >= "1" && event.key <= String(CONSUMABLE_KEYS.length)) {
      const type = CONSUMABLE_KEYS[Number(event.key) - 1];
      if (type) {
        event.preventDefault();
        useItem(type);
      }
      return;
    }
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
    const useBtn = event.target.closest("button[data-use]");
    if (useBtn) {
      useItem(useBtn.dataset.use);
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
  window.__fvStage2 = {
    state: () => state,
    dev,
    move,
    step: move,
    bodySolver,
    descendToBoss: bodySolver,
    lockState: () => getBossLockState({ actions, state }),
    bossSolver: challengeBoss,
    elementProbe
  };
  function elementProbe() {
    const grid = ["#####", "#...#", "#####"];
    const sw = { floor: 5, width: 5, grid, pos: { x: 1, y: 1 }, exit: { x: 9, y: 9 }, monsters: [{ alive: true, x: 2, y: 1, hp: 300, maxHp: 300, atk: 5, name: "frost foe", glyph: "f", statuses: {} }], weapons: [], glyphs: [], potions: [], hidden: [], seed: "probe" };
    applyElement(sw.monsters[0], "frost");
    const player = { atk: 12, def: 0, hp: 50, maxHp: 50, level: 1, xp: 0, glyphsThisRun: 0, glyphMult: 1, statuses: {}, inventory: {} };
    const hpBefore = sw.monsters[0].hp;
    const ev = step(sw, player, "right");
    const shatter = ev.shattered === true && hpBefore - sw.monsters[0].hp > 12;
    const pw = { floor: 8, width: 5, grid, pos: { x: 1, y: 1 }, monsters: [{ alive: true, x: 3, y: 1, hp: 30, maxHp: 30, atk: 7, name: "null phantom", glyph: "ψ", phantom: true, statuses: {}, bucket: 0, dir: "left", sight: 5, chasing: false, faction: 0 }], torch: 12 };
    monsterTurn(pw, { hp: 999, def: 0, statuses: {}, atk: 5 }, { log: [], damageTaken: 0, died: false }, () => true);
    const phantomPinned = Boolean(pw.monsters[0].statuses && pw.monsters[0].statuses.slow);
    return { shatter, phantomPinned };
  }
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
    else if (id === "items") {
      e.inventory = e.inventory || {};
      for (const k of CONSUMABLE_KEYS) e.inventory[k] = Number(e.inventory[k] || 0) + 3;
    } else if (id === "map") {
      view.toggleFullMap(state.run.world);
      return;
    }
    if (typeof save === "function") save();
    paintHud();
  }
  return {
    repaint,
    dev,
    jumpToBoss: bodySolver,
    destroy() {
      window.removeEventListener("keydown", onKey);
      if (flashTimer) clearTimeout(flashTimer);
      stopMonsterClocks();
      view.destroy();
      if (window.__fvStage2) delete window.__fvStage2;
      root.remove();
    }
  };
  function bodySolver() {
    let guard = 0;
    while (!state.run.boss.reached && guard++ < 64) descend(state);
    persistAndPaint();
    return { floor: state.run.floor, reached: state.run.boss.reached };
  }
  function tickBucket(bucket) {
    if (hiddenTab()) return;
    if (overlay || state.run.boss.reached || state.run.boss.defeated) return;
    const world = state.run.world;
    if (!world || !world.grid) return;
    const events = { moved: false, log: [], damageTaken: 0, died: false };
    if (bucket === 0 && state.run.entity.statuses) {
      const ps = tickPlayerStatus(state.run.entity);
      for (const line of ps.log) events.log.push(line);
      events.damageTaken += ps.damageTaken;
      if (ps.died) events.died = true;
    }
    if (bucket === 2 && pressureSpawn(world)) appendLog(state, "something else stirs in the dark.");
    if (bucket === 3 && !events.died) tickFire(world, state.run.entity, events);
    if (!events.died) monsterTurn(world, state.run.entity, events, (m) => m.bucket === bucket);
    for (const line of events.log) appendLog(state, line);
    if (events.damageTaken > 0) flashDamage(events.died);
    if (events.died) {
      appendLog(state, "@ was unparsed. run reset — banked glyphs survive.");
      resetRun(state, { banked: true, death: true });
      persistAndPaint();
      return;
    }
    if (world.fires && world.fires.length) view.paintExplore(world);
    else view.tickMonsters(world);
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
    recordBossAttempt(state);
    if (lock.unlocked) {
      state.run.boss.unlocked = true;
      let result2 = damageBoss({ state, amount: 999 });
      for (let i = 0; i < 5 && !result2.defeated; i++) {
        result2 = damageBoss({ state, amount: 999 });
      }
      if (result2.defeated) {
        appendLog(state, bellMessages.defeated);
        completeOnce({ stage: 2, defeated: true, reward: { glyphs: 25 }, btsPath: BTS_PATH });
      }
      return;
    }
    const result = damageBoss({ state, amount: 45 });
    const entity = state.run.entity;
    const counter = Math.max(3, Math.round((entity.maxHp || 30) * 0.2));
    entity.hp = Math.max(0, Number(entity.hp || 0) - counter);
    appendLog(state, combatLines.lockedExchange);
    if (entity.hp <= 0) {
      appendLog(state, "@ was unparsed. run reset — banked glyphs survive.");
      resetRun(state, { banked: true, death: true });
      persistAndPaint();
      return;
    }
    if (result.defeated) {
      appendLog(state, bellMessages.defeated);
      completeOnce({ stage: 2, defeated: true, reward: { glyphs: 25 }, btsPath: BTS_PATH });
      return;
    }
    persistAndPaint();
  }
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
        // Run consumables (blink/firebolt/freeze/torch) banked by type → count. MUST be a plain
        // object: consumables.js / engine.js / rollEntity all key it as inv[type]++. It was once a
        // legacy ["minor_parse_potion"] array, which silently DROPPED rune counts on save (a non-index
        // property on an array doesn't JSON-serialise) — the "picked-up rune vanishes" bug.
        inventory: {}
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
      runMods: {},
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
  const inv = target.run.entity.inventory;
  if (!inv || typeof inv !== "object" || Array.isArray(inv)) target.run.entity.inventory = {};
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
    { id: "items", label: "+3 of each rune" },
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
    jumpToBoss() {
      return view?.jumpToBoss?.() || false;
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
  ensureStylesheet("stage2-glyph-dungeon-styles", new URL("./styles.css", import.meta.url).href);
  ensureStylesheet("stage2-glyph-dungeon-ui-styles", new URL("./styles-ui.css", import.meta.url).href);
  ensureStylesheet("stage2-glyph-dungeon-overlay-styles", new URL("./styles-overlays.css", import.meta.url).href);
}
function ensureStylesheet(id, href) {
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  document.head.append(link);
}
export {
  applySearchPassageUnlock,
  defaultState2 as defaultState,
  getBossLockState,
  mountStage,
  recordBossAttempt,
  stageMeta
};
