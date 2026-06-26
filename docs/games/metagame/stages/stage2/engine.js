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
import { detonate } from "./monsters.js";
import { applyStatus, tickStatuses } from "./status.js";
import { placeHazards, hazardIndex, enterHazard } from "./hazards.js";
import { DIRS } from "./dirs.js";

export { DIRS };

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
  const { grid, rooms, hidden, decor } = generate(rng, dims);
  return { grid, rooms, hidden, decor, dims, rng };
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
  defineHazards(world); // rebuild the O(1) hazard lookup from the saved hazards array
  return world;
}

// Non-enumerable hazard lookup (built from the enumerable, saved world.hazards) — same pattern as
// the grid: the data is serialised, the index is rebuilt in memory on load.
function defineHazards(world) {
  Object.defineProperty(world, "hazardAt", { value: hazardIndex(world), enumerable: false, writable: true, configurable: true });
}

// Generate one floor: layout + spawn + stairs + entities, all from `${runSeed}:${floor}`.
export function buildFloor(runSeed, floorNum) {
  const { grid, rooms, hidden, decor, dims, rng } = buildGrid(runSeed, floorNum);
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
  // Loot anchored to interior structures (a sword behind a corner, a potion in an alcove). Skip any
  // marker the layout sealed off, or that coincides with the spawn / stairs.
  for (const d of (decor || [])) {
    const idx = d.y * width + d.x;
    if (flood.dist[idx] < 0) continue;
    if ((d.x === start.x && d.y === start.y) || (d.x === exit.x && d.y === exit.y)) continue;
    if (d.kind === "weapon") weapons.push({ x: d.x, y: d.y, ...WEAPONS[rng.int(1, maxTier)], taken: false });
    else if (d.kind === "potion") potions.push({ x: d.x, y: d.y, taken: false });
    else if (d.kind === "glyph") glyphs.push({ x: d.x, y: d.y, taken: false });
  }
  // Hazards last, on the floor cells nothing else claimed (so a foe/loot never starts on lava).
  const hazards = placeHazards(rng, floorNum, roomN, take);
  const world = { floor: floorNum, width, height, seed: runSeed, pos: { ...start }, exit, monsters, weapons, potions, glyphs, hidden, hazards };
  defineGrid(world, grid);
  defineHazards(world);
  return world;
}

// ── Stairwell Sense routing ─────────────────────────────────────────────────────────────────────
// Best-route hint for the compass. Every floor tile costs 1, so the shortest path is a plain BFS
// from the stairs (≡ A* with a zero/consistent heuristic) — flood once per floor, cache it, then
// the next step is just the open neighbour with the lowest distance-to-exit. Never points at a wall.
export function exitDistanceField(world) {
  return floodDistances(world.grid, world.exit);
}

// First move of the shortest @→stairs path, given a precomputed field: returns a DIRS key + the
// remaining step count, or null once standing on the exit (or if somehow walled off).
export function stepToExit(world, field) {
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
    if (d >= 0 && d < bestD) { bestD = d; best = dir; }
  }
  return best ? { dir: best, steps: here > 0 ? here : bestD + 1 } : null;
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

// Elites (A3) leave a guaranteed cache on death: a high-tier weapon on the death cell plus a few
// glyph shards on adjacent open cells — so engaging the marked, tougher foe pays off.
function dropElite(world, foe, events) {
  if (!foe.elite) return;
  const maxTier = Math.min(WEAPONS.length - 1, Math.floor(world.floor / 2) + 2);
  world.weapons.push({ x: foe.x, y: foe.y, ...WEAPONS[Math.max(1, maxTier)], taken: false });
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

// Tick the player's status effects (poison/burn/bleed) by one turn. The renderer calls this on a
// real-time clock so damage-over-time keeps burning even while @ stands still.
export function tickPlayerStatus(player) {
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
      dropElite(world, foe, events);            // elites leave a guaranteed cache (A3)
      if (foe.explode) detonate(world, foe, player, events); // segfaults blast on death (A1)
      if (player.hp <= 0) { events.died = true; return events; }
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

  // Open tile — move there, then resolve hazards / pickups / stairs.
  world.pos = { x: nx, y: ny };
  events.moved = true;
  world.stepCount = (world.stepCount || 0) + 1; // drives A4 lingering pressure

  // Hazard on-enter (A2): lava burns, spores poison, spikes bleed, a chasm drops you a floor.
  const hz = world.hazardAt && world.hazardAt(nx, ny);
  if (hz) {
    enterHazard(world, player, hz, events);
    if (events.died) return events;
    if (events.descend) return events; // chasm fall — skip the rest of this floor's resolution
  }

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
// teleport (warp to the stairs), shrine (pay HP for a buff), vault (prime weapon + elite guards),
// captive (free an ally that fights for you). Deterministic per door via the run seed; persisted.
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
  } else if (h.type === "teleport") {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0]]) {
      const tx = world.exit.x + dx;
      const ty = world.exit.y + dy;
      if (world.grid[ty] && world.grid[ty][tx] === ".") { world.pos = { x: tx, y: ty }; break; }
    }
    events.moved = true;
    events.log.push("a teleport sigil! flung straight to the stairwell.");
  } else if (h.type === "shrine") {
    // Pay a slice of current HP for a permanent (this-run) buff — never lethal.
    const cost = Math.min(Math.max(0, player.hp - 1), Math.max(5, Math.round(player.maxHp * 0.15)));
    player.hp = Math.max(1, player.hp - cost);
    const boon = rng.pick(["atk", "def", "maxhp"]);
    if (boon === "atk") { player.atk += 2; events.log.push(`a shrine — you bleed ${cost} HP for +2 ATK.`); }
    else if (boon === "def") { player.def = Number(player.def || 0) + 1; events.log.push(`a shrine — you bleed ${cost} HP for +1 DEF.`); }
    else { player.maxHp += 8; events.log.push(`a shrine — you bleed ${cost} HP for +8 max HP.`); }
  } else if (h.type === "vault") {
    const cx = h.x + (h.w >> 1);
    const cy = h.y + (h.h >> 1);
    world.weapons.push({ x: cx, y: cy, ...WEAPONS[WEAPONS.length - 1], taken: false }); // a prime weapon
    const guards = rng.int(2, 3);
    for (let i = 0; i < guards; i += 1) {
      const c = take();
      const m = spawnMonster(rng, world.floor, world.monsters.length + i);
      m.x = c.x; m.y = c.y; m.home = { x: c.x, y: c.y }; m.chasing = true;
      m.elite = true; m.hp = Math.round(m.hp * 1.5); m.maxHp = m.hp; m.atk = Math.round(m.atk * 1.2);
      m.name = `vault guard`; m.drop += 2;
      world.monsters.push(m);
    }
    events.log.push(`a vault! a prime weapon — but ${guards} elite guards stir.`);
  } else if (h.type === "captive") {
    const c = take();
    const ally = spawnMonster(rng, world.floor, world.monsters.length);
    ally.x = c.x; ally.y = c.y; ally.home = { x: c.x, y: c.y };
    ally.ally = true; ally.chasing = false;
    ally.ranged = false; ally.summon = false; ally.explode = false; ally.ambush = false; ally.hidden = false; ally.elite = false; ally.venom = false;
    ally.hp = Math.round(ally.hp * 1.6); ally.maxHp = ally.hp;
    ally.name = "freed process";
    world.monsters.push(ally);
    events.log.push("a captive process — freed, it fights at your side.");
  }
}
