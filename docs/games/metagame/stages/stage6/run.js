// run.js — Stage 6 Protocol Codex: run controller (pure state machine over the generated map).
//
// Owns one run attempt: the deck, hp, handshakes, relics, and position on the act map. The UI (WP4)
// drives combat; this module records outcomes and decides what screen comes next (map / reward /
// rest / shop / boss / dead / won). Run-scoped state resets on death; meta (handshakes carried,
// prestige version) is held by the caller across runs.

import { generateRun, nodeById, enemyForNode } from "./mapgen.js";
import { makeRng, hashSeed } from "./combat.js";
import { STARTING_DECK, REWARD_POOL } from "./cards.js";
import { upgradeIdFor } from "./card-upgrades.js";
import { applyModifiers } from "./modifiers.js";
import { rollRelic, relicById } from "./relics.js";

export const PLAYER_MAX_HP = 60;
const REST_HEAL_FRACTION = 0.30;
const REWARD_CHOICES = 3;
const HANDSHAKE_REWARD = { combat: 10, elite: 30, boss: 0 };
// Skipping a reward card pays a few handshakes — deck-thinning is rewarded, so decks stay lean (12–18).
const SKIP_REWARD = 5;
// Deck removal is the strongest shop action, so its price ESCALATES per purchase within a run.
const REMOVAL_BASE = 25;
const REMOVAL_STEP = 25;
export const FINAL_BOSS_ACT = 4;
// Per-act combat mini-bosses; the final act is the codex-gated negotiation (handled in the UI).
const ACT_BOSSES = { 1: "kernel-panic", 2: "buffer-overflow", 3: "deadlock" };
const PRESTIGE_HP_PER_VERSION = 5;

// Banked-handshake cost to advance from the given Protocol Version to the next.
export function prestigeCost(version) {
  return (Number(version || 0) + 1) * 40;
}

export function createRun({ seed = 1, version = 0, handshakes = 0 } = {}) {
  const maxHp = PLAYER_MAX_HP + Number(version || 0) * PRESTIGE_HP_PER_VERSION;
  const run = {
    seed,
    version,
    map: generateRun(seed, FINAL_BOSS_ACT),
    act: 1,
    currentNodeId: null,
    clearedIds: [],
    deck: [...STARTING_DECK],
    relics: [],
    hp: maxHp,
    maxHp,
    handshakes,
    removalsPurchased: 0,
    status: "map",
    pendingReward: null,
    notice: null,
    // Prestige rule-modifier knobs (defaults = no modifier); applyModifiers tunes them by version.
    handshakeMult: 1,
    restHealMod: 0,
    windowCapMod: 0,
    eliteHpBonus: 0,
    bossHpMult: 1,
    modifiers: []
  };
  // Prestige: each Protocol Version grants one starting relic (until the pool is exhausted).
  for (let i = 0; i < Number(version || 0); i++) grantRelic(run, `prestige-${i}`);
  applyModifiers(run, version); // stack the Ascension-style rule modifiers
  return run;
}

// Nodes the player may move to next: act start nodes, or the current node's forward edges.
export function availableNodes(run) {
  const act = run.map.acts[run.act - 1];
  if (!run.currentNodeId) return act.startIds.map((id) => nodeById(run.map, id));
  const node = nodeById(run.map, run.currentNodeId);
  return (node?.next || []).map((id) => nodeById(run.map, id));
}

export function moveTo(run, nodeId) {
  const options = availableNodes(run).map((n) => n.id);
  if (!options.includes(nodeId)) return { ok: false, reason: "unreachable" };
  const node = nodeById(run.map, nodeId);
  run.notice = null;
  run.currentNodeId = nodeId;
  run.status = screenForNode(node);
  return { ok: true, node };
}

