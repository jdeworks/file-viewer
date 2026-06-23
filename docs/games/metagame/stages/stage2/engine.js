// Glyph Dungeon — exploration & combat engine (no DOM).
//
// Floors are procedurally generated (generate.js) from a seeded RNG (rng.js), populated
// with scaled monsters / weapons / glyph shards (data.js). The player @ walks with the
// arrow/WASD keys; bumping a monster trades blows (ATK vs HP), weapons raise ATK, glyph
// shards bank glyphs, and the stairs > descend to a deeper, harder floor. The boss is still
// gated by the cipher.txt "cheat" — this engine only governs the rooms you walk through.
// Everything here is pure data so it stays testable and JSON-serialisable into the save.

import { makeRng } from "./rng.js";
import { generate, floodDistances, carveHiddenRoom } from "./generate.js";
import { WEAPONS, spawnMonster, xpForLevel } from "./data.js";

export const DIRS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 }
};

// Floor dimensions: a run-wide random 200–250 base (stable across floors via the run seed),
// grown ×1.35 per floor (area thus ~×1.8/floor) and capped so floor 5 lands near ~750². Rooms
// and monsters scale with area. Deterministic so attachGrid() can rebuild the exact terrain.
const GROWTH = 1.35;
export function floorDims(runSeed, floorNum) {
  const dimRng = makeRng(`${runSeed}:dims`);
  const baseW = dimRng.int(200, 250);
  const baseH = dimRng.int(200, 250);
  const g = Math.pow(GROWTH, floorNum - 1);
  const width = Math.min(900, Math.round(baseW * g));
  const height = Math.min(900, Math.round(baseH * g));
  // BSP leaf size scales with the map so rooms stay proportionally large at every depth.
  const minLeaf = Math.max(16, Math.min(70, Math.round(width / 9)));
  return { width, height, minLeaf, minRoom: 6 };
}

// Deterministic terrain only (grid + rooms) from `${runSeed}:${floor}`. buildFloor continues
// consuming the SAME rng to place entities; attachGrid re-runs just this to recover the grid.
function buildGrid(runSeed, floorNum) {
  const dims = floorDims(runSeed, floorNum);
  const rng = makeRng(`${runSeed}:${floorNum}`);
  const { grid, rooms, hidden } = generate(rng, dims);
  return { grid, rooms, hidden, dims, rng };
}

// The grid is large (a 750² floor is ~600KB of strings) and fully derivable from the seed, so we
// keep it as a NON-ENUMERABLE property: JSON.stringify (the save path) skips it, but step()/view
// still read world.grid in memory. attachGrid() restores it on load (see renderer ensureWorld).
function defineGrid(world, grid) {
  Object.defineProperty(world, "grid", { value: grid, enumerable: false, writable: true, configurable: true });
}
export function attachGrid(world, runSeed, floorNum) {
  const grid = buildGrid(runSeed, floorNum).grid; // hidden rooms come back sealed…
  if (Array.isArray(world.hidden)) for (const h of world.hidden) if (h.revealed) carveHiddenRoom(grid, h); // …re-open the ones already found
  defineGrid(world, grid);
  return world;
}

