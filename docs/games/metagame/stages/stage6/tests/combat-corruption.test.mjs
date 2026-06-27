// combat-corruption.test.mjs — Phase H Act 5 CORRUPTION (DoT) verb: the corruption tick + decay, the
// Daemon Swarm cards, the Entropy Pool relic, and the Act-5 enemies (Heisenbug cleanse / Stack
// Overflow fortify). Split out of combat.test.mjs to keep each suite under the LOC cap.
import assert from "node:assert/strict";
import { createCombat, endTurn, playCard } from "../combat.js";
import { instantiateEnemy } from "../enemies.js";
import { relicsFor } from "../relics.js";
import { STARTING_DECK } from "../cards.js";

function bigEnemyCombat(deck, relics = [], seed = 9) {
  const c = createCombat({ deck, player: { hp: 300, maxHp: 300 }, enemy: instantiateEnemy("corrupt-packet", 1), seed, relics });
  c.enemy.hp = 400; c.enemy.maxHp = 400; // survive long enough to observe the DoT
  return c;
}

// ── corruption: ticks at the enemy turn start, decays by 1, ignores armor ──────────────────────────
{
  const c = bigEnemyCombat(STARTING_DECK);
  c.enemy.armor = 5; // corruption ignores armor (it's a leak, not an attack)
  c.enemy.statuses.corruption = 5;
  const hp0 = c.enemy.hp;
  endTurn(c); // enemy turn ticks corruption first
  assert.equal(c.enemy.hp, hp0 - 5, "corruption dealt 5 (armor ignored)");
  assert.equal(c.enemy.statuses.corruption, 4, "corruption decayed by 1");
  endTurn(c);
  assert.equal(c.enemy.hp, hp0 - 5 - 4, "next tick dealt 4");
  assert.equal(c.enemy.statuses.corruption, 3, "corruption decayed again");
}
{
  // Entropy Pool relic: corruption ticks TWICE (combat.corruptionDouble).
  const c = bigEnemyCombat(STARTING_DECK);
  c.corruptionDouble = true;
  c.enemy.statuses.corruption = 6;
  const hp0 = c.enemy.hp;
  endTurn(c);
  assert.equal(c.enemy.hp, hp0 - 12, "doubled corruption dealt 6×2");
  assert.equal(c.enemy.statuses.corruption, 5, "still decays by 1 after the double tick");
}
{
  // Corruption can kill outright before the enemy acts (no counter-damage to the player).
  const c = bigEnemyCombat(STARTING_DECK);
  c.enemy.hp = 4; c.enemy.statuses.corruption = 9;
  const playerHp0 = c.player.hp;
  endTurn(c);
  assert.ok(c.over && c.result === "win", "corruption killed the enemy at its turn start");
  assert.equal(c.player.hp, playerHp0, "a corruption kill means the enemy never attacked");
}

