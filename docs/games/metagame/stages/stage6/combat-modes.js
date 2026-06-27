// combat-modes.js — Stage 6 turn modifiers: THROUGHPUT congestion window + DELAY pending queue.
//
// applyTurnEnergy computes the next turn's energy: a flat refill normally, or the dynamic congestion
// window in Act-3 fights (a wide turn shrinks it, restraint regrows it toward the cap — TCP
// slow-start). resolvePending lands DELAY effects whose target turn has arrived. Both are fully
// deterministic (no RNG).

import { makeCtx } from "./combat-ctx.js";
import { checkEnemyDead } from "./combat.js";

// THROUGHPUT: the congestion window — a dynamic energy cap. A wide turn (spend it all) shrinks next
// turn's window; a restrained turn regrows it toward the cap (TCP slow-start).
export const WINDOW_CAP = 5;
export const WINDOW_FLOOR = 2;

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
