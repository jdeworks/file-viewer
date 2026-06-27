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
  },
  // ── Build-definers: relics that change HOW you build, not just stat-sticks ──────────────────────────
  {
    // Rewards WIDE turns — makes dumping your hand a plan, not a panic.
    id: "full-duplex", name: "Full Duplex", rarity: "uncommon",
    text: "Each turn, when you play your 3rd card, draw 1.",
    hooks: { onCardPlay: (ctx) => { if (ctx.combat.cardsPlayedThisTurn === 3) ctx.draw(1); } }
  },
  {
    // Turns a Protocol/defensive deck into a KILL plan — Protocol cards now bite.
    id: "checksum-offload", name: "Checksum Offload", rarity: "rare",
    text: "Whenever you play a Protocol card, deal 3 to the enemy.",
    hooks: { onCardPlay: (ctx) => { if (ctx.card?.type === "Protocol") ctx.deal(3); } }
  },
  {
    // Layer/power decks get an extra payoff for stacking Strength.
    id: "cipher-cascade", name: "Cipher Cascade", rarity: "uncommon",
    text: "Whenever you play a Layer card, gain 2 block.",
    hooks: { onCardPlay: (ctx) => { if (ctx.card?.type === "Layer") ctx.block(2); } }
  },
  // ── Cursed: strong, with a real downside (tag `cursed` so the UI can warn) ──────────────────────────
  {
    id: "memory-leak", name: "Memory Leak", rarity: "rare", cursed: true,
    text: "Cursed. At the start of each combat, gain 2 Strength — but also 2 Weak.",
    hooks: { onCombatStart: (ctx) => { ctx.applySelf("strength", 2); ctx.applySelf("weak", 2); } }
  },
  {
    id: "overcommit-buffer", name: "Overcommit Buffer", rarity: "rare", cursed: true,
    text: "Cursed. At the start of each of your turns, gain 1 energy — but become Vulnerable.",
    hooks: { onPlayerTurnStart: (ctx) => { ctx.gainEnergy(1); ctx.applySelf("vulnerable", 1); } }
  },
  // ── Act 1 LINK · SEQUENCE: rewards leading the turn with the right card ─────────────────────────────
  {
    id: "tcp-fast-open", name: "TCP Fast Open", rarity: "rare",
    text: "The first card you play each turn costs 1 less.",
    hooks: { onCombatStart: (ctx) => { ctx.combat.firstCardDiscount = (ctx.combat.firstCardDiscount || 0) + 1; } }
  },
  // ── Act 2 TRANSPORT · DELAY: lands the first delayed packet a turn sooner ───────────────────────────
  {
    id: "fast-retransmit", name: "Fast Retransmit", rarity: "uncommon",
    text: "Your first delayed effect each combat resolves a turn sooner.",
    hooks: { onCombatStart: (ctx) => { ctx.combat.delaySpeedup = true; } }
  },
  // ── Act 3 NETWORK · THROUGHPUT: bigger pipe, harsher collapse (cursed Overclock successor) ──────────
  {
    id: "overclock-bus", name: "Overclock Bus", rarity: "rare", cursed: true,
    text: "Cursed. Your congestion window cap is +1, but a wide turn shrinks it by 2.",
    hooks: { onCombatStart: (ctx) => { ctx.combat.windowCap = (ctx.combat.windowCap || 5) + 1; ctx.combat.windowDecay = 2; } }
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
