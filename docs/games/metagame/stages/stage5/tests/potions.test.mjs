import assert from "node:assert/strict";
import { POTIONS, potionById, rollPotion } from "../potions.js";
import {
  createRun, addPotion, usePotion, takePotion, buyPotion,
  moveTo, availableNodes, resolveCombat, POTION_SLOTS, POTION_COST
} from "../run.js";
import { createCombat, applyPotionEffect, playCard } from "../combat.js";
import { instantiateEnemy } from "../enemies.js";
import { STARTING_DECK } from "../cards.js";

// Phase G item 2 — the potion belt: deterministic rolls, 2-slot management, combat use, persistence.

// ── rollPotion is deterministic and rarity-weighted ────────────────────────────────────────────────
{
  for (const seed of [1, 7, 42, 9999]) {
    assert.equal(rollPotion(seed), rollPotion(seed), `seed ${seed}: same seed ⇒ same potion`);
    assert.ok(potionById(rollPotion(seed)), `seed ${seed}: rolls a real potion`);
  }
  // Over many seeds, commons should dominate rares (4:1 weight).
  const counts = {};
  for (let s = 1; s <= 2000; s++) { const id = rollPotion(s); counts[id] = (counts[id] || 0) + 1; }
  const commons = POTIONS.filter((p) => p.rarity === "common").reduce((n, p) => n + (counts[p.id] || 0), 0);
  const rares = POTIONS.filter((p) => p.rarity === "rare").reduce((n, p) => n + (counts[p.id] || 0), 0);
  assert.ok(commons > rares, "commons roll more often than rares");
}

// ── belt management: add respects the 2-slot cap; full belt needs a replace index ─────────────────
{
  const run = createRun({ seed: 1 });
  assert.deepEqual(run.potions, [], "fresh belt is empty");
  assert.ok(addPotion(run, "hotfix").ok, "first add ok");
  assert.ok(addPotion(run, "smoke-test").ok, "second add ok");
  assert.equal(run.potions.length, POTION_SLOTS, "belt at capacity");
  const full = addPotion(run, "fuzzer");
  assert.equal(full.ok, false, "third add rejected");
  assert.equal(full.full, true, "reports belt full");
  const swap = addPotion(run, "fuzzer", 0);
  assert.ok(swap.ok && swap.replaced === "hotfix", "replace swaps the named slot out");
  assert.deepEqual(run.potions, ["fuzzer", "smoke-test"], "slot 0 replaced");
  assert.equal(addPotion(run, "nope").ok, false, "unknown potion rejected");
}

// ── usePotion removes from the belt ────────────────────────────────────────────────────────────────
{
  const run = createRun({ seed: 1 });
  addPotion(run, "snapshot");
  const u = usePotion(run, 0);
  assert.ok(u.ok && u.id === "snapshot", "used potion returned");
  assert.equal(run.potions.length, 0, "belt empties");
  assert.equal(usePotion(run, 0).ok, false, "no potion to use");
}

