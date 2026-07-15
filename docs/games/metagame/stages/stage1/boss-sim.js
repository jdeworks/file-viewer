// boss-sim.js — Stage 1 Defragmenter: the PURE, deterministic scoring model shared by the live boss
// (boss1.js) and the headless smoke (__fvStage1.fightBoss). No Date.now / no Math.random.
//
// The single canonical tuning is comfortably winnable at a casual pace while still rewarding a
// steady rhythm through the boss's floor pulses and bursts.

export const FIGHT_MS = 20000;
export const BURST_MS = 800;

export function fightParams() {
  return { shadow: 0.62, floorWeight: 0.3, floorMs: (r) => Math.max(320, r * 1.5), burstCount: 2, burstWeight: 1.0 };
}

// Deterministic-within-a-fight, varied-per-attempt burst schedule. `seed` is supplied by the caller
// (the live boss seeds from a wall clock at fight start; the sim passes a fixed seed).
export function makeBurstSchedule(seed) {
  let s = (seed % 1000) + 0x9e3779b9;
  function rand() {
    s |= 0; s = s + 0x9e3779b9 | 0;
    let t = Math.imul(s ^ s >>> 16, 0x21f0aaad);
    t = Math.imul(t ^ t >>> 15, 0x735a2d97);
    return ((t ^ t >>> 15) >>> 0) / 4294967296;
  }
  const N = rand() < 0.5 ? 2 : 3;
  const bursts = [];
  for (let i = 0; i < N; i++) {
    let start, tries = 0;
    do {
      start = Math.floor(rand() * (FIGHT_MS - 2000)) + 1000;
      tries++;
    } while (tries < 20 && bursts.some((b) => Math.abs(b.start - start) < BURST_MS));
    bursts.push({ start, end: start + BURST_MS, fired: 0 });
  }
  return bursts.sort((a, b) => a.start - b.start);
}

// Fast-forward a whole fight at 100 ms resolution with the player tapping at a steady rate. Mirrors
// the live boss1.js loop (per-tap shadow, auto-floor, burst auto-fires). Returns the outcome.
export function simulateFight({ tapsPerSec = 10, seed = 1 } = {}) {
  const p = fightParams();
  const bursts = makeBurstSchedule(seed);
  const tapInterval = 1000 / Math.max(0.001, tapsPerSec);
  let userScore = 0, bossAcc = 0, lastFloor = 0, nextTapAt = 0;
  let tapTimes = [];
  for (let now = 0; now <= FIGHT_MS; now += 100) {
    while (nextTapAt <= now && nextTapAt <= FIGHT_MS) {
      userScore += 1;
      bossAcc += p.shadow; // per-tap shadow only; burst pressure comes solely from the timed auto-fire below
      tapTimes.push(nextTapAt);
      tapTimes = tapTimes.filter((t) => nextTapAt - t < 3000);
      nextTapAt += tapInterval;
    }
    const userRateMs = tapTimes.length > 1 ? (tapTimes[tapTimes.length - 1] - tapTimes[0]) / (tapTimes.length - 1) : 999;
    if (now - lastFloor >= p.floorMs(userRateMs)) { bossAcc += p.floorWeight; lastFloor = now; }
    for (const b of bursts) {
      if (now >= b.start && now < b.end) {
        const want = Math.min(p.burstCount, Math.floor((now - b.start) / (BURST_MS / p.burstCount)) + 1);
        while (b.fired < want) { bossAcc += p.burstWeight; b.fired++; }
      }
    }
  }
  const bossScore = Math.floor(bossAcc);
  return { won: userScore > bossScore, userScore, bossScore };
}
