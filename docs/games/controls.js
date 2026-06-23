// Shared touch controls for the arcade games (general lane). Desktop play stays keyboard/pointer —
// these add the phone layer so every game works on a touchscreen without each game reinventing it.
//   • swipe(el, onDir)        — 4-direction swipe + tap detection. Returns a detach function.
//   • dpad(host, btns, onPress) — renders an on-screen button bar (only on coarse-pointer/touch
//     devices); supports press-and-hold auto-repeat. Returns { el, destroy }.

export function swipe(el, onDir, { threshold = 24 } = {}) {
  let s = null;
  const start = (e) => { const t = e.touches[0]; s = { x: t.clientX, y: t.clientY }; };
  const end = (e) => {
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x, dy = t.clientY - s.y;
    s = null;
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) { onDir('tap'); return; }
    if (Math.abs(dx) > Math.abs(dy)) onDir(dx > 0 ? 'right' : 'left');
    else onDir(dy > 0 ? 'down' : 'up');
  };
  el.addEventListener('touchstart', start, { passive: true });
  el.addEventListener('touchend', end, { passive: true });
  return () => { el.removeEventListener('touchstart', start); el.removeEventListener('touchend', end); };
}

const hasTouch = () => {
  try { return window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window; }
  catch { return 'ontouchstart' in window; }
};

// btns: [{ id, label, hold? }]. onPress(id) fires on tap; hold:true repeats while held.
// `force:true` shows the bar even on desktop (handy for tests / hybrid devices).
export function dpad(host, btns, onPress, { repeatMs = 110, force = false } = {}) {
  const bar = document.createElement('div');
  bar.className = 'games-touchpad';
  bar.style.cssText = 'display:flex;gap:10px;justify-content:center;margin-top:8px;flex-wrap:wrap';
  if (!force && !hasTouch()) bar.style.display = 'none';
  const timers = {};
  for (const b of btns) {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.textContent = b.label; btn.dataset.id = b.id;
    btn.className = 'games-touchpad-btn';
    btn.style.cssText = 'min-width:46px;min-height:46px;font-size:20px;line-height:1;border-radius:10px;'
      + 'border:1px solid rgba(128,128,128,.45);background:rgba(128,128,128,.12);color:inherit;cursor:pointer;touch-action:none';
    const fire = () => onPress(b.id);
    const down = (e) => { e.preventDefault(); fire(); if (b.hold) { clearInterval(timers[b.id]); timers[b.id] = setInterval(fire, repeatMs); } };
    const up = (e) => { e.preventDefault(); if (timers[b.id]) { clearInterval(timers[b.id]); delete timers[b.id]; } };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointerleave', up);
    btn.addEventListener('pointercancel', up);
    bar.appendChild(btn);
  }
  host.appendChild(bar);
  return { el: bar, destroy() { Object.values(timers).forEach(clearInterval); bar.remove(); } };
}
