// Stage 1 — the bespoke "pixel reveal" onboarding mechanic, plus the commentary BELL that lives in
// every stage. Split out of metagame.js to keep that orchestrator under the LOC cap.
//
// Stage 1 has no shop / no score / no rate: a single "Compute" button sits at the bottom, fully
// covered by a 100-square grid. Tapping anywhere adds bits (×clickPower); each bit reveals one
// square in COLUMN-MAJOR order. At 100 the button is fully revealed and interactive; buying it
// resets bits to 0 and raises click power, so the reveal restarts (faster). The bell narrates it.

import { MESSAGES1 } from './messages1.js';
import { clickTick } from './sounds.js';

const BELL_KEY = 'fv:games:mg:bell';
const GRID_COLS = 20, GRID_ROWS = 5, GRID_CELLS = GRID_COLS * GRID_ROWS;   // 20×5 = 100

const MILESTONES = [
  { id: 'sound-unlock',  threshold: 1000,  msg: 'I can hear something' },
  { id: 'anim-unlock',   threshold: 10000, msg: 'something changed'    },
];

function checkMilestones(state, bs, save) {
  const achieved = state.milestones || [];
  for (const m of MILESTONES) {
    if (achieved.includes(m.id)) continue;
    if ((state.totalBits || 0) >= m.threshold) {
      state.milestones = achieved;
      state.milestones.push(m.id);
      bellAdd(m.id, m.msg, bs);
      save(state);
    }
  }
}

/* ── Commentary bell: persisted message log with unread count + grouped display. ── */
export function bellLoad() {
  try {
    const s = JSON.parse(localStorage.getItem(BELL_KEY)) || {};
    return {
      messages: Array.isArray(s.messages) ? s.messages : [],
      fired: (s.fired && typeof s.fired === 'object') ? s.fired : {},
      removed: Array.isArray(s.removed) ? s.removed : [],
      lastReadCount: Number(s.lastReadCount) || 0,
    };
  } catch { return { messages: [], fired: {}, removed: [], lastReadCount: 0 }; }
}
export function bellSave(bs) { try { localStorage.setItem(BELL_KEY, JSON.stringify(bs)); } catch { /* private mode */ } }

// Add a message entry into the bell panel. Bumps the count if the id already appears (grouping).
// Does NOT check maxCount / removeAfterFire — that's handled by checkMessages.
export function bellAdd(id, text, bs) {
  const state = bs || bellLoad();
  const existing = state.messages.find((m) => m.id === id);
  if (existing) existing.count++;
  else state.messages.push({ id, text, count: 1, ts: Date.now() });
  bellSave(state);
  updateBellDot();
}

// Unread count: total messages logged vs. how many the player has acknowledged.
let bellRoot = null;   // the live bell DOM (per mount) so bellAdd can refresh the dot from anywhere.

export function updateBellDot() {
  if (!bellRoot) return;
  const bs = bellLoad();
  const total = bs.messages.reduce((s, m) => s + m.count, 0);
  const unread = total > bs.lastReadCount;
  const dot = bellRoot.querySelector('.mg-bell-dot');
  if (dot) dot.hidden = !unread;
}

