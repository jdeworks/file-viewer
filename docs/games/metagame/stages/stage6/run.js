// run.js — Stage 6 Protocol Codex: run controller (pure state machine over the generated map).
//
// Owns one run attempt: the deck, hp, handshakes, relics, and position on the act map. The UI (WP4)
// drives combat; this module records outcomes and decides what screen comes next (map / reward /
// rest / shop / boss / dead / won). Run-scoped state resets on death; meta (handshakes carried,
// prestige version) is held by the caller across runs.

import { generateRun, nodeById, enemyForNode } from "./mapgen.js";
import { makeRng, hashSeed, strHash } from "./combat.js";
import { STARTING_DECK, REWARD_POOL, draftRewardCards } from "./cards.js";
import { upgradeIdFor } from "./card-upgrades.js";
import { baseRunConfig, foldAscension, activeAscensionMods, MAX_ASCENSION } from "./ascension-mods.js";
import { rollRelic, rollRelics, relicById } from "./relics.js";
import { rollPotion, POTION_DROP_CHANCE } from "./potions.js";
import { SUPERBOSS_ID } from "./superboss.js";
// Belt operations live in potions.js; re-export so the renderer/tests keep importing from run.js.
export { POTION_SLOTS, POTION_COST, addPotion, usePotion, takePotion, buyPotion } from "./potions.js";

export const PLAYER_MAX_HP = 60;
const REST_HEAL_FRACTION = 0.30;
const REWARD_CHOICES = 4; // wider draft (was 3) so runs see more of the pool per node
const HANDSHAKE_REWARD = { combat: 10, elite: 30, boss: 0 };
// Skipping a reward card pays a few handshakes — deck-thinning is rewarded, so decks stay lean (12–18).
const SKIP_REWARD = 5;
// Deck removal is the strongest shop action, so its price ESCALATES per purchase within a run.
const REMOVAL_BASE = 25;
const REMOVAL_STEP = 25;
export const FINAL_BOSS_ACT = 6;
// First-run pacing (UX audit approved option): a player's FIRST-EVER run terminates victoriously at
// the act-4 story boss, The Refused Connection (which IS the epub un-cheat carrier). Acts 5–6 unlock
// on the first win. Six acts before any boss kill is a ~60–90m first exposure; StS ships 3.
export const FIRST_RUN_FINAL_ACT = 4;
// Per-act combat mini-bosses (acts 1–5); the final act is the codex-gated negotiation, The Refused
// Connection. On a 4-act first run its boss node IS that negotiation (enemyForCurrentNode keys off
// run.act === finalActOf(run)); on a 6-act veteran run acts 4/5 are the mini-bosses below.
const ACT_BOSSES = { 1: "kernel-panic", 2: "buffer-overflow", 3: "deadlock", 4: "session-hijack", 5: "stack-overflow" };
const PRESTIGE_HP_PER_VERSION = 5;

// The terminal act for a run derived from LIFETIME wins: 0 wins ⇒ end at act 4; ≥1 win ⇒ full six.
export function finalActForWins(wins) {
  return (Number(wins) || 0) >= 1 ? FINAL_BOSS_ACT : FIRST_RUN_FINAL_ACT;
}

// The run's terminal act. Runs saved before run.finalAct existed (or in-flight act-5/6 runs) default
// to the full six acts, so an existing run is NEVER shortened mid-flight. Clamped to [1, 6].
export function finalActOf(run) {
  const n = Number(run?.finalAct);
  return Number.isFinite(n) && n >= 1 ? Math.min(FINAL_BOSS_ACT, n) : FINAL_BOSS_ACT;
}

// Whether acts 5-6 + the key-gated true-ending superboss are reachable this run (a veteran run). Key
// telegraphs and the superboss only apply here — a first-ever 4-act run can't collect all 3 keys.
export function isVeteranRun(run) {
  return finalActOf(run) >= FINAL_BOSS_ACT;
}

// Banked-handshake cost to advance from the given Protocol Version to the next.
export function prestigeCost(version) {
  return (Number(version || 0) + 1) * 40;
}

// runScore(run) — a simple, deterministic self-competition score for a finished run (local-only):
//   handshakes earned + (acts fully cleared × 50) + HP remaining, all bonused ×(1 + ascension/10).
// A won run counts all FINAL_BOSS_ACT acts; a death counts the acts before the one it died in.
export function runScore(run) {
  if (!run) return 0;
  const won = run.status === "won";
  const actsCleared = won ? finalActOf(run) : Math.max(0, (run.act || 1) - 1);
  const base = Math.max(0, run.handshakes || 0) + actsCleared * 50 + Math.max(0, run.hp || 0);
  return Math.round(base * (1 + (run.ascension || 0) / 10));
}

