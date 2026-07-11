// overlay.js — Stage 8 Observer State: pure presentation helpers for the arena overlays (no DOM/timers).
// These drive the crossing marker's "get ready" brighten (#2) and the Cadence beat pulse (#4) from the
// SAME angle/elapsed state the renderer already has. Nothing here affects motion or the CROSS engine —
// they only decide how bright the marker is and where in the beat the metronome dot sits.

// #2 — the fixed crossing marker brightens when the gap's leading edge is within `readyDeg` of the top.
// `distance` is the gap's angular distance from the top (0 = perfectly aligned), as crossAttempt returns
// it for every mode (max of the two rings for dual, the real gap for multigap). Returns true = "ready".
export function markerReady(distance, readyDeg = 30) {
  const d = Number(distance);
  if (!Number.isFinite(d)) return false;
  return d <= readyDeg;
}

// #2 — a 0..1 brightness ramp: 1 exactly on the crossing point, 0 at/after `readyDeg` away. Lets the
// marker fade UP as the gap approaches instead of a hard on/off (still pure, still presentation-only).
export function markerIntensity(distance, readyDeg = 30) {
  const d = Number(distance);
  if (!Number.isFinite(d) || d >= readyDeg || readyDeg <= 0) return 0;
  return 1 - d / readyDeg;
}

// #4 — Cadence beat phase in [0,1): 0 at the top-pass (the beat), climbing to 1 just before the next.
// periodMs is one rotation (one metronome beat). Used to pulse the beat dot in sync with the rotor.
export function beatPhase(elapsedMs, periodMs) {
  const p = Number(periodMs);
  if (!Number.isFinite(p) || p <= 0) return 0;
  const t = Number(elapsedMs) || 0;
  return ((t % p) + p) % p / p;
}
