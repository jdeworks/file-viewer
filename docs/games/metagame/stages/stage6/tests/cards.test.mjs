// cards.test.mjs — archetype split + upgrade coverage invariants.
import assert from "node:assert/strict";
import { CARDS, cardById, REWARD_POOL, STARTING_DECK, draftRewardCards } from "../cards.js";
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

// ── G5: reward drafting is rarity-weighted, act-scaled, and deterministic ──────────────────────────
{
  const rarityOf = (id) => cardById(id)?.rarity;

  // Determinism: same (seed, act) ⇒ same 3 distinct cards.
  for (const seed of [1, 7, 42, 1000]) {
    const a = draftRewardCards(seed, 1, 3);
    const b = draftRewardCards(seed, 1, 3);
    assert.deepEqual(a, b, `seed ${seed}: draft is deterministic`);
    assert.equal(a.length, 3, "three cards drafted");
    assert.equal(new Set(a).size, 3, "the three are distinct");
    assert.ok(a.every((id) => REWARD_POOL.includes(id)), "drafts come from the reward pool");
  }

  // Act-scaling: across many seeds, rares are far more common in act 4 than act 1.
  function rareRate(act) {
    let rares = 0, total = 0;
    for (let s = 1; s <= 1500; s++) {
      for (const id of draftRewardCards(s, act, 3)) { total++; if (rarityOf(id) === "rare") rares++; }
    }
    return rares / total;
  }
  const earlyRare = rareRate(1);
  const lateRare = rareRate(4);
  assert.ok(lateRare > earlyRare * 2, `act 4 drafts far more rares than act 1 (${earlyRare.toFixed(3)} -> ${lateRare.toFixed(3)})`);

  // Conversely commons dominate act 1.
  let act1Common = 0, act1Total = 0;
  for (let s = 1; s <= 1500; s++) for (const id of draftRewardCards(s, 1, 3)) { act1Total++; if (rarityOf(id) === "common") act1Common++; }
  assert.ok(act1Common / act1Total > 0.5, "act 1 drafts are common-heavy");
}

console.log("stage6 cards tests passed");
