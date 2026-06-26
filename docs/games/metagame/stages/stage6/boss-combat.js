// boss-combat.js — The Refused Connection as a REAL-DECK fight.
//
// The act-4 boss is no longer a 3-button puzzle: it is fought with the player's actual run deck
// through the normal combat engine. The negotiation survives as an *acceptance predicate* layered
// on top of combat — a Signal-type card only deals damage when the handshake is satisfied for the
// current phase; Protocol/Layer cards always resolve. This is the structural port of boss.js's
// phase rules (kept intact for its own unit test) into combat terms, so the player must satisfy
// the handshake with their REAL Protocol cards while their Signals carry the damage.
//
//   Phase 1 (HANDSHAKE)  — Signals land only if the FIRST card played this turn was SYN.
//   Phase 2 (ESTABLISHED)— Signals land only if an ACK (Protocol) was played earlier this turn.
//   Phase 3 (MAINTAIN)   — Signals always land, but a turn with no ACK costs 8 ongoing damage.
//
// Deck-building matters: a deck with no ACK/Protocol cards can never satisfy phases 2–3.

import { playCard, endTurn, dealToPlayer } from "./combat.js";
import { cardById } from "./cards.js";

// Per-phase HP pools (mirror boss.js PHASE_HP). Each phase is a fresh pool; overkill is lost.
export const BOSS_PHASE_HP = { 1: 60, 2: 80, 3: 60 };
export const ONGOING_DAMAGE = 8; // phase-3 penalty when a turn ends with no ACK

export function isSignalCard(card) {
  return card?.type === "Signal";
}

// Upgraded cards keep their base id minus a trailing "+", so an upgraded SYN+/ACK+ still satisfies
// the handshake (the negotiation cares about the protocol verb, not the card's tier).
function baseId(id) {
  return typeof id === "string" && id.endsWith("+") ? id.slice(0, -1) : id;
}

// acceptance(combat, card) — consulted by the engine only for Signal cards.
// Returns false ⇒ that Signal deals 0 ("PROTOCOL MISMATCH").
export function accepts(combat, card) {
  if (!isSignalCard(card)) return true;          // Protocol/Layer always resolve
  if (combat.bossLocked) return false;           // ch9 unread ⇒ permanent mismatch (B3)
  const phase = combat.bossPhase || 1;
  if (phase === 1) return baseId(combat.playedIdsThisTurn[0]) === "SYN";
  if (phase === 2) return combat.playedIdsThisTurn.some((id) => baseId(id) === "ACK");
  return true;                                    // phase 3: always accepted
}

// Did the player play an ACK (or ACK+) this turn?
function ackPlayed(combat) {
  return combat.playedIdsThisTurn.some((id) => baseId(id) === "ACK");
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
  combat.onPlayerTurnEnd = (c) => {
    if ((c.bossPhase || 1) !== 3 || c.bossLocked) return;
    if (!ackPlayed(c)) {
      c.log = [...(c.log || []), "no ACK — 8 ongoing damage."].slice(-10);
      dealToPlayer(c, ONGOING_DAMAGE);
      if (c.player.hp <= 0 && !c.over) { c.over = true; c.result = "lose"; }
    }
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
  // Lead correctly for the phase: SYN first in phase 1, an ACK/Protocol first in phase 2/3.
  if ((combat.bossPhase || 1) === 1) playFirstMatch(combat, (c) => baseId(c.id) === "SYN");
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
