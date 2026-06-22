// combat.js — Stage 6 Protocol Codex: pure deck-combat engine (no DOM, no storage).
//
// One encounter = player vs one enemy. The engine owns the piles, energy, block, statuses, and the
// turn loop. Card effects are JS functions (cards.js) that mutate combat through the `ctx` API built
// by playCard — so all game logic stays here and content stays declarative.
//
// Status model (stacks): vulnerable (takes +50% attack dmg), weak (deals -25% attack dmg),
// each decremented at the owner's turn start. Block is not a status; it resets each owner turn.

import { cardById } from "./cards.js";

const HAND_SIZE = 5;
const START_ENERGY = 3;

// Small seeded PRNG (mulberry32) so shuffles are deterministic for tests/replays.
export function makeRng(seed) {
  let a = (Number(seed) >>> 0) || 1;
  return function rng() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, rng) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function createCombat({ deck, player, enemy, seed = 1, relics = [] }) {
  const rng = makeRng(seed);
  const combat = {
    rng,
    relics,
    player: {
      hp: player.hp,
      maxHp: player.maxHp,
      block: 0,
      energy: START_ENERGY,
      maxEnergy: START_ENERGY,
      statuses: {}
    },
    enemy: {
      id: enemy.id,
      name: enemy.name,
      hp: enemy.hp,
      maxHp: enemy.hp,
      block: 0,
      armor: Number(enemy.armor || 0),
      statuses: {},
      script: enemy.script,
      intentIndex: 0,
      skipNext: false
    },
    draw: shuffle(deck, rng),
    hand: [],
    discard: [],
    exhaust: [],
    turn: 1,
    cardsPlayedThisTurn: 0,
    energySpentThisTurn: 0,
    playedIdsThisTurn: [],
    lastCardPlayed: null,
    over: false,
    result: null,
    log: []
  };
  drawCards(combat, HAND_SIZE);
  runHook(combat, "onCombatStart");
  runHook(combat, "onPlayerTurnStart");
  return combat;
}

// Relics observe the fight through the same primitives cards use.
function runHook(combat, name, card = null) {
  for (const relic of combat.relics) {
    const fn = relic.hooks?.[name];
    if (typeof fn === "function") fn(relicCtx(combat, card));
  }
}

function relicCtx(combat, card) {
  return {
    combat, card,
    deal: (n) => dealToEnemy(combat, n),
    block: (n) => { combat.player.block += Math.max(0, Math.round(n)); },
    draw: (n) => drawCards(combat, n),
    gainEnergy: (n) => { combat.player.energy += n; },
    applySelf: (status, n) => addStatus(combat.player, status, n),
    applyEnemy: (status, n) => addStatus(combat.enemy, status, n)
  };
}

export function currentIntent(combat) {
  const script = combat.enemy.script;
  return script[combat.enemy.intentIndex % script.length];
}

// ── Card play ───────────────────────────────────────────────────────────────────────────────────

export function playCard(combat, handIndex) {
  if (combat.over) return { ok: false, reason: "over" };
  const cardId = combat.hand[handIndex];
  if (cardId == null) return { ok: false, reason: "no-card" };
  const card = cardById(cardId);
  if (!card) return { ok: false, reason: "unknown-card" };
  if (card.cost > combat.player.energy) return { ok: false, reason: "no-energy" };

  combat.player.energy -= card.cost;
  combat.energySpentThisTurn += card.cost;
  combat.cardsPlayedThisTurn += 1;
  combat.hand.splice(handIndex, 1);
  combat.playedIdsThisTurn.push(card.id);

  card.effect(makeCtx(combat, card));

  combat.lastCardPlayed = card.id;
  if (card.exhaust) combat.exhaust.push(card.id);
  else combat.discard.push(card.id);

  runHook(combat, "onCardPlay", card);
  checkEnemyDead(combat);
  return { ok: true, card: card.id };
}

function makeCtx(combat, card) {
  return {
    combat,
    card,
    deal: (n) => dealToEnemy(combat, n),
    block: (n) => { combat.player.block += Math.max(0, Math.round(n)); },
    draw: (n) => drawCards(combat, n),
    gainEnergy: (n) => { combat.player.energy += n; },
    applyEnemy: (status, n) => addStatus(combat.enemy, status, n),
    applySelf: (status, n) => addStatus(combat.player, status, n),
    clearSelfDebuffs: () => {
      let cleared = 0;
      for (const key of Object.keys(combat.player.statuses)) {
        if (DURATION_STATUSES.has(key)) { cleared += combat.player.statuses[key]; delete combat.player.statuses[key]; }
      }
      return cleared;
    },
    skipEnemyNext: () => { combat.enemy.skipNext = true; },
    playedThisTurn: (id) => combat.playedIdsThisTurn.includes(id),
    get cardsPlayed() { return combat.cardsPlayedThisTurn; },
    get energySpent() { return combat.energySpentThisTurn; },
    get handSize() { return combat.hand.length; },
    get blockNow() { return combat.player.block; },
    get hp() { return combat.player.hp; },
    get discardPile() { return combat.discard; }
  };
}

