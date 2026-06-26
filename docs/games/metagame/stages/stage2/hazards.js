// Hazard tiles (A2) — terrain that finally *means* something. They're sparse colored sprite-cells
// layered over the mono terrain (never a terrain redraw), each with an on-enter effect. Monsters
// avoid lava/spikes (monsters.freeCell); chasm is a risky shortcut straight down a floor. Placement
// is seeded in buildFloor; the live cells are saved verbatim, so attachGrid just rebuilds the index.

import { applyStatus } from "./status.js";

export const HAZARD_GLYPH = { lava: "≈", spores: "*", spikes: "^", chasm: ":" };
export const HAZARD_CLASS = { lava: "s2-c-lava", spores: "s2-c-spores", spikes: "s2-c-spikes", chasm: "s2-c-chasm" };

// Available hazard types + density by floor band (the escalation arc: mild spikes early, lava/chasm
// deep). density multiplies the base count.
function hazardPlan(floor) {
  if (floor <= 2) return { types: ["spikes"], density: 0.35 };
  if (floor <= 4) return { types: ["spikes", "spores", "chasm"], density: 0.8 };
  if (floor <= 6) return { types: ["spikes", "spores", "lava", "chasm"], density: 1.2 };
  return { types: ["lava", "spores", "chasm", "spikes"], density: 1.7 };
}

// Scatter hazards on reachable floor cells handed out by buildFloor's `takeCell` (which already
// skips the spawn / stairs). Deterministic via `rng`. Returns the hazards array.
export function placeHazards(rng, floor, roomN, takeCell) {
  const plan = hazardPlan(floor);
  const count = Math.round(roomN * 0.45 * plan.density);
  const hazards = [];
  for (let i = 0; i < count; i += 1) {
    const c = takeCell();
    if (!c) break;
    hazards.push({ x: c.x, y: c.y, type: rng.pick(plan.types) });
  }
  return hazards;
}

// Build the {y*width+x → type} lookup so monsters.freeCell and step() can probe a cell in O(1).
export function hazardIndex(world) {
  const map = new Map();
  if (Array.isArray(world.hazards)) for (const h of world.hazards) map.set(h.y * world.width + h.x, h.type);
  return (x, y) => map.get(y * world.width + x);
}

// Apply a hazard's on-enter effect to the player (step() resolved the move onto cell type `hz`).
// Sets events.died / events.descend (chasm fall) as needed.
export function enterHazard(world, player, hz, events) {
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
    if (player.hp <= 0) { events.died = true; return; }
    events.descend = true;
    events.fell = true;
    events.log.push(`you plunge through a chasm — ${dmg} fall damage — and drop a floor.`);
  }
}