// Generate one floor: layout + spawn + stairs + entities, all from `${runSeed}:${floor}`.
export function buildFloor(runSeed, floorNum) {
  const { grid, rooms, hidden, dims, rng } = buildGrid(runSeed, floorNum);
  const width = dims.width;
  const height = dims.height;
  const start = { x: rooms[0].cx, y: rooms[0].cy };
  const flood = floodDistances(grid, start);
  // Stairs go on the farthest reachable cell so a floor takes some crossing.
  let exit = start;
  let far = -1;
  for (let i = 0; i < flood.count; i += 1) {
    const idx = flood.order[i];
    if (flood.dist[idx] > far) { far = flood.dist[idx]; exit = { x: idx % width, y: Math.floor(idx / width) }; }
  }
  // Shuffle the reached cells in place (Fisher–Yates) and hand them out as unique spawn points.
  const order = flood.order;
  for (let i = flood.count - 1; i > 0; i -= 1) {
    const j = Math.floor(rng.float() * (i + 1));
    const t = order[i]; order[i] = order[j]; order[j] = t;
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

  // Counts scale with the number of rooms (one room per BSP leaf), so density tracks the map.
  const roomN = rooms.length;
  const monsterCount = Math.max(16, Math.min(400, Math.round(roomN * 2.4)));
  const monsters = [];
  for (let i = 0; i < monsterCount; i += 1) {
    const c = take();
    if (!c) break;
    const m = spawnMonster(rng, floorNum, i);
    m.x = c.x; m.y = c.y; m.home = { x: c.x, y: c.y };
    monsters.push(m);
  }
  // Scatter several weapons of mixed tiers (deeper floors skew toward better gear).
  const maxTier = Math.min(WEAPONS.length - 1, Math.floor(floorNum / 2) + 1);
  const weapons = [];
  const weaponCount = Math.max(2, Math.min(24, Math.round(roomN * 0.18)));
  for (let i = 0; i < weaponCount; i += 1) {
    const wc = take();
    if (wc) weapons.push({ x: wc.x, y: wc.y, ...WEAPONS[rng.int(1, maxTier)], taken: false });
  }
  // Health potions scattered through the floor.
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
  const world = { floor: floorNum, width, height, seed: runSeed, pos: { ...start }, exit, monsters, weapons, potions, glyphs, hidden };
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
    player.maxHp += 5 + Number(player.hpPerLevel || 0);     // Cell Growth shop upgrade
    player.atk += 1 + Number(player.atkPerLevel || 0);       // Adaptive Edge
    player.def += Number(player.defPerLevel || 0);           // Tempered Types
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

// Attempt to move the player one step. Mutates `world` and `player` (the run entity) and
// returns an events object the renderer turns into log lines / flashes.
export function step(world, player, dir) {
  const move = DIRS[dir];
  const events = { moved: false, log: [], damageTaken: 0, killed: false, pickup: null, descend: false, died: false };
  if (!move) return events;
  const nx = world.pos.x + move.dx;
  const ny = world.pos.y + move.dy;
  if (ny < 0 || nx < 0 || ny >= world.grid.length || nx >= world.width) return events;
  if (world.grid[ny][nx] === "#") {
    // Bumping the secret door of an unopened hidden room triggers its reveal (then stay put).
    const door = world.hidden && world.hidden.find((h) => !h.revealed && h.entrance.x === nx && h.entrance.y === ny);
    if (door) revealHidden(world, player, door, events);
    return events;
  }

  const foeIndex = world.monsters.findIndex((m) => m.alive && m.x === nx && m.y === ny);
  const foe = foeIndex >= 0 ? world.monsters[foeIndex] : null;
  if (foe) {
    // Record the clash so the renderer can lunge @ and foe toward each other (view.js).
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
      // Fast foes (race conditions) strike twice.
      if (foe.fast && player.hp > 0) {
        const d2 = bite(foe, player, events);
        events.log.push(`${foe.name} strikes again for ${d2}.`);
      }
    }
    return events;
  }

  // Open tile — move there, then resolve pickups / stairs.
  world.pos = { x: nx, y: ny };
  events.moved = true;

  const weapon = world.weapons.find((wp) => !wp.taken && wp.x === nx && wp.y === ny);
  if (weapon && weapon.atk > 0) {
    weapon.taken = true;
    player.atk += weapon.atk;
    player.equipment = { ...(player.equipment || {}), weapon: weapon.name };
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

// Open a hidden room: carve it to floor, then resolve its kind — treasure (loot), trap (ambush),
// or teleport (warp to the stairs). Deterministic per door via the run seed; results are persisted.
function revealHidden(world, player, h, events) {
  h.revealed = true;
  carveHiddenRoom(world.grid, h);
  const rng = makeRng(`${world.seed}:reveal:${h.entrance.x},${h.entrance.y}`);
  const open = [];
  for (let y = h.y; y < h.y + h.h; y += 1) for (let x = h.x; x < h.x + h.w; x += 1) if (world.grid[y] && world.grid[y][x] === ".") open.push({ x, y });
  const cells = rng.shuffle(open);
  let ci = 0;
  const take = () => (ci < cells.length ? cells[ci++] : { x: h.entrance.x, y: h.entrance.y });
  events.reveal = h.type;
  if (h.type === "treasure") {
    for (let i = 0; i < 3; i += 1) { const c = take(); world.potions.push({ x: c.x, y: c.y, taken: false }); }
    const ng = rng.int(3, 7);
    for (let i = 0; i < ng; i += 1) { const c = take(); world.glyphs.push({ x: c.x, y: c.y, taken: false }); }
    const nw = rng.int(2, 5);
    const maxTier = Math.min(WEAPONS.length - 1, Math.floor(world.floor / 2) + 1);
    for (let i = 0; i < nw; i += 1) { const c = take(); world.weapons.push({ x: c.x, y: c.y, ...WEAPONS[rng.int(1, maxTier)], taken: false }); }
    events.log.push("hidden cache! potions, glyphs and weapons spill out.");
  } else if (h.type === "trap") {
    const n = rng.int(3, 5);
    for (let i = 0; i < n; i += 1) {
      const c = take();
      const m = spawnMonster(rng, world.floor, world.monsters.length + i);
      m.x = c.x; m.y = c.y; m.home = { x: c.x, y: c.y }; m.chasing = true;
      world.monsters.push(m);
    }
    events.log.push(`ambush! ${n} foes pour out of the dark.`);
  } else {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0]]) {
      const tx = world.exit.x + dx;
      const ty = world.exit.y + dy;
      if (world.grid[ty] && world.grid[ty][tx] === ".") { world.pos = { x: tx, y: ty }; break; }
    }
    events.moved = true;
    events.log.push("a teleport sigil! flung straight to the stairwell.");
  }
}

