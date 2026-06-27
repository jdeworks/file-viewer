// Glyph Dungeon — floor construction: dimensions, deterministic terrain, entity population,
// stairs (incl. the B5 branch), B6 guardians, hazards and traps. Split out of engine.js to keep
// each file focused; engine.js re-exports buildFloor/attachGrid/floorDims so importers are stable.

import { makeRng } from "./rng.js";
import { generate, floodDistances, carveHiddenRoom } from "./generate.js";
import { WEAPONS, spawnMonster } from "./data.js";
import { placeHazards, hazardIndex } from "./hazards.js";
import { placeTraps, trapIndex } from "./traps.js";
import { placeConsumables } from "./consumables.js";
import { rollAffix } from "./affixes.js";
import { isGuardianFloor, isOverflowFloor } from "./acts.js";

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
  defineHazards(world); // rebuild the O(1) hazard + trap lookups from the saved arrays
  return world;
}

// Non-enumerable hazard + trap lookups (built from the enumerable, saved arrays) — same pattern as
// the grid: the data is serialised, the indexes are rebuilt in memory on load.
function defineHazards(world) {
  Object.defineProperty(world, "hazardAt", { value: hazardIndex(world), enumerable: false, writable: true, configurable: true });
  Object.defineProperty(world, "trapAt", { value: trapIndex(world), enumerable: false, writable: true, configurable: true });
}

// Generate one floor: layout + spawn + stairs + entities, all from `${runSeed}:${floor}`.
export function buildFloor(runSeed, floorNum, mods = {}) {
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
  // B5 branching stair: on ~half of floors, a SECOND descent in a far, separate area — tougher and
  // richer than the main one (the player opts into risk for loot). Seeded per floor; chosen as the
  // farthest reachable cell that's also well away from the main exit so the two stairs don't cluster.
  let branchExit = null;
  if (makeRng(`${runSeed}:${floorNum}:branchroll`).float() < 0.5) {
    let bf = -1;
    for (let i = 0; i < flood.count; i += 1) {
      const idx = flood.order[i];
      const x = idx % width;
      const y = Math.floor(idx / width);
      const awayFromExit = Math.abs(x - exit.x) + Math.abs(y - exit.y) > 24;
      if (awayFromExit && flood.dist[idx] > bf) { bf = flood.dist[idx]; branchExit = { x, y }; }
    }
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
      const onStair = (x === start.x && y === start.y) || (x === exit.x && y === exit.y) || (branchExit && x === branchExit.x && y === branchExit.y);
      if (!onStair) return { x, y };
    }
    return null;
  };

  // Counts scale with the number of rooms (one room per BSP leaf), so density tracks the map. A
  // branch floor (B5) is deadlier AND richer — the reward for taking the optional harder descent.
  const roomN = rooms.length;
  const run = mods.run || {}; // C3 run modifiers (Heat)
  const danger = mods.branch ? 1.4 : 1;
  const bounty = mods.branch ? 1.5 : 1;
  const monsterCount = Math.max(16, Math.min(700, Math.round(roomN * 2.4 * danger * (run.swarm ? 1.6 : 1))));
  const monsters = [];
  for (let i = 0; i < monsterCount; i += 1) {
    const c = take();
    if (!c) break;
    const m = spawnMonster(rng, floorNum, i);
    // Elite Storm: promote many extra non-elites to elites (stat bump + guaranteed cache).
    if (run.elite_storm && !m.elite && rng.float() < 0.3) {
      m.elite = true; m.hp = Math.round(m.hp * 1.5); m.maxHp = m.hp; m.atk = Math.round(m.atk * 1.2);
      m.drop += 2; m.name = `elite ${m.name}`;
    }
    m.x = c.x; m.y = c.y; m.home = { x: c.x, y: c.y };
    monsters.push(m);
  }
  // Scatter several weapons of mixed tiers (deeper floors skew toward better gear).
  const maxTier = Math.min(WEAPONS.length - 1, Math.floor(floorNum / 2) + 1);
  const weapons = [];
  const weaponCount = Math.max(2, Math.min(36, Math.round(roomN * 0.18 * bounty)));
  for (let i = 0; i < weaponCount; i += 1) {
    const wc = take();
    if (wc) weapons.push({ x: wc.x, y: wc.y, ...WEAPONS[rng.int(1, maxTier)], affix: rollAffix(rng, floorNum), taken: false });
  }
  // Health potions scattered through the floor.
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
  // Loot anchored to interior structures (a sword behind a corner, a potion in an alcove). Skip any
  // marker the layout sealed off, or that coincides with the spawn / stairs.
  for (const d of (decor || [])) {
    const idx = d.y * width + d.x;
    if (flood.dist[idx] < 0) continue;
    if ((d.x === start.x && d.y === start.y) || (d.x === exit.x && d.y === exit.y)) continue;
    if (d.kind === "weapon") weapons.push({ x: d.x, y: d.y, ...WEAPONS[rng.int(1, maxTier)], affix: rollAffix(rng, floorNum), taken: false });
    else if (d.kind === "potion" && !run.no_potions) potions.push({ x: d.x, y: d.y, taken: false });
    else if (d.kind === "glyph") glyphs.push({ x: d.x, y: d.y, taken: false });
  }
  // Act-cap floor guardian (floors 3, 6, 9 — see acts.js): a beefy, mechanic-bearing foe posted by
  // the stairs, so each act ENDS in a real spike you must get past before the next biome (or boss).
  if (isGuardianFloor(floorNum)) {
    const g = makeGuardian(rng, floorNum, monsters.length);
    const spot = adjacentOpen(grid, exit) || take();
    if (spot) { g.x = spot.x; g.y = spot.y; g.home = { x: spot.x, y: spot.y }; monsters.push(g); }
  }

  // Hazards + traps last, on the floor cells nothing else claimed (unique via the shared `take`).
  const hazards = placeHazards(rng, floorNum, roomN, take);
  const traps = placeTraps(rng, floorNum, roomN, take);
  const consumables = placeConsumables(rng, floorNum, roomN, take);
  const world = { floor: floorNum, width, height, seed: runSeed, pos: { ...start }, exit, branchExit, branch: Boolean(mods.branch), monsters, weapons, potions, glyphs, hidden, hazards, traps, consumables };
  defineGrid(world, grid);
  defineHazards(world);
  return world;
}

// B6 guardian: take a roster spawn, beef it up (3× HP, 1.5× ATK), mark it, and give it ONE scripted
// mechanic — summon (forks minions, handled in monsterTurn) or split (spawns shards on death, below).
function makeGuardian(rng, floor, idx) {
  const g = spawnMonster(rng, floor, idx);
  g.hp = Math.round(g.maxHp * 3); g.maxHp = g.hp;
  g.atk = Math.round(g.atk * 1.5);
  g.glyph = "Ω"; g.name = "floor guardian"; g.guardian = true; g.elite = true;
  g.drop += 6; g.xp += 12; g.sight = 9; g.chasing = false;
  g.ranged = false; g.ambush = false; g.hidden = false; g.explode = false; g.venom = false;
  if (rng.pick(["summon", "split"]) === "summon") { g.summon = true; g.split = false; }
  else { g.summon = false; g.split = true; }
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
