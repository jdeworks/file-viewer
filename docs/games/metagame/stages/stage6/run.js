// run.js — Stage 6 Protocol Codex: run controller (pure state machine over the generated map).
//
// Owns one run attempt: the deck, hp, handshakes, relics, and position on the act map. The UI (WP4)
// drives combat; this module records outcomes and decides what screen comes next (map / reward /
// rest / shop / boss / dead / won). Run-scoped state resets on death; meta (handshakes carried,
// prestige version) is held by the caller across runs.

import { generateRun, nodeById, enemyForNode } from "./mapgen.js";
import { makeRng } from "./combat.js";
import { STARTING_DECK, REWARD_POOL } from "./cards.js";
import { rollRelic, relicById } from "./relics.js";

export const PLAYER_MAX_HP = 60;
const REST_HEAL_FRACTION = 0.30;
const REWARD_CHOICES = 3;
const HANDSHAKE_REWARD = { combat: 10, elite: 30, boss: 0 };
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
    status: "map",
    pendingReward: null,
    notice: null
  };
  // Prestige: each Protocol Version grants one starting relic (until the pool is exhausted).
  for (let i = 0; i < Number(version || 0); i++) grantRelic(run, `prestige-${i}`);
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

  run.handshakes += HANDSHAKE_REWARD[node.type] ?? HANDSHAKE_REWARD.combat;
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
  run.pendingReward = null;
  run.status = "map";
  return { ok: true };
}

export function rest(run, choice) {
  const node = nodeById(run.map, run.currentNodeId);
  if (node?.type !== "rest") return { ok: false, reason: "not-rest" };
  if (choice === "heal") run.hp = Math.min(run.maxHp, run.hp + Math.round(run.maxHp * REST_HEAL_FRACTION));
  // "remove" (deck thinning) handled by removeCard below; either way the site is spent.
  run.clearedIds.push(node.id);
  run.status = "map";
  return { ok: true, hp: run.hp };
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

function hashSeed(seed, nodeId) {
  let h = (Number(seed) || 1) >>> 0;
  for (const ch of String(nodeId)) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0;
  return h || 1;
}