// ── Turn loop ───────────────────────────────────────────────────────────────────────────────────

export function endTurn(combat) {
  if (combat.over) return combat;
  // Discard the hand.
  combat.discard.push(...combat.hand);
  combat.hand = [];

  enemyTurn(combat);
  if (combat.over) return combat;

  // New player turn.
  combat.turn += 1;
  combat.player.block = 0;
  combat.player.energy = combat.player.maxEnergy;
  combat.cardsPlayedThisTurn = 0;
  combat.energySpentThisTurn = 0;
  combat.playedIdsThisTurn = [];
  tickStatuses(combat.player);
  drawCards(combat, HAND_SIZE);
  runHook(combat, "onPlayerTurnStart");
  return combat;
}

function enemyTurn(combat) {
  const enemy = combat.enemy;
  enemy.block = 0;
  const intent = currentIntent(combat);
  if (enemy.skipNext) {
    enemy.skipNext = false;
    log(combat, `${enemy.name} action interrupted.`);
  } else {
    resolveIntent(combat, intent);
  }
  enemy.intentIndex += 1;
  tickStatuses(enemy);
  checkPlayerDead(combat);
}

function resolveIntent(combat, intent) {
  const enemy = combat.enemy;
  if (intent.block) enemy.block += intent.block;
  if (intent.attack) {
    const hits = intent.hits || 1;
    for (let i = 0; i < hits; i++) dealToPlayer(combat, intent.attack, { pierce: Boolean(intent.pierce) });
  }
  // Man-in-the-Middle: reflect the player's just-finished turn — damage scales with cards played.
  if (intent.mirror) dealToPlayer(combat, intent.mirror * combat.cardsPlayedThisTurn);
  if (intent.applySelf) addStatus(enemy, intent.applySelf.status, intent.applySelf.value);
  if (intent.applyPlayer) addStatus(combat.player, intent.applyPlayer.status, intent.applyPlayer.value);
}

// ── Damage / block / status primitives ───────────────────────────────────────────────────────────

export function dealToEnemy(combat, baseAmount) {
  let amount = Math.max(0, Math.round(baseAmount));
  if (combat.player.statuses.strength) amount += combat.player.statuses.strength;
  if (combat.player.statuses.weak) amount = Math.floor(amount * 0.75);
  if (combat.enemy.statuses.vulnerable) amount = Math.floor(amount * 1.5);
  amount = Math.max(0, amount - combat.enemy.armor);
  const absorbed = Math.min(combat.enemy.block, amount);
  combat.enemy.block -= absorbed;
  combat.enemy.hp = Math.max(0, combat.enemy.hp - (amount - absorbed));
}

export function dealToPlayer(combat, baseAmount, { pierce = false } = {}) {
  let amount = Math.max(0, Math.round(baseAmount));
  if (combat.enemy.statuses.weak) amount = Math.floor(amount * 0.75);
  if (combat.player.statuses.vulnerable) amount = Math.floor(amount * 1.5);
  if (pierce) { // unblockable (Expired Certificate's expiry) — block does not absorb it
    combat.player.hp = Math.max(0, combat.player.hp - amount);
    return;
  }
  const absorbed = Math.min(combat.player.block, amount);
  combat.player.block -= absorbed;
  combat.player.hp = Math.max(0, combat.player.hp - (amount - absorbed));
}

function addStatus(entity, status, value) {
  entity.statuses[status] = (entity.statuses[status] || 0) + value;
  if (entity.statuses[status] <= 0) delete entity.statuses[status];
}

// Only duration statuses count down at the owner's turn start; powers (e.g. strength) persist.
const DURATION_STATUSES = new Set(["vulnerable", "weak"]);

function tickStatuses(entity) {
  for (const key of Object.keys(entity.statuses)) {
    if (!DURATION_STATUSES.has(key)) continue;
    entity.statuses[key] -= 1;
    if (entity.statuses[key] <= 0) delete entity.statuses[key];
  }
}

// ── Piles ────────────────────────────────────────────────────────────────────────────────────────

export function drawCards(combat, n) {
  for (let i = 0; i < n; i++) {
    if (combat.draw.length === 0) {
      if (combat.discard.length === 0) return;
      combat.draw = shuffle(combat.discard, combat.rng);
      combat.discard = [];
    }
    combat.hand.push(combat.draw.shift());
  }
}

function checkEnemyDead(combat) {
  if (combat.enemy.hp <= 0 && !combat.over) {
    combat.over = true;
    combat.result = "win";
  }
}

function checkPlayerDead(combat) {
  if (combat.player.hp <= 0 && !combat.over) {
    combat.over = true;
    combat.result = "lose";
  }
}

function log(combat, line) {
  combat.log = [...combat.log, line].slice(-10);
}
