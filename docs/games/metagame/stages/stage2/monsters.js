// Monster AI — patrol, chase-on-sight, and the depth-unlocked behaviour archetypes (A1):
//   ranged   (spitter)  — fires down line-of-sight instead of closing; poisons.
//   summon   (forkbomb) — spawns weak minions adjacent while it sees you.
//   explode  (segfault) — detonates an area blast when it dies (punishes pure bump-attack).
//   ambush   (dangling) — disguised as a wall until you step close, then springs.
// Pure data/logic, no DOM. Monsters move on the renderer's real-time clocks (one bucket per call),
// so this never needs determinism — anything spawned here is just appended to world.monsters.

import { DIRS, DIR_LIST } from "./dirs.js";
import { tickStatuses, skipsTurn, applyStatus } from "./status.js";
import { spawnMonster } from "./data.js";
import { makeRng } from "./rng.js";
import { torchSightBonus, litCell } from "./darkness.js";
import { lightEaterTick, mirrorTick, phantomTick } from "./overflow.js";
import { iceSlide } from "./hazards.js";

const SUMMON_CAP = 90; // hard ceiling on live monsters so a summoner can't runaway-spawn
const RANGED_COOLDOWN = 2;
const SUMMON_COOLDOWN = 4;
const EXPLODE_RADIUS = 2;
const SHADOW_RANGE = 9; // D3: how close (Manhattan) @ must drift for an unlit void ref to shadow-step

export function isOpen(world, x, y) {
  return y >= 0 && x >= 0 && y < world.grid.length && x < world.width && world.grid[y][x] !== "#";
}

function freeCell(world, x, y, occupied) {
  if (!isOpen(world, x, y) || occupied.has(y * world.width + x)) return false;
  if (x === world.pos.x && y === world.pos.y) return false;
  // Monsters avoid lethal terrain (lava/spikes) unless they're already doomed by it.
  if (world.hazardAt && world.hazardAt(x, y) && !world.hazardSafe) {
    const hz = world.hazardAt(x, y);
    if (hz === "lava" || hz === "spikes" || hz === "acid") return false; // E2: foes funnel AROUND acid pools
  }
  return true;
}

