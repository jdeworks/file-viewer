// combat-piles.js — Stage 5 pile mechanics: draw / reshuffle, and the Packet-Loss jam.
//
// drawCards is the only place the discard recycles into the draw pile (via a seeded shuffle), so the
// card order is fully replayable from the combat seed. jamOne/releaseJam implement THROUGHPUT's
// Packet Loss: an oversize turn sets one freshly-drawn card aside (unplayable) for exactly one turn.

import { shuffle } from "./combat-rng.js";
import { runHook } from "./combat-ctx.js";

export function drawCards(combat, n) {
  for (let i = 0; i < n; i++) {
    if (combat.draw.length === 0) {
      if (combat.discard.length === 0) return;
      combat.draw = shuffle(combat.discard, combat.rng);
      combat.discard = [];
      // Relics that fire when the discard recycles into a fresh draw pile (onShuffle). Inert by
      // default; a relic may e.g. gain block each reshuffle. Deterministic (shuffle is seeded).
      runHook(combat, "onShuffle");
    }
    combat.hand.push(combat.draw.shift());
  }
}

// Packet Loss: set aside one card from the freshly-drawn hand (unplayable this turn).
export function jamOne(combat) {
  if (combat.hand.length) combat.jammed.push(combat.hand.shift());
}

// Release last turn's jammed cards back into the deck (discard) so they can return later.
export function releaseJam(combat) {
  if (combat.jammed.length) { combat.discard.push(...combat.jammed); combat.jammed = []; }
}