// effectiveAscension(version, ascension) — the rule level a run actually plays under. Prestige acts
// as a FLOOR (its historical "one harder rule per version", now drawn from the same ladder) and the
// explicit ascension picker can push beyond it. The max (never the sum) is what makes the prestige
// rules and the ascension rules compose without double-applying. Clamped to the ladder length.
export function effectiveAscension(version = 0, ascension = 0) {
  return Math.max(0, Math.min(MAX_ASCENSION, Math.max(Number(version) || 0, Number(ascension) || 0)));
}

export function createRun({ seed = 1, version = 0, handshakes = 0, ascension = 0, dailyKey = null, mode = "standard", finalAct = FINAL_BOSS_ACT } = {}) {
  const maxHp = PLAYER_MAX_HP + Number(version || 0) * PRESTIGE_HP_PER_VERSION;
  const ascensionLevel = effectiveAscension(version, ascension);
  // The number of acts this run generates AND terminates at (see finalActForWins). Clamped to [1,6].
  // generateAct is independent of the total count, so acts 1..N are identical across a 4- or 6-act run.
  const acts = Math.max(1, Math.min(FINAL_BOSS_ACT, Number(finalAct) || FINAL_BOSS_ACT));
  // Fold the active ascension rules into this run's tunable config (the same ladder the hub picker
  // and prestige floor select). Each field is read by run.js economy/rest or makeCombat enemy scaling.
  const cfg = foldAscension(baseRunConfig(), ascensionLevel);
  const run = {
    seed,
    version,
    ascension: ascensionLevel, // the effective rule level this run was built at (for recordClear)
    mode,                      // "standard" | "daily" | "custom" (for the run-end score / labelling)
    dailyKey,                  // the date/custom string the seed was derived from, or null
    finalAct: acts,            // this run terminates victoriously at this act's boss (4 on a first run)
    map: generateRun(seed, acts),
    act: 1,
    currentNodeId: null,
    clearedIds: [],
    deck: [...STARTING_DECK],
    relics: [],
    potions: [], // the 2-slot consumable belt (potions.js); persisted with the run
    keys: [],    // true-ending keys earned this run (3 ⇒ the hidden superboss opens after the boss)
    atSuperboss: false,   // true while fighting the key-gated superboss
    superbossCleared: false,
    trueEnding: false,
    hp: maxHp,
    maxHp,
    handshakes,
    removalsPurchased: 0,
    status: "map",
    pendingReward: null,
    notice: null,
    // Ascension rule-modifier knobs (defaults = no modifier); foldAscension tuned them above.
    handshakeMult: cfg.handshakeMult,
    restHealMod: cfg.restHealMod,
    windowCapMod: cfg.windowCapMod,
    eliteHpBonus: cfg.eliteHpBonus,
    bossHpMult: cfg.bossHpMult,
    enemyHpMult: cfg.enemyHpMult,
    enemyArmorBonus: cfg.enemyArmorBonus,
    skipRewardMod: cfg.skipRewardMod,
    removalCostMod: cfg.removalCostMod,
    rewardChoicesMod: cfg.rewardChoicesMod,
    bossExtraPhase: cfg.bossExtraPhase,
    modifiers: activeAscensionMods(ascensionLevel).map((m) => m.id)
  };
  // Attrition (ascension): a run may start below its maximum HP.
  run.hp = Math.max(1, maxHp + (cfg.startHpMod || 0));
  // Prestige: each Protocol Version grants one starting relic (until the pool is exhausted).
  for (let i = 0; i < Number(version || 0); i++) grantRelic(run, `prestige-${i}`);
  return run;
}

// True-ending keys. Earned at most once each per run; collecting all 3 opens the hidden superboss
// after the act-6 negotiation. Each rewards a deliberate sacrifice (a roguelike "challenge run"):
//   untouchable — defeat an ELITE taking ≤ KEY_ELITE_MAX_DMG damage in that fight.
//   ascetic     — SKIP a card reward at a node (deck-thinning discipline).
//   sacrifice   — spend a REST on neither heal nor upgrade (thin a card instead).
export const KEY_UNTOUCHABLE = "untouchable";
export const KEY_ASCETIC = "ascetic";
export const KEY_SACRIFICE = "sacrifice";
export const KEYS_FOR_SUPERBOSS = 3;
const KEY_ELITE_MAX_DMG = 5;

// Award a key once (deduped). Returns true if newly awarded.
export function awardKey(run, id) {
  if (!run) return false;
  if (!Array.isArray(run.keys)) run.keys = [];
  if (run.keys.includes(id)) return false;
  run.keys.push(id);
  return true;
}