// ── potion effects apply to a live combat through the shared ctx ───────────────────────────────────
function freshCombat() {
  return createCombat({ deck: STARTING_DECK, player: { hp: 30, maxHp: 50 }, enemy: instantiateEnemy("corrupt-packet", 1), seed: 4 });
}
{
  const c = freshCombat();
  applyPotionEffect(c, potionById("hotfix"));
  assert.equal(c.player.hp, 42, "Hotfix heals 12 (capped at max)");
}
{
  const c = freshCombat(); const e = c.player.energy;
  applyPotionEffect(c, potionById("burst-buffer"));
  assert.equal(c.player.energy, e + 2, "Burst Buffer adds 2 energy");
}
{
  const c = freshCombat(); c.player.block = 0;
  applyPotionEffect(c, potionById("smoke-test"));
  assert.equal(c.player.block, 15, "Smoke Test grants 15 block");
}
{
  const c = freshCombat();
  applyPotionEffect(c, potionById("fuzzer"));
  assert.equal(c.enemy.statuses.vulnerable, 3, "Fuzzer applies 3 Vulnerable");
}
{
  const c = freshCombat(); const before = c.hand.length;
  applyPotionEffect(c, potionById("snapshot"));
  assert.equal(c.hand.length, before + 3, "Snapshot draws 3");
}
{
  // Rollback returns the last played card to hand.
  const c = freshCombat(); c.hand = ["SYN"]; c.player.energy = 3; c.enemy.hp = 999;
  playCard(c, 0);
  const handLen = c.hand.length;
  applyPotionEffect(c, potionById("rollback"));
  assert.equal(c.hand.length, handLen + 1, "Rollback returns a card to hand");
  assert.ok(c.hand.includes("SYN"), "the last played card is back");
}
{
  // Core Dump Vial deals damage and can win the fight.
  const c = freshCombat(); c.enemy.hp = 10; c.enemy.armor = 0; c.enemy.block = 0;
  applyPotionEffect(c, potionById("core-dump-vial"));
  assert.equal(c.result, "win", "Core Dump Vial's 25 damage kills a 10-HP enemy");
}

// ── shop purchase: deducts handshakes; rejects when poor or belt full ──────────────────────────────
{
  const run = createRun({ seed: 1, handshakes: 500 });
  const r = buyPotion(run, "hotfix", POTION_COST);
  assert.ok(r.ok, "potion bought");
  assert.equal(run.handshakes, 500 - POTION_COST, "handshakes deducted");
  assert.deepEqual(run.potions, ["hotfix"], "potion added to belt");
  buyPotion(run, "fuzzer", POTION_COST);
  const full = buyPotion(run, "snapshot", POTION_COST); // belt full, no replace index — plenty of cash
  assert.equal(full.ok, false, "cannot buy with a full belt");
  assert.ok(full.full, "reports full (not poor)");
  const poor = createRun({ seed: 1, handshakes: 5 });
  assert.equal(buyPotion(poor, "hotfix", POTION_COST).ok, false, "too poor rejected");
  assert.equal(poor.handshakes, 5, "nothing spent when poor");
}

// ── reward drop: deterministic per node (same seed ⇒ same potion-or-none) ──────────────────────────
{
  function dropFor(seed) {
    const run = createRun({ seed });
    moveTo(run, availableNodes(run)[0].id);
    resolveCombat(run, { win: true, hpRemaining: run.hp });
    return run.pendingReward?.potion ?? null;
  }
  for (const seed of [1, 2, 3, 7, 42]) {
    assert.equal(dropFor(seed), dropFor(seed), `seed ${seed}: combat potion drop is deterministic`);
  }
  // Grabbing the dropped potion (when present) puts it on the belt.
  let seed = 1; let drop = null;
  while (drop == null && seed < 50) { drop = dropFor(seed); if (drop == null) seed++; }
  assert.ok(drop, "found a seed that drops a potion");
  const run = createRun({ seed });
  moveTo(run, availableNodes(run)[0].id);
  resolveCombat(run, { win: true, hpRemaining: run.hp });
  const t = takePotion(run);
  assert.ok(t.ok, "potion grabbed");
  assert.ok(run.potions.includes(drop), "grabbed potion is on the belt");
  assert.equal(run.pendingReward.potion, null, "drop consumed");
}

// ── persistence: the belt survives a JSON round-trip (it lives in the run state) ───────────────────
{
  const run = createRun({ seed: 1 });
  addPotion(run, "hotfix"); addPotion(run, "core-dump-vial");
  const revived = JSON.parse(JSON.stringify(run));
  assert.deepEqual(revived.potions, ["hotfix", "core-dump-vial"], "belt persists across serialization");
  // usePotion works on the revived run too.
  assert.ok(usePotion(revived, 0).ok, "revived belt is usable");
}

console.log("stage5 potions tests passed");
