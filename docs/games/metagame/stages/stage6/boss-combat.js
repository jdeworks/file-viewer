// boss-combat.js — The Refused Connection as a REAL-DECK fight.
//
// The act-4 boss is no longer a 3-button puzzle: it is fought with the player's actual run deck
// through the normal combat engine. The negotiation survives as an *acceptance predicate* layered
// on top of combat — a Signal-type card only deals damage when the handshake is satisfied for the
// current phase; Protocol/Layer cards always resolve. This is the structural port of boss.js's
// phase rules (kept intact for its own unit test) into combat terms, so the player must satisfy
// the handshake with their REAL Protocol cards while their Signals carry the damage.
//
//   Phase 1 (HANDSHAKE)  — demands LEAD-SYN: Signals land only if the first card this turn was SYN.
//   Phase 2 (ESTABLISHED)— demands ACK-FIRST: Signals land only if an ACK was played earlier.
//   Phase 3 (MAINTAIN)   — the demand MUTATES each turn (D4): it alternates between LEAD-SYN and
//                          ACK-FIRST, so the player must re-sequence on the fly with the deck built
//                          across acts 1–3 (sequence + protocol both pay off).
//
// Deck-building matters: a deck with no ACK/Protocol cards can never satisfy the ACK-FIRST demand.

import { playCard, endTurn } from "./combat.js";
import { cardById } from "./cards.js";

// Per-phase HP pools (mirror boss.js PHASE_HP). Each phase is a fresh pool; overkill is lost.
export const BOSS_PHASE_HP = { 1: 60, 2: 80, 3: 60 };

export const DEMAND_LEAD_SYN = "lead-syn";
export const DEMAND_ACK_FIRST = "ack-first";

export function isSignalCard(card) {
  return card?.type === "Signal";
}

// Upgraded cards keep their base id minus a trailing "+", so an upgraded SYN+/ACK+ still satisfies
// the handshake (the negotiation cares about the protocol verb, not the card's tier).
function baseId(id) {
  return typeof id === "string" && id.endsWith("+") ? id.slice(0, -1) : id;
}

// The protocol the boss demands THIS turn. Phases 1–2 are fixed; phase 3 mutates by turn parity.
export function currentDemand(combat) {
  const phase = combat.bossPhase || 1;
  if (phase === 1) return DEMAND_LEAD_SYN;
  if (phase === 2) return DEMAND_ACK_FIRST;
  return (combat.turn % 2 === 1) ? DEMAND_LEAD_SYN : DEMAND_ACK_FIRST; // phase 3 mutates each turn
}

// Did the player play an ACK (or ACK+) this turn?
function ackPlayed(combat) {
  return combat.playedIdsThisTurn.some((id) => baseId(id) === "ACK");
}

// Is the current turn's demand satisfied?
function demandMet(combat) {
  return currentDemand(combat) === DEMAND_LEAD_SYN
    ? baseId(combat.playedIdsThisTurn[0]) === "SYN"
    : ackPlayed(combat);
}

// acceptance(combat, card) — consulted by the engine only for Signal cards.
// Returns false ⇒ that Signal deals 0 ("PROTOCOL MISMATCH").
export function accepts(combat, card) {
  if (!isSignalCard(card)) return true;          // Protocol/Layer always resolve
  if (combat.bossLocked) return false;           // ch9 unread ⇒ permanent mismatch (B3)
  return demandMet(combat);
}

// Wire the negotiation onto a freshly-created combat whose enemy is the-refused-connection.
// `locked` (ch9 unread) makes every Signal a mismatch ⇒ the fight is unwinnable (B3).
export function wireBossCombat(combat, { locked = false } = {}) {
  combat.bossPhase = 1;
  combat.bossLocked = Boolean(locked);
  combat.enemy.hp = BOSS_PHASE_HP[1];
  combat.enemy.maxHp = BOSS_PHASE_HP[1];
  combat.acceptance = accepts;
  combat.advancePhase = (c) => {
    const phase = c.bossPhase || 1;
    if (phase >= 3) return false;
    c.bossPhase = phase + 1;
    c.enemy.hp = BOSS_PHASE_HP[c.bossPhase];
    c.enemy.maxHp = BOSS_PHASE_HP[c.bossPhase];
    c.log = [...(c.log || []), `Phase ${c.bossPhase}.`].slice(-10);
    return true;
  };
  return combat;
}

// ── Test/debug driver ──────────────────────────────────────────────────────────────────────────
// Drive the REAL engine through the handshake correctly until the fight ends (or maxTurns). This
// plays real cards via the real acceptance — it is NOT a bypass: if `locked`, Signals deal 0 and
// the boss never dies. Used by the smoke harness to clear the fight without a hand-scripted hand.
export function autoNegotiate(combat, maxTurns = 80) {
  let turns = 0;
  while (!combat.over && turns++ < maxTurns) {
    playHandshakeTurn(combat);
    if (combat.over) break;
    endTurn(combat);
  }
  return combat;
}

function playHandshakeTurn(combat) {
  // Satisfy THIS turn's demand first: lead SYN for LEAD-SYN, play a Protocol (ACK) for ACK-FIRST.
  if (currentDemand(combat) === DEMAND_LEAD_SYN) playFirstMatch(combat, (c) => baseId(c.id) === "SYN");
  else playFirstMatch(combat, (c) => c.type === "Protocol");
  // Then spend remaining energy on anything affordable.
  let guard = 0;
  while (guard++ < 20 && playFirstMatch(combat, () => true)) { /* keep playing */ }
}

// Play the first hand card matching `pred` that we can afford. Returns true if one was played.
// playCard removes the card from hand, so repeated calls always make progress.
function playFirstMatch(combat, pred) {
  for (let i = 0; i < combat.hand.length; i++) {
    const card = cardById(combat.hand[i]);
    if (!card || card.cost > combat.player.energy) continue;
    if (!pred(card)) continue;
    playCard(combat, i);
    return true;
  }
  return false;
}
