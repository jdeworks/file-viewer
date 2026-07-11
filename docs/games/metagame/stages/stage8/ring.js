// ring.js — Stage 8 Observer State: the seed→angle pipeline (pure, no DOM/timers). The arena is a
// rotating ring with a gap; the player CROSSes when the gap faces their steered ship position. Online
// each OBSERVE reseeds the base angle (unpredictable); offline (seed 0) the angle is fixed/learnable.
//
// 2026-07-11 (canvas rewrite): the ASCII `renderRing`/`renderRingHidden`/`ringChar` grid-drawing
// functions that used to live here were removed — the arena is now a <canvas> (canvas-ring.js /
// canvas-modes.js), which draws directly from each mode's angle accessor rather than through a
// per-mode ASCII render() string. `ringAngle` is the one piece every mode's motion math still
// depends on, so it stays.

import { makeRng } from "./rng.js";

// Current gap angle [0,360): a fixed per-seed base angle plus rotation over elapsed time. Deterministic.
export function ringAngle(seed, elapsedMs, rotSpeedDegPerSec = 30) {
  const base = makeRng(seed).float() * 360;
  return mod360(base + rotSpeedDegPerSec * (Number(elapsedMs) || 0) / 1000);
}

function mod360(a) { return ((a % 360) + 360) % 360; }
