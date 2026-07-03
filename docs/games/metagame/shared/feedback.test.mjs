// feedback.test.mjs — `node docs/games/metagame/shared/feedback.test.mjs`
//
// Covers the shared micro-feedback kit's class/DOM contracts without a real browser: a minimal fake
// element (classList as a Set, a listener registry, a dispatch helper) plus a tiny `document` stub let
// us assert that flash/shake add then remove their class, that they clean up on `animationend`, that
// the setTimeout FALLBACK still cleans up when no animationend fires (the reduced-motion path), and
// that floatNum/banner spawn a node, that banner keeps only one at a time, and that they auto-remove.

import { flash, shake, floatNum, banner } from './feedback.js';

let failed = 0;
const ok = (cond, msg) => { console.log((cond ? '✓ ' : '✗ ') + msg); if (!cond) failed++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Minimal fake element ──────────────────────────────────────────────────────────────────────────
class FakeEl {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.textContent = '';
    this.children = [];
    this.parentNode = null;
    this._listeners = new Map();
    this.offsetWidth = 0;
    const set = new Set();
    this.classList = {
      _set: set,
      add: (c) => set.add(c),
      remove: (c) => set.delete(c),
      contains: (c) => set.has(c),
    };
  }
  // className is backed by the classList set so a string assignment (used by the kit) is reflected.
  get className() { return [...this.classList._set].join(' '); }
  set className(v) { this.classList._set.clear(); String(v).split(/\s+/).filter(Boolean).forEach((c) => this.classList._set.add(c)); }
  addEventListener(type, fn) {
    if (!this._listeners.has(type)) this._listeners.set(type, new Set());
    this._listeners.get(type).add(fn);
  }
  removeEventListener(type, fn) { this._listeners.get(type)?.delete(fn); }
  dispatch(type) { for (const fn of [...(this._listeners.get(type) || [])]) fn({ type }); }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  remove() { if (this.parentNode) { const i = this.parentNode.children.indexOf(this); if (i >= 0) this.parentNode.children.splice(i, 1); this.parentNode = null; } }
  // querySelector only needs to answer ':scope > .mg-banner' for the banner one-at-a-time test.
  querySelector(sel) {
    if (sel === ':scope > .mg-banner') return this.children.find((c) => c.classList.contains('mg-banner')) || null;
    return this.children.find((c) => c.classList.contains(sel.replace(/^\./, ''))) || null;
  }
}

// document stub so floatNum/banner can create nodes without a DOM.
globalThis.document = { createElement: (tag) => new FakeEl(tag) };

// ── flash: adds then removes the kind class; animationend cleans up ─────────────────────────────────
{
  const el = new FakeEl();
  flash(el, 'bad');
  ok(el.classList.contains('mg-hit--bad'), 'flash adds mg-hit--bad');
  el.dispatch('animationend');
  ok(!el.classList.contains('mg-hit--bad'), 'flash removes the class on animationend');
}

// ── shake: adds then removes on animationend ────────────────────────────────────────────────────────
{
  const el = new FakeEl();
  shake(el);
  ok(el.classList.contains('mg-shake'), 'shake adds mg-shake');
  el.dispatch('animationend');
  ok(!el.classList.contains('mg-shake'), 'shake removes the class on animationend');
}

// ── null / non-element inputs are a clean no-op ─────────────────────────────────────────────────────
{
  let threw = false;
  try { flash(null); shake(undefined); flash({}); } catch { threw = true; }
  ok(!threw, 'flash/shake tolerate null / non-element inputs');
}

// ── floatNum: spawns a child, then auto-removes on animationend ─────────────────────────────────────
{
  const host = new FakeEl();
  const span = floatNum(host, '+42', 'good');
  ok(host.children.length === 1 && span.textContent === '+42', 'floatNum appends a node with the text');
  ok(span.classList.contains('mg-float') && span.classList.contains('mg-float--good'), 'floatNum sets mg-float classes');
  span.dispatch('animationend');
  ok(host.children.length === 0, 'floatNum removes its node on animationend');
}

// ── banner: one at a time (a second banner replaces the first) ──────────────────────────────────────
{
  const host = new FakeEl();
  const a = banner(host, 'WAVE 1');
  const b = banner(host, 'WAVE 2');
  ok(host.children.length === 1 && host.children[0] === b, 'banner keeps only one at a time');
  ok(a.parentNode === null, 'the replaced banner was detached');
  b.dispatch('animationend');
  ok(host.children.length === 0, 'banner auto-removes on animationend');
}

// ── reduced-motion / no-animation path: the setTimeout fallback still cleans up ─────────────────────
// (In reduced-motion CSS suppresses the animation, so animationend never fires — the fallback timer is
// the only cleanup. We simply never dispatch animationend and wait past the fallback window.)
{
  const el = new FakeEl();
  const host = new FakeEl();
  flash(el, 'warn');
  const span = floatNum(host, 'x', 'bad');
  ok(el.classList.contains('mg-hit--warn') && host.children.length === 1, 'effects applied before any timer');
  await sleep(1100);
  ok(!el.classList.contains('mg-hit--warn'), 'flash fallback removes the class with no animationend');
  ok(host.children.length === 0, 'floatNum fallback removes the node with no animationend');
}

console.log(failed ? `\nFEEDBACK FAILED (${failed})` : '\nFEEDBACK PASSED');
process.exit(failed ? 1 : 0);