// ── Daemon Swarm: corruption application + payoff cards ─────────────────────────────────────────────
function daemonCombat(hand, { seed = 5, hp = 60, enemy = "corrupt-packet", relics = [] } = {}) {
  const c = createCombat({ deck: hand, player: { hp, maxHp: hp }, enemy: instantiateEnemy(enemy, 1), seed, relics });
  c.hand = [...hand]; c.player.energy = 9;
  return c;
}
{
  const c = daemonCombat(["FORK_BOMB", "ZOMBIE_PROCESS"]);
  playCard(c, 0);
  assert.equal(c.enemy.statuses.corruption, 4, "FORK_BOMB applies 4 corruption");
  playCard(c, 0); // ZOMBIE_PROCESS: +3, and +3 more because already corrupted
  assert.equal(c.enemy.statuses.corruption, 4 + 6, "ZOMBIE_PROCESS adds extra when already corrupted");
}
{
  const c = daemonCombat(["MEMORY_LEAK", "FORK_BOMB"]);
  playCard(c, 0); // boost +1, then apply 2 (→ 3)
  assert.equal(c.enemy.statuses.corruption, 3, "MEMORY_LEAK applies 2 + its own +1 = 3");
  playCard(c, 0); // FORK_BOMB: 4 + 1 boost = 5
  assert.equal(c.enemy.statuses.corruption, 3 + 5, "Memory Leak boosts later corruption by 1");
}
{
  const c = daemonCombat(["CORE_DUMP"]); c.enemy.statuses.corruption = 10;
  const hp0 = c.enemy.hp;
  playCard(c, 0);
  assert.equal(c.enemy.hp, hp0 - 10, "CORE_DUMP deals damage = corruption");
  assert.equal(c.enemy.statuses.corruption, 5, "CORE_DUMP halves the stack");
}
{
  const c = daemonCombat(["GARBAGE_COLLECT"]); c.enemy.statuses.corruption = 12;
  const hp0 = c.enemy.hp;
  playCard(c, 0);
  assert.equal(c.enemy.hp, hp0 - 12, "GARBAGE_COLLECT deals all corruption instantly");
  assert.ok(!c.enemy.statuses.corruption, "GARBAGE_COLLECT consumes the whole stack");
}
{
  const c = daemonCombat(["CASCADE_FAILURE"]); c.enemy.statuses.corruption = 5;
  playCard(c, 0);
  assert.equal(c.enemy.statuses.corruption, 10, "CASCADE_FAILURE doubles the corruption");
}
{
  // Entropy Pool relic: corruption ticks twice at the enemy turn.
  const c = daemonCombat(["FORK_BOMB"], { hp: 300, relics: relicsFor(["entropy-pool"]) });
  c.enemy.hp = 400; c.enemy.statuses.corruption = 5;
  const hp0 = c.enemy.hp;
  endTurn(c);
  assert.equal(c.enemy.hp, hp0 - 10, "Entropy Pool doubles the tick (5×2)");
}

// ── Act 5 enemies: Heisenbug cleanses, Stack Overflow fortifies when undamaged ─────────────────────
{
  const c = createCombat({ deck: STARTING_DECK, player: { hp: 300, maxHp: 300 }, enemy: instantiateEnemy("heisenbug", 1), seed: 5 });
  c.enemy.hp = 400;
  c.enemy.statuses.corruption = 12;
  c.enemy.statuses.weak = 9;
  endTurn(c); endTurn(c); // turns 1–2: no cleanse yet
  assert.ok((c.enemy.statuses.corruption || 0) > 0, "corruption persists before the cleanse turn");
  endTurn(c); // turn 3 intent: Heisenbug cleanses itself
  assert.ok(!c.enemy.statuses.corruption, "Heisenbug cleansed its corruption");
  assert.ok(!c.enemy.statuses.weak, "Heisenbug cleansed its weak");
}
{
  // Fortify: a turn you DON'T damage it grants +6 armor.
  const c = createCombat({ deck: STARTING_DECK, player: { hp: 300, maxHp: 300 }, enemy: instantiateEnemy("stack-overflow", 1), seed: 5 });
  const armor0 = c.enemy.armor;
  endTurn(c); // intent 0 (attack); player dealt no damage → still unhurt
  endTurn(c); // intent 1 (fortify) → +6 armor
  assert.equal(c.enemy.armor, armor0 + 6, "Stack Overflow fortifies when undamaged");
}
{
  // Damaging it right before the fortify turn denies the armor.
  const c = createCombat({ deck: ["PRIORITY_PACKET"], player: { hp: 300, maxHp: 300 }, enemy: instantiateEnemy("stack-overflow", 1), seed: 5 });
  endTurn(c); // intent 0, no damage
  const armor0 = c.enemy.armor;
  c.hand = ["PRIORITY_PACKET"]; c.player.energy = 5;
  playCard(c, 0); // hit it before the fortify turn
  endTurn(c); // intent 1 (fortify) — we hit it, so NO armor
  assert.equal(c.enemy.armor, armor0, "Stack Overflow does not fortify if you damaged it");
}

console.log("stage6 combat-corruption tests passed");
