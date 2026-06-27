// combat.js — Stage 6 Protocol Codex: deck-combat engine core + public surface.
//
// One encounter = player vs one enemy. This file owns the combat lifecycle — createCombat, playCard,
// endTurn, and the win/lose death checks — and re-exports the engine's full public surface so the
// rest of the stage (run.js / boss-combat.js / renderer.js / ui-combat.js / tests) imports a single
// module unchanged. The engine is split by concern into focused siblings:
//   - combat-rng.js     makeRng / shuffle / hashSeed (also used by run/mapgen)
//   - combat-damage.js  dealToEnemy / dealToPlayer / addStatus / tickStatuses / status model
//   - combat-piles.js   draw / reshuffle / Packet-Loss jam
//   - combat-ctx.js     makeCtx (card-facing API) + relicCtx + runHook
//   - combat-enemy.js   enemyTurn / resolveIntent / currentIntent
//   - combat-modes.js   congestion window (applyTurnEnergy) + DELAY (resolvePending)
// Card effects are JS functions (cards.js) that mutate combat through the `ctx` API — all game logic
// lives in the engine, content stays declarative.

import { cardById } from "./cards.js";
import { makeTrackedRng, shuffle } from "./combat-rng.js";
import { drawCards, jamOne, releaseJam } from "./combat-piles.js";
import { makeCtx, runHook } from "./combat-ctx.js";
import { tickStatuses } from "./combat-damage.js";
import { enemyTurn } from "./combat-enemy.js";
import { applyTurnEnergy, resolvePending, WINDOW_CAP } from "./combat-modes.js";

const HAND_SIZE = 5;
const START_ENERGY = 3;

export function createCombat({ deck, player, enemy, seed = 1, relics = [], congestion = false, windowCap = WINDOW_CAP }) {
  const rng = makeTrackedRng(seed);
  const combat = {
    rng,
    rngSeed: seed,         // persisted in the snapshot so a reload resumes the same shuffle sequence
    relics,
    congestion,            // THROUGHPUT: when true, energy is a dynamic congestion window
    window: START_ENERGY,  // current window size (== maxEnergy while in congestion mode)
    windowCap: Math.max(START_ENERGY, windowCap),
    windowDecay: 1,        // how much a wide turn shrinks the window (relics can worsen this)
    player: {
      hp: player.hp,
      maxHp: player.maxHp,
      block: 0,
      energy: START_ENERGY,
      maxEnergy: START_ENERGY,
      statuses: {}
    },
    enemy: {
      id: enemy.id,
      name: enemy.name,
      hp: enemy.hp,
      maxHp: enemy.hp,
      block: 0,
      armor: Number(enemy.armor || 0),
      statuses: {},
      script: enemy.script,
      intentIndex: 0,
      skipNext: false
    },
    draw: shuffle(deck, rng),
    hand: [],
    discard: [],
    exhaust: [],
    pending: [], // DELAY (Act 2): effects queued to resolve at a future player turn (no RNG)
    jammed: [],  // THROUGHPUT (Act 3): cards set aside (Packet Loss) — unplayable until released/Defrag'd
    turn: 1,
    cardsPlayedThisTurn: 0,
    firstCardDiscount: 0, // SEQUENCE (Act 1): the first card each turn costs this much less (relic-set)
    energySpentThisTurn: 0,
    playedIdsThisTurn: [],
    lastCardPlayed: null,
    over: false,
    result: null,
    log: []
  };
  drawCards(combat, HAND_SIZE);
  runHook(combat, "onCombatStart");
  runHook(combat, "onPlayerTurnStart");
  return combat;
}

// ── Card play ───────────────────────────────────────────────────────────────────────────────────

export function playCard(combat, handIndex) {
  if (combat.over) return { ok: false, reason: "over" };
  const cardId = combat.hand[handIndex];
  if (cardId == null) return { ok: false, reason: "no-card" };
  const card = cardById(cardId);
  if (!card) return { ok: false, reason: "unknown-card" };
  // SEQUENCE: the first card played each turn may be discounted (Root Certificate relic).
  const isFirst = combat.cardsPlayedThisTurn === 0;
  const cost = Math.max(0, card.cost - (isFirst ? (combat.firstCardDiscount || 0) : 0));
  if (cost > combat.player.energy) return { ok: false, reason: "no-energy" };

  combat.player.energy -= cost;
  combat.energySpentThisTurn += cost;
  combat.cardsPlayedThisTurn += 1;
  combat.hand.splice(handIndex, 1);
  combat.playedIdsThisTurn.push(card.id);

  card.effect(makeCtx(combat, card));

  combat.lastCardPlayed = card.id;
  if (card.exhaust) combat.exhaust.push(card.id);
  else combat.discard.push(card.id);

  runHook(combat, "onCardPlay", card);
  checkEnemyDead(combat);
  return { ok: true, card: card.id };
}

// ── Turn loop ───────────────────────────────────────────────────────────────────────────────────

export function endTurn(combat) {
  if (combat.over) return combat;
  // Boss negotiation (optional): end-of-turn protocol response (e.g. phase-3 ongoing damage).
  if (typeof combat.onPlayerTurnEnd === "function") combat.onPlayerTurnEnd(combat);
  if (combat.over) return combat;
  // Discard the hand.
  combat.discard.push(...combat.hand);
  combat.hand = [];

  enemyTurn(combat);
  if (combat.over) return combat;

  // New player turn.
  combat.turn += 1;
  combat.player.block = 0;
  applyTurnEnergy(combat); // flat refill, or recompute the congestion window from this turn's spend
  combat.cardsPlayedThisTurn = 0;
  combat.energySpentThisTurn = 0;
  combat.playedIdsThisTurn = [];
  tickStatuses(combat.player);
  releaseJam(combat); // Packet Loss from last turn cycles back into the deck before the new draw
  drawCards(combat, HAND_SIZE);
  runHook(combat, "onPlayerTurnStart");
  resolvePending(combat); // DELAY: deferred effects land at the start of the new player turn
  if (combat.jamPending) { jamOne(combat); combat.jamPending = false; } // jam one of the new hand
  return combat;
}

// ── Death checks ────────────────────────────────────────────────────────────────────────────────

export function checkEnemyDead(combat) {
  if (combat.enemy.hp <= 0 && !combat.over) {
    // Boss negotiation (optional): a multi-phase boss refills to its next phase instead of dying.
    if (typeof combat.advancePhase === "function" && combat.advancePhase(combat)) return;
    combat.over = true;
    combat.result = "win";
  }
}

export function checkPlayerDead(combat) {
  if (combat.player.hp <= 0 && !combat.over) {
    combat.over = true;
    combat.result = "lose";
  }
}

// ── Re-exports: the engine's stable public surface (imports elsewhere stay unchanged) ─────────────
export { makeRng, shuffle, hashSeed } from "./combat-rng.js";
export { dealToEnemy, dealToPlayer } from "./combat-damage.js";
export { drawCards } from "./combat-piles.js";
export { currentIntent } from "./combat-enemy.js";
