// 30s-idle ASCII screensaver for the image viewer.
// Overlays a retro terminal boot animation when the user is idle in ASCII mode.
// Any click or keydown dismisses it.

import { mountAsciiAnim } from '../../core/ascii-anim.js';

const BOOT_FRAMES = [
`
  ┌────────────────────────────────┐
  │  FILE  VIEWER  OS  v0.1        │
  │                                │
  │  Booting...                    │
  └────────────────────────────────┘`,
`
  ┌────────────────────────────────┐
  │  FILE  VIEWER  OS  v0.1        │
  │                                │
  │  Booting... ▓                  │
  └────────────────────────────────┘`,
`
  ┌────────────────────────────────┐
  │  FILE  VIEWER  OS  v0.1        │
  │                                │
  │  Booting... ▓▓▓                │
  └────────────────────────────────┘`,
`
  ┌────────────────────────────────┐
  │  FILE  VIEWER  OS  v0.1        │
  │                                │
  │  Booting... ▓▓▓▓▓▓▓            │
  └────────────────────────────────┘`,
`
  ┌────────────────────────────────┐
  │  FILE  VIEWER  OS  v0.1        │
  │                                │
  │  Booting... ▓▓▓▓▓▓▓▓▓▓▓▓▓▓    │
  └────────────────────────────────┘`,
`
  ┌────────────────────────────────┐
  │  FILE  VIEWER  OS  v0.1        │
  │                                │
  │  Booting... ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
  └────────────────────────────────┘`,
`
  ┌────────────────────────────────┐
  │  FILE  VIEWER  OS  v0.1        │
  │  ██████████████████████████    │
  │  Initializing subsystems...    │
  └────────────────────────────────┘`,
`
  ┌────────────────────────────────┐
  │  FILE  VIEWER  OS  v0.1        │
  │  ██████████████████████████    │
  │  [ OK ] ascii-driver loaded    │
  └────────────────────────────────┘`,
`
  ┌────────────────────────────────┐
  │  FILE  VIEWER  OS  v0.1        │
  │  ██████████████████████████    │
  │  [ OK ] ansi-palette ready     │
  └────────────────────────────────┘`,
`
  ┌────────────────────────────────┐
  │  FILE  VIEWER  OS  v0.1        │
  │  ██████████████████████████    │
  │  [ OK ] pixel decoder online   │
  └────────────────────────────────┘`,
`
  ┌────────────────────────────────┐
  │  FILE  VIEWER  OS  v0.1        │
  │  ██████████████████████████    │
  │  Mounting filesystem...        │
  └────────────────────────────────┘`,
`
  ┌────────────────────────────────┐
  │  FILE  VIEWER  OS  v0.1        │
  │  ██████████████████████████    │
  │  All systems nominal.          │
  └────────────────────────────────┘`,
`
  ┌────────────────────────────────┐
  │  FILE  VIEWER  OS  v0.1        │
  │                                │
  │  > _                           │
  └────────────────────────────────┘`,
`
  ┌────────────────────────────────┐
  │  FILE  VIEWER  OS  v0.1        │
  │                                │
  │  > ls                          │
  └────────────────────────────────┘`,
`
  ┌────────────────────────────────┐
  │  FILE  VIEWER  OS  v0.1        │
  │  images/  secrets/  .hidden    │
  │  > _                           │
  └────────────────────────────────┘`,
`
  ┌────────────────────────────────┐
  │  FILE  VIEWER  OS  v0.1        │
  │  images/  secrets/  .hidden    │
  │  > cat .hidden                 │
  └────────────────────────────────┘`,
`
  ┌────────────────────────────────┐
  │  FILE  VIEWER  OS  v0.1        │
  │  Permission denied.            │
  │  > _                           │
  └────────────────────────────────┘`,
`
  ╔════════════════════════════════╗
  ║        SCREENSAVER ACTIVE      ║
  ║                                ║
  ║    click or press any key      ║
  ║          to dismiss            ║
  ╚════════════════════════════════╝`,
`
  ╔════════════════════════════════╗
  ║        SCREENSAVER ACTIVE      ║
  ║                                ║
  ║    click or press any key      ║
  ║          to dismiss            ║
  ╚════════════════════════════════╝`,
`
  ╔════════════════════════════════╗
  ║                                ║
  ║                                ║
  ║                                ║
  ║                                ║
  ╚════════════════════════════════╝`,
];

const IDLE_MS = 30_000;

export function installScreensaver(host, isAsciiActiveGetter) {
  let idleTimer = null;
  let overlay = null;
  let anim = null;

  function dismiss() {
    if (overlay) {
      if (anim) { anim.destroy(); anim = null; }
      overlay.remove();
      overlay = null;
    }
    resetTimer();
  }

  function showOverlay() {
    if (overlay) return;
    if (!isAsciiActiveGetter()) return;

    overlay = document.createElement('div');
    overlay.className = 'imgv-ss-overlay';
    const pre = document.createElement('div');
    pre.className = 'imgv-ss-inner';
    overlay.appendChild(pre);
    host.appendChild(overlay);

    anim = mountAsciiAnim(pre, BOOT_FRAMES, { fps: 4, mode: 'pre', loop: true });
    anim.play();

    overlay.addEventListener('click', dismiss, { once: false });
    document.addEventListener('keydown', dismiss, { once: true });
  }

  function resetTimer() {
    clearTimeout(idleTimer);
    if (isAsciiActiveGetter()) {
      idleTimer = setTimeout(showOverlay, IDLE_MS);
    }
  }

  // Attach activity listeners on the host element
  const events = ['mousemove', 'click', 'keydown', 'touchstart'];
  events.forEach((ev) => host.addEventListener(ev, resetTimer, { passive: true }));

  function start() { resetTimer(); }
  function stop() {
    clearTimeout(idleTimer);
    dismiss();
    events.forEach((ev) => host.removeEventListener(ev, resetTimer));
  }

  return { start, stop };
}
