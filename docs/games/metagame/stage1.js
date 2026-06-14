// Stage 1 — the bespoke "pixel reveal" onboarding mechanic, plus the commentary BELL that lives in
// every stage. Split out of metagame.js to keep that orchestrator under the LOC cap.
//
// Stage 1 has no shop / no score / no rate: a single "Compute" button sits at the bottom, fully
// covered by a 100-square grid. Tapping anywhere adds bits (×clickPower); each bit reveals one
// square in COLUMN-MAJOR order. At 100 the button is fully revealed and interactive; buying it
// resets bits to 0 and raises click power, so the reveal restarts (faster). The bell narrates it.

import { MESSAGES1 } from './messages1.js';
import { clickTick } from './sounds.js';
import { ACHIEVEMENTS1 } from './achievements1.js';
import { netRate } from './s1economy.js';

const BELL_KEY = 'fv:games:mg:bell';
const GRID_COLS = 20, GRID_ROWS = 5, GRID_CELLS = GRID_COLS * GRID_ROWS;   // 20×5 = 100

// ── BigNum helper for gate metrics (local, avoids circular imports) ──────────
// Handles both legacy plain numbers and BigNum {m,e} objects gracefully.
function bigToNum(bn) {
  if (bn === null || bn === undefined) return 0;
  if (typeof bn === 'number') return bn;   // legacy plain number
  if (!bn.m) return 0;
  return Math.min(bn.m * Math.pow(10, bn.e || 0), Number.MAX_VALUE);
}

// ── Gate table (§3.2) ────────────────────────────────────────────────────────
// Each gate tracks progress toward the next unlock. The active gate is the first
// one whose satisfied() returns false; when all are satisfied g8 stays active.
const GATES = [
  // g0: until Multiplier reachable — metric: totalBits, threshold: [0, 1]
  { id: 'g0', metric: (s) => bigToNum(s.totalBits), from: 0, to: 1,
    satisfied: (s) => bigToNum(s.totalBits) >= 1 },
  // g1: until Bit Box reachable — metric: bits on hand, threshold: [0, 500]
  { id: 'g1', metric: (s) => bigToNum(s.bits), from: 0, to: 500,
    satisfied: (s) => bigToNum(s.bits) >= 500 || (s.owned && s.owned['s1-box'] >= 1) },
  // g2: until Signal Booster reachable — fill toward first Bit Box cost (500)
  { id: 'g2', metric: (s) => bigToNum(s.bits), from: 0, to: 500,
    satisfied: (s) => (s.owned && (s.owned['s1-box'] || 0) >= 1) },
  // g3: until Core Cluster reachable — fill toward Signal Booster cost (2500)
  { id: 'g3', metric: (s) => bigToNum(s.bits), from: 0, to: 2500,
    satisfied: (s) => (s.owned && (s.owned['s1-boost'] || 0) >= 1) },
  // g4: until Processing Array reachable — fill toward Core Cluster cost (12000)
  { id: 'g4', metric: (s) => bigToNum(s.bits), from: 0, to: 12000,
    satisfied: (s) => (s.owned && (s.owned['s1-cluster'] || 0) >= 1) },
  // g5: until Neural Net reachable — metric: totalBits, threshold: [0, 1e6]
  { id: 'g5', metric: (s) => bigToNum(s.totalBits), from: 0, to: 1e6,
    satisfied: (s) => bigToNum(s.totalBits) >= 1e6 },
  // g6: until Quantum Tap reachable — owned[s1-neural] toward 3
  { id: 'g6', metric: (s) => (s.owned && s.owned['s1-neural'] || 0), from: 0, to: 3,
    satisfied: (s) => (s.owned && (s.owned['s1-neural'] || 0) >= 3) },
  // g7: until Boss reachable — bits toward 5M; all sub-stages must be owned ≥1
  { id: 'g7', metric: (s) => bigToNum(s.bits), from: 0, to: 5e6,
    satisfied: (s) => bigToNum(s.bits) >= 5e6 && Object.keys(s.owned || {}).filter(id => id.startsWith('s1-') && id !== 's1-cursor').every(id => (s.owned[id] || 0) >= 1) },
  // g8: boss ticket gate — bits toward 1B
  { id: 'g8', metric: (s) => bigToNum(s.bits), from: 0, to: 1e9,
    satisfied: (s) => bigToNum(s.bits) >= 1e9 },
];

