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
    applyEnemy: (status, n) => addStatus(combat.enemy, status, n),
    applySelf: (status, n) => addStatus(combat.player, status, n),
    // DELAY: schedule `fn(ctx)` to resolve at the start of a future player turn (deterministic).
    // A relic (Fast Retransmit) can land the FIRST queued effect one turn sooner.
    queue: (turnsAhead, fn) => {
      let ahead = Math.max(1, Math.floor(turnsAhead) || 1);
      if (combat.delaySpeedup && !combat.delayUsed) { ahead = Math.max(1, ahead - 1); combat.delayUsed = true; }
      combat.pending.push({ turn: combat.turn + ahead, fn });
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
