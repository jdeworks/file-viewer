// Tier-arrival messaging — fire ONE one-time log line the moment corruption first crosses each
// mechanic's activation threshold, so a new mechanic is legible when it appears instead of surprising
// the player. Pure + deterministic: keyed only off the current corruption and a per-run "seen" set
// (state.run.tiers), NEVER wall-clock or RNG. Each message therefore fires exactly once per run, and
// re-enters the same way on a reloaded save (the seen-set persists in the run state).
//
// Thresholds are imported from the mechanic modules so they can never drift from the gates that
// actually activate the mechanics (VOLATILE_AT / ALIASED_AT / DECAY_AT / TWOCOLOR_AT).

import { pushLog } from "./boss.js";
import { VOLATILE_AT } from "./s3volatile.js";
import { ALIASED_AT } from "./s3aliased.js";
import { DECAY_AT } from "./s3decay.js";
import { TWOCOLOR_AT } from "./s3twocolor.js";

// Ordered by activation corruption so a corruption jump announces lower tiers first.
export const TIER_MESSAGES = [
  {
    id: "volatile",
    at: VOLATILE_AT,
    msg: "CACHE PRESSURE: volatile memory cells activated — a filled cell now fades after a few moves unless you LOCK it (press l).",
  },
  {
    id: "aliased",
    at: ALIASED_AT,
    msg: "MEMORY ALIAS: some clues are now obscured as “?” — deduce those lines from the crossing clues.",
  },
  {
    id: "decay",
    at: DECAY_AT,
    msg: "DECAY CLOCK: an instability meter now climbs as you work — wrong fills spike it; cross it and the snapshot collapses.",
  },
  {
    id: "twocolor",
    at: TWOCOLOR_AT,
    msg: "HOT / COLD MEMORY: snapshots split into two colours — fill A (space/1) and B (g/2); same-colour blocks need a gap, different colours may touch.",
  },
];

// Announce any tier whose threshold the given corruption has reached and that this run has not yet
// seen. Mutates state.run.tiers (the seen-set) and appends to state.log via pushLog. Returns the list
// of tier ids fired this call (empty when nothing new crossed) — idempotent on repeat calls.
export function announceTiers(state, corruption) {
  const run = state.run || (state.run = {});
  const seen = Array.isArray(run.tiers) ? run.tiers : (run.tiers = []);
  const fired = [];
  for (const tier of TIER_MESSAGES) {
    if (Number(corruption || 0) >= tier.at && !seen.includes(tier.id)) {
      seen.push(tier.id);
      pushLog(state, tier.msg);
      fired.push(tier.id);
    }
  }
  return fired;
}
