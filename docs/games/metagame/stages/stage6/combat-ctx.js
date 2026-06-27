// combat-ctx.js — Stage 6 card-facing API (ctx) + relic hooks.
//
// makeCtx builds the object a card's effect(ctx) mutates the fight through (deal/block/draw/queue…),
// so all card logic stays declarative in cards.js. relicCtx is the slimmer surface relics observe
// the fight through, and runHook fires a named relic hook. Keeping the ctx surface here isolates the
// "what a card can do" contract from the turn loop in combat.js.

import { dealToEnemy, addStatus, DURATION_STATUSES, log } from "./combat-damage.js";
import { drawCards } from "./combat-piles.js";

// Upgraded cards share their base id minus a trailing "+" (see card-upgrades.js). Combos that key
// off a specific card (e.g. "ACK was played") match the base, so an upgrade never breaks a synergy.
function baseId(id) {
  return typeof id === "string" && id.endsWith("+") ? id.slice(0, -1) : id;
}

export function makeCtx(combat, card) {
  return {
    combat,
    card,
    // Boss negotiation (optional): a Signal-type card whose handshake is unmet deals 0 —
    // "PROTOCOL MISMATCH". Protocol/Layer cards always resolve. See boss-combat.js.
    deal: (n) => {
      if (combat.acceptance && card && card.type === "Signal" && !combat.acceptance(combat, card)) {
        log(combat, "PROTOCOL MISMATCH — signal refused.");
        return;
      }
      dealToEnemy(combat, n);
    },
    block: (n) => { combat.player.block += Math.max(0, Math.round(n)); },
    draw: (n) => drawCards(combat, n),
    gainEnergy: (n) => { combat.player.energy += n; },
    // Restore HP (capped at max). Used by potions (Hotfix) and onKill heal relics. No RNG.
    heal: (n) => { combat.player.hp = Math.min(combat.player.maxHp, combat.player.hp + Math.max(0, Math.round(n))); },
    // Return the last card played this fight from the discard back to hand (Rollback potion).
    returnLastPlayed: () => {
      const id = combat.lastCardPlayed;
      if (id == null) return false;
      const i = combat.discard.lastIndexOf(id);
      if (i < 0) return false;
      combat.discard.splice(i, 1);
      combat.hand.push(id);
      return true;
    },
    applyEnemy: (status, n) => addStatus(combat.enemy, status, n),
    applySelf: (status, n) => addStatus(combat.player, status, n),
    // DELAY: schedule a DECLARATIVE effect `op` (e.g. { deal: 8 } / { block: 9 }) to resolve at the
    // start of a future player turn. The op is a plain object (not a closure) so the pending queue is
    // serializable — a reload resumes the same delayed packets. combat-modes.applyOp interprets it.
    // A relic (Fast Retransmit) can land the FIRST queued effect one turn sooner.
    queue: (turnsAhead, op) => {
      let ahead = Math.max(1, Math.floor(turnsAhead) || 1);
      if (combat.delaySpeedup && !combat.delayUsed) { ahead = Math.max(1, ahead - 1); combat.delayUsed = true; }
      combat.pending.push({ turn: combat.turn + ahead, op });
    },
    // THROUGHPUT: widen the congestion window by n (and gain n energy now).
    widenWindow: (n) => {
      combat.window = (combat.window || combat.player.maxEnergy) + n;
      combat.player.maxEnergy += n;
      combat.player.energy += n;
    },
    noWindowShrink: () => { combat.noShrinkNextTurn = true; },
    // THROUGHPUT: return all Packet-Loss jammed cards to hand (Defrag).
    defrag: () => { combat.hand.push(...combat.jammed); combat.jammed = []; },
    clearSelfDebuffs: () => {
      let cleared = 0;
      for (const key of Object.keys(combat.player.statuses)) {
        if (DURATION_STATUSES.has(key)) { cleared += combat.player.statuses[key]; delete combat.player.statuses[key]; }
      }
      return cleared;
    },
    skipEnemyNext: () => { combat.enemy.skipNext = true; },
    // Base-id aware: an upgraded "ACK+" still counts as having played "ACK" this turn.
    playedThisTurn: (id) => combat.playedIdsThisTurn.some((pid) => baseId(pid) === baseId(id)),
    // SEQUENCE: true while resolving the FIRST card played this turn (the counter is bumped before
    // the effect runs, so the first card sees cardsPlayedThisTurn === 1).
    get isFirstCard() { return combat.cardsPlayedThisTurn === 1; },
    get cardsPlayed() { return combat.cardsPlayedThisTurn; },
    get energySpent() { return combat.energySpentThisTurn; },
    get handSize() { return combat.hand.length; },
    get blockNow() { return combat.player.block; },
    get hp() { return combat.player.hp; },
    get discardPile() { return combat.discard; }
  };
}

// Relics observe the fight through the same primitives cards use.
export function relicCtx(combat, card) {
  return {
    combat, card,
    deal: (n) => dealToEnemy(combat, n),
    block: (n) => { combat.player.block += Math.max(0, Math.round(n)); },
    draw: (n) => drawCards(combat, n),
    gainEnergy: (n) => { combat.player.energy += n; },
    applySelf: (status, n) => addStatus(combat.player, status, n),
    applyEnemy: (status, n) => addStatus(combat.enemy, status, n)
  };
}

export function runHook(combat, name, card = null) {
  for (const relic of combat.relics) {
    const fn = relic.hooks?.[name];
    if (typeof fn === "function") fn(relicCtx(combat, card));
  }
}
