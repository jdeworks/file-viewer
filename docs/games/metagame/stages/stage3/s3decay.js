// Decay / pressure clock (corruption ≥ DECAY_AT) — turns the untimed nonogram farm into a tense
// per-snapshot OPTIMIZATION problem. A deterministic meter, counted in MOVES (never wall-clock),
// rises a little on every cell action and SPIKES on a wrong fill. Cross the snapshot's threshold and
// the CURRENT puzzle fails: its board is wiped to retry and a Register penalty is charged — the run
// itself continues (only this snapshot resets). The threshold scales with size so an efficient,
// mistake-light solve always finishes with headroom; the teeth come from sloppiness and inefficiency.
//
// Pure data: no timers. The renderer feeds it one pressureMove per cell action (plus pressureWrong on
// a wrong fill). The deterministic body solver fills solutions directly (never through this path), so
// it is never throttled — uniqueness and smoke determinism are preserved.

export const DECAY_AT = 4;      // corruption level at which the clock engages
const PER_MOVE = 1;             // pressure per cell action (the "idle"/inefficiency drip)
const PER_WRONG = 5;            // extra pressure for a wrong fill

function needOf(puzzle) {
  let need = 0;
  for (const row of puzzle.solution) for (const v of row) if (v) need += 1;
  return need;
}

// Headroom above the minimum moves a clean solve needs, plus a size term — generous on purpose so a
// careful player rarely fails; mistakes (×PER_WRONG) are what actually burn it down.
export function decayThreshold(puzzle) {
  return needOf(puzzle) * 2 + puzzle.width * 6;
}

// Register cost of letting a snapshot decay — about half a solve's reward, a real sting.
export function decayPenalty(puzzle) {
  return Math.round((puzzle.width * puzzle.width + 12) * 0.5);
}

export function createDecay(puzzle, corruption) {
  const active = Number(corruption || 0) >= DECAY_AT;
  return { active, meter: 0, threshold: decayThreshold(puzzle), penalty: decayPenalty(puzzle) };
}

export function pressureMove(decay) {
  if (decay && decay.active) decay.meter += PER_MOVE;
}

export function pressureWrong(decay) {
  if (decay && decay.active) decay.meter += PER_WRONG;
}

export function decayFailed(decay) {
  return Boolean(decay && decay.active && decay.meter >= decay.threshold);
}

// 0..1 fill ratio for the HUD bar.
export function decayRatio(decay) {
  if (!decay || !decay.active || !decay.threshold) return 0;
  return Math.max(0, Math.min(1, decay.meter / decay.threshold));
}
