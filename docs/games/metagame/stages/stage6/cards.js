// cards.js — Stage 6 Protocol Codex card pool (thin aggregator).
//
// The pool is split by archetype into focused modules; this file concatenates them and owns the
// shared registry/lookup so the rest of the stage imports a single surface:
//   - cards-signal.js   SYN-Flood aggro/tempo (type "Signal")
//   - cards-protocol.js Stateful Stack block-control (type "Protocol")
//   - cards-layer.js    Layered Cipher power-scaling (type "Layer")
// card-upgrades.js registers the upgraded "<ID>+" forms into the same registry at load.
//
// Each card: { id, type, cost, rarity, exhaust?, text, effect(ctx) }. effect(ctx) mutates combat via
// the ctx API from combat.js (deal/block/draw/applyEnemy…). Keep effects pure w.r.t. ctx.

import { SIGNAL_CARDS } from "./cards-signal.js";
import { PROTOCOL_CARDS } from "./cards-protocol.js";
import { LAYER_CARDS } from "./cards-layer.js";
import { DAEMON_CARDS } from "./cards-daemon.js";
import { RECURSION_CARDS } from "./cards-recursion.js";
import { makeRng } from "./combat-rng.js";

export const CARDS = [...SIGNAL_CARDS, ...PROTOCOL_CARDS, ...LAYER_CARDS, ...DAEMON_CARDS, ...RECURSION_CARDS];

const BY_ID = new Map(CARDS.map((card) => [card.id, card]));

export function cardById(id) {
  return BY_ID.get(id) || null;
}

// Register additional card definitions at load (e.g. the upgraded "<ID>+" forms in card-upgrades.js)
// so cardById resolves them everywhere without cards.js depending on the upgrade module.
export function registerCard(card) {
  if (card && card.id) BY_ID.set(card.id, card);
}

// Cards offered as combat rewards (not the starter-only cards).
export const REWARD_POOL = CARDS.filter((card) => card.rarity !== "starter").map((card) => card.id);

export const STARTING_DECK = ["SYN", "SYN", "SYN", "SYN", "SYN", "ACK", "ACK", "ACK", "ACK", "RST"];

// Card-reward rarity weights per act: commons dominate early, rares swell late. The act scaling is
// what keeps early decks consistent and late drafts exciting. (Acts past 6 clamp to act 6.)
const RARITY_WEIGHT_BY_ACT = {
  1: { common: 70, uncommon: 25, rare: 5 },
  2: { common: 50, uncommon: 35, rare: 15 },
  3: { common: 35, uncommon: 40, rare: 25 },
  4: { common: 20, uncommon: 40, rare: 40 },
  5: { common: 12, uncommon: 38, rare: 50 },
  6: { common: 8, uncommon: 32, rare: 60 }
};

// Draft `count` DISTINCT reward cards, weighted by rarity and scaled by act. Deterministic: the same
// (seed, act) always yields the same offer. Weighted sampling without replacement from REWARD_POOL.
// The act weight is a TIER probability — it is split evenly across the cards in that rarity tier — so
// the offer's rarity mix follows the weights regardless of how many cards each tier holds.
export function draftRewardCards(seed, act, count = 3) {
  const rng = makeRng(seed);
  const weights = RARITY_WEIGHT_BY_ACT[Math.min(6, Math.max(1, Number(act) || 1))];
  const tierCount = {};
  for (const id of REWARD_POOL) { const r = cardById(id)?.rarity || "common"; tierCount[r] = (tierCount[r] || 0) + 1; }
  const pool = REWARD_POOL.map((id) => {
    const r = cardById(id)?.rarity || "common";
    return { id, w: (weights[r] ?? weights.common) / (tierCount[r] || 1) };
  });
  const picks = [];
  while (picks.length < count && pool.length) {
    const total = pool.reduce((sum, c) => sum + c.w, 0);
    let r = rng() * total;
    let idx = pool.length - 1;
    for (let i = 0; i < pool.length; i++) { r -= pool[i].w; if (r < 0) { idx = i; break; } }
    picks.push(pool.splice(idx, 1)[0].id);
  }
  return picks;
}
