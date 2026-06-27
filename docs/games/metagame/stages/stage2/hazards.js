// Hazard tiles (A2) — terrain that finally *means* something. They're sparse colored sprite-cells
// layered over the mono terrain (never a terrain redraw), each with an on-enter effect. Monsters
// avoid lava/spikes (monsters.freeCell); chasm is a risky shortcut straight down a floor. Placement
// is seeded in buildFloor; the live cells are saved verbatim, so attachGrid just rebuilds the index.

import { applyStatus } from "./status.js";

export const HAZARD_GLYPH = { lava: "≈", spores: "*", spikes: "^", chasm: ":", rift: "○", wet: "~", ice: "~" };
// rift reuses the chasm colour (a dim void-blue) so no new CSS is needed (styles.css is at the cap).
// wet/ice (E1) render with the same ~ glyph but different colour classes (blue water vs pale ice).
export const HAZARD_CLASS = { lava: "s2-c-lava", spores: "s2-c-spores", spikes: "s2-c-spikes", chasm: "s2-c-chasm", rift: "s2-c-chasm", wet: "s2-c-wet", ice: "s2-c-ice" };

// Available hazard types + density by floor band (the escalation arc: mild spikes early, lava/chasm
// deep). The Overflow act (floor 7+) adds the darkness-only `rift` — a void that snuffs your torch.
// density multiplies the base count.
function hazardPlan(floor) {
  if (floor <= 2) return { types: ["spikes"], density: 0.35 };
  if (floor <= 4) return { types: ["spikes", "spores", "chasm"], density: 0.8 };
  if (floor <= 6) return { types: ["spikes", "spores", "lava", "chasm"], density: 1.2 };
  return { types: ["lava", "spores", "chasm", "spikes", "rift"], density: 1.7 };
}

// E1 — Act II (the "hazard" act, floors 4-6: Flooded Cisterns + Emberworks) is the only band that
// drips `wet` cells: a handful of always-visible puddles a freeze rune glazes into `ice`. On ice, a
// stepping creature SLIDES one cell in its heading — into a chasm = instant kill, into a wall = stun.
// This is the act's missing positioning verb (freeze → slide a chaser into your prepared chasm).
const ICE_ACT = { from: 4, to: 6 };

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
  // E1: a controlled scatter of wet cells across the Cisterns act (separate from the random pool so
  // the slide puzzle is reliably present, not luck-of-the-draw). Deterministic via the shared rng.
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

// Build the {y*width+x → hazard} lookup so monsters.freeCell and step() can probe a cell in O(1).
// It stores the hazard OBJECT (not its type string) so a live mutation — the freeze rune turning a
// `wet` cell to `ice` (E1) — is reflected immediately without rebuilding the index.
export function hazardIndex(world) {
  const map = new Map();
  if (Array.isArray(world.hazards)) for (const h of world.hazards) map.set(h.y * world.width + h.x, h);
  return (x, y) => { const h = map.get(y * world.width + x); return h ? h.type : undefined; };
}

// E1 ice slide: a creature that lands on `ice` glides one more cell in its heading (dx,dy). Returns
// the outcome — {wall:true} if it slams a wall / leaves the map, {x,y,chasm:true} if it slides over a
// chasm (a kill), or {x,y} for an open glide cell. Pure positional logic — fully deterministic.
export function iceSlide(world, x, y, dx, dy) {
  const sx = x + dx;
  const sy = y + dy;
  const grid = world.grid;
  if (!(grid[sy] && grid[sy][sx] && grid[sy][sx] !== "#")) return { wall: true };
  if (world.hazardAt && world.hazardAt(sx, sy) === "chasm") return { x: sx, y: sy, chasm: true };
  return { x: sx, y: sy };
}

// E1 player slide: @ stepping onto ice glides one cell in the move heading (dx,dy). Returns the
// resting {x,y}. A chasm or open cell is glided onto (the caller's hazard pass then resolves a chasm
// fall as usual); a wall or a foe-occupied cell stops @ on the ice. Logs the skid. Deterministic.
export function playerIceSlide(world, x, y, dx, dy, events) {
  if (!world.hazardAt || world.hazardAt(x, y) !== "ice") return { x, y };
  const sl = iceSlide(world, x, y, dx, dy);
  const blocked = sl.wall || (sl.x != null && Array.isArray(world.monsters)
    && world.monsters.some((m) => m.alive && m.x === sl.x && m.y === sl.y));
  if (blocked) { events.log.push("you skid on the ice and bump the wall."); return { x, y }; }
  events.slid = true;
  events.log.push(sl.chasm ? "you skid across the ice — straight toward a chasm!" : "you skid across the ice.");
  return { x: sl.x, y: sl.y };
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
  } else if (hz === "rift") {
    // Void rift (Overflow act): SNUFFS your torch and leaves you reeling in the dark — shadow damage
    // plus a stumble (slow). Darkness navigation becomes load-bearing: a careless step kills your light.
    const dmg = 3 + world.floor;
    const hadTorch = Number(world.torch) > 0;
    world.torch = 0;
    player.hp = Math.max(0, player.hp - dmg);
    events.damageTaken = (events.damageTaken || 0) + dmg;
    applyStatus(player, "slow", 3, 1);
    events.riftSnuff = hadTorch;
    events.log.push(hadTorch
      ? `a void rift! your torch is swallowed — ${dmg} shadow damage, and you stumble blind.`
      : `a void rift! ${dmg} shadow damage drags at you — you stumble in the dark.`);
    if (player.hp <= 0) events.died = true;
  }
}