// Build the bell button + (closed) message panel, both absolutely positioned over the host.
export function mountBell(host) {
  const prev = host.querySelector(':scope > .mg-bell-wrap');   // idempotent: never leave two bells
  if (prev) prev.remove();
  const wrap = document.createElement('div');
  wrap.className = 'mg-bell-wrap';
  wrap.innerHTML =
    '<button class="mg-bell-btn" type="button" aria-label="Notifications">🔔<span class="mg-bell-dot" hidden></span></button>'
    + '<div class="mg-bell-panel" hidden></div>';
  host.appendChild(wrap);
  bellRoot = wrap;
  const btn = wrap.querySelector('.mg-bell-btn');
  const panel = wrap.querySelector('.mg-bell-panel');

  function renderPanel() {
    const bs = bellLoad();
    if (!bs.messages.length) { panel.innerHTML = '<div class="mg-bell-empty">nothing here</div>'; return; }
    // Newest first.
    const sorted = [...bs.messages].sort((a, b) => (b.ts || 0) - (a.ts || 0));
    panel.innerHTML = sorted.map((m) =>
      '<div class="mg-bell-msg">' + escapeHtml(m.text) + (m.count > 1 ? ' <span class="mg-bell-x">×' + m.count + '</span>' : '') + '</div>'
    ).join('');
  }
  let onOutside = null;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = panel.hidden;
    panel.hidden = !open;
    if (open) {
      renderPanel();
      const bs = bellLoad();
      bs.lastReadCount = bs.messages.reduce((s, m) => s + m.count, 0);
      bellSave(bs);
      updateBellDot();
      onOutside = (ev) => {
        if (!panel.contains(ev.target) && ev.target !== btn) {
          panel.hidden = true;
          document.removeEventListener('click', onOutside, true);
          onOutside = null;
        }
      };
      document.addEventListener('click', onOutside, true);
    } else {
      if (onOutside) { document.removeEventListener('click', onOutside, true); onOutside = null; }
    }
  });
  updateBellDot();
  return { el: wrap };
}

function escapeHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

/* ── Event-driven message checking ── */
// activeMessages: the subset of MESSAGES1 not yet permanently removed. Null = needs reload.
let activeMessages = null;

function loadActiveMessages(bs) {
  const removed = new Set(bs.removed || []);
  return MESSAGES1.filter((m) => !removed.has(m.id));
}

// Check messages matching eventType against state. Fires qualifying ones, updates bell state.
export function checkMessages(eventType, state, bs) {
  if (!activeMessages) activeMessages = loadActiveMessages(bs);
  let changed = false;
  for (const msg of activeMessages.slice()) {   // slice: safe to mutate activeMessages during loop
    if (msg.trigger !== eventType && msg.trigger !== 'any') continue;
    if (msg.maxCount !== undefined) {
      const fired = (bs.fired[msg.id] || 0);
      if (fired >= msg.maxCount) continue;
    }
    if (!msg.condition(state)) continue;
    // Fire: add to bell panel, record in fired map.
    bellAdd(msg.id, msg.text, bs);
    bs.fired[msg.id] = (bs.fired[msg.id] || 0) + 1;
    if (msg.removeAfterFire) {
      bs.removed = bs.removed || [];
      if (!bs.removed.includes(msg.id)) bs.removed.push(msg.id);
      activeMessages = activeMessages.filter((m) => m.id !== msg.id);
    }
    changed = true;
  }
  if (changed) bellSave(bs);
}

// Mark all message IDs from a given array as permanently removed (call when stage advances past 1).
export function removeStageMsgs(msgs) {
  const bs = bellLoad();
  bs.removed = [...new Set([...(bs.removed || []), ...msgs.map((m) => m.id)])];
  bellSave(bs);
  activeMessages = null;   // force reload on next checkMessages call
}