// ── Monster turn — patrol, chase on sight ───────────────────────────────────────────────────────
const DIR_LIST = ["up", "down", "left", "right"];

function isOpen(world, x, y) {
  return y >= 0 && x >= 0 && y < world.grid.length && x < world.width && world.grid[y][x] !== "#";
}

function freeCell(world, x, y, occupied) {
  return isOpen(world, x, y) && !occupied.has(y * world.width + x) && !(x === world.pos.x && y === world.pos.y);
}

// Cheap Bresenham line-of-sight: any wall between monster and @ blocks the sighting.
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
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
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

// Greedy chase: close the larger axis first, fall back to the other; never onto @ (that's a bite).
function greedyStep(world, m, px, py, occupied) {
  const ddx = px - m.x;
  const ddy = py - m.y;
  const order = Math.abs(ddx) >= Math.abs(ddy)
    ? [[Math.sign(ddx), 0], [0, Math.sign(ddy)]]
    : [[0, Math.sign(ddy)], [Math.sign(ddx), 0]];
  for (const [sx, sy] of order) {
    if (!sx && !sy) continue;
    if (freeCell(world, m.x + sx, m.y + sy, occupied)) return { x: m.x + sx, y: m.y + sy };
  }
  return null;
}

// Patrol: keep the current heading; on a block, take the first open direction (paces corridors,
// bounces in rooms). The heading lives on the monster so it persists across turns/saves.
function patrolStep(world, m, occupied) {
  const dirs = [m.dir, ...DIR_LIST.filter((d) => d !== m.dir)];
  for (const d of dirs) {
    const mv = DIRS[d];
    if (!mv) continue;
    if (freeCell(world, m.x + mv.dx, m.y + mv.dy, occupied)) return { x: m.x + mv.dx, y: m.y + mv.dy, dir: d };
  }
  return null;
}

// Advance monsters one tile. `filter` (optional) restricts which monsters act this call — used to
// drive the 5 shared real-time clocks (one bucket per call) so monsters move without the player.
// Mutates monsters + the player entity (bites) and appends to `events`.
export function monsterTurn(world, player, events, filter) {
  const px = world.pos.x;
  const py = world.pos.y;
  const occupied = new Set();
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
      if (player.hp <= 0) { events.died = true; return; }
      continue;
    }
    const target = sees ? (m.chasing = true, greedyStep(world, m, px, py, occupied))
      : (m.chasing = false, patrolStep(world, m, occupied));
    if (target) {
      occupied.delete(m.y * world.width + m.x);
      m.x = target.x; m.y = target.y; if (target.dir) m.dir = target.dir;
      occupied.add(m.y * world.width + m.x);
    }
  }
}
