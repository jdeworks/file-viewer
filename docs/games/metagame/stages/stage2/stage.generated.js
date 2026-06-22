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
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) grid[y][x] = ".";
}
function carveV(grid, y1, y2, x) {
  for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1) grid[y][x] = ".";
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
function overlaps(a, b, margin) {
  return a.x - margin < b.x + b.w && a.x + a.w + margin > b.x && a.y - margin < b.y + b.h && a.y + a.h + margin > b.y;
}
function generate(rng, { width, height, maxRooms, minRoom, maxRoom }) {
  const grid = Array.from({ length: height }, () => Array(width).fill("#"));
  const rooms = [];
  const attempts = maxRooms * 4;
  for (let i = 0; i < attempts && rooms.length < maxRooms; i += 1) {
    const w = rng.int(minRoom, maxRoom);
    const h = rng.int(minRoom, maxRoom);
    const x = rng.int(1, Math.max(1, width - w - 2));
    const y = rng.int(1, Math.max(1, height - h - 2));
    const room = { x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) };
    if (rooms.some((r) => overlaps(r, room, 1))) continue;
    carveRoom(grid, room);
    if (rooms.length > 0) connect(grid, rooms[rooms.length - 1], room, rng);
    rooms.push(room);
  }
  const extraLoops = Math.min(rooms.length - 1, 1 + Math.floor(rooms.length / 4));
  for (let i = 0; i < extraLoops; i += 1) {
    const a = rng.pick(rooms);
    const b = rng.pick(rooms);
    if (a !== b) connect(grid, a, b, rng);
  }
  return { grid: grid.map((row) => row.join("")), rooms };
}
function floodDistances(gridRows, start) {
  const width = gridRows[0].length;
  const height = gridRows.length;
  const dist = /* @__PURE__ */ new Map();
  const key = (x, y) => `${x},${y}`;
  dist.set(key(start.x, start.y), 0);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift();
    const d = dist.get(key(cur.x, cur.y));
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      if (gridRows[ny][nx] === "#") continue;
      const k = key(nx, ny);
      if (dist.has(k)) continue;
      dist.set(k, d + 1);
      queue.push({ x: nx, y: ny });
    }
  }
  return dist;
}

// ../../docs/games/metagame/stages/stage2/data.js
var BASE_STATS = { hp: 30, maxHp: 30, atk: 5, def: 2, sight: 7 };
var MONSTERS = [
  { id: "mite", glyph: "m", name: "parse mite", hp: 4, atk: 2, xp: 2, drop: 1, minFloor: 1 },
  { id: "spider", glyph: "s", name: "syntax spider", hp: 6, atk: 3, xp: 3, drop: 1, minFloor: 1 },
  { id: "null", glyph: "n", name: "null pointer", hp: 5, atk: 5, xp: 4, drop: 2, minFloor: 2 },
  { id: "race", glyph: "r", name: "race condition", hp: 8, atk: 4, xp: 6, drop: 2, minFloor: 3, fast: true },
  { id: "leak", glyph: "L", name: "memory leak", hp: 16, atk: 2, xp: 5, drop: 3, minFloor: 3 },
  { id: "overflow", glyph: "O", name: "stack overflow", hp: 22, atk: 6, xp: 9, drop: 4, minFloor: 4 }
];
var WEAPONS = [
  { name: "hand_cursor", atk: 0 },
  { name: "parser_blade", atk: 3 },
  { name: "regex_lance", atk: 5 },
  { name: "compiler_axe", atk: 8 },
  { name: "kernel_scythe", atk: 12 }
];
var SHOP_UPGRADES = [
  { id: "vitality", name: "Vitality", desc: "+8 max HP", max: 8, apply: (s, n) => {
    s.maxHp += 8 * n;
    s.hp = s.maxHp;
  } },
  { id: "edge", name: "Sharper Cursor", desc: "+1 ATK", max: 8, apply: (s, n) => {
    s.atk += n;
  } },
  { id: "guard", name: "Hardened Types", desc: "+1 DEF", max: 6, apply: (s, n) => {
    s.def += n;
  } },
  { id: "greed", name: "Glyph Magnet", desc: "+25% glyphs", max: 4, apply: (s, n) => {
    s.glyphMult = 1 + 0.25 * n;
  } }
];
var SHOP_BASE = { vitality: 8, edge: 12, guard: 10, greed: 15 };
var SHOP_GROWTH = { vitality: 1.6, edge: 1.7, guard: 1.7, greed: 1.9 };
function upgradeCost(id, level) {
  return Math.round((SHOP_BASE[id] || 10) * (SHOP_GROWTH[id] || 1.7) ** level);
}
function xpForLevel(level) {
  return 4 + (level - 1) * 4;
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
  const scale = 1 + (floor - 1) * 0.25;
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
    y: 0
  };
}

