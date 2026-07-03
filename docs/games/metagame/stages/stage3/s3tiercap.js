// Tier cap + tier-learning windows (UX audit 2026-07, APPROVED OPTION) — legibility governor over the
// four mechanical tiers. Left unchecked, volatile + aliased + decay (mono) or two-colour + volatile +
// decay could all stack on one snapshot (3–4 mechanics at once); this caps the ACTIVE set to at most
// TIER_CAP per snapshot late-game, and makes the FIRST snapshot after each unlock a solo learning
// window. Pure + deterministic: which ≤TIER_CAP mechanics apply is chosen from the snapshot INDEX (a
// fixed rotation), never RNG or wall-clock, so replays / solveCurrent stay identical.
//
// REVERT PATH: set TIER_CAP = Infinity to restore the old unlimited stacking (activeTiers then returns
// every unlocked mechanic). The learning-window helper is opt-in at the call site (renderer.loadBoard).

import { VOLATILE_AT } from "./s3volatile.js";
import { ALIASED_AT } from "./s3aliased.js";
import { DECAY_AT } from "./s3decay.js";
import { TWOCOLOR_AT } from "./s3twocolor.js";

export const TIER_CAP = 2;      // max simultaneous ACTIVE tier mechanics per snapshot (Infinity = off)
export const LEARN_SIZE = 5;    // small board size for a tier-introduction (learning-window) snapshot

// The tier mechanics UNLOCKED at a corruption level, in escalation order. Two-colour REPLACES the mono
// board type, so aliased (a mono-only clue overlay) is absent once two-colour is live, and two-colour
// is MANDATORY whenever present — it defines the board and can't be toggled off.
export function unlockedTiers(corruption) {
  const c = Number(corruption || 0);
  const twoColor = c >= TWOCOLOR_AT;
  const list = [];
  if (c >= VOLATILE_AT) list.push("volatile");
  if (!twoColor && c >= ALIASED_AT) list.push("aliased");
  if (c >= DECAY_AT) list.push("decay");
  if (twoColor) list.push("twocolor");
  return list;
}

// The subset of mechanics ACTIVE on this snapshot (≤ TIER_CAP). Two-colour is forced (board type); the
// remaining optional mechanics rotate by snapshot index so every mechanic still surfaces across a run.
export function activeTiers(corruption, index) {
  const all = unlockedTiers(corruption);
  if (all.length <= TIER_CAP) return new Set(all);
  const forced = all.filter((m) => m === "twocolor");
  const optional = all.filter((m) => m !== "twocolor");
  const slots = Math.max(0, TIER_CAP - forced.length);
  const active = new Set(forced);
  const i = Number(index || 0);
  for (let k = 0; k < slots && optional.length; k += 1) active.add(optional[(i + k) % optional.length]);
  return active;
}