export function hasAllKeys(run) {
  return (run?.keys?.length || 0) >= KEYS_FOR_SUPERBOSS;
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
export function enemyForCurrentNode(run, rng = makeRng(strHash(`${run.seed}:${run.currentNodeId}:enemy`))) {
  if (run.atSuperboss) return SUPERBOSS_ID; // the key-gated true-ending fight (synthetic node)
  const node = nodeById(run.map, run.currentNodeId);
  if (!node) return null;
  if (node.type === "boss") return run.act === finalActOf(run) ? "the-refused-connection" : (ACT_BOSSES[run.act] || "kernel-panic");
  return enemyForNode(node, run.act, rng);
}

// Called by the UI once a combat resolves. win=false => the run ends (death restart).
export function resolveCombat(run, { win, hpRemaining }) {
  const hpBefore = run.hp; // captured before applying the fight's outcome (for the untouchable key)
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
    // Untouchable key: cleared this elite taking ≤ KEY_ELITE_MAX_DMG damage.
    if (hpBefore - run.hp <= KEY_ELITE_MAX_DMG) awardKey(run, KEY_UNTOUCHABLE);
  }
  // ~40% of cleared fights also drop a potion to grab (deterministic per node).
  const potionId = rollRewardPotion(run, node.id);
  if (potionId) reward.potion = potionId;
  run.pendingReward = reward;
  run.status = "reward";
  return { ok: true, status: "reward" };
}

export function takeReward(run, cardId) {
  if (run.status !== "reward") return { ok: false, reason: "no-reward" };
  if (cardId && run.pendingReward?.cards.includes(cardId)) run.deck.push(cardId);
  else { run.handshakes += Math.max(0, SKIP_REWARD + (run.skipRewardMod || 0)); awardKey(run, KEY_ASCETIC); } // skip keeps the deck thin, pays a little, and earns the ascetic key
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
  } else if (choice === "remove") {
    awardKey(run, KEY_SACRIFICE); // a rest spent on neither heal nor upgrade earns the sacrifice key
  }
  // "remove" (deck thinning) is performed by removeCard before this call; either way the site is spent.
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
  return REMOVAL_BASE + Math.max(0, run?.removalCostMod || 0) + REMOVAL_STEP * (run.removalsPurchased || 0);
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
  const finalAct = finalActOf(run);
  run.act = finalAct;
  const bossNode = run.map.acts[finalAct - 1].layers.at(-1)[0];
  run.currentNodeId = bossNode.id;
  run.status = "boss";
  run.pendingReward = null;
  run.notice = null;
  if (Array.isArray(deck)) run.deck = [...deck];
  return bossNode.id;
}

// ── internals ────────────────────────────────────────────────────────────────────────────────────

const BOSS_RELIC_CHOICES = 3;

function clearBoss(run) {
  if (run.act >= finalActOf(run)) {
    // True ending: the negotiation is won. With all 3 keys, a hidden superboss opens AFTER it (pure
    // extra combat — NO second un-cheat). It's reached via a synthetic node id; enemyForCurrentNode
    // returns the superboss while run.atSuperboss is set.
    if (hasAllKeys(run) && !run.superbossCleared && !run.atSuperboss) {
      run.atSuperboss = true;
      run.currentNodeId = `${run.currentNodeId}:superboss`;
      run.status = "superboss";
      return { ok: true, status: "superboss" };
    }
    run.status = "won";
    return { ok: true, status: "won" };
  }
  // Offer a 1-of-3 relic choice (deterministic, owned-deduped) instead of a forced grant — big replay
  // variance. Advancing to the next act is DEFERRED until the player picks (takeBossRelic).
  const offered = rollRelics(hashSeed(run.seed, `boss-clear-act${run.act}:relics`), run.relics, BOSS_RELIC_CHOICES);
  run.pendingReward = { relics: offered };
  run.status = "boss-reward";
  return { ok: true, status: "boss-reward", offered };
}

// Pick one of the boss-relic choices (or skip with a null id), then advance to the next act's map.
export function takeBossRelic(run, relicId) {
  if (run.status !== "boss-reward") return { ok: false, reason: "no-reward" };
  const offered = run.pendingReward?.relics || [];
  let granted = null;
  if (relicId && offered.includes(relicId) && !run.relics.includes(relicId)) {
    run.relics.push(relicId);
    granted = relicId;
  }
  run.pendingReward = null;
  run.act += 1;
  run.currentNodeId = null;
  run.status = "map";
  if (granted) run.notice = `Relic acquired — ${relicById(granted)?.name || granted}`;
  return { ok: true, advancedToAct: run.act, relic: granted };
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

// Deterministic per-node potion drop: ~40% chance, then a rarity-weighted pick. null = no drop.
function rollRewardPotion(run, nodeId) {
  const gate = makeRng(hashSeed(run.seed, `${nodeId}:potion-drop`))();
  if (gate >= POTION_DROP_CHANCE) return null;
  return rollPotion(hashSeed(run.seed, `${nodeId}:potion-pick`));
}

// Reward-card draft: rarity-weighted + act-scaled (cards.draftRewardCards), seeded per node.
function rollRewardCards(run, nodeId) {
  const choices = Math.max(1, REWARD_CHOICES + (run.rewardChoicesMod || 0)); // ascension can trim the draft
  return draftRewardCards(hashSeed(run.seed, nodeId), run.act, choices);
}

function screenForNode(node) {
  if (node.type === "combat" || node.type === "elite") return "combat";
  if (node.type === "boss") return "boss";
  return node.type; // rest | shop | event
}
