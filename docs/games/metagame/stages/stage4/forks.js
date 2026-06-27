// forks.js — Stage 4 Fractal Bastion: tier-3 branching upgrade FORKS (the Kingdom Rush model).
//
// At level 3 a player picks ONE of two irrevocable forks per tower (stored on tower.fork). A fork can
// override the L3 ability AND/OR apply stat modifiers. This module is the data + tiny resolvers; the
// engine reads fork stat mods through forks.js helpers, abilities.js reads forkAbility, and the combat
// UI offers the choice. (Registry + UI land in the tier-3-fork increment; this is the seam.)

// Which ability a tower casts because of its chosen fork (null = use the tower type's default).
export function forkAbility(tower) {
  return forkDef(tower)?.ability || null;
}

// The chosen fork definition for a tower (or null when unchosen / unknown).
export function forkDef(/* tower */) {
  return null; // populated by the tier-3-fork increment
}

// Multiplicative stat modifier from a fork (1 = unmodified). `key` ∈ damage|fireRate|range|aoe.
export function forkStatMult(/* tower, key */) {
  return 1;
}
