// s1dom.js — Stage 1 shared DOM/value helpers.
//
// Guarded writers: the 100ms tick repaints the live tab every tick. Setting textContent/innerHTML
// /hidden/disabled to a value an element already holds STILL mutates the DOM (textContent replaces
// child nodes), which churns the UI and can swallow a tap mid-press. These no-op when the value is
// unchanged, so a steady state produces zero DOM writes. Shared by stage1.js and s1shop.js.

export function setText(el, s) { if (el && el.textContent !== s) el.textContent = s; }
export function setHtml(el, s) { if (el && el.innerHTML !== s) el.innerHTML = s; }
export function setHidden(el, b) { if (el && el.hidden !== b) el.hidden = b; }
export function setDisabled(el, b) { if (el && el.disabled !== b) el.disabled = b; }

// BigNum → number, tolerant of legacy plain-number state. Min-clamped to MAX_VALUE.
export function bigToNum(bn) {
  if (bn === null || bn === undefined) return 0;
  if (typeof bn === 'number') return bn;   // legacy plain number
  if (!bn.m) return 0;
  return Math.min(bn.m * Math.pow(10, bn.e || 0), Number.MAX_VALUE);
}
