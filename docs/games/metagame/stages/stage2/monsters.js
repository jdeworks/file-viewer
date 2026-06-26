// Monster AI — patrol, chase-on-sight, and the depth-unlocked behaviour archetypes (A1):
//   ranged   (spitter)  — fires down line-of-sight instead of closing; poisons.
//   summon   (forkbomb) — spawns weak minions adjacent while it sees you.
//   explode  (segfault) — detonates an area blast when it dies (punishes pure bump-attack).
//   ambush   (dangling) — disguised as a wall until you step close, then springs.
// Pure data/logic, no DOM. Monsters move on the renderer's real-time clocks (one bucket per call),
// so this never needs determinism — anything spawned here is just appended to world.monsters.

import { DIRS, DIR_LIST } from "./dirs.js";
import { tickStatuses, skipsTurn, applyStatus } from "./status.js";

const SUMMON_CAP = 90; // hard ceiling on live monsters so a summoner can't runaway-spawn
const RANGED_COOLDOWN = 2;
const SUMMON_COOLDOWN = 4;
const EXPLODE_RADIUS = 2;

export function isOpen(world, x, y) {
  return y >= 0 && x >= 0 && y < world.grid.length && x < world.width && world.grid[y][x] !== "#";
}

function freeCell(world, x, y, occupied) {
  if (!isOpen(world, x, y) || occupied.has(y * world.width + x)) return false;
  if (x === world.pos.x && y === world.pos.y) return false;
  // Monsters avoid lethal terrain (lava/spikes) unless they're already doomed by it.
  if (world.hazardAt && world.hazardAt(x, y) && !world.hazardSafe) {
    const hz = world.hazardAt(x, y);
    if (hz === "lava" || hz === "spikes") return false;
  }
  return true;
}

// Cheap Bresenham line-of-sight: any wall between the monster and @ blocks the sighting.
export function hasLOS(world, x0, y0, x1, y1) {
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
  events.damageTaken = (events.damageTaken || 0) + dmg;
  if (m.venom) applyStatus(player, "poison", 3, 1);
  if (player.hp <= 0) events.died = true;
  if (events.log) events.log.push(`${m.name} bites for ${dmg}.`);
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

// Patrol: keep heading; on a block take the first open dir (paces corridors, bounces in rooms).
function patrolStep(world, m, occupied) {
  const dirs = [m.dir, ...DIR_LIST.filter((d) => d !== m.dir)];
  for (const d of dirs) {
    const mv = DIRS[d];
    if (!mv) continue;
    if (freeCell(world, m.x + mv.dx, m.y + mv.dy, occupied)) return { x: m.x + mv.dx, y: m.y + mv.dy, dir: d };
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

// A weak minion for summoners — a deterministic-free mite scaled to the floor (no rng needed; it's
// runtime-only state that gets saved with the world). Bucket round-robins so minions don't clump.
function makeMinion(world) {
  const scale = 1 + (world.floor - 1) * 0.35;
  const hp = Math.round(12 * scale);
  world._summonN = (world._summonN || 0) + 1;
  return {
    id: "spawnling", glyph: "·", name: "fork spawn", hp, maxHp: hp,
    atk: Math.max(2, Math.round(4 * scale)), xp: 1, drop: 1,
    alive: true, x: 0, y: 0, dir: "down", sight: 6, chasing: true,
    bucket: world._summonN % 5
  };
}

// Area blast when an exploder dies: damages the player and chains nearby monsters. Called from both
// the player's kill (engine.step) and a DoT death here. `at` is the death cell.
export function detonate(world, at, player, events) {
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

// Advance monsters one tile. `filter` (optional) restricts which act this call — used to drive the
// 5 shared real-time clocks (one bucket per call). Mutates monsters + the player (bites/spits) and
// appends to `events`. Behaviour archetypes branch here before the default chase/patrol.
export function monsterTurn(world, player, events, filter) {
  const px = world.pos.x;
  const py = world.pos.y;
  const occupied = new Set();
  for (const m of world.monsters) if (m.alive) occupied.add(m.y * world.width + m.x);

  for (const m of world.monsters) {
    if (!m.alive) continue;
    if (filter && !filter(m)) continue;

    // Damage-over-time first — a foe can die to poison/burn before it acts (exploders blast).
    if (m.statuses) {
      tickStatuses(m, events, false);
      if (m.hp <= 0) {
        m.alive = false;
        occupied.delete(m.y * world.width + m.x);
        if (m.explode) detonate(world, m, player, events);
        if (player.hp <= 0) { events.died = true; return; }
        continue;
      }
    }
    if (skipsTurn(m)) continue; // stunned / frozen / slowed-off-beat

    const dist = Math.abs(px - m.x) + Math.abs(py - m.y);
    const sight = m.sight || 5;
    const sees = Math.max(Math.abs(px - m.x), Math.abs(py - m.y)) <= sight && hasLOS(world, m.x, m.y, px, py);

    // Ambusher: disguised as a wall until @ steps within 2, then springs and chases.
    if (m.ambush && m.hidden) {
      if (dist <= 2) { m.hidden = false; m.chasing = true; if (events.log) events.log.push(`${m.name} springs from the wall!`); }
      else continue;
    }

    const adjacent = dist === 1;
    if (adjacent && (sees || m.chasing)) {
      m.chasing = true;
      monsterBite(m, player, events);
      if (m.fast && player.hp > 0) monsterBite(m, player, events);
      if (player.hp <= 0) { events.died = true; return; }
      continue;
    }

    // Ranged spitter — fire down LOS instead of closing, on a cooldown; still drifts closer between shots.
    if (m.ranged) {
      if (sees && dist > 1 && (m._cd || 0) <= 0) {
        const dmg = Math.max(1, Math.round(m.atk * 0.7) - Number(player.def || 0));
        player.hp = Math.max(0, player.hp - dmg);
        events.damageTaken = (events.damageTaken || 0) + dmg;
        applyStatus(player, "poison", 3, 1);
        if (events.log) events.log.push(`${m.name} spits for ${dmg}.`);
        m._cd = RANGED_COOLDOWN;
        m.chasing = true;
        if (player.hp <= 0) { events.died = true; return; }
        continue;
      }
      if (m._cd > 0) m._cd -= 1;
    }

    // Summoner — spawn an adjacent minion while it can see you, on a cooldown and under the cap.
    if (m.summon && sees) {
      if ((m._cd || 0) <= 0 && world.monsters.filter((o) => o.alive).length < SUMMON_CAP) {
        const spot = adjacentFree(world, m, occupied);
        if (spot) {
          const minion = makeMinion(world);
          minion.x = spot.x; minion.y = spot.y; minion.home = { x: spot.x, y: spot.y };
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

    const target = sees ? (m.chasing = true, greedyStep(world, m, px, py, occupied))
      : (m.chasing = false, patrolStep(world, m, occupied));
    if (target) {
      occupied.delete(m.y * world.width + m.x);
      m.x = target.x; m.y = target.y; if (target.dir) m.dir = target.dir;
      occupied.add(m.y * world.width + m.x);
    }
  }
}
