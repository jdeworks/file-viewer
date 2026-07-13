// Shared "prefers reduced motion" check for games. Returns true when the app's Reduce-motion
// setting is on (the `.reduce-motion` class app.js sets on <html>) OR the OS/browser
// prefers-reduced-motion media query is set. Games use this to skip DECORATIVE motion — flashes,
// particles, screen shake, victory bursts — never to freeze the gameplay motion itself.
// (settings audit 2026-07-13: the Reduce-motion setting was CSS-only and never reached rAF loops.)
export function prefersReducedMotion() {
  try {
    if (document.documentElement.classList.contains('reduce-motion')) return true;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch { return false; }
}
