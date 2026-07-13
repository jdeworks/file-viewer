// combat-damage.js — Stage 5 combat damage / block / status primitives.
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
  const landed = amount - absorbed;
  combat.enemy.hp = Math.max(0, combat.enemy.hp - landed);
  if (landed > 0) combat.enemy.unhurt = false; // the player damaged it this cycle (Stack Overflow fortify)
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

// CORRUPTION (Act 5 · PRESENTATION LAYER, verb DAMAGE-OVER-TIME): a poison-analogue stack carried by
// the enemy. At the enemy's turn start it deals damage equal to its current stacks (ignoring armor and
// block — it's a leak, not an attack), then decays by 1. A relic (Entropy Pool) makes it tick TWICE.
// Fully deterministic; no RNG. Inert until a card/relic applies the `corruption` status to the enemy.
export function tickCorruption(combat) {
  const enemy = combat.enemy;
  const stacks = enemy.statuses.corruption || 0;
  if (stacks <= 0) return;
  const ticks = combat.corruptionDouble ? 2 : 1;
  enemy.hp = Math.max(0, enemy.hp - stacks * ticks);
  enemy.statuses.corruption = stacks - 1;
  if (enemy.statuses.corruption <= 0) delete enemy.statuses.corruption;
}

// Only duration statuses count down at the owner's turn start; powers (e.g. strength) persist.
// Corruption is NOT here — it has its own damage-dealing decay (tickCorruption) at the enemy turn.
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
