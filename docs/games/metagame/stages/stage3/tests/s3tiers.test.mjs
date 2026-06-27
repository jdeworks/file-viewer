// Tier-arrival messaging (round 4): one deterministic log line fires the moment corruption first
// crosses each mechanic threshold, exactly ONCE per run, in ascending-threshold order.
import assert from "node:assert/strict";
import { TIER_MESSAGES, announceTiers } from "../s3tiers.js";
import { defaultState } from "../state.js";
import { VOLATILE_AT } from "../s3volatile.js";
import { ALIASED_AT } from "../s3aliased.js";
import { DECAY_AT } from "../s3decay.js";
import { TWOCOLOR_AT } from "../s3twocolor.js";

// Thresholds are sourced from the mechanic gates so they can never drift.
const byId = Object.fromEntries(TIER_MESSAGES.map((t) => [t.id, t]));
assert.equal(byId.volatile.at, VOLATILE_AT, "volatile message fires at VOLATILE_AT");
assert.equal(byId.aliased.at, ALIASED_AT, "aliased message fires at ALIASED_AT");
assert.equal(byId.decay.at, DECAY_AT, "decay message fires at DECAY_AT");
assert.equal(byId.twocolor.at, TWOCOLOR_AT, "two-colour message fires at TWOCOLOR_AT");
// Distinct, non-empty messages.
const msgs = TIER_MESSAGES.map((t) => t.msg);
assert.equal(new Set(msgs).size, msgs.length, "tier messages are distinct");
assert(msgs.every((m) => typeof m === "string" && m.length > 0), "tier messages are non-empty strings");
// Defined in ascending threshold order (so a corruption jump announces lower tiers first).
for (let i = 1; i < TIER_MESSAGES.length; i += 1) assert(TIER_MESSAGES[i].at >= TIER_MESSAGES[i - 1].at, "ordered by threshold");

// Crossing thresholds one at a time fires each tier exactly once.
{
  const state = defaultState();
  const base = state.log.length;
  assert.deepEqual(announceTiers(state, 0), [], "nothing fires below the first threshold");
  assert.equal(state.log.length, base, "log untouched at corruption 0");
  assert.deepEqual(announceTiers(state, VOLATILE_AT), ["volatile"], "volatile fires on first crossing");
  assert.equal(state.log.length, base + 1, "one log line added");
  assert.deepEqual(announceTiers(state, VOLATILE_AT), [], "volatile does NOT fire again (once per run)");
  assert.equal(state.log.length, base + 1, "no duplicate log line");
  assert.deepEqual(announceTiers(state, DECAY_AT), ["aliased", "decay"], "a jump fires skipped tiers in order");
  assert.deepEqual(announceTiers(state, TWOCOLOR_AT), ["twocolor"], "two-colour fires when corruption reaches it");
  assert.deepEqual(announceTiers(state, 8), [], "nothing new fires once all tiers are seen");
  assert(state.run.tiers.includes("volatile") && state.run.tiers.includes("twocolor"), "seen-set records every fired tier");
}

// A run that loads straight into peak corruption fires ALL tiers once, in order.
{
  const state = defaultState();
  assert.deepEqual(announceTiers(state, 8), ["volatile", "aliased", "decay", "twocolor"], "all tiers fire in order on a peak-corruption entry");
  assert.deepEqual(announceTiers(state, 8), [], "and never again this run");
}

// A FRESH run (new state) starts with an empty seen-set, so the messaging is per-run.
{
  const a = defaultState();
  announceTiers(a, 8);
  const b = defaultState();
  assert.deepEqual(b.run.tiers, [], "a new run starts with no tiers seen");
  assert.deepEqual(announceTiers(b, VOLATILE_AT), ["volatile"], "the new run announces volatile afresh");
}

console.log("stage3 tier-arrival messaging tests passed");
