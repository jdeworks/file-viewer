// waves.js — Stage 4 Fractal Bastion: wave composition definitions (data + a little shaping logic).
// engine.js calls waveComposition to populate the spawn queue. Waves 1–5 (PLACE verb) for now;
// later increments extend this toward wave 31 (the boss). Pure/deterministic from (waveNum, seed).

// Pacing: a tighter spawn cadence (~0.7s) so long campaign maps don't drag — combined with the
// fast-forward (1×/2×/3×) and player-driven wave starts in the renderer, forced time comes from the
// waves themselves, not dead air between them.
export const SPAWN_INTERVAL_MS = 700;  // one enemy every ~0.7s
export const WAVE_GAP_MS = 0;          // no forced gap — the player calls each wave
export const FINAL_WAVE = 31;          // legacy single-map boss marker (campaign uses run4.js gating)

// Authored waves. Each: { enemies: [{type, count}], leftFraction: null|number, note? }.
const WAVES = {
  1: { enemies: [{ type: "recursion", count: 6 }] },
  2: { enemies: [{ type: "recursion", count: 9 }] },
  3: { enemies: [{ type: "recursion", count: 12 }] },
  4: { enemies: [{ type: "recursion", count: 15 }] },
  5: { enemies: [{ type: "recursion", count: 18 }], note: "cover the corner tiles" },
  // Waves 6–10 (MATCH): fast pattern-crawlers expose sparse coverage; armored null-packets blunt
  // low-damage towers. The enemy types already exist (enemies.js) — this is composition only.
  6: { enemies: [{ type: "recursion", count: 8 }, { type: "pattern_crawler", count: 4 }], note: "pattern crawlers sprint through gaps" },
  7: { enemies: [{ type: "recursion", count: 6 }, { type: "pattern_crawler", count: 8 }] },
  8: { enemies: [{ type: "recursion", count: 10 }, { type: "null_packet", count: 4 }], note: "null packets are armored" },
  9: { enemies: [{ type: "recursion", count: 8 }, { type: "null_packet", count: 6 }, { type: "pattern_crawler", count: 2 }] },
  10: { enemies: [{ type: "recursion", count: 6 }, { type: "null_packet", count: 6 }, { type: "pattern_crawler", count: 6 }] },
  // Waves 11–15 (PORTFOLIO): fractal hosts split on death — punish thin coverage.
  11: { enemies: [{ type: "recursion", count: 10 }, { type: "fractal_host", count: 1 }], note: "fractal hosts split when they fall" },
  12: { enemies: [{ type: "recursion", count: 8 }, { type: "pattern_crawler", count: 4 }, { type: "fractal_host", count: 1 }] },
  13: { enemies: [{ type: "recursion", count: 8 }, { type: "null_packet", count: 4 }, { type: "fractal_host", count: 2 }] },
  14: { enemies: [{ type: "recursion", count: 6 }, { type: "pattern_crawler", count: 6 }, { type: "fractal_host", count: 2 }] },
  15: { enemies: [{ type: "recursion", count: 6 }, { type: "null_packet", count: 6 }, { type: "fractal_host", count: 3 }] },
  // Waves 16–20 (REPAIR): resonance ghosts are slow-immune; wave 20 fields three depth-crawler elites.
  16: { enemies: [{ type: "recursion", count: 8 }, { type: "resonance_ghost", count: 4 }], note: "ghosts ignore the attractor field" },
  17: { enemies: [{ type: "recursion", count: 6 }, { type: "resonance_ghost", count: 6 }, { type: "pattern_crawler", count: 4 }] },
  18: { enemies: [{ type: "recursion", count: 6 }, { type: "null_packet", count: 6 }, { type: "resonance_ghost", count: 4 }] },
  19: { enemies: [{ type: "recursion", count: 8 }, { type: "resonance_ghost", count: 6 }, { type: "fractal_host", count: 2 }] },
  20: { enemies: [{ type: "recursion", count: 6 }, { type: "depth_crawler", count: 3 }], note: "three depth-crawler elites" },
  // Waves 21–30 (ANTICIPATE): everything mixed and scaling; wave 25 fields all six types.
  21: { enemies: [{ type: "recursion", count: 8 }, { type: "pattern_crawler", count: 6 }, { type: "null_packet", count: 4 }] },
  22: { enemies: [{ type: "resonance_ghost", count: 8 }, { type: "fractal_host", count: 3 }] },
  23: { enemies: [{ type: "null_packet", count: 8 }, { type: "pattern_crawler", count: 6 }, { type: "depth_crawler", count: 1 }] },
  24: { enemies: [{ type: "recursion", count: 10 }, { type: "resonance_ghost", count: 6 }, { type: "fractal_host", count: 3 }] },
  25: { enemies: [{ type: "recursion", count: 6 }, { type: "pattern_crawler", count: 6 }, { type: "null_packet", count: 6 }, { type: "resonance_ghost", count: 6 }, { type: "fractal_host", count: 3 }, { type: "depth_crawler", count: 1 }], note: "every protocol at once" },
  26: { enemies: [{ type: "null_packet", count: 10 }, { type: "depth_crawler", count: 2 }] },
  27: { enemies: [{ type: "resonance_ghost", count: 10 }, { type: "fractal_host", count: 4 }] },
  28: { enemies: [{ type: "pattern_crawler", count: 12 }, { type: "null_packet", count: 8 }] },
  29: { enemies: [{ type: "recursion", count: 10 }, { type: "resonance_ghost", count: 8 }, { type: "depth_crawler", count: 2 }] },
  30: { enemies: [{ type: "depth_crawler", count: 3 }, { type: "fractal_host", count: 4 }, { type: "null_packet", count: 8 }], note: "the bastion's last stand before the loop" },
  // Wave 31 = The Infinite Loop. Not a spawn wave — fought via the confront path (boss.js).
  31: { isBoss: true, enemies: [] }
};

// Composition for a wave. Authored waves use the table; unauthored waves (6+ until built) fall back
// to a deterministic scaling recursion wave so the engine never crashes on a missing definition.
export function waveComposition(waveNum, seed) {
  const n = Math.max(1, Math.trunc(Number(waveNum)) || 1);
  const authored = WAVES[n];
  if (authored) return { leftFraction: null, ...authored };
  // Fallback: grows with the wave number (placeholder until waves 6–31 are authored).
  return { enemies: [{ type: "recursion", count: 6 + n * 3 }], leftFraction: null };
}

// Total enemy count for a wave (spawn-queue length / wave-clear bookkeeping).
export function waveEnemyCount(waveNum, seed) {
  return waveComposition(waveNum, seed).enemies.reduce((sum, e) => sum + e.count, 0);
}
