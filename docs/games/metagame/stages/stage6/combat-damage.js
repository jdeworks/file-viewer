// combat-damage.js — Stage 6 combat damage / block / status primitives.
//
// The low-level mutators every other combat module funnels through. Status model (stacks):
// vulnerable (takes +50% attack dmg), weak (deals -25% attack dmg), each decremented at the owner's
// turn start; strength is a permanent power (does not tick). Block is not a status; it resets each
// owner turn. No RNG here — damage resolution is fully deterministic.

export function dealToEnemy(combat, baseAmount) {
  let amount = Math.max(0, Math.round(baseAmount));
  if (combat.player.statuses.strength) amount += combat.player.statuses.strength;
  if (combat.player.statuses.weak) amount = Math.floor(amount * 0.75);
  if (combat.enemy.statuses.vulnerable) amount = Math.floor(amount * 1.5);
  amount = Math.max(0, amount - combat.enemy.armor);
  const absorbed = Math.min(combat.enemy.block, amount);
  combat.enemy.block -= absorbed;
  combat.enemy.hp = Math.max(0, combat.enemy.hp - (amount - absorbed));
}

export function dealToPlayer(combat, baseAmount, { pierce = false } = {}) {
  let amount = Math.max(0, Math.round(baseAmount));
  if (combat.enemy.statuses.weak) amount = Math.floor(amount * 0.75);
  if (combat.player.statuses.vulnerable) amount = Math.floor(amount * 1.5);
  if (pierce) { // unblockable (Expired Certificate's expiry) — block does not absorb it
    combat.player.hp = Math.max(0, combat.player.hp - amount);
    return;
  }
  const absorbed = Math.min(combat.player.block, amount);
  combat.player.block -= absorbed;
  combat.player.hp = Math.max(0, combat.player.hp - (amount - absorbed));
}

export function addStatus(entity, status, value) {
  entity.statuses[status] = (entity.statuses[status] || 0) + value;
  if (entity.statuses[status] <= 0) delete entity.statuses[status];
}

// Only duration statuses count down at the owner's turn start; powers (e.g. strength) persist.
export const DURATION_STATUSES = new Set(["vulnerable", "weak"]);

export function tickStatuses(entity) {
  for (const key of Object.keys(entity.statuses)) {
    if (!DURATION_STATUSES.has(key)) continue;
    entity.statuses[key] -= 1;
    if (entity.statuses[key] <= 0) delete entity.statuses[key];
  }
}

// Append a line to the rolling combat log (kept to the last 10 entries).
export function log(combat, line) {
  combat.log = [...combat.log, line].slice(-10);
}
