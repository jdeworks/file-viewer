// App-wide idle screensaver: after IDLE_MS of no activity anywhere in the file-viewer,
// fade in a slow retro terminal boot animation; any input dismisses it. Self-contained
// (own frames + cycler) so it has no type-lane dependency. Suppressed while media is
// playing (covers the ASCII webcam — its <video> is playing), a game overlay is open,
// something is fullscreen, or the tab is hidden.

const IDLE_MS = 300_000;   // 5 minutes
const STATE_MS = 1800;     // boot frames advance slowly (was 250 ms in the old ASCII-only one)
const PULSE_MS = 1600;     // idle "SCREENSAVER ACTIVE" blink cadence

const BOOT = [
  '\n  ┌────────────────────────────────┐\n  │  FILE  VIEWER  OS  v0.1         │\n  │                                │\n  │  Booting...                    │\n  └────────────────────────────────┘',
  '\n  ┌────────────────────────────────┐\n  │  FILE  VIEWER  OS  v0.1         │\n  │                                │\n  │  Booting... ▓▓▓▓▓▓              │\n  └────────────────────────────────┘',
  '\n  ┌────────────────────────────────┐\n  │  FILE  VIEWER  OS  v0.1         │\n  │  ██████████████████████████    │\n  │  Initializing subsystems...    │\n  └────────────────────────────────┘',
  '\n  ┌────────────────────────────────┐\n  │  FILE  VIEWER  OS  v0.1         │\n  │  ██████████████████████████    │\n  │  [ OK ] ansi-palette ready     │\n  └────────────────────────────────┘',
  '\n  ┌────────────────────────────────┐\n  │  FILE  VIEWER  OS  v0.1         │\n  │  ██████████████████████████    │\n  │  All systems nominal.          │\n  └────────────────────────────────┘',
  '\n  ┌────────────────────────────────┐\n  │  FILE  VIEWER  OS  v0.1         │\n  │                                │\n  │  > _                           │\n  └────────────────────────────────┘',
];
const IDLE_FRAMES = [
  '\n  ╔════════════════════════════════╗\n  ║        SCREENSAVER ACTIVE       ║\n  ║                                ║\n  ║    move or press any key       ║\n  ║          to dismiss            ║\n  ╚════════════════════════════════╝',
  '\n  ╔════════════════════════════════╗\n  ║        SCREENSAVER ACTIVE       ║\n  ║                                ║\n  ║                                ║\n  ║                                ║\n  ╚════════════════════════════════╝',
];

// Reasons NOT to start (or to instantly dismiss) the screensaver.
function suppressed() {
  if (document.hidden) return true;
  if (document.fullscreenElement) return true;
  const games = document.querySelector('.games-overlay');
  if (games && !games.hidden) return true;
  for (const el of document.querySelectorAll('video, audio')) {
    if (!el.paused && !el.ended && el.readyState > 2) return true;   // playing media (incl. the ASCII webcam feed)
  }
  return false;
}

export function installGlobalScreensaver() {
  let idleTimer = 0, frameTimer = 0, overlay = null, pre = null, i = 0;

  function paint(text) { if (pre) pre.textContent = text; }

  function step() {
    if (i < BOOT.length) { paint(BOOT[i]); i++; frameTimer = setTimeout(step, STATE_MS); }
    else { paint(IDLE_FRAMES[(i - BOOT.length) % IDLE_FRAMES.length]); i++; frameTimer = setTimeout(step, PULSE_MS); }
  }

  function show() {
    if (overlay || suppressed()) { arm(); return; }
    overlay = document.createElement('div');
    overlay.className = 'fv-ss-overlay';
    pre = document.createElement('pre');
    pre.className = 'fv-ss-pre';
    overlay.appendChild(pre);
    (document.getElementById('app') || document.body).appendChild(overlay);
    requestAnimationFrame(() => overlay && overlay.classList.add('fv-ss-on'));   // fade in
    i = 0; step();
  }

  function dismiss() {
    clearTimeout(frameTimer); frameTimer = 0;
    if (overlay) { overlay.remove(); overlay = null; pre = null; }
    arm();
  }

  function arm() { clearTimeout(idleTimer); idleTimer = setTimeout(show, IDLE_MS); }

  // Any activity resets the idle timer; while the overlay is up, it dismisses.
  function onActivity() { if (overlay) dismiss(); else arm(); }
  const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel', 'scroll'];
  EVENTS.forEach((ev) => document.addEventListener(ev, onActivity, { passive: true, capture: true }));
  document.addEventListener('visibilitychange', () => { if (document.hidden && overlay) dismiss(); else arm(); });

  arm();

  // Test seam: drive it without waiting 5 minutes.
  const api = {
    force() { clearTimeout(idleTimer); show(); return !!overlay; },
    isActive: () => !!overlay,
    dismiss,
    suppressed,
  };
  // Dedicated global (the window.__fv object is rebuilt later in app.js, which would clobber
  // a property hung off it).
  try { window.__fvScreensaver = api; } catch { /* no window */ }
  return api;
}