// ../../docs/games/metagame/stages/stage2/engine.js
var DIRS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 }
};
function buildFloor(runSeed, floorNum) {
  const rng = makeRng(`${runSeed}:${floorNum}`);
  const width = Math.min(60, 45 + floorNum * 2);
  const height = Math.min(32, 25 + floorNum);
  const maxRooms = Math.min(12, 6 + floorNum);
  const { grid, rooms } = generate(rng, { width, height, maxRooms, minRoom: 4, maxRoom: 8 });
  const start = { x: rooms[0].cx, y: rooms[0].cy };
  const dist = floodDistances(grid, start);
  let exit = start;
  let far = -1;
  for (const [k, d] of dist) {
    if (d > far) {
      far = d;
      const [x, y] = k.split(",").map(Number);
      exit = { x, y };
    }
  }
  const spawnable = [];
  for (const k of dist.keys()) {
    const [x, y] = k.split(",").map(Number);
    if ((x !== start.x || y !== start.y) && (x !== exit.x || y !== exit.y)) spawnable.push({ x, y });
  }
  const cells = rng.shuffle(spawnable);
  let ci = 0;
  const take = () => ci < cells.length ? cells[ci++] : null;
  const monsterCount = Math.min(14, 3 + floorNum * 2);
  const monsters = [];
  for (let i = 0; i < monsterCount; i += 1) {
    const c = take();
    if (!c) break;
    const m = spawnMonster(rng, floorNum, i);
    m.x = c.x;
    m.y = c.y;
    monsters.push(m);
  }
  const weaponTier = Math.min(WEAPONS.length - 1, Math.floor(floorNum / 2) + 1);
  const weapons = [];
  const wc = take();
  if (wc) weapons.push({ x: wc.x, y: wc.y, ...WEAPONS[weaponTier], taken: false });
  const glyphs = [];
  const glyphCount = 2 + Math.floor(floorNum / 2);
  for (let i = 0; i < glyphCount; i += 1) {
    const c = take();
    if (!c) break;
    glyphs.push({ x: c.x, y: c.y, taken: false });
  }
  return { floor: floorNum, grid, width, height, pos: { ...start }, exit, monsters, weapons, glyphs };
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
    player.maxHp += 5;
    player.atk += 1;
    player.hp = Math.min(player.maxHp, player.hp + 8);
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
  const foe = world.monsters.find((m) => m.alive && m.x === nx && m.y === ny);
  if (foe) {
    foe.hp -= Math.max(1, player.atk);
    if (foe.hp <= 0) {
      foe.alive = false;
      events.killed = true;
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
  if (nx === world.exit.x && ny === world.exit.y) events.descend = true;
  return events;
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
        <div class="s2-shop-desc">${up.desc} per level</div>
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

// ../../docs/games/metagame/stages/stage2/renderer.js
var MAX_FLOOR = 5;
var CELL_CLASS = {
  "#": "s2-c-wall",
  "@": "s2-c-player",
  m: "s2-c-foe",
  s: "s2-c-foe",
  n: "s2-c-foe",
  r: "s2-c-foe",
  L: "s2-c-foe2",
  O: "s2-c-foe2",
  "/": "s2-c-item",
  "[": "s2-c-item",
  "]": "s2-c-item",
  "%": "s2-c-glyph",
  "?": "s2-c-glyph",
  ">": "s2-c-exit"
};
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
    <header class="s2-hud">
      <div><strong>FLOOR <span data-field="floor"></span>/${MAX_FLOOR} - GLYPH DUNGEON</strong></div>
      <div>HP <span data-field="hp"></span>/<span data-field="maxHp"></span></div>
      <div>LVL <span data-field="level"></span> (<span data-field="xp"></span>xp)</div>
      <div>ATK <span data-field="atk"></span></div>
      <div>DEF <span data-field="def"></span></div>
      <div>GLYPHS <span data-field="glyphs"></span></div>
    </header>
    <div class="s2-objective" data-field="objective"></div>
    <div class="s2-screen">
      <pre class="s2-grid" aria-label="ASCII dungeon map"></pre>
      <div class="s2-flash" aria-hidden="true"></div>
    </div>
    <div class="s2-legend">
      <span class="s2-c-player">@</span> you
      <span class="s2-c-foe">s</span> foe
      <span class="s2-c-item">/</span> weapon
      <span class="s2-c-glyph">%</span> glyph
      <span class="s2-c-exit">&gt;</span> stairs
    </div>
    <div class="s2-boss-panel">
      <div class="s2-boss-title">THE AMBIGUOUS EXPRESSION</div>
      <div data-field="bossStatus"></div>
      <div class="s2-hint" data-field="hint"></div>
    </div>
    <ol class="s2-log" aria-label="combat log"></ol>
    <div class="s2-controls">
      <div class="s2-dpad" aria-label="move">
        <button type="button" data-move="up" aria-label="move up">&#9650;</button>
        <button type="button" data-move="left" aria-label="move left">&#9664;</button>
        <button type="button" data-move="down" aria-label="move down">&#9660;</button>
        <button type="button" data-move="right" aria-label="move right">&#9654;</button>
      </div>
      <button type="button" data-action="boss">challenge boss</button>
      <button type="button" data-action="search">open cipher.txt</button>
      <button type="button" data-action="shop">glyph shop</button>
      <button type="button" data-action="help">how to play</button>
      <button type="button" data-action="retreat">retreat (new run)</button>
      <button type="button" data-action="bts" hidden>open trace.bts</button>
    </div>
  `;
  host.replaceChildren(root);
  const fields = Object.fromEntries([...root.querySelectorAll("[data-field]")].map((el) => [el.dataset.field, el]));
  const grid = root.querySelector(".s2-grid");
  const flash = root.querySelector(".s2-flash");
  const log = root.querySelector(".s2-log");
  let flashTimer = null;
  let overlay = null;
  const completeOnce = once((result) => {
    if (typeof onStageComplete === "function") onStageComplete(result);
  });
  ensureWorld(state);
  function repaint() {
    const entity = state.run.entity;
    const lock = getBossLockState({ actions, state });
    fields.floor.textContent = String(state.run.floor);
    fields.hp.textContent = String(entity.hp);
    fields.maxHp.textContent = String(entity.maxHp);
    fields.level.textContent = String(entity.level);
    fields.xp.textContent = String(entity.xp || 0);
    fields.atk.textContent = String(entity.atk);
    fields.def.textContent = String(entity.def);
    fields.glyphs.textContent = `${state.meta.glyphsBanked} +${entity.glyphsThisRun}`;
    fields.bossStatus.textContent = state.run.boss.defeated ? "defeated. BTS trace available." : `${lock.unlocked ? "UNLOCKED" : "LOCKED"} / north pillar ${lock.northPillar} / gap ${lock.projectileGapTiles}`;
    fields.hint.textContent = lock.hint;
    fields.objective.textContent = state.run.boss.reached ? lock.unlocked ? "the passage is open. challenge the boss." : "blocked. find PASSAGE in cipher.txt to open the way." : `reach the stairs > (floor ${state.run.floor}/${MAX_FLOOR}). fight foes, grab weapons & glyphs.`;
    if (state.run.boss.reached) {
      grid.innerHTML = colorize(lock.unlocked ? bossArenaUnlocked : bossArenaLocked);
    } else {
      grid.innerHTML = colorize(composeExplore(state.run.world));
    }
    log.replaceChildren(...state.run.combatLog.slice(-4).map((line) => {
      const item = document.createElement("li");
      item.textContent = line;
      return item;
    }));
    root.querySelector('[data-action="bts"]').hidden = !state.run.boss.defeated;
  }
  function persistAndPaint() {
    if (typeof save === "function") save();
    repaint();
  }
  function move(dir) {
    if (overlay || state.run.boss.reached || state.run.boss.defeated) return;
    const events = step(state.run.world, state.run.entity, dir);
    for (const line of events.log) appendLog(state, line);
    if (events.damageTaken > 0) flashDamage(events.died);
    if (events.died) {
      appendLog(state, "@ was unparsed. run reset — banked glyphs survive.");
      resetRun(state, { banked: true, death: true });
    } else if (events.descend) {
      descend(state);
    }
    persistAndPaint();
  }
  function flashDamage(fatal) {
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
  return {
    repaint,
    destroy() {
      window.removeEventListener("keydown", onKey);
      if (flashTimer) clearTimeout(flashTimer);
      root.remove();
    }
  };
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
function composeExplore(world) {
  const rows = world.grid.map((r) => r.split(""));
  const put = (x, y, ch) => {
    if (rows[y] && rows[y][x] !== void 0) rows[y][x] = ch;
  };
  for (const g of world.glyphs) if (!g.taken) put(g.x, g.y, "%");
  for (const wp of world.weapons) if (!wp.taken) put(wp.x, wp.y, "/");
  put(world.exit.x, world.exit.y, ">");
  for (const m of world.monsters) if (m.alive) put(m.x, m.y, m.glyph);
  put(world.pos.x, world.pos.y, "@");
  return rows.map((r) => r.join(""));
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
  requiredAction: REQUIRED_ACTION
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
