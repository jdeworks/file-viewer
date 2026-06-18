// Detection — runs every registered type's cheap detector against the intake,
// returns them sorted by confidence. The winner is auto-selected but always
// user-overridable via the type dropdown (core/app.js).

import { REGISTRY, FALLBACK_TYPE } from './registry-runtime.generated.js';

export function detectAll(intake) {
  const scored = REGISTRY.map((type) => {
    let score = 0;
    try {
      score = Math.max(0, Math.min(1, type.detect(intake) || 0));
    } catch {
      score = 0;
    }
    return { type, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

export function pickType(intake) {
  const scored = detectAll(intake);
  const best = scored[0];
  // Nothing matched with any confidence -> raw fallback (never a dead end).
  if (!best || best.score === 0) return { type: FALLBACK_TYPE, score: 0, ranking: scored };
  return { type: best.type, score: best.score, ranking: scored };
}

// Shared helpers for type detectors, so each detect.js stays tiny.
export function hasExtension(intake, ...exts) {
  const name = (intake.filename || '').toLowerCase();
  return exts.some((e) => name.endsWith('.' + e.toLowerCase().replace(/^\./, '')));
}

export function mimeMatches(intake, ...needles) {
  const m = (intake.mimeType || '').toLowerCase();
  return needles.some((n) => m.includes(n));
}
