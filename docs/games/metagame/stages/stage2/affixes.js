// Weapon affixes (C2) — horizontal progression: the weapon you carry gives a per-hit identity, not
// just a bigger +ATK number. The most-recently-picked weapon's affix becomes the player's active
// on-hit effect (player.affix). Rolled at generation; better/likelier deeper. Pure logic.

import { applyStatus } from "./status.js";

export const WEAPON_AFFIXES = ["vampiric", "cleave", "burning", "knockback", "double"];
const LABEL = { vampiric: "vampiric", cleave: "cleaving", burning: "burning", knockback: "knockback", double: "double-strike" };

export function rollAffix(rng, floor) {
  const chance = Math.min(0.6, 0.12 + floor * 0.05);
  return rng.float() < chance ? rng.pick(WEAPON_AFFIXES) : null;
}

export function affixLabel(a) { return a ? (LABEL[a] || a) : ""; }

// Base hit damage given the equipped affix — double-strike swings for twice.
export function affixDamage(player) {
  const base = Math.max(1, player.atk);
  return player.affix === "double" ? base * 2 : base;
}

// On-hit side effects of the equipped affix, applied right after `dmg` lands on `foe` (so vampiric /
// cleave / burning fire even on a finishing blow). knockback only shoves a survivor.
export function applyHitAffix(world, player, foe, dmg, events) {
  const a = player.affix;
  if (!a) return;
  if (a === "vampiric") {
    player.hp = Math.min(player.maxHp, player.hp + Math.max(1, Math.round(dmg * 0.2)));
  } else if (a === "burning") {
    applyStatus(foe, "burn", 3, 2);
  } else if (a === "knockback" && foe.hp > 0) {
    const tx = foe.x + Math.sign(foe.x - world.pos.x);
    const ty = foe.y + Math.sign(foe.y - world.pos.y);
    if (world.grid[ty] && world.grid[ty][tx] === "." && !world.monsters.some((m) => m.alive && m.x === tx && m.y === ty)) { foe.x = tx; foe.y = ty; }
  } else if (a === "cleave") {
    // Swing arc: every OTHER foe adjacent to the player takes half damage.
    for (const o of world.monsters) {
      if (!o.alive || o === foe || o.ally) continue;
      if (Math.abs(o.x - world.pos.x) + Math.abs(o.y - world.pos.y) === 1) {
        o.hp -= Math.max(1, Math.round(dmg * 0.5));
        if (o.hp <= 0) o.alive = false;
      }
    }
  }
}
