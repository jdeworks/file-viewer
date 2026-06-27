// Systemic spreading fire (C1) — the emergent-puzzle layer. Fire is lit by a firebolt rune, then
// spreads tile-to-tile each tick through SPORE fields (the fuel), burning whatever stands on it.
// Deliberately FUEL-BOUNDED (only spore cells carry it) so it can never engulf the whole map, and
// fully DETERMINISTIC (no RNG — spread is decided entirely by the spore layout), so it reproduces
// from a save. Only the small active-fire set updates per tick — never a terrain redraw.

import { applyStatus } from "./status.js";

export const FIRE_GLYPH = "▴";
const FIRE_LIFE = 5;
const MAX_FIRES = 400;

function burnedSet(world) {
  world.burned = world.burned || [];
  return world.burned;
}

// Light a single cell (a firebolt impact). Marks it burned so it can't re-ignite later.
export function igniteCell(world, x, y, life = FIRE_LIFE) {
  if (!world.grid[y] || world.grid[y][x] === "#") return;
  world.fires = world.fires || [];
  if (world.fires.length >= MAX_FIRES || world.fires.some((f) => f.x === x && f.y === y)) return;
  world.fires.push({ x, y, life });
  const idx = y * world.width + x;
  if (!burnedSet(world).includes(idx)) world.burned.push(idx);
}

// One fire tick: burn the player/monsters on fire cells, spread to adjacent UNBURNED spore tiles,
// and age fires out. Called on a real-time clock (renderer). Sets events.died on a fatal burn.
export function tickFire(world, player, events) {
  if (!world.fires || !world.fires.length) return;
  const burned = burnedSet(world);
  const dmg = 4 + world.floor;
  const next = [];
  const fresh = [];
  for (const f of world.fires) {
    if (world.pos.x === f.x && world.pos.y === f.y) {
      player.hp = Math.max(0, player.hp - dmg);
      events.damageTaken = (events.damageTaken || 0) + dmg;
      applyStatus(player, "burn", 3, 2);
      if (player.hp <= 0) events.died = true;
    }
    for (const m of world.monsters) {
      if (m.alive && m.x === f.x && m.y === f.y) { m.hp -= dmg; applyStatus(m, "burn", 3, 2); if (m.hp <= 0) m.alive = false; }
    }
    // Spread into adjacent spore fuel that hasn't burned yet.
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = f.x + dx;
      const ny = f.y + dy;
      const idx = ny * world.width + nx;
      if (world.hazardAt && world.hazardAt(nx, ny) === "spores" && !burned.includes(idx)
        && !fresh.some((g) => g.x === nx && g.y === ny)) {
        fresh.push({ x: nx, y: ny, life: FIRE_LIFE });
        burned.push(idx);
      }
    }
    f.life -= 1;
    if (f.life > 0) next.push(f);
  }
  world.fires = next.concat(fresh);
  events.fireActive = world.fires.length;
}