// `rng` is REQUIRED — a seeded rng (e.g. `makeRng(hashSeed(seed, nodeId))`). No `Math.random`
// fallback: which enemy a node spawns must be deterministic from the run seed.
export function enemyForCurrentNode(run, rng = makeRng(hashSeed(run.seed, `${run.currentNodeId}:enemy`))) {
  const node = nodeById(run.map, run.currentNodeId);
  if (!node) return null;
  if (node.type === "boss") return run.act === FINAL_BOSS_ACT ? "the-refused-connection" : (ACT_BOSSES[run.act] || "kernel-panic");
  return enemyForNode(node, run.act, rng);
}

// Called by the UI once a combat resolves. win=false => the run ends (death restart).
export function resolveCombat(run, { win, hpRemaining }) {
  const node = nodeById(run.map, run.currentNodeId);
  if (typeof hpRemaining === "number") run.hp = Math.max(0, hpRemaining);
  if (!win || run.hp <= 0) {
    run.status = "dead";
    return { ok: true, status: "dead" };
  }
  run.clearedIds.push(node.id);

  if (node.type === "boss") return clearBoss(run);

  run.handshakes += Math.round((HANDSHAKE_REWARD[node.type] ?? HANDSHAKE_REWARD.combat) * (run.handshakeMult ?? 1));
  const reward = { cards: rollRewardCards(run, node.id) };
  if (node.type === "elite") {
    const relicId = grantRelic(run, node.id);
    if (relicId) reward.relic = relicId;
  }
  run.pendingReward = reward;
  run.status = "reward";
  return { ok: true, status: "reward" };
}

export function takeReward(run, cardId) {
  if (run.status !== "reward") return { ok: false, reason: "no-reward" };
  if (cardId && run.pendingReward?.cards.includes(cardId)) run.deck.push(cardId);
  else run.handshakes += SKIP_REWARD; // skipping the card keeps the deck thin and pays a little
  run.pendingReward = null;
  run.status = "map";
  return { ok: true, skipped: !cardId };
}

// A rest site grants exactly ONE of: heal, upgrade a card, or remove a card. `payload` is the deck
// index for "upgrade". A failed upgrade does NOT spend the site (the player can pick again).
export function rest(run, choice, payload) {
  const node = nodeById(run.map, run.currentNodeId);
  if (node?.type !== "rest") return { ok: false, reason: "not-rest" };
  if (choice === "heal") run.hp = Math.min(run.maxHp, run.hp + Math.round(run.maxHp * Math.max(0, REST_HEAL_FRACTION + (run.restHealMod || 0))));
  else if (choice === "upgrade") {
    const r = upgradeDeckCard(run, Number(payload));
    if (!r.ok) return r; // not spent
  }
  // "remove" (deck thinning) handled by removeCard below; either way the site is spent.
  run.clearedIds.push(node.id);
  run.status = "map";
  return { ok: true, hp: run.hp };
}

// Replace deck[index] with its upgraded form, in place. Returns { ok, id } or a reason.
export function upgradeDeckCard(run, index) {
  if (index < 0 || index >= run.deck.length) return { ok: false, reason: "bad-index" };
  const upgraded = upgradeIdFor(run.deck[index]);
  if (!upgraded) return { ok: false, reason: "not-upgradable" };
  run.deck[index] = upgraded;
  return { ok: true, id: upgraded };
}

export function removeCard(run, index) {
  if (index < 0 || index >= run.deck.length) return { ok: false };
  run.deck.splice(index, 1);
  return { ok: true };
}

// Leave a non-combat node (shop / event) and return to the map.
export function closeNode(run) {
  const node = nodeById(run.map, run.currentNodeId);
  if (!node) return { ok: false };
  if (!run.clearedIds.includes(node.id)) run.clearedIds.push(node.id);
  run.status = "map";
  return { ok: true };
}

export function buyCard(run, cardId, cost) {
  if (run.handshakes < cost) return { ok: false, reason: "poor" };
  if (!REWARD_POOL.includes(cardId)) return { ok: false, reason: "unavailable" };
  run.handshakes -= cost;
  run.deck.push(cardId);
  return { ok: true };
}

