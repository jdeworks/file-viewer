// Raw is the universal floor. It always returns a tiny non-zero score for text so
// that ANY more specific type outranks it, but it still wins when nothing else matches.
// (When even raw scores 0 — pure binary with no text — the shell still falls back to it.)
export function detect(intake) {
  return intake.isBinary ? 0.01 : 0.05;
}
