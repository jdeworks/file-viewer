// cards.test.mjs — archetype split + upgrade coverage invariants.
import assert from "node:assert/strict";
import { CARDS, cardById, REWARD_POOL, STARTING_DECK } from "../cards.js";
import { canUpgrade, upgradeIdFor } from "../card-upgrades.js";

// ── the pool is split across all three archetypes ──────────────────────────────────────────────────
{
  assert.ok(CARDS.length >= 36, `pool is at least 36 cards (have ${CARDS.length})`);
  const byType = (t) => CARDS.filter((c) => c.type === t);
  assert.ok(byType("Signal").length >= 12, "Signal archetype well represented");
  assert.ok(byType("Protocol").length >= 10, "Protocol archetype well represented");
  assert.ok(byType("Layer").length >= 6, "Layer archetype well represented");
  // ids are unique.
  assert.equal(new Set(CARDS.map((c) => c.id)).size, CARDS.length, "card ids are unique");
}

// ── every card has a registered, stronger upgraded "+" form ────────────────────────────────────────
{
  for (const card of CARDS) {
    assert.ok(canUpgrade(card.id), `${card.id} can be upgraded`);
    const upId = upgradeIdFor(card.id);
    const up = cardById(upId);
    assert.ok(up, `${upId} resolves via the registry`);
    assert.equal(up.base, card.id, `${upId} carries its base id`);
    assert.equal(up.type, card.type, `${upId} keeps its archetype`);
  }
}

// ── reward pool excludes starters; starting deck cards all resolve ─────────────────────────────────
{
  assert.ok(REWARD_POOL.every((id) => cardById(id)?.rarity !== "starter"), "reward pool has no starters");
  assert.ok(STARTING_DECK.every((id) => cardById(id)), "every starting-deck card resolves");
}

console.log("stage6 cards tests passed");
