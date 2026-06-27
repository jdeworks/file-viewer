// Trap tiles (B4) — INVISIBLE until you step on them (unlike the always-visible A2 hazards), then
// they spring once and leave a marker. Denser/nastier deeper. Same save/index pattern as hazards:
// the cells are saved (with their sprung flag), the O(1) trapAt index is non-enumerable + rebuilt.

import { applyStatus } from "./status.js";
import { isOpen } from "./monsters.js";

// Sprung-trap marker glyphs/colour (nothing is drawn before it springs).
export const TRAP_GLYPH = { dart: "˙", alarm: "¡", pit: "o", blink: "✶" };
export const TRAP_CLASS = "s2-c-trap";

function trapPlan(floor) {
  if (floor <= 2) return { types: ["dart"], density: 0.25 };
  if (floor <= 4) return { types: ["dart", "alarm", "blink"], density: 0.5 };
  if (floor <= 6) return { types: ["dart", "alarm", "blink", "pit"], density: 0.8 };
  return { types: ["dart", "alarm", "pit", "blink"], density: 1.1 };
}

export function placeTraps(rng, floor, roomN, takeCell) {
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

export function trapIndex(world) {
  const map = new Map();
  if (Array.isArray(world.traps)) for (const t of world.traps) map.set(t.y * world.width + t.x, t);
  return (x, y) => map.get(y * world.width + x);
}

// Random reachable-ish open floor cell within `rad` of the player, for the blink trap.
function blinkCell(world, rng, rad) {
  for (let t = 0; t < 50; t += 1) {
    const x = world.pos.x + rng.int(-rad, rad);
    const y = world.pos.y + rng.int(-rad, rad);
    if (isOpen(world, x, y) && !(world.hazardAt && world.hazardAt(x, y))) return { x, y };
  }
  return null;
}

// Spring a trap as the player enters its cell (step() already moved @ there). Sets events.died /
// events.descend (pit) as needed; the trap is flipped to sprung so it never fires twice.
export function springTrap(world, player, trap, events) {
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
      if (m.alive && !m.ally && Math.abs(m.x - world.pos.x) + Math.abs(m.y - world.pos.y) <= 16) { m.chasing = true; if (m.ambush) { m.hidden = false; } woke += 1; }
    }
    events.log.push(`an alarm trap! ${woke} foes wake and converge.`);
  } else if (trap.type === "blink") {
    const rng = makeBlinkRng(world, trap);
    const spot = blinkCell(world, rng, 8);
    if (spot) { world.pos = { x: spot.x, y: spot.y }; events.moved = true; events.blinked = true; }
    events.log.push("a blink rune! you're flung across the floor.");
  } else if (trap.type === "pit") {
    const dmg = 4 + world.floor;
    player.hp = Math.max(0, player.hp - dmg);
    events.damageTaken = (events.damageTaken || 0) + dmg;
    if (player.hp <= 0) { events.died = true; return; }
    events.descend = true;
    events.fell = true;
    events.log.push(`a hidden pit — ${dmg} fall damage — you drop a floor.`);
  }
}

// Deterministic-enough blink rng keyed off the trap location (no wall-clock).
function makeBlinkRng(world, trap) {
  let h = (trap.x * 73856093) ^ (trap.y * 19349663) ^ (world.stepCount || 0);
  return { int: (lo, hi) => { h = (h * 1103515245 + 12345) & 0x7fffffff; return lo + (h % (hi - lo + 1)); } };
}
