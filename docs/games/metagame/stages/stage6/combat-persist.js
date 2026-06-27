// combat-persist.js — Stage 6 combat snapshot / restore (kills the reload-retry exploit).
//
// A combat used to be transient: a reload mid-fight re-instantiated a FRESH encounter from the run
// node, so a player could reload to reroll a bad shuffle or escape a losing position. These two pure
// helpers serialize the live fight into plain data and rebuild it exactly:
//   - snapshotCombat(combat) → a JSON-safe object (no closures): piles, energy, enemy HP/intent/
//     statuses, turn, the DELAY pending queue (declarative ops), congestion window, and the RNG
//     position (seed + draw count) so the shuffle sequence resumes identically.
//   - restoreCombat(snapshot, { relics }) → a combat object continued from that exact position. The
//     non-serializable parts are rebuilt: the tracked RNG is fast-forwarded to its saved step, relics
//     are re-resolved from the run, and a boss fight's acceptance/advancePhase hooks are re-attached
//     (via rewireBossCombat) WITHOUT resetting its live phase/HP.
//
// The renderer drives these through shared/run-state.js: checkpoint after each action, reset on
// resolution. Determinism is total — same seed + same step ⇒ same continuation.

import { makeTrackedRng } from "./combat-rng.js";
import { rewireBossCombat } from "./boss-combat.js";

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

// Capture the full mid-combat state as plain, serializable data. `combat.nodeId` (set by the
// renderer) and the persisted run seed (merged in by the caller) tag which fight this snapshot is.
export function snapshotCombat(combat) {
  return {
    nodeId: combat.nodeId ?? null,
    rngSeed: combat.rngSeed,
    rngSteps: typeof combat.rng?.steps === "function" ? combat.rng.steps() : 0,
    congestion: Boolean(combat.congestion),
    window: combat.window,
    windowCap: combat.windowCap,
    windowDecay: combat.windowDecay,
    noShrinkNextTurn: Boolean(combat.noShrinkNextTurn),
    jamPending: Boolean(combat.jamPending),
    firstCardDiscount: combat.firstCardDiscount || 0,
    delaySpeedup: Boolean(combat.delaySpeedup),
    delayUsed: Boolean(combat.delayUsed),
    corruptionBonus: combat.corruptionBonus || 0,
    corruptionDouble: Boolean(combat.corruptionDouble),
    turn: combat.turn,
    cardsPlayedThisTurn: combat.cardsPlayedThisTurn || 0,
    energySpentThisTurn: combat.energySpentThisTurn || 0,
    chainThisTurn: combat.chainThisTurn || 0,
    playedIdsThisTurn: [...(combat.playedIdsThisTurn || [])],
    lastCardPlayed: combat.lastCardPlayed ?? null,
    over: Boolean(combat.over),
    result: combat.result ?? null,
    log: [...(combat.log || [])],
    player: clone(combat.player),
    enemy: clone(combat.enemy),
    draw: [...(combat.draw || [])],
    hand: [...(combat.hand || [])],
    discard: [...(combat.discard || [])],
    exhaust: [...(combat.exhaust || [])],
    jammed: [...(combat.jammed || [])],
    pending: clone(combat.pending || []),
    boss: combat.bossPhase
      ? { phase: combat.bossPhase, locked: Boolean(combat.bossLocked), hpMult: combat.bossHpMult || 1 }
      : null
  };
}

// Rebuild a continuable combat from a snapshot. `relics` must be re-resolved by the caller
// (relicsFor(run.relics)) — their hook functions can't be serialized but their per-combat effects
// (block/strength/firstCardDiscount/…) are already baked into the restored fields.
export function restoreCombat(snapshot, { relics = [] } = {}) {
  const s = snapshot || {};
  const combat = {
    rng: makeTrackedRng(s.rngSeed, s.rngSteps || 0),
    rngSeed: s.rngSeed,
    relics,
    congestion: Boolean(s.congestion),
    window: s.window,
    windowCap: s.windowCap,
    windowDecay: s.windowDecay,
    noShrinkNextTurn: Boolean(s.noShrinkNextTurn),
    jamPending: Boolean(s.jamPending),
    firstCardDiscount: s.firstCardDiscount || 0,
    delaySpeedup: Boolean(s.delaySpeedup),
    delayUsed: Boolean(s.delayUsed),
    corruptionBonus: s.corruptionBonus || 0,
    corruptionDouble: Boolean(s.corruptionDouble),
    player: clone(s.player),
    enemy: clone(s.enemy),
    draw: [...(s.draw || [])],
    hand: [...(s.hand || [])],
    discard: [...(s.discard || [])],
    exhaust: [...(s.exhaust || [])],
    jammed: [...(s.jammed || [])],
    pending: clone(s.pending || []),
    turn: s.turn,
    cardsPlayedThisTurn: s.cardsPlayedThisTurn || 0,
    energySpentThisTurn: s.energySpentThisTurn || 0,
    chainThisTurn: s.chainThisTurn || 0,
    playedIdsThisTurn: [...(s.playedIdsThisTurn || [])],
    lastCardPlayed: s.lastCardPlayed ?? null,
    over: Boolean(s.over),
    result: s.result ?? null,
    log: [...(s.log || [])]
  };
  combat.nodeId = s.nodeId ?? null;
  if (s.boss) {
    combat.bossPhase = s.boss.phase;
    combat.bossLocked = Boolean(s.boss.locked);
    combat.bossHpMult = s.boss.hpMult || 1;
    rewireBossCombat(combat);
  }
  return combat;
}
