// Pure staged-reveal state machine for the Stage 10 endings (ceremony pass, UX audit #3). The finale
// screen — synthesis paragraphs / capstone tiles / route closers — is revealed one beat at a time
// (~250ms cadence) instead of a single instant innerHTML swap. It is SKIPPABLE (a click reveals the
// rest at once) and, under prefers-reduced-motion, starts fully revealed (no staging at all).
//
// No DOM, no timers here: this only tracks how many of `total` beats are revealed. The renderer owns
// the setInterval that calls tick() + repaints, and the click that calls skip(). Extracted so the
// state transitions are unit-testable in isolation.
export function createReveal(total, { reducedMotion = false } = {}) {
  const count = Math.max(0, Number(total) || 0);
  // Reduced motion (or a zero-length reveal) starts fully shown — the animation is purely optional.
  let revealed = reducedMotion ? count : Math.min(1, count);
  return {
    get total() { return count; },
    get revealed() { return revealed; },
    get done() { return revealed >= count; },
    // Whether beat `index` (0-based) is visible yet.
    shows(index) { return index < revealed; },
    // Advance one beat; returns true if it actually changed (so the caller can stop ticking on false).
    tick() {
      if (revealed >= count) return false;
      revealed += 1;
      return true;
    },
    // Reveal everything immediately (player clicked to skip the staging).
    skip() {
      if (revealed >= count) return false;
      revealed = count;
      return true;
    }
  };
}
