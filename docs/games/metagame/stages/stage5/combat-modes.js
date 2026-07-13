// combat-modes.js — Stage 5 turn modifiers: THROUGHPUT congestion window + DELAY pending queue.
//
// applyTurnEnergy computes the next turn's energy: a flat refill normally, or the dynamic congestion
// window in Act-3 fights (a wide turn shrinks it, restraint regrows it toward the cap — TCP
// slow-start). resolvePending lands DELAY effects whose target turn has arrived. Both are fully
// deterministic (no RNG).

import { makeCtx, MAX_ECHO_DEPTH } from "./combat-ctx.js";
import { cardById } from "./cards.js";
import { checkEnemyDead } from "./combat.js";

// THROUGHPUT: the congestion window — a dynamic energy cap. A wide turn (spend it all) shrinks next
// turn's window; a restrained turn regrows it toward the cap (TCP slow-start).
export const WINDOW_CAP = 5;
export const WINDOW_FLOOR = 2;

// The act in which the congestion window first opens (THROUGHPUT verb's debut).
export const CONGESTION_ACT = 3;

// Whether a fight in the given act runs on the dynamic congestion window. It opens in act 3 and
// PERSISTS for every act after — the stage's design principle is "carry all prior verbs forward", so
// THROUGHPUT cards (BANDWIDTH/BACKOFF/DEFRAG) and the OVERCLOCK_BUS relic stay live in acts 3–6.
export function congestionForAct(act) {
  return Number(act) >= CONGESTION_ACT;
}

// Set the next turn's energy. In congestion mode the window shrinks after a WIDE turn (you spent the
// whole window) and regrows toward the cap after a restrained turn (slow-start). Fully deterministic.
export function applyTurnEnergy(combat) {
  if (!combat.congestion) { combat.player.energy = combat.player.maxEnergy; return; }
  // Packet Loss: dumping many cards (4+) in a turn jams one card next turn.
  combat.jamPending = combat.cardsPlayedThisTurn >= 4;
  const wide = combat.energySpentThisTurn >= combat.window;
  if (combat.noShrinkNextTurn) {
    combat.noShrinkNextTurn = false; // Backoff: skip the shrink once
  } else if (wide) {
    combat.window = Math.max(WINDOW_FLOOR, combat.window - (combat.windowDecay || 1));
  } else {
    combat.window = Math.min(combat.windowCap || WINDOW_CAP, combat.window + 1);
  }
  combat.player.maxEnergy = combat.window;
  combat.player.energy = combat.window;
}

// Interpret a DECLARATIVE delayed-effect op (see combat-ctx.queue). Keeping the pending queue as
// plain data (not closures) is what makes a mid-combat fight serializable / resumable on reload.
export function applyOp(ctx, op) {
  if (!op || typeof op !== "object") return;
  if (op.deal != null) ctx.deal(op.deal);
  if (op.block != null) ctx.block(op.block);
  if (op.draw != null) ctx.draw(op.draw);
  if (op.gainEnergy != null) ctx.gainEnergy(op.gainEnergy);
  if (op.applyEnemy) ctx.applyEnemy(op.applyEnemy.status, op.applyEnemy.value);
  if (op.applySelf) ctx.applySelf(op.applySelf.status, op.applySelf.value);
  // CHAIN (Act 6): a delayed card replay (CALLBACK). Re-runs the named card's effect, depth-capped so
  // a queued self-echo can't loop forever. Serializable: the op is just { replay: cardId }.
  if (op.replay) {
    const combat = ctx.combat;
    const card = cardById(op.replay);
    if (card && (combat.echoDepth || 0) < MAX_ECHO_DEPTH) {
      combat.echoDepth = (combat.echoDepth || 0) + 1;
      card.effect(makeCtx(combat, card));
      combat.echoDepth -= 1;
      combat.chainThisTurn = (combat.chainThisTurn || 0) + 1;
    }
  }
}

// Resolve any queued (delayed) effects whose target turn has arrived. Deterministic, no RNG.
export function resolvePending(combat) {
  if (!combat.pending || !combat.pending.length) return;
  const due = combat.pending.filter((p) => p.turn <= combat.turn);
  combat.pending = combat.pending.filter((p) => p.turn > combat.turn);
  for (const p of due) {
    if (combat.over) break;
    applyOp(makeCtx(combat, null), p.op);
    checkEnemyDead(combat);
  }
}
