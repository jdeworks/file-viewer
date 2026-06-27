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

export const CARDS = [...SIGNAL_CARDS, ...PROTOCOL_CARDS, ...LAYER_CARDS];

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
