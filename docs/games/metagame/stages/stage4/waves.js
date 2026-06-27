// waves.js — Stage 4 Fractal Bastion: wave composition definitions (data + a little shaping logic).
// engine.js calls waveComposition to populate the spawn queue. Waves 1–5 (PLACE verb) for now;
// later increments extend this toward wave 31 (the boss). Pure/deterministic from (waveNum, seed).

export const SPAWN_INTERVAL_MS = 1500; // one enemy every 1.5s
export const WAVE_GAP_MS = 5000;       // pause between waves
export const FINAL_WAVE = 31;

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
  10: { enemies: [{ type: "recursion", count: 6 }, { type: "null_packet", count: 6 }, { type: "pattern_crawler", count: 6 }] }
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