// D3 void ref: a free open cell cardinally adjacent to @ to shadow-step into (deterministic, DIR_LIST
// order; freeCell already excludes occupied cells, @ itself, and lethal terrain so it never blinks
// onto lava/acid). Returns null when @ is fully boxed in.
function adjacentToPlayerFree(world, occupied) {
  for (const d of DIR_LIST) {
    const x = world.pos.x + DIRS[d].dx;
    const y = world.pos.y + DIRS[d].dy;
    if (freeCell(world, x, y, occupied)) return { x, y };
  }
  return null;
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

// E1 — a monster that just stepped onto ice glides one more cell in the heading it was moving. Over a
// chasm it dies (the headline combo: freeze a wet cell into ice next to a chasm, then a chaser slides
// in); into a wall it's stunned 2 turns; onto a free cell it slides on; a blocked cell stops it on the
// ice. `from{X,Y}` is the cell it came from (gives the slide direction). Deterministic positional logic.
function slideMonster(world, m, fromX, fromY, occupied, events) {
  if (!world.hazardAt || world.hazardAt(m.x, m.y) !== "ice") return;
  const sl = iceSlide(world, m.x, m.y, m.x - fromX, m.y - fromY);
  if (sl.wall) { applyStatus(m, "stun", 2, 1); if (events.log) events.log.push(`${m.name} skids on the ice and slams into the wall!`); return; }
  if (sl.chasm) {
    occupied.delete(m.y * world.width + m.x);
    m.alive = false; m.hp = 0;
    if (events.log) events.log.push(`${m.name} skids across the ice into the chasm!`);
    return;
  }
  if (occupied.has(sl.y * world.width + sl.x) || (sl.x === world.pos.x && sl.y === world.pos.y)) return; // blocked — stops on the ice
  occupied.delete(m.y * world.width + m.x);
  m.x = sl.x; m.y = sl.y;
  occupied.add(m.y * world.width + m.x);
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

// An alive, non-ally monster of the OTHER faction on a cardinally-adjacent cell (C5 infighting).
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

// ── A4 lingering pressure ─────────────────────────────────────────────────────────────────────
// As the player lingers on a floor (step count climbs), extra wanderers fade in OFF-camera and
// hunt — the anti-turtle valve. The first spawn + the interval both shrink with depth, so deeper
// floors pressure you sooner and faster. Call on a real-time clock; returns how many spawned.
export function pressureSpawn(world) {
  if (world.stepCount == null) return 0;
  const interval = Math.max(12, 40 - world.floor * 4);
  const first = Math.max(20, 60 - world.floor * 5);
  if (world._nextWander == null) world._nextWander = first;
  if (world.stepCount < world._nextWander) return 0;
  if (world.monsters.filter((m) => m.alive).length >= SUMMON_CAP * 4) return 0; // absolute safety cap
  world._nextWander = world.stepCount + interval;
  world._wanderN = (world._wanderN || 0) + 1;
  const rng = makeRng(`${world.seed}:${world.floor}:wander:${world._wanderN}`);
  const spot = offscreenCell(world, rng);
  if (!spot) return 0;
  const m = spawnMonster(rng, world.floor, world.monsters.length);
  m.x = spot.x; m.y = spot.y; m.home = { x: spot.x, y: spot.y };
  m.chasing = true;
  m.bucket = world._wanderN % 5;
  if (m.ambush) { m.ambush = false; m.hidden = false; } // wanderers hunt, they don't lie in wait
  world.monsters.push(m);
  return 1;
}

// A reachable floor cell outside the ~48×22 camera box (so wanderers appear off-screen, then walk in).
function offscreenCell(world, rng) {
  for (let t = 0; t < 60; t += 1) {
    const dx = rng.int(-44, 44);
    const dy = rng.int(-30, 30);
    if (Math.abs(dx) <= 26 && Math.abs(dy) <= 13) continue; // inside the visible box — skip
    const x = world.pos.x + dx;
    const y = world.pos.y + dy;
    if (isOpen(world, x, y) && !(world.hazardAt && world.hazardAt(x, y))) return { x, y };
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
    bucket: world._summonN % 5, faction: 0
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

// A freed captive ally (B2): close on and bite the nearest hostile monster; idle-patrol if none in
// reach. Never targets or damages the player. Killing an exploder still detonates (player unhurt).
function allyTurn(world, m, occupied, events) {
  let target = null;
  let bd = Infinity;
  for (const o of world.monsters) {
    if (!o.alive || o.ally || o === m) continue;
    const d = Math.abs(o.x - m.x) + Math.abs(o.y - m.y);
    if (d < bd) { bd = d; target = o; }
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
    const t = greedyStep(world, m, target.x, target.y, occupied);
    if (t) { occupied.delete(m.y * world.width + m.x); m.x = t.x; m.y = t.y; occupied.add(m.y * world.width + m.x); }
    return;
  }
  const t = patrolStep(world, m, occupied);
  if (t) { occupied.delete(m.y * world.width + m.x); m.x = t.x; m.y = t.y; m.dir = t.dir; occupied.add(m.y * world.width + m.x); }
}

// Advance monsters one tile. `filter` (optional) restricts which act this call — used to drive the
// 5 shared real-time clocks (one bucket per call). Mutates monsters + the player (bites/spits) and
// appends to `events`. Behaviour archetypes branch here before the default chase/patrol.
export function monsterTurn(world, player, events, filter) {
  const px = world.pos.x;
  const py = world.pos.y;
  const torchAggro = torchSightBonus(world); // a burning torch in the dark draws foes from farther
  const occupied = new Set();
  for (const m of world.monsters) if (m.alive) occupied.add(m.y * world.width + m.x);

  for (const m of world.monsters) {
    if (!m.alive) continue;
    if (filter && !filter(m)) continue;

    // Freed captives (B2) fight FOR you — they hunt the nearest hostile, never the player.
    if (m.ally) { allyTurn(world, m, occupied, events); continue; }

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

    // Overflow-act foes mutate before acting: the light eater feeds on darkness; the mirror copies @;
    // the phantom is pinned (slowed) while a torch burns.
    if (m.lighteater) lightEaterTick(world, m, events);
    if (m.mirror) mirrorTick(m, player);
    if (m.phantom) phantomTick(world, m);

    const dist = Math.abs(px - m.x) + Math.abs(py - m.y);
    const sight = (m.sight || 5) + torchAggro;
    const sees = Math.max(Math.abs(px - m.x), Math.abs(py - m.y)) <= sight && hasLOS(world, m.x, m.y, px, py);

    // Void ref (D3) shadow-step. While UNLIT it lurks invisibly (every unlit foe is hidden); if @
    // drifts within SHADOW_RANGE it BLINKS to a cell beside @ and bites on its next turn — a dark
    // cell is never safe. A torch puts it inside the light (litCell true): the step is frozen and it
    // simply chases like a normal foe (so a torch both reveals AND defangs it). Deterministic.
    if (m.shadow && !litCell(world, m.x, m.y)) {
      if (dist <= SHADOW_RANGE) {
        const spot = adjacentToPlayerFree(world, occupied);
        if (spot) {
          occupied.delete(m.y * world.width + m.x);
          m.x = spot.x; m.y = spot.y;
          occupied.add(m.y * world.width + m.x);
          m.chasing = true;
          if (events.log) events.log.push(`${m.name} shadow-steps out of the dark beside you!`);
        }
      }
      continue; // unlit void refs lurk (or spent the turn blinking) — they don't patrol into view
    }

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
          minion.faction = m.faction; // minions share their summoner's camp
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

    // Faction infighting (C5): an idle monster (not engaged with @) bites an adjacent rival camp.
    if (!sees && !m.chasing) {
      const rival = adjacentRival(world, m);
      if (rival) {
        rival.hp -= Math.max(1, Math.round(m.atk * 0.8));
        if (rival.hp <= 0) { rival.alive = false; occupied.delete(rival.y * world.width + rival.x); if (rival.explode) detonate(world, rival, { hp: null }, events); }
        continue;
      }
    }

    const target = sees ? (m.chasing = true, greedyStep(world, m, px, py, occupied))
      : (m.chasing = false, patrolStep(world, m, occupied));
    if (target) {
      const fromX = m.x;
      const fromY = m.y;
      occupied.delete(m.y * world.width + m.x);
      m.x = target.x; m.y = target.y; if (target.dir) m.dir = target.dir;
      occupied.add(m.y * world.width + m.x);
      slideMonster(world, m, fromX, fromY, occupied, events); // E1 ice slide
    }
  }
}
