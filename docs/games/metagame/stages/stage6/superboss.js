// superboss.js — The Kernel of Refusal: the key-gated TRUE-ENDING superboss.
//
// Reached ONLY after the act-6 negotiation (The Refused Connection) is already won AND the player
// collected all 3 hidden keys during the run (run.keys: untouchable elite / skipped reward /
// sacrificial rest — see run.js awardKey). It is PURE EXTRA COMBAT: it adds NO second host-app
// un-cheat (the ch9 epub remains the only stage gate, already satisfied by beating the negotiation).
// It is fought with the player's REAL deck through the normal engine, so it is never locked.
//
// Three phases, each a fresh HP pool whose looping script leans on a different pair of the stage's
// six verbs (SEQUENCE/DELAY, THROUGHPUT/CORRUPTION, CHAIN/HANDSHAKE). The phases deliberately avoid
// compounding ramp/rampHits intents (rttStacks accrues across the whole fight) so a basic deck can
// still close it out — the difficulty is its layered HP, not an unwinnable damage spiral.

export const SUPERBOSS_ID = "the-kernel-of-refusal";

// Per-phase HP pools (index 0..2). Overkill is lost when a phase falls.
// NOTE (round-4): the negotiation boss is 200 base, so on paper this true-ending fight (165) is the
// lighter pool — but it is reached with a REAL act-6 deck, the no-handshake fight plays faster, and
// the smoke fixture (a 10-card starter deck) enters at ~15 HP with no headroom to chew a bigger pool.
// Raising it requires a healthier/representative smoke deck first (a cross-lane test-fixture change).
export const SUPERBOSS_PHASE_HP = [50, 55, 60];

// Each phase's looping intent script (telegraphed one step ahead like every enemy).
export const SUPERBOSS_PHASE_SCRIPTS = [
  // Phase 1 — SEQUENCE / DELAY: ordered pressure with a guard turn.
  [
    { label: "Ordered strike", attack: 6 },
    { label: "Deferred packet", attack: 8 },
    { label: "Reorder buffer", block: 8 }
  ],
  // Phase 2 — THROUGHPUT / CORRUPTION: punishes a wide turn, then steady attrition.
  [
    { label: "Congestion", congest: 2 },
    { label: "Overflow", attack: 8 },
    { label: "Corruption tick", attack: 6 }
  ],
  // Phase 3 — CHAIN / HANDSHAKE: reflects your turn, then the final refusal.
  [
    { label: "Reflection", mirror: 2 },
    { label: "Recursion strike", attack: 7 },
    { label: "The final refusal", attack: 9 }
  ]
];

// Wire the multi-phase superboss onto a fresh combat whose enemy is the-kernel-of-refusal. Sets the
// phase-0 pool/script and attaches the phase-advance closure. NOT locked (no handshake / un-cheat).
export function wireSuperboss(combat) {
  combat.superPhase = 0;
  // The superboss is a synthetic bonus node (not a normal act-6 fight) with bespoke phase scripts that
  // were authored and balanced under FLAT energy. It keeps flat energy regardless of the act-3+
  // congestion window so its tuned difficulty is unchanged. (Normal act 3-6 fights + the act-6
  // negotiation boss DO carry the congestion window forward — see renderer makeCombat / congestionForAct.)
  combat.congestion = false;
  combat.enemy.hp = SUPERBOSS_PHASE_HP[0];
  combat.enemy.maxHp = SUPERBOSS_PHASE_HP[0];
  combat.enemy.armor = 0;
  combat.enemy.script = SUPERBOSS_PHASE_SCRIPTS[0].map((i) => ({ ...i }));
  combat.enemy.intentIndex = 0;
  rewireSuperboss(combat);
  return combat;
}

// Re-attach the phase-advance closure to a combat RESTORED from a snapshot (the closure can't be
// serialized; superPhase / enemy.script ARE persisted and restored by combat-persist).
export function rewireSuperboss(combat) {
  combat.advancePhase = (c) => {
    const next = (c.superPhase || 0) + 1;
    if (next >= SUPERBOSS_PHASE_HP.length) return false; // last phase down ⇒ the kernel falls
    c.superPhase = next;
    c.enemy.hp = SUPERBOSS_PHASE_HP[next];
    c.enemy.maxHp = SUPERBOSS_PHASE_HP[next];
    c.enemy.script = SUPERBOSS_PHASE_SCRIPTS[next].map((i) => ({ ...i }));
    c.enemy.intentIndex = 0;
    c.log = [...(c.log || []), `The kernel reshapes — phase ${next + 1}.`].slice(-10);
    return true;
  };
  return combat;
}
