// Glyph Dungeon — exploration & combat engine (no DOM).
//
// Floors are procedurally generated (generate.js) from a seeded RNG (rng.js), populated
// with scaled monsters / weapons / glyph shards (data.js). The player @ walks with the
// arrow/WASD keys; bumping a monster trades blows (ATK vs HP), weapons raise ATK, glyph
// shards bank glyphs, and the stairs > descend to a deeper, harder floor. The boss is still
// gated by the cipher.txt "cheat" — this engine only governs the rooms you walk through.
// Everything here is pure data so it stays testable and JSON-serialisable into the save.

import { makeRng } from "./rng.js";
import { generate, floodDistances } from "./generate.js";
import { WEAPONS, spawnMonster, xpForLevel } from "./data.js";

export const DIRS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 }
};

// Generate one floor: layout + spawn + stairs + entities, all from `${runSeed}:${floor}`.
export function buildFloor(runSeed, floorNum) {
  const rng = makeRng(`${runSeed}:${floorNum}`);
  const width = Math.min(60, 45 + floorNum * 2);
  const height = Math.min(32, 25 + floorNum);
  const maxRooms = Math.min(12, 6 + floorNum);
  const { grid, rooms } = generate(rng, { width, height, maxRooms, minRoom: 4, maxRoom: 8 });
  const start = { x: rooms[0].cx, y: rooms[0].cy };
  const dist = floodDistances(grid, start);
  // Stairs go on the farthest reachable cell so a floor takes some crossing.
  let exit = start;
  let far = -1;
  for (const [k, d] of dist) {
    if (d > far) { far = d; const [x, y] = k.split(",").map(Number); exit = { x, y }; }
  }
  // Unique, reachable spawn cells (not the start or stairs), shuffled for placement.
  const spawnable = [];
  for (const k of dist.keys()) {
    const [x, y] = k.split(",").map(Number);
    if ((x !== start.x || y !== start.y) && (x !== exit.x || y !== exit.y)) spawnable.push({ x, y });
  }
  const cells = rng.shuffle(spawnable);
  let ci = 0;
  const take = () => (ci < cells.length ? cells[ci++] : null);

  const monsterCount = Math.min(14, 3 + floorNum * 2);
  const monsters = [];
  for (let i = 0; i < monsterCount; i += 1) {
    const c = take();
    if (!c) break;
    const m = spawnMonster(rng, floorNum, i);
    m.x = c.x; m.y = c.y;
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

// Attempt to move the player one step. Mutates `world` and `player` (the run entity) and
// returns an events object the renderer turns into log lines / flashes.
export function step(world, player, dir) {
  const move = DIRS[dir];
  const events = { moved: false, log: [], damageTaken: 0, killed: false, pickup: null, descend: false, died: false };
  if (!move) return events;
  const nx = world.pos.x + move.dx;
  const ny = world.pos.y + move.dy;
  if (ny < 0 || nx < 0 || ny >= world.grid.length || nx >= world.width) return events;
  if (world.grid[ny][nx] === "#") return events; // wall — stay put

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
  if (nx === world.exit.x && ny === world.exit.y) events.descend = true;
  return events;
}
