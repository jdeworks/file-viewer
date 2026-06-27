// Glyph consumables (B3) — one-shot tactical tools found as loot, used with keys 1/2/3 or the HUD
// buttons. In-run build/tactic variety beyond the permanent shop upgrades; they synergise with the
// status + hazard systems (firebolt burns, freeze locks foes, blink escapes). Counts live on the
// run entity's `inventory`, so they reset each run. Pure logic — no DOM.

import { applyStatus } from "./status.js";
import { hasLOS, isOpen } from "./monsters.js";
import { igniteCell } from "./fire.js";
import { TORCH_STEPS } from "./darkness.js";

export const CONSUMABLES = {
  blink: { glyph: "♦", name: "blink rune", desc: "teleport across the room (escape)" },
  firebolt: { glyph: "♦", name: "firebolt", desc: "scorch + burn the nearest foe in sight" },
  freeze: { glyph: "♦", name: "freeze rune", desc: "freeze every foe around you" },
  torch: { glyph: "†", name: "torch", desc: "light the dark for a while — but the glare draws foes" }
};
export const CONSUMABLE_KEYS = ["blink", "firebolt", "freeze", "torch"];

// Scatter a few consumables on reachable floor cells (more, better deeper). Seeded via buildFloor.
// Torches only enter the loot pool from late Act II (floor 5+) and dominate it in the Overflow act
// (floor 7+) so you can stock up for the darkness — they're useless on the lit shallow floors.
export function placeConsumables(rng, floor, roomN, takeCell) {
  const count = Math.max(1, Math.round(roomN * 0.05) + Math.floor(floor / 2));
  const pool = ["blink", "firebolt", "freeze"];
  if (floor >= 5) pool.push("torch");
  if (floor >= 7) pool.push("torch", "torch");
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const c = takeCell();
    if (!c) break;
    out.push({ x: c.x, y: c.y, type: rng.pick(pool), taken: false });
  }
  return out;
}

function nearbyOpen(world, rad) {
  let h = (world.pos.x * 73856093) ^ (world.pos.y * 19349663) ^ ((world.stepCount || 0) * 83492791);
  for (let t = 0; t < 60; t += 1) {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    const dx = (h % (rad * 2 + 1)) - rad;
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    const dy = (h % (rad * 2 + 1)) - rad;
    const x = world.pos.x + dx;
    const y = world.pos.y + dy;
    if ((dx || dy) && isOpen(world, x, y) && !(world.hazardAt && world.hazardAt(x, y))) return { x, y };
  }
  return null;
}

function nearestVisibleFoe(world, rad) {
  let best = null;
  let bd = Infinity;
  for (const m of world.monsters) {
    if (!m.alive || m.ally) continue;
    const d = Math.abs(m.x - world.pos.x) + Math.abs(m.y - world.pos.y);
    if (d <= rad && d < bd && hasLOS(world, world.pos.x, world.pos.y, m.x, m.y)) { bd = d; best = m; }
  }
  return best;
}

// Use a consumable from the run inventory. Returns true if it was actually spent (a firebolt with no
// target fizzles WITHOUT consuming). Mutates world/player and appends to events.
export function useConsumable(world, player, type, events) {
  const inv = player.inventory || (player.inventory = {});
  if (!inv[type] || inv[type] <= 0) return false;
  if (type === "blink") {
    const spot = nearbyOpen(world, 7);
    if (!spot) { events.log.push("the blink rune finds nowhere to land."); return false; }
    world.pos = { x: spot.x, y: spot.y };
    events.moved = true; events.blinked = true;
    events.log.push("blink rune — you flicker across the floor.");
  } else if (type === "firebolt") {
    const foe = nearestVisibleFoe(world, 10);
    if (!foe) { events.log.push("firebolt fizzles — no target in sight."); return false; }
    const dmg = 12 + world.floor * 3;
    foe.hp -= dmg;
    applyStatus(foe, "burn", 4, 2);
    if (foe.hp <= 0) foe.alive = false;
    igniteCell(world, foe.x, foe.y); // C1: lights the impact cell — chains through spore fields
    events.log.push(`firebolt scorches ${foe.name} for ${dmg}${foe.hp <= 0 ? " — unparsed" : ""}.`);
  } else if (type === "freeze") {
    let n = 0;
    for (const m of world.monsters) {
      if (m.alive && !m.ally && Math.abs(m.x - world.pos.x) + Math.abs(m.y - world.pos.y) <= 5) { applyStatus(m, "frozen", 4, 1); if (m.ambush) m.hidden = false; n += 1; }
    }
    events.log.push(`freeze rune — ${n} foe${n === 1 ? "" : "s"} locked in place.`);
  } else if (type === "torch") {
    // Light vs stealth: floods a wide radius for a stretch of steps, but the glare wakes foes from
    // much farther (darkness.torchSightBonus reads world.torch). Re-lighting tops the timer up.
    world.torch = Math.max(Number(world.torch) || 0, TORCH_STEPS);
    events.log.push("you strike a torch — the dark peels back, but something stirs toward the light.");
  } else {
    return false;
  }
  inv[type] -= 1;
  events.used = type;
  return true;
}
