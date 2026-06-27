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

// A seeded rng that RECORDS how many values it has produced. A combat resumes by recreating the rng
// and fast-forwarding to the same position: `makeTrackedRng(seed, savedSteps)` replays `savedSteps`
// draws so the very next value matches the live fight. `rng.steps()` reads the current position
// (persist it in the combat snapshot). Determinism is preserved — same seed ⇒ same sequence.
export function makeTrackedRng(seed, steps = 0) {
  const base = makeRng(seed);
  for (let i = 0; i < steps; i++) base(); // fast-forward to the saved position
  let count = steps;
  const rng = () => { count += 1; return base(); };
  rng.steps = () => count;
  return rng;
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

// FNV-1a 32-bit hash of a single string. This is the canonical sub-seed derivation for per-node
// fights (enemy pick, combat shuffle, shop/potion rolls) and seed-mode keys — renderer.js, run.js and
// ui-rewards.js all route through this one function so the live game and the tests agree exactly.
export function strHash(str) {
  let h = 2166136261 >>> 0;
  const s = String(str);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h || 1;
}
