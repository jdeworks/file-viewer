// elements.js — the element-interaction matrix. Generalises the spreading-fire system (fire.js) into
// a small data table of ELEMENTS, each mapped to a carried status, plus an INTERACTIONS matrix that
// decides what happens when two elements meet. Fire keeps its EXACT behaviour (it just sources its
// glyph / burn status / damage here now); the new elements layer combos on top — teaching the
// "interact two systems" literacy:
//   • frost  — freezes a foe; striking a FROZEN foe SHATTERS it for bonus damage (and thaws it).
//   • acid   — corrodes a foe's integrity; a CORRODED foe takes amplified damage (armour stripped).
//   • gas    — the spore field (fuel). When FIRE reaches GAS the cloud DETONATES (fire+gas → explode).
// Pure logic, fully DETERMINISTIC (no rng, no Date.now): every combo is decided by which elements are
// present, so it reproduces from a save. elements.js imports only status.js, so it never forms a cycle.

import { applyStatus } from "./status.js";

// The element table — the single place an element ↔ status mapping (and its glyph/colour) lives.
export const ELEMENTS = {
  fire:  { id: "fire",  status: "burn",     turns: 3, power: 2, glyph: "▴", cls: "s2-c-fire" },
  frost: { id: "frost", status: "frozen",   turns: 4, power: 1, glyph: "❄", cls: "s2-c-frost" },
  acid:  { id: "acid",  status: "corroded", turns: 5, power: 1, glyph: "≀", cls: "s2-c-acid" },
  gas:   { id: "gas",   status: "poison",   turns: 4, power: 1, glyph: "*", cls: "s2-c-spores" }
};

// When two elements share a cell/target, the matrix decides the combined effect. Keys are the two
// element ids sorted + joined, so interact() is order-independent.
export const INTERACTIONS = {
  "fire+gas": "explode",   // an ignited spore cloud bursts (fire reaches the gas fuel)
  "fire+frost": "melt",    // flame thaws frost (both cancel)
  "acid+frost": "brittle"  // a corroded + frozen foe shatters for even more
};
export function interact(a, b) {
  if (!ELEMENTS[a] || !ELEMENTS[b]) return null;
  return INTERACTIONS[[a, b].sort().join("+")] || null;
}

// Damage amplification a CORRODED (acid-stripped) bearer suffers — the "armour strip" made real.
export const BRITTLE_MULT = 1.4;
// Bonus fraction added when SHATTERING a frozen foe (frost combo).
export const SHATTER_BONUS = 0.6;
// Extra shatter when the foe is ALSO corroded (the acid+frost "brittle" interaction).
export const BRITTLE_SHATTER_BONUS = 1.0;

// Apply an element to an entity as its status (the single element→status entry point).
export function applyElement(ent, elementId) {
  const el = ELEMENTS[elementId];
  if (!el) return false;
  applyStatus(ent, el.status, el.turns, el.power);
  return true;
}

function has(ent, type) {
  return Boolean(ent && ent.statuses && ent.statuses[type] && ent.statuses[type].turns > 0);
}

// Resolve a melee hit against a foe THROUGH the element matrix. A corroded foe is brittle (takes
// amplified damage); a frozen foe SHATTERS for bonus damage and is thawed (frost consumed). When the
// foe is BOTH corroded and frozen the acid+frost "brittle" interaction adds even more. Returns
// {total, shattered} — pure except that it consumes the frozen status it cracks.
export function elementStrike(foe, dmg) {
  let total = dmg;
  let shattered = false;
  const corroded = has(foe, "corroded");
  if (corroded) total = Math.round(total * BRITTLE_MULT);
  if (has(foe, "frozen")) {
    const bonus = corroded ? BRITTLE_SHATTER_BONUS : SHATTER_BONUS;
    total += Math.round(dmg * bonus);
    delete foe.statuses.frozen; // the ice cracks — frost consumed, foe can act again
    shattered = true;
  }
  return { total, shattered };
}

// fire+gas → explode: an igniting spore (gas) cloud bursts, dealing a one-tick blast to the player
// and monsters within radius 1 of the cell. Deterministic; adds NO new fire cells (fuel-bounded
// spread stays owned by fire.js). Called by tickFire when flame first reaches a spore cell, and by
// the E3 wych-gas pocket detonation (which passes a bigger `power`). Default = the spore-cloud burst.
export function gasExplosion(world, x, y, player, events, power) {
  power = power != null ? power : 3 + (world.floor || 1);
  for (const m of world.monsters) {
    if (m.alive && Math.abs(m.x - x) + Math.abs(m.y - y) <= 1) {
      m.hp -= power;
      if (m.hp <= 0) m.alive = false;
    }
  }
  if (player && typeof player.hp === "number"
    && Math.abs(world.pos.x - x) + Math.abs(world.pos.y - y) <= 1) {
    player.hp = Math.max(0, player.hp - power);
    if (events) {
      events.damageTaken = (events.damageTaken || 0) + power;
      if (events.log) events.log.push(`the spore cloud detonates for ${power}!`);
      if (player.hp <= 0) events.died = true;
    }
  }
  if (events) events.gasExplode = (events.gasExplode || 0) + 1;
}
