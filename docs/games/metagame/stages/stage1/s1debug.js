// s1debug.js — TEMPORARY diagnostics for the intermittent Stage 1 "lost click" bug (2026-06-22).
//
// Hypothesis under test: a full innerHTML rebuild of the panel (shop/managers renderPanel — the
// managers one also fires from the 100ms tick on auto-pause/unpause) lands BETWEEN a button's
// pointerdown and its click, destroying the pressed element so the delegated `closest()` matches
// nothing → the tap silently does nothing. The tracer below pairs each pointerdown with its click;
// a "panels pointerdown" with NO matching "panels click" (and a "renderPanel innerHTML swap" logged
// in between) is the smoking gun.
//
// All output is gated behind a flag that DEFAULTS ON. Silence at runtime in the console with:
//     window.__S1_DEBUG = false
// Remove this module (and its imports) once the root cause is confirmed and fixed.

let seq = 0;

function on() {
  return typeof window === "undefined" ? false : window.__S1_DEBUG !== false;
}

function now() {
  try { return Math.round(performance.now()); } catch { return 0; }
}

export function s1log(tag, info) {
  if (!on()) return;
  try { console.log(`%c[s1dbg #${++seq} @${now()}ms]%c ${tag}`, "color:#b8962e;font-weight:700", "color:inherit", info == null ? "" : info); } catch { /* no console */ }
}

export function s1desc(el) {
  if (!el || !el.tagName) return String(el);
  const cls = (el.className && typeof el.className === "string")
    ? "." + el.className.trim().split(/\s+/).join(".") : "";
  return el.tagName.toLowerCase() + cls;
}

// Attach capture-phase pointerdown/click tracers on a stable parent (panelsEl). Both fire before the
// delegated handlers, so we see the gesture even when the click is later lost to a DOM swap.
export function s1trace(parentEl, label) {
  if (!parentEl || parentEl.__s1traced) return;
  parentEl.__s1traced = true;
  const ctrlOf = (e) => e.target.closest("button, .mg-s1-timedrow, [data-id]") || e.target;
  parentEl.addEventListener("pointerdown", (e) => s1log(`${label} pointerdown`, s1desc(ctrlOf(e))), true);
  parentEl.addEventListener("click", (e) => s1log(`${label} click`, s1desc(ctrlOf(e))), true);
}
