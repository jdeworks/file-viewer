// fork.js — Stage 5 Signal Racer: the sub-channel routing layer. A round with `hasFork` carves
// deterministic FORK SPANS into its obstacle table: contiguous tick ranges where the corridor splits
// into two parallel sub-channels the player must COMMIT to before the split, then ride to the merge:
//   • HI (▓ dense + boost gates) — risk/reward: more throughput, harder to keep integrity.
//   • LO (░ light, always an escape) — the safe line: fewer gates, easy survival.
// Each fork row carries BOTH variants (forkHi / forkLo, each a normal 3-lane row); the game-loop
// resolves which one is "live" from the player's committed channel. Pure + seeded (a separate
// `${seed}:fork:${id}` stream) so it never disturbs the obstacle/powerup tables — zero live RNG.

import { isBlock } from './track.js';

const LANES = 3;
const HI_DENSITY = 0.55;
const LO_DENSITY = 0.30;

// Each sub-channel keeps its own reachable SAFE lane (never blocked, drifts ≤1/tick on beat-open ticks)
// — the same winnability invariant as the main track (track.js). `safeLane` is threaded per-row so a
// committed channel is always dodgeable within the one-lane-per-tick limit.
function buildLanes(rng, density, glyphs, beatOpen, withGates, safeLane) {
  const lanes = [null, null, null];
  for (let l = 0; l < LANES; l += 1) {
    if (l === safeLane) continue;                    // the safe lane is never blocked
    if (rng.chance(density)) lanes[l] = rng.pick(glyphs);
  }
  if (withGates && beatOpen && rng.chance(0.5)) {
    const open = [0, 1, 2].filter((l) => lanes[l] === null);
    if (open.length) lanes[rng.pick(open)] = '>>';
  }
  return lanes;
}

function driftSafe(rng, safeLane, beatOpen) {
  if (!beatOpen || !rng.chance(0.4)) return safeLane;
  return Math.max(0, Math.min(LANES - 1, safeLane + rng.pick([-1, 1])));
}

// applyForks(table, rng, round) — mutate `table` in place, tagging fork-span rows with { fork: true,
// forkEntry, forkHi, forkLo } and leaving non-span rows untouched. Returns the list of entry ticks.
// Spans never overlap the very start (so the player can read the first split coming) or the finish.
export function applyForks(table, rng, round = {}) {
  const span = Math.max(8, Number(round.forkSpan) || 36);
  const gap = Math.max(span + 8, Number(round.forkGap) || 150);
  const first = Math.max(24, Number(round.forkFirst) || 60);
  const hiGlyphs = ['░', '▓'];
  const loGlyphs = ['░'];
  const entries = [];

  for (let start = first; start + span < table.length - 8; start += gap) {
    entries.push(start);
    // Both sub-channels start their safe lane at CENTER; the commit row (i===0) is fully clear so the
    // player can align to center from whatever main-channel lane they entered on (≤1 move), then track
    // the wandering safe lane through the span. This keeps HI and LO both winnable, not just "escapable".
    let safeHi = 1;
    let safeLo = 1;
    for (let i = 0; i < span; i += 1) {
      const t = start + i;
      const row = table[t];
      if (!row) continue;
      const beatOpen = row.beatOpen !== false;
      const entryClear = i === 0;
      if (!entryClear) { safeHi = driftSafe(rng, safeHi, beatOpen); safeLo = driftSafe(rng, safeLo, beatOpen); }
      const forkHi = entryClear ? [null, null, null] : buildLanes(rng, HI_DENSITY, hiGlyphs, beatOpen, true, safeHi);
      const forkLo = entryClear ? [null, null, null] : buildLanes(rng, LO_DENSITY, loGlyphs, beatOpen, false, safeLo);
      row.fork = true;
      row.forkEntry = i === 0;
      row.forkHi = forkHi;
      row.forkLo = forkLo;
      row.lanes = forkLo.slice(); // safe-channel fallback for any channel-unaware reader/renderer
    }
  }
  return entries;
}

// resolveRow(row, channel) — the row a reader should actually use: the committed sub-channel's lanes
// inside a fork span, else the row unchanged. Pure; returns a row-shaped object (lanes/beatOpen/cp).
export function resolveRow(row, channel) {
  if (!row || !row.fork) return row;
  const lanes = channel === 'hi' ? row.forkHi : row.forkLo;
  return { ...row, lanes: lanes || row.lanes };
}

// Count the boost gates a sub-channel offers across a fork span (for the HI risk/reward narrative).
export function channelGateCount(table, startTick, span, channel) {
  let gates = 0;
  for (let i = 0; i < span; i += 1) {
    const row = table[startTick + i];
    if (!row || !row.fork) continue;
    const lanes = channel === 'hi' ? row.forkHi : row.forkLo;
    for (const g of lanes || []) if (g === '>>') gates += 1;
  }
  return gates;
}

// True if the resolved row has an escape lane (no channel ever fully blocks — defensive check).
export function hasEscape(row, channel) {
  const resolved = resolveRow(row, channel);
  if (!resolved) return true;
  return resolved.lanes.filter(isBlock).length < LANES;
}
