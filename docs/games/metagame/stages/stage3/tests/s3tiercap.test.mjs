// Tier cap (APPROVED OPTION) — at most TIER_CAP mechanics active per snapshot, two-colour forced when
// present, rotation surfaces every unlocked mechanic across snapshots.
import assert from "node:assert/strict";
import { TIER_CAP, unlockedTiers, activeTiers } from "../s3tiercap.js";
import { VOLATILE_AT } from "../s3volatile.js";
import { ALIASED_AT } from "../s3aliased.js";
import { DECAY_AT } from "../s3decay.js";
import { TWOCOLOR_AT } from "../s3twocolor.js";

assert.equal(TIER_CAP, 2, "cap is 2 (late-game legibility)");

// unlockedTiers tracks the gates and drops mono-only aliased once two-colour takes over.
assert.deepEqual(unlockedTiers(VOLATILE_AT - 1), [], "no tiers before volatile");
assert.deepEqual(unlockedTiers(VOLATILE_AT), ["volatile"], "volatile alone first");
assert.deepEqual(unlockedTiers(ALIASED_AT), ["volatile", "aliased"], "aliased stacks (mono)");
assert.deepEqual(unlockedTiers(DECAY_AT), ["volatile", "aliased", "decay"], "decay stacks (mono, 3 unlocked)");
{
  const t = unlockedTiers(TWOCOLOR_AT);
  assert(t.includes("twocolor"), "two-colour present at its gate");
  assert(!t.includes("aliased"), "aliased (mono-only) is dropped once two-colour is live");
}

// The cap holds at every corruption, and two-colour (the board type) is always kept when present.
for (let c = 0; c <= 8; c += 1) {
  for (let i = 0; i < 6; i += 1) {
    const active = activeTiers(c, i);
    assert(active.size <= TIER_CAP, `corruption ${c} idx ${i}: ≤${TIER_CAP} active (was ${active.size})`);
    if (unlockedTiers(c).includes("twocolor")) assert(active.has("twocolor"), `corruption ${c} keeps two-colour`);
  }
}

// Mono corruption 4 has 3 unlocked (volatile/aliased/decay) but only 2 active — and the index rotation
// surfaces ALL THREE across consecutive snapshots (no mechanic is permanently starved).
{
  const union = new Set();
  for (let i = 0; i < 3; i += 1) for (const m of activeTiers(4, i)) union.add(m);
  assert.deepEqual([...union].sort(), ["aliased", "decay", "volatile"], "rotation covers all three across snapshots");
  assert.equal(activeTiers(4, 0).size, 2, "exactly 2 active at corruption 4");
}

// Deterministic: same (corruption, index) → same active set.
assert.deepEqual([...activeTiers(8, 3)].sort(), [...activeTiers(8, 3)].sort(), "activeTiers is deterministic");

console.log("stage3 tier-cap tests passed");
