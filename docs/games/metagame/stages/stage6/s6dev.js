// s6dev.js — Stage 6 Protocol Codex dev-menu cheat mutators (pure: no save/repaint).
//
// Each exported function receives run/combat state, mutates it in place, and returns a result
// object. The caller (renderer.js dev(id) dispatch) owns save() + repaint. Deterministic —
// no Date.now / Math.random. skip-boss has side effects (live combat nulled by renderer) that
// are documented in devSkipToBoss's comment; all other mutators are self-contained.

import { seatAtFinalBoss, KEY_UNTOUCHABLE, KEY_ASCETIC, KEY_SACRIFICE } from "./run.js";

// Three strong, non-starter cards injected by devAddCards (one per archetype). These IDs are
// valid reward-pool members (rarity ≠ "starter") that represent each archetype's kill engine.
export const DEV_CARDS = ["HANDSHAKE", "FIREWALL", "TCP_STACK"];

// Keys that must all be present for the superboss to open after the act-6 negotiation.
const ALL_KEYS = [KEY_UNTOUCHABLE, KEY_ASCETIC, KEY_SACRIFICE];

// ── pure state mutators ───────────────────────────────────────────────────────────────────────────

// Full HP — applies to run.hp (persisted) and, if a live combat.player sub-object is supplied,
// also to combat.player.hp (transient, in-fight HP tracking).
export function devHeal(run, combatPlayer) {
  if (!run) return { ok: false, reason: "no-run" };
  run.hp = run.maxHp;
  if (combatPlayer && typeof combatPlayer.maxHp === "number") {
    combatPlayer.hp = combatPlayer.maxHp;
  }
  return { ok: true, hp: run.hp };
}

// Grant all 3 true-ending keys (idempotent — preserves any already earned, no duplicates).
// Keys collected: untouchable (elite with ≤5 dmg), ascetic (skip a reward), sacrifice (rest remove).
export function devGrantKeys(run) {
  if (!run) return { ok: false, reason: "no-run" };
  if (!Array.isArray(run.keys)) run.keys = [];
  for (const k of ALL_KEYS) {
    if (!run.keys.includes(k)) run.keys.push(k);
  }
  return { ok: true, keys: run.keys.length };
}

// Add DEV_CARDS to the deck (always appended; duplicates are acceptable for dev testing).
export function devAddCards(run) {
  if (!run) return { ok: false, reason: "no-run" };
  if (!Array.isArray(run.deck)) run.deck = [];
  run.deck = [...run.deck, ...DEV_CARDS];
  return { ok: true, added: DEV_CARDS.length, deckSize: run.deck.length };
}

// Seat the run at the act-6 final boss node. The caller (renderer.js) must null the live
// combat object and reset combatRun after this returns, so the boss fight starts fresh.
export function devSkipToBoss(run) {
  if (!run) return { ok: false, reason: "no-run" };
  const nodeId = seatAtFinalBoss(run);
  return { ok: true, nodeId, act: run.act };
}

// Boost live-combat energy by n (capped at 9). Operates on the transient combat.player object —
// NOT persisted (save() after this call has no effect on energy). Returns { ok: false } when
// called outside of an active combat (combatPlayer === null).
export function devAddEnergy(combatPlayer, n = 3) {
  if (!combatPlayer) return { ok: false, reason: "no-combat" };
  combatPlayer.energy = Math.min(9, (combatPlayer.energy || 0) + n);
  return { ok: true, energy: combatPlayer.energy };
}

// ── dispatcher ────────────────────────────────────────────────────────────────────────────────────

// Route a dev-menu id to its pure mutator. "skip-boss" is NOT handled here — renderer.js
// dispatches it directly (it needs to null the live combat + reset combatRun). "energy" mutates
// only the transient combat.player and is NOT reflected in the save.
export function applyDev(id, run, combatPlayer) {
  switch (id) {
    case "heal":   return devHeal(run, combatPlayer);
    case "keys":   return devGrantKeys(run);
    case "cards":  return devAddCards(run);
    case "energy": return devAddEnergy(combatPlayer);
    default:       return { ok: false, reason: "unknown-id" };
  }
}
