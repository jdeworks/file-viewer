// relics.js — Stage 6 Protocol Codex relics (passive run-long modifiers).
//
// Each relic: { id, name, rarity, text, hooks: { onCombatStart?, onPlayerTurnStart?, onCardPlay? } }.
// Hooks receive a relicCtx (combat.js) exposing the same primitives cards use: deal/block/draw/
// gainEnergy/applySelf/applyEnemy (+ ctx.card on onCardPlay). Relics are earned from elites/bosses.

export const RELICS = [
  {
    id: "handshake-token", name: "Handshake Token", rarity: "common",
    text: "At the start of each combat, gain 8 block.",
    hooks: { onCombatStart: (ctx) => ctx.block(8) }
  },
  {
    id: "syn-cookie", name: "SYN Cookie", rarity: "common",
    text: "At the start of each combat, draw 1 extra card.",
    hooks: { onCombatStart: (ctx) => ctx.draw(1) }
  },
  {
    id: "persistent-socket", name: "Persistent Socket", rarity: "uncommon",
    text: "At the start of each of your turns, gain 3 block.",
    hooks: { onPlayerTurnStart: (ctx) => ctx.block(3) }
  },
  {
    id: "protocol-primer", name: "Protocol Primer", rarity: "uncommon",
    text: "Whenever you play a Protocol card, gain 1 block.",
    hooks: { onCardPlay: (ctx) => { if (ctx.card?.type === "Protocol") ctx.block(1); } }
  },
  {
    id: "overclock-chip", name: "Overclock Chip", rarity: "rare",
    text: "At the start of each combat, gain 1 Strength.",
    hooks: { onCombatStart: (ctx) => ctx.applySelf("strength", 1) }
  }
];

import { makeRng } from "./combat.js";

const BY_ID = new Map(RELICS.map((relic) => [relic.id, relic]));

export function relicById(id) {
  return BY_ID.get(id) || null;
}

// Resolve a run's stored relic ids into relic objects for createCombat({ relics }).
export function relicsFor(ids) {
  return (ids || []).map(relicById).filter(Boolean);
}

// Pick a relic the player does not already own (deterministic per seed); null once all are owned.
export function rollRelic(seed, owned = []) {
  const ownedSet = new Set(owned);
  const pool = RELICS.filter((relic) => !ownedSet.has(relic.id));
  if (!pool.length) return null;
  const rng = makeRng(seed);
  return pool[Math.floor(rng() * pool.length)].id;
}