// Return the first unsatisfied gate (or g8 when all are done).
function activeGate(state) {
  for (const gate of GATES) {
    if (!gate.satisfied(state)) return gate;
  }
  return GATES[GATES.length - 1];   // g8 stays active at max
}

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

  function reveal(state) {
    const gate = activeGate(state);
    const range = gate.to - gate.from;
    const raw = range > 0 ? (gate.metric(state) - gate.from) / range : 0;
    const progress = Math.max(0, Math.min(1, raw));
    const n = Math.floor(100 * progress);
    for (let i = 0; i < GRID_CELLS; i++) cells[i].classList.toggle('mg-s1-on', i < n);
    const done = n >= GRID_CELLS;
    btn.style.opacity = done ? '' : String(n / GRID_CELLS);
    btn.classList.toggle('mg-s1-ready', done);
    grid.classList.toggle('mg-s1-clear', done);
    tap.style.pointerEvents = done ? 'none' : '';  // let button clicks through when fully revealed
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
    reveal(state);
  }
  // Full-screen tap area: pointer (covers mouse + touch). The grid sits above the button but is
  // click-through (pointer-events:none on covered cells) until cleared.
  tap.addEventListener('pointerdown', addBits);

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!btn.classList.contains('mg-s1-ready')) return;  // grid not fully revealed yet → ignore
    // Stage 1 cursor tier has a BigNum base cost ({m,e}) which the generic costOf cannot handle yet
    // (WP-S1-05 lands a BigNum-aware buyTier). For now, deduct GRID_CELLS directly and bump owned.
    let bought = 0;
    if (t) {
      const baseCost = (typeof t.base === 'number') ? t.base : GRID_CELLS;   // plain-number compat
      if (state.bits >= baseCost) {
        state.bits = Math.max(0, state.bits - baseCost);
        state.owned = state.owned || {};
        state.owned[t.id] = (state.owned[t.id] || 0) + 1;
        bought = 1;
      }
    }
    if (bought) {
      // Keep remainder (bits > 100 after fast taps carry into the next cycle).
      // Compute totalBought for condition checks (counts across all resets).
      state.totalBought = (state.totalBought || 0) + 1;
      save(state);
      const bs = bellLoad();
      checkMessages('buy', state, bs);
      checkMessages('bit-lose', state, bs);
      renderStage1(ctx);                     // re-render fresh (all covered again)
    }
  });

  reveal(state);
  attachChrome(host);
}

// ── Achievement runtime (§7, WP-S1-06) ──────────────────────────────────────
// Called from event paths (buy, bit-earn, prestige, boss events) to check all
// achievement conditions and fire bells for newly unlocked ones.
// ach-boss-cheat-found is excluded here — it fires from the fv:boss-cheat-disable
// event in boss1.js/rawpane.js, not from condition polling.
export function checkAchievements(state, cfg, bs) {
  if (!cfg) return false;   // guard during early boot
  const achieved = state.achievements || [];
  let changed = false;
  for (const ach of ACHIEVEMENTS1) {
    if (achieved.includes(ach.id)) continue;
    // ach-boss-cheat-found is fired by the fv:boss-cheat-disable event, not polling
    if (ach.id === 'ach-boss-cheat-found') continue;
    try {
      if (!ach.condition(state, cfg)) continue;
    } catch { continue; }
    achieved.push(ach.id);
    state.achievements = achieved;
    changed = true;
    // Fire bell
    const bsLocal = bs || bellLoad();
    bellAdd(ach.id, ach.bell, bsLocal);
    if (bsLocal !== bs) bellSave(bsLocal);
  }
  return changed;
}

export const STAGE1 = { GRID_CELLS, GRID_COLS, GRID_ROWS };
