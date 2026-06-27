// combat-rng.js — Stage 6 deterministic RNG + seed hashing.
//
// Shared by combat.js (shuffles), run.js (per-node sub-seeds), and mapgen.js (act layout). Keeping
// these here makes the stage's randomness a single, replayable surface — every shuffle/seed is a
// pure function of the run seed, so a saved run resumes identically (see run-state retrofit).

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

// Fisher–Yates copy-shuffle driven by a seeded rng (does not mutate the input list).
export function shuffle(list, rng) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Derive a stable 32-bit seed from a base seed + a string key (e.g. a node id). Used by run.js to
// give each node its own replayable sub-seed. Never returns 0 (makeRng treats 0 as 1 anyway).
export function hashSeed(seed, key) {
  let h = (Number(seed) || 1) >>> 0;
  for (const ch of String(key)) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0;
  return h || 1;
}