// Current price to remove a card — escalates each time you buy a removal this run.
export function removalCost(run) {
  return REMOVAL_BASE + REMOVAL_STEP * (run.removalsPurchased || 0);
}

// Buy a deck removal at the shop. Price climbs per purchase; deck-thinning is the strongest action.
export function buyRemoval(run, index) {
  const cost = removalCost(run);
  if (run.handshakes < cost) return { ok: false, reason: "poor", cost };
  if (index < 0 || index >= run.deck.length) return { ok: false, reason: "bad-index", cost };
  if (run.deck.length <= 1) return { ok: false, reason: "deck-floor", cost }; // never empty the deck
  run.handshakes -= cost;
  run.deck.splice(index, 1);
  run.removalsPurchased = (run.removalsPurchased || 0) + 1;
  return { ok: true, cost };
}

export const UPGRADE_COST = 40;
export const RELIC_COST = 65;

// Buy an in-place card upgrade at the shop. No spend if the card cannot be upgraded.
export function buyUpgrade(run, index, cost = UPGRADE_COST) {
  if (run.handshakes < cost) return { ok: false, reason: "poor", cost };
  const r = upgradeDeckCard(run, index);
  if (!r.ok) return r; // not upgradable — nothing spent
  run.handshakes -= cost;
  return { ok: true, id: r.id, cost };
}

// Buy a relic at the shop. No spend if the relic pool is exhausted.
export function buyRelic(run, cost = RELIC_COST) {
  if (run.handshakes < cost) return { ok: false, reason: "poor", cost };
  const id = grantRelic(run, `shop:${run.currentNodeId}`);
  if (!id) return { ok: false, reason: "sold-out", cost };
  run.handshakes -= cost;
  return { ok: true, relic: id, cost };
}

// TEST/DEBUG ONLY — seat a run directly at the act-4 boss node without playing acts 1–3.
// This is NOT a player affordance (no hub button); the smoke harness uses it to reach the
// negotiation in one hop. Optionally swaps in a known `deck` so the boss fight is reproducible.
// Returns the boss node id. Deterministic: only mutates run position/act/status.
export function seatAtFinalBoss(run, deck) {
  run.act = FINAL_BOSS_ACT;
  const bossNode = run.map.acts[FINAL_BOSS_ACT - 1].layers.at(-1)[0];
  run.currentNodeId = bossNode.id;
  run.status = "boss";
  run.pendingReward = null;
  run.notice = null;
  if (Array.isArray(deck)) run.deck = [...deck];
  return bossNode.id;
}

// ── internals ────────────────────────────────────────────────────────────────────────────────────

function clearBoss(run) {
  if (run.act >= FINAL_BOSS_ACT) {
    run.status = "won";
    return { ok: true, status: "won" };
  }
  run.act += 1;
  run.currentNodeId = null;
  const relicId = grantRelic(run, `boss-clear-act${run.act}`);
  if (relicId) run.notice = `Relic acquired — ${relicById(relicId)?.name || relicId}`;
  run.status = "map";
  return { ok: true, status: "map", advancedToAct: run.act, relic: relicId };
}

// Public relic grant for events (Defragmenter rewrite). Returns the granted relic id, or null.
export function awardRelic(run, key = "event") {
  return grantRelic(run, key);
}

// Grant a not-yet-owned relic deterministically (per run seed + key). Returns its id, or null.
function grantRelic(run, key) {
  const id = rollRelic(hashSeed(run.seed, `${key}:relic`), run.relics);
  if (id) run.relics.push(id);
  return id;
}

function rollRewardCards(run, nodeId) {
  const rng = makeRng(hashSeed(run.seed, nodeId));
  const pool = [...REWARD_POOL];
  const picks = [];
  while (picks.length < REWARD_CHOICES && pool.length) {
    picks.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  return picks;
}

function screenForNode(node) {
  if (node.type === "combat" || node.type === "elite") return "combat";
  if (node.type === "boss") return "boss";
  return node.type; // rest | shop | event
}