/* ── Stage 1 render: full-screen tap area + a Compute button under a 100-square reveal grid. ── */
// ctx: { host, state, save, stage, clickPower, buyTier, onExit, attachChrome, onBoss }
//   attachChrome(host) re-attaches the back/fullscreen/debug header + bell after any innerHTML wipe.
//   After 5 purchases (and if the stage isn't already beaten) a "Confront" button appears so the
//   onboarding loop hands off to the stage-1 boss.
const BOSS_AFTER = 5;
export function renderStage1(ctx) {
  const { host, state, save, stage, clickPower, buyTier, onExit, attachChrome } = ctx;
  let soundOn = (state.milestones || []).includes('sound-unlock');
  let animOn  = (state.milestones || []).includes('anim-unlock');
  const t = (stage().tiers || [])[0];
  const bought = t ? (state.owned[t.id] || 0) : 0;
  const beaten = Array.isArray(state.defeated) && state.defeated.includes(1);
  const showBoss = !beaten && bought >= BOSS_AFTER;

  host.innerHTML =
    '<div class="mg-wrap mg-s1">'
    + '<div class="mg-s1-tap" aria-label="tap to compute"></div>'
    + '<div class="mg-s1-stage">'
    + '  <button class="mg-s1-btn mg-compute" type="button">' + (t ? t.icon + ' ' + t.name : '⚙ Compute') + '</button>'
    + '  <div class="mg-s1-grid" aria-hidden="true"></div>'
    + '</div>'
    + '<button class="mg-faceboss mg-s1-boss" type="button"' + (showBoss ? '' : ' hidden') + '>⚔ Confront ' + (stage().bossName || 'the boss') + '</button>'
    + '</div>';
  const $ = (s) => host.querySelector(s);
  const tap = $('.mg-s1-tap');
  const btn = $('.mg-s1-btn');
  const grid = $('.mg-s1-grid');
  const bossBtn = $('.mg-s1-boss');
  if (bossBtn) bossBtn.addEventListener('click', (e) => { e.stopPropagation(); ctx.onBoss && ctx.onBoss(); });

  // Build the 100 covering squares in COLUMN-MAJOR fill order: cell index i maps to (r,c) with
  // c = floor(i / ROWS), r = i % ROWS. We lay them out in a CSS grid that is row-major, so we give
  // each square an explicit grid-area to honour the visual position while keeping fill-order = i.
  let cells = [];
  for (let i = 0; i < GRID_CELLS; i++) {
    const c = Math.floor(i / GRID_ROWS), r = i % GRID_ROWS;
    const cell = document.createElement('div');
    cell.className = 'mg-s1-cell';
    cell.style.gridColumn = (c + 1);
    cell.style.gridRow = (r + 1);
    cell.dataset.i = String(i);
    grid.appendChild(cell);
    cells.push(cell);
  }

  function reveal(animOn = false) {
    const n = Math.min(Math.floor(state.bits), GRID_CELLS);
    for (let i = 0; i < GRID_CELLS; i++) {
      const wasOn = cells[i].classList.contains('mg-s1-on');
      cells[i].classList.toggle('mg-s1-on', i < n);
      // Flash the cell that just got revealed (only the boundary cell, not all):
      if (animOn && !wasOn && i < n && i === n - 1) {
        cells[i].classList.remove('mg-s1-flash');
        void cells[i].offsetWidth; // reflow
        cells[i].classList.add('mg-s1-flash');
      }
    }
    const done = n >= GRID_CELLS;
    btn.classList.toggle('mg-s1-ready', done);
    grid.classList.toggle('mg-s1-clear', done);   // pointer-events pass-through once clear
  }

  function addBits() {
    const cp = clickPower();
    state.bits += cp;
    state.totalBits = (state.totalBits || 0) + cp;
    const bs = bellLoad();
    // Milestone check — may flip soundOn/animOn for THIS and future taps:
    const prevMilestones = (state.milestones || []).length;
    checkMilestones(state, bs, save);
    if ((state.milestones || []).length > prevMilestones) {
      soundOn = (state.milestones || []).includes('sound-unlock');
      animOn  = (state.milestones || []).includes('anim-unlock');
    }
    if (soundOn) clickTick();
    checkMessages('bit-earn', state, bs);
    reveal(animOn);
  }
  // Full-screen tap area: pointer (covers mouse + touch). The grid sits above the button but is
  // click-through (pointer-events:none on covered cells) until cleared.
  tap.addEventListener('pointerdown', addBits);

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (state.bits < GRID_CELLS) return;     // not revealed yet → ignore (shouldn't fire; covered)
    if (t && buyTier(t.id)) {                // spends the tier cost (=100); raises click power
      state.bits = 0;                        // …then wipe whatever's left — everything goes
      // Compute totalBought for condition checks (counts across all resets).
      state.totalBought = (state.totalBought || 0) + 1;
      save(state);
      const bs = bellLoad();
      checkMessages('buy', state, bs);
      checkMessages('bit-lose', state, bs);
      renderStage1(ctx);                     // re-render fresh (all covered again)
    }
  });

  reveal(animOn);
  attachChrome(host);
}

export const STAGE1 = { GRID_CELLS, GRID_COLS, GRID_ROWS };
