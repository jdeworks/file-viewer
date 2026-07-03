// Shared micro-feedback kit (UX audit F5) — the cheapest fun-per-line change in the audit. Stages
// ATTACH these instead of inventing per-stage systems: a hit flash, an element shake, a rising damage/
// score number, and a phase-interstitial banner. Every effect is CSS-driven (games-chrome.css) and
// `prefers-reduced-motion`-aware there; this file only adds/removes classes and spawns/cleans nodes.
//
// No timers leak: each effect finishes on the CSS `animationend` OR a slightly-longer setTimeout
// fallback (whichever fires first — the fallback is what drives reduced-motion, where animations are
// suppressed so `animationend` never fires). The spawned float/banner nodes are children of the host,
// so removing the host also removes them; the pending fallback then no-ops on the detached node.

// Effect durations (ms) — kept a touch longer than the matching CSS animations so animationend wins.
const DUR = { flash: 360, shake: 420, float: 960, banner: 1280 };

// Run `done` once, on the first of: an animationend on `el`, or `ms` elapsed. Clears the timer and the
// listener whichever way it resolves, so nothing is left pending.
function finishAfter(el, ms, done) {
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    el.removeEventListener?.("animationend", finish);
    done();
  };
  const timer = setTimeout(finish, ms);
  el.addEventListener?.("animationend", finish);
  return finish;
}

// Restart a class-driven animation even if the class is already present (re-flash a cell mid-effect).
function restartClass(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth; // force reflow so re-adding the class replays the animation
  el.classList.add(cls);
}

// flash(el, kind) — a brief good/bad/warn hit flash on an existing element.
export function flash(el, kind = "good") {
  if (!el || !el.classList) return;
  const cls = `mg-hit--${kind}`;
  restartClass(el, cls);
  finishAfter(el, DUR.flash, () => el.classList.remove(cls));
}

// shake(el) — a short shake (a miss / invalid action / big hit).
export function shake(el) {
  if (!el || !el.classList) return;
  restartClass(el, "mg-shake");
  finishAfter(el, DUR.shake, () => el.classList.remove("mg-shake"));
}

// floatNum(hostEl, text, kind) — spawn a rising, fading number/label inside hostEl (position it
// relative). Auto-removes. hostEl should be `position: relative` so the absolute float sits over it.
export function floatNum(hostEl, text, kind = "good") {
  if (!hostEl || typeof document === "undefined") return null;
  const span = document.createElement("span");
  span.className = `mg-float mg-float--${kind}`;
  span.textContent = String(text);
  hostEl.appendChild(span);
  finishAfter(span, DUR.float, () => span.remove());
  return span;
}

// banner(hostEl, text) — a phase interstitial ("WAVE 12", "ENEMY TURN") that slides in then out.
// One at a time: any existing banner in the host is cleared first.
export function banner(hostEl, text) {
  if (!hostEl || typeof document === "undefined") return null;
  hostEl.querySelector?.(":scope > .mg-banner")?.remove();
  const el = document.createElement("div");
  el.className = "mg-banner";
  el.textContent = String(text);
  hostEl.appendChild(el);
  finishAfter(el, DUR.banner, () => el.remove());
  return el;
}
