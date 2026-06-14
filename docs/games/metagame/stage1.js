// Stage 1 — Bit Foundry. The bespoke "pixel reveal" onboarding mechanic sits on top; below it a
// full tabbed idle-clicker (shop, timed buttons, achievements; managers + prestige stubbed for
// WP-S1-10). The commentary BELL (top-right) narrates every stage. Split out of metagame.js to
// keep that orchestrator under the LOC cap.
//
// Reveal: tapping the top area adds bits (×clickPower); a gate-based metric fills a 100-square grid
// over the Compute button. When full the button is interactive; buying the cursor restarts the
// reveal. The tabs below host the real BigNum economy (shop / timed / stats / achievements).

import { MESSAGES1 } from './messages1.js';
import { clickTick } from './sounds.js';
import { ACHIEVEMENTS1 } from './achievements1.js';
import {
  netRate, passiveRate, managerCostPerSec, clickPower as economyClickPower,
  timedPayout, totalCost, maxAffordable, buyTier,
  managerHireCost, managerRunCost, autoInterval, globalPull, pullGain,
} from './s1economy.js';
import { fromNumber, add, sub, mulScalar, gte, toDisplay, ZERO } from './bignum.js';

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
    if (bigToNum(state.totalBits) >= m.threshold) {
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

/* ─────────────────────────────────────────────────────────────────────────────
   Stage 1 render: pixel-reveal top section + a tabbed idle clicker below it.
   ctx: { host, state, save, stage, clickPower, buyTier, onExit, attachChrome, onBoss }
     attachChrome(host) re-attaches the back/fullscreen/debug header + bell after innerHTML wipe.
   ───────────────────────────────────────────────────────────────────────────── */

// Buy-count selector options for the shop.
const BUY_COUNTS = [1, 10, 100, 1000, 'max'];

// Visibility predicates for each tier in the shop (stagger gating — independent of affordability).
const TIER_VISIBLE = {
  's1-cursor':  () => true,
  's1-mult':    (s) => (s.owned['s1-cursor'] || 0) >= 1,
  's1-box':     (s) => (s.owned['s1-mult'] || 0) >= 1,
  's1-boost':   (s) => gte(s.bits, { m: 500, e: 0 }) || (s.owned['s1-box'] || 0) >= 1,
  's1-cluster': (s) => (s.owned['s1-boost'] || 0) >= 1,
  's1-array':   (s) => (s.owned['s1-cluster'] || 0) >= 1,
  's1-neural':  (s) => gte(s.totalBits, { m: 1, e: 6 }),
  's1-quantum': (s) => (s.owned['s1-neural'] || 0) >= 3,
};

export function renderStage1(ctx) {
  const { host, state, save, stage, onExit, attachChrome } = ctx;
  const cfg = stage();   // Stage 1 config from stages.js

  // ── State normalization on mount (legacy plain numbers → BigNum until WP-S1-12 lands) ──
  if (typeof state.bits === 'number') state.bits = fromNumber(state.bits);
  if (typeof state.totalBits === 'number') state.totalBits = fromNumber(state.totalBits || 0);
  if (state.totalBits == null) state.totalBits = fromNumber(0);
  state.owned = state.owned || {};
  state.timedStates = state.timedStates || {};
  state.managers = state.managers || {};

  let soundOn = (state.milestones || []).includes('sound-unlock');
  let animOn  = (state.milestones || []).includes('anim-unlock');   // reserved for future tap anim
  void animOn;
  let activeTab = 'bits';

  const tiers = cfg.tiers || [];
  const cursorTier = tiers[0];
  const timedTiers = tiers.filter((t) => t.type === 'timed');
  const beaten = Array.isArray(state.defeated) && state.defeated.includes(1);

  const tabVisible = {
    bits: () => true,
    managers: () => (state.owned['s1-box'] || 0) >= 1,
    achievements: () => (state.achievements || []).length >= 1,
    reset: () => gte(state.bits, cfg.bossTicket),
  };
  const TAB_LABELS = { bits: '🧮 Bits', managers: '🛠 Managers', achievements: '🏆 Achievements', reset: '🌀 Reset' };

  host.innerHTML =
    '<div class="mg-wrap mg-s1">'
    + '<div class="mg-s1-top">'
    + '  <div class="mg-s1-tap" aria-label="tap to compute"></div>'
    + '  <div class="mg-s1-stage">'
    + '    <button class="mg-s1-btn mg-compute" type="button">' + (cursorTier ? cursorTier.icon + ' ' + cursorTier.name : '⚙ Compute') + '</button>'
    + '    <div class="mg-s1-grid" aria-hidden="true"></div>'
    + '  </div>'
    + '</div>'
    + '<div class="mg-s1-tabs" role="tablist"></div>'
    + '<div class="mg-s1-panels"></div>'
    + '</div>';

  const $ = (s) => host.querySelector(s);
  const tap = $('.mg-s1-tap');
  const computeBtn = $('.mg-s1-btn');
  const grid = $('.mg-s1-grid');
  const tabsEl = $('.mg-s1-tabs');
  const panelsEl = $('.mg-s1-panels');

  // ── Pixel-reveal grid (column-major fill order) ────────────────────────────
  const cells = [];
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

  function reveal() {
    const gate = activeGate(state);
    const range = gate.to - gate.from;
    const raw = range > 0 ? (gate.metric(state) - gate.from) / range : 0;
    const progress = Math.max(0, Math.min(1, raw));
    const n = Math.floor(100 * progress);
    for (let i = 0; i < GRID_CELLS; i++) cells[i].classList.toggle('mg-s1-on', i < n);
    const done = n >= GRID_CELLS;
    computeBtn.style.opacity = done ? '' : String(n / GRID_CELLS);
    computeBtn.classList.toggle('mg-s1-ready', done);
    grid.classList.toggle('mg-s1-clear', done);
    tap.style.pointerEvents = done ? 'none' : '';   // let button clicks through when fully revealed
  }

  // ── Tab framework ──────────────────────────────────────────────────────────
  function renderTabs() {
    tabsEl.innerHTML = Object.keys(TAB_LABELS)
      .filter((id) => tabVisible[id]())
      .map((id) => '<button class="mg-s1-tab' + (id === activeTab ? ' mg-s1-tab-on' : '') + '" type="button" role="tab" data-tab="' + id + '">' + TAB_LABELS[id] + '</button>')
      .join('');
    tabsEl.querySelectorAll('.mg-s1-tab').forEach((b) => b.addEventListener('click', () => {
      activeTab = b.dataset.tab;
      renderTabs();
      renderPanel();
    }));
  }

  // ── Bits tab: shop + timed buttons + statistics ────────────────────────────
  function shopRowHtml(t) {
    const owned = state.owned[t.id] || 0;
    const visible = (TIER_VISIBLE[t.id] || (() => true))(state);
    const desc = t.desc || t.name;
    const counts = BUY_COUNTS.map((n) =>
      '<button class="mg-mult-b mg-s1-buyn" type="button" data-id="' + t.id + '" data-n="' + n + '">'
      + (n === 'max' ? 'MAX' : '×' + n) + '</button>').join('');
    return '<div class="mg-buy mg-s1-shoprow" data-id="' + t.id + '"' + (visible ? '' : ' hidden') + '>'
      + '<span class="mg-buy-name">' + escapeHtml(t.icon + ' ' + t.name) + ' <span class="mg-owned">×' + owned + '</span></span>'
      + '<span class="mg-buy-blurb">' + escapeHtml(desc) + '</span>'
      + '<span class="mg-s1-buyrow"><span class="mg-s1-counts">' + counts + '</span>'
      + '<button class="mg-buy-cost mg-s1-buybtn" type="button" data-id="' + t.id + '"></button></span>'
      + '</div>';
  }

  function timedBtnHtml(t) {
    return '<div class="mg-s1-timed" data-id="' + t.id + '" hidden>'
      + '<button class="mg-s1-timed-btn" type="button" data-id="' + t.id + '"></button>'
      + '<div class="mg-s1-timed-bar" hidden><div class="mg-s1-timed-fill"></div><span class="mg-s1-timed-label"></span></div>'
      + '</div>';
  }

  function renderBitsPanel() {
    panelsEl.innerHTML =
      '<div class="mg-s1-panel" data-panel="bits">'
      + '<div class="mg-shop">' + tiers.map(shopRowHtml).join('') + '</div>'
      + '<div class="mg-s1-timers">' + timedTiers.map(timedBtnHtml).join('') + '</div>'
      + '<div class="mg-s1-stats"></div>'
      + '<button class="mg-faceboss mg-s1-boss" type="button" hidden>⚔ Confront ' + (cfg.bossName || 'the boss') + '</button>'
      + '</div>';

    // Buy-count selectors (per-row remembered active count; default ×1).
    panelsEl.querySelectorAll('.mg-s1-buyn').forEach((b) => b.addEventListener('click', () => {
      buyCounts[b.dataset.id] = b.dataset.n === 'max' ? 'max' : Number(b.dataset.n);
      paintShop();
    }));
    // Buy buttons.
    panelsEl.querySelectorAll('.mg-s1-buybtn').forEach((b) => b.addEventListener('click', () => doBuy(b.dataset.id)));
    // Timed buttons.
    panelsEl.querySelectorAll('.mg-s1-timed-btn').forEach((b) => b.addEventListener('click', () => startTimed(b.dataset.id)));
    // Boss button.
    const bossBtn = panelsEl.querySelector('.mg-s1-boss');
    if (bossBtn) bossBtn.addEventListener('click', (e) => { e.stopPropagation(); ctx.onBoss && ctx.onBoss(); });

    paintShop();
    paintTimed();
    paintStats();
  }

  // Selected buy count per tier (defaults to 1).
  const buyCounts = {};
  const countFor = (id) => buyCounts[id] || 1;

  function effectiveN(t) {
    const sel = countFor(t.id);
    if (sel === 'max') return maxAffordable(state.bits, t, state.owned[t.id] || 0);
    return sel;
  }

  function doBuy(id) {
    const t = tiers.find((x) => x.id === id);
    if (!t) return;
    const n = effectiveN(t);
    if (!n || n <= 0) return;
    const got = buyTier(state, cfg, id, n, save);
    if (got > 0) {
      const bs = bellLoad();
      checkMessages('buy', state, bs);
      checkMessages('bit-lose', state, bs);
      checkAchievements(state, cfg, bs);
      renderAll();
    }
  }

  function startTimed(id) {
    const t = timedTiers.find((x) => x.id === id);
    if (!t || (state.owned[id] || 0) < 1) return;
    const ts = state.timedStates[id];
    if (ts && ts.active) {
      // Already running — flash the bar.
      const barWrap = panelsEl.querySelector('.mg-s1-timed[data-id="' + id + '"] .mg-s1-timed-bar');
      if (barWrap) { barWrap.classList.remove('mg-s1-flash'); void barWrap.offsetWidth; barWrap.classList.add('mg-s1-flash'); }
      return;
    }
    state.timedStates[id] = { active: true, startedAt: Date.now(), duration_ms: t.duration_ms };
    paintTimed();
  }

  function paintShop() {
    tiers.forEach((t) => {
      const row = panelsEl.querySelector('.mg-s1-shoprow[data-id="' + t.id + '"]');
      if (!row) return;
      const visible = (TIER_VISIBLE[t.id] || (() => true))(state);
      row.hidden = !visible;
      if (!visible) return;
      const owned = state.owned[t.id] || 0;
      row.querySelector('.mg-owned').textContent = '×' + owned;
      // Highlight the active count selector.
      const sel = countFor(t.id);
      row.querySelectorAll('.mg-s1-buyn').forEach((b) => {
        const v = b.dataset.n === 'max' ? 'max' : Number(b.dataset.n);
        b.classList.toggle('mg-mult-on', String(v) === String(sel));
      });
      const n = effectiveN(t);
      const cost = totalCost(t, owned, n || 0);
      const buyBtn = row.querySelector('.mg-s1-buybtn');
      const label = sel === 'max' ? 'MAX' : '×' + n;
      buyBtn.textContent = 'Buy ' + label + ' — ' + toDisplay(cost);
      const affordable = (n > 0) && gte(state.bits, cost);
      buyBtn.classList.toggle('mg-buy-locked', !affordable);
      buyBtn.disabled = !affordable;
    });
  }

  function paintTimed() {
    timedTiers.forEach((t) => {
      const wrap = panelsEl.querySelector('.mg-s1-timed[data-id="' + t.id + '"]');
      if (!wrap) return;
      const owned = state.owned[t.id] || 0;
      wrap.hidden = owned < 1;
      if (owned < 1) return;
      const ts = state.timedStates[t.id];
      const btn = wrap.querySelector('.mg-s1-timed-btn');
      const bar = wrap.querySelector('.mg-s1-timed-bar');
      if (ts && ts.active) {
        btn.hidden = true;
        bar.hidden = false;
        const elapsed = Date.now() - ts.startedAt;
        const dur = ts.duration_ms || t.duration_ms;
        const frac = Math.max(0, Math.min(1, elapsed / dur));
        bar.querySelector('.mg-s1-timed-fill').style.width = (frac * 100) + '%';
        bar.querySelector('.mg-s1-timed-label').textContent = Math.max(0, (dur - elapsed) / 1000).toFixed(1) + 's';
      } else {
        btn.hidden = false;
        bar.hidden = true;
        btn.textContent = '▶ ' + t.icon + ' ' + t.name + ' → +' + toDisplay(timedPayout(state, cfg, t.id));
      }
    });
  }

  function paintStats() {
    const statsEl = panelsEl.querySelector('.mg-s1-stats');
    if (!statsEl) return;
    const rate = netRate(state, cfg);
    statsEl.innerHTML =
      '<span class="mg-s1-stat">Bits: <strong>' + toDisplay(state.bits) + '</strong></span>'
      + '<span class="mg-s1-stat">Total: <strong>' + toDisplay(state.totalBits) + '</strong></span>'
      + '<span class="mg-s1-stat' + (rate < 0 ? ' mg-s1-neg' : '') + '">Rate: <strong>'
      + (rate < 0 ? '-' : '') + toDisplay(fromNumber(Math.abs(rate))) + '/s</strong></span>';
    // Boss button: only when not yet beaten and the boss ticket is affordable.
    const bossBtn = panelsEl.querySelector('.mg-s1-boss');
    if (bossBtn) bossBtn.hidden = beaten || !gte(state.bits, cfg.bossTicket);
  }

  // ── Achievements tab ───────────────────────────────────────────────────────
  function renderAchievementsPanel() {
    const unlocked = state.achievements || [];
    let body;
    if (!unlocked.length) {
      body = '<div class="mg-s1-ach-empty">no achievements yet</div>';
    } else {
      body = '<div class="mg-s1-ach-list">' + unlocked.map((id) => {
        const a = ACHIEVEMENTS1.find((x) => x.id === id);
        if (!a) return '';
        return '<div class="mg-s1-ach"><span class="mg-s1-ach-icon">' + escapeHtml(a.icon || '🏆') + '</span>'
          + '<span class="mg-s1-ach-text"><strong>' + escapeHtml(a.name) + '</strong>'
          + '<span class="mg-s1-ach-desc">' + escapeHtml(a.bell || '') + '</span></span></div>';
      }).join('') + '</div>';
    }
    panelsEl.innerHTML = '<div class="mg-s1-panel" data-panel="achievements">' + body + '</div>';
  }

  // ── Managers tab (§6.4) ────────────────────────────────────────────────────
  // Lazily initialize per-manager state. A manager is "hired" when level >= 1.
  function mgrState(id) {
    state.managers = state.managers || {};
    return (state.managers[id] = state.managers[id] || { level: 0, paused: false, lastFire: 0 });
  }
  const managers = cfg.managers || [];
  const managedTier = (mgr) => tiers.find((t) => t.id === mgr.manages);

  function mgrCardHtml(mgr) {
    const ms = mgrState(mgr.id);
    const mt = managedTier(mgr);
    const mtName = mt ? (mt.icon + ' ' + mt.name) : mgr.manages;
    if (ms.level === 0) {
      // Un-hired: greyed card with a single Hire button.
      const cost = managerHireCost(mgr, 0, cfg);
      return '<div class="mg-mgr-card mg-mgr-unhired" data-id="' + mgr.id + '">'
        + '<span class="mg-mgr-head"><span class="mg-mgr-icon">' + escapeHtml(mgr.icon) + '</span>'
        + '<span class="mg-mgr-name">' + escapeHtml(mgr.name) + '</span></span>'
        + '<span class="mg-mgr-manages">Manages: ' + escapeHtml(mtName) + '</span>'
        + '<button class="mg-mgr-hire" type="button" data-id="' + mgr.id + '" data-act="hire">Hire — ' + toDisplay(cost) + '</button>'
        + '</div>';
    }
    // Hired: full controls.
    const runCost = managerRunCost(mgr.id, state, cfg);
    const lvlCost = managerHireCost(mgr, ms.level, cfg);
    return '<div class="mg-mgr-card mg-mgr-hired" data-id="' + mgr.id + '">'
      + '<span class="mg-mgr-head"><span class="mg-mgr-icon">' + escapeHtml(mgr.icon) + '</span>'
      + '<span class="mg-mgr-name">' + escapeHtml(mgr.name) + '</span>'
      + '<span class="mg-mgr-level">Level ' + ms.level + '</span></span>'
      + '<span class="mg-mgr-manages">Manages: ' + escapeHtml(mtName) + '</span>'
      + '<span class="mg-mgr-run">Running cost: <strong class="mg-mgr-runcost">' + toDisplay(fromNumber(runCost)) + '</strong>/s</span>'
      + (ms.paused ? '<span class="mg-mgr-paused">⏸ Paused (out of bits)</span>' : '')
      + '<span class="mg-mgr-actions">'
      + '<button class="mg-mgr-lvl" type="button" data-id="' + mgr.id + '" data-act="lvl">Level up — ' + toDisplay(lvlCost) + '</button>'
      + '<button class="mg-mgr-fire" type="button" data-id="' + mgr.id + '" data-act="fire">Fire</button>'
      + '</span>'
      + '</div>';
  }

  // Net-rate preview: recompute net rate as if `mgr` were one level higher.
  function previewNetNeg(mgr) {
    const ms = mgrState(mgr.id);
    const saved = ms.level;
    ms.level = saved + 1;
    const r = netRate(state, cfg);
    ms.level = saved;
    return r < 0;
  }

  function renderManagersPanel() {
    // Show each manager whose managed tier is owned >= 1.
    const visible = managers.filter((mgr) => {
      const mt = managedTier(mgr);
      return mt && (state.owned[mt.id] || 0) >= 1;
    });
    const rate = netRate(state, cfg);
    const head = '<div class="mg-mgr-net' + (rate < 0 ? ' mg-s1-neg' : '') + '">Net rate: <strong>'
      + (rate < 0 ? '-' : '') + toDisplay(fromNumber(Math.abs(rate))) + '/s</strong></div>';
    const body = visible.length
      ? '<div class="mg-mgr-list">' + visible.map(mgrCardHtml).join('') + '</div>'
      : '<div class="mg-managers-stub">no managers available yet</div>';
    panelsEl.innerHTML = '<div class="mg-s1-panel" data-panel="managers">' + head + body + '</div>';

    panelsEl.querySelectorAll('.mg-mgr-card [data-act]').forEach((b) => {
      const id = b.dataset.id, act = b.dataset.act;
      const mgr = managers.find((m) => m.id === id);
      if (!mgr) return;
      b.addEventListener('click', () => mgrAction(mgr, act));
      // Net-rate negative preview on hover/focus for the level-up button.
      if (act === 'lvl') {
        const show = () => { if (previewNetNeg(mgr)) panelsEl.querySelector('.mg-mgr-net')?.classList.add('mg-net-neg-preview'); };
        const hide = () => panelsEl.querySelector('.mg-mgr-net')?.classList.remove('mg-net-neg-preview');
        b.addEventListener('mouseenter', show);
        b.addEventListener('focus', show);
        b.addEventListener('mouseleave', hide);
        b.addEventListener('blur', hide);
      }
    });
    paintManagers();
  }

  // Live paint for the managers tab (no innerHTML churn). Re-renders fully only when a
  // manager's paused flag flips (that adds/removes the ⏸ indicator element).
  function paintManagers() {
    const rateNeg = netRate(state, cfg) < 0;
    const net = panelsEl.querySelector('.mg-mgr-net');
    if (net) net.classList.toggle('mg-s1-neg', rateNeg);
    let pausedChanged = false;
    managers.forEach((mgr) => {
      const ms = mgrState(mgr.id);
      const card = panelsEl.querySelector('.mg-mgr-card[data-id="' + mgr.id + '"]');
      if (!card) return;
      // Detect a paused flip vs. what the DOM currently shows.
      const hasIndicator = !!card.querySelector('.mg-mgr-paused');
      if (ms.level >= 1 && hasIndicator !== !!ms.paused) pausedChanged = true;
      const cost = managerHireCost(mgr, ms.level, cfg);
      const btn = card.querySelector(ms.level === 0 ? '.mg-mgr-hire' : '.mg-mgr-lvl');
      if (btn) {
        const can = gte(state.bits, cost);
        btn.disabled = !can;
        btn.classList.toggle('mg-buy-locked', !can);
      }
      const runEl = card.querySelector('.mg-mgr-runcost');
      if (runEl) {
        runEl.textContent = toDisplay(fromNumber(managerRunCost(mgr.id, state, cfg)));
        runEl.classList.toggle('mg-mgr-runcost-neg', rateNeg);
      }
    });
    if (pausedChanged) renderManagersPanel();
  }

  function mgrAction(mgr, act) {
    const ms = mgrState(mgr.id);
    if (act === 'fire') {
      ms.level = 0; ms.paused = false; ms.lastFire = 0;
      save(state);
      renderManagersPanel();
      paintStats();
      return;
    }
    // hire (0→1) and lvl (N→N+1) share the same buy path.
    const cost = managerHireCost(mgr, ms.level, cfg);
    if (!gte(state.bits, cost)) return;
    state.bits = sub(state.bits, cost);
    ms.level++;
    save(state);
    checkMessages('buy', state, bellLoad());
    checkAchievements(state, cfg, bellLoad());
    renderManagersPanel();
    paintStats();
  }

  // ── Auto-fire (§5.6/§6.2) + shutdown rule (§6.3), called from the game tick. ──
  function runManagerAutoFire() {
    const now = Date.now();
    // Shutdown rule (§6.3): pause all managers if net-negative AND broke; resume once bits > 0.
    const broke = state.bits.m === 0;
    const rate = netRate(state, cfg);
    if (rate < 0 && broke) {
      for (const mgr of managers) { const ms = mgrState(mgr.id); if (ms.level >= 1) ms.paused = true; }
    } else if (!broke) {
      for (const mgr of managers) { const ms = mgrState(mgr.id); if (ms.level >= 1 && ms.paused) ms.paused = false; }
    }
    // Auto-fire each hired, non-paused manager's managed timed button.
    for (const mgr of managers) {
      const ms = mgrState(mgr.id);
      if (ms.level < 1 || ms.paused) continue;
      const mt = managedTier(mgr);
      if (!mt || mt.type !== 'timed' || (state.owned[mt.id] || 0) < 1) continue;
      const ts = state.timedStates[mt.id];
      if (ts && ts.active) continue;
      const interval = autoInterval(mt.duration_ms, ms.level);
      if (now - (ms.lastFire || 0) >= interval) {
        state.timedStates[mt.id] = { active: true, startedAt: now, duration_ms: interval };
        ms.lastFire = now;
      }
    }
  }

  // ── Reset / prestige tab (§8.5) ────────────────────────────────────────────
  function renderResetPanel() {
    const gain = pullGain(state.totalBits);
    const newTotal = (globalPull(state) * gain).toFixed(1);
    panelsEl.innerHTML =
      '<div class="mg-s1-panel" data-panel="reset">'
      + '<div class="mg-reset-panel">'
      + '<div class="mg-reset-title">Reset Stage 1?</div>'
      + '<p class="mg-reset-line">You will gain <strong>×' + gain.toFixed(1) + '</strong> Gravitational Pull (total <strong>×' + newTotal + '</strong>).</p>'
      + '<p class="mg-reset-line">All bits, buildings, and managers will be lost.</p>'
      + '<p class="mg-reset-line mg-reset-keep">Achievements and pull persist.</p>'
      + '<div class="mg-reset-actions">'
      + '<button class="mg-reset-go" type="button">Reset</button>'
      + '<button class="mg-reset-cancel" type="button">Cancel</button>'
      + '</div></div></div>';
    panelsEl.querySelector('.mg-reset-go').addEventListener('click', doReset);
    panelsEl.querySelector('.mg-reset-cancel').addEventListener('click', renderResetPanel);
  }

  function doReset() {
    const gain = pullGain(state.totalBits);
    state.pullFactors = [...(state.pullFactors || []), gain];   // append, don't replace
    // Wipe per-run progress; preserve meta progression.
    state.bits = ZERO;
    state.totalBits = ZERO;
    state.owned = {};
    state.timedStates = {};
    state.managers = {};
    state.runStartedAt = Date.now();
    save(state);
    checkMessages('prestige', state, bellLoad());
    checkAchievements(state, cfg, bellLoad());
    renderAll();
  }

  function renderPanel() {
    if (activeTab !== 'bits' && !tabVisible[activeTab]()) activeTab = 'bits';   // tab vanished → fall back
    if (activeTab === 'bits') renderBitsPanel();
    else if (activeTab === 'managers') renderManagersPanel();
    else if (activeTab === 'achievements') renderAchievementsPanel();
    else if (activeTab === 'reset') renderResetPanel();
  }

  // Full re-render of the dynamic UI (tabs + active panel + reveal). Used after a buy.
  function renderAll() {
    renderTabs();
    renderPanel();
    reveal();
  }

  // ── Pixel-reveal tap (onboarding) — adds bits via the real economy clickPower ──
  function addBits() {
    const cp = economyClickPower(state, cfg);
    const gained = fromNumber(cp);
    state.bits = add(state.bits, gained);
    state.totalBits = add(state.totalBits, gained);
    const bs = bellLoad();
    const prevMilestones = (state.milestones || []).length;
    checkMilestones(state, bs, save);
    if ((state.milestones || []).length > prevMilestones) {
      soundOn = (state.milestones || []).includes('sound-unlock');
      animOn  = (state.milestones || []).includes('anim-unlock');
    }
    if (soundOn) clickTick();
    checkMessages('bit-earn', state, bs);
    checkAchievements(state, cfg, bs);
    reveal();
    if (activeTab === 'bits') { paintShop(); paintTimed(); paintStats(); }
  }
  tap.addEventListener('pointerdown', addBits);

  // ── Compute button: the onboarding "buy a cursor" gimmick. The cursor tier is free
  //    (base {m:0,e:0}), so it can't be bought through the generic cost path — instead a full
  //    reveal (GRID_CELLS bits worth of progress) "spends" a cycle and bumps owned[s1-cursor]. ──
  computeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!computeBtn.classList.contains('mg-s1-ready')) return;   // grid not full → ignore
    if (!cursorTier) return;
    const cost = fromNumber(GRID_CELLS);
    if (!gte(state.bits, cost)) return;
    state.bits = sub(state.bits, cost);
    state.owned[cursorTier.id] = (state.owned[cursorTier.id] || 0) + 1;
    state.totalBought = (state.totalBought || 0) + 1;
    save(state);
    const bs = bellLoad();
    checkMessages('buy', state, bs);
    checkMessages('bit-lose', state, bs);
    checkAchievements(state, cfg, bs);
    renderAll();
  });

  // ── Game tick loop (§5.5) — single 100ms interval; cleared on re-render. ──
  if (renderStage1._tickId) { clearInterval(renderStage1._tickId); renderStage1._tickId = null; }
  let tickAcc = 0;
  function tick() {
    // Self-terminate if our DOM was torn down (orchestrator switched to boss/another stage) — the
    // orchestrator's clearTransient() doesn't know about this interval, so we stop ourselves.
    if (!host.isConnected || !grid.isConnected) {
      clearInterval(renderStage1._tickId); renderStage1._tickId = null; return;
    }
    // 1. Passive accrual.
    const passive = mulScalar(fromNumber(passiveRate(state, cfg)), 1 / 10);
    state.bits = add(state.bits, passive);
    state.totalBits = add(state.totalBits, passive);
    // 2. Manager cost drain (0 until WP-S1-10, but still call it).
    state.bits = sub(state.bits, mulScalar(fromNumber(managerCostPerSec(state, cfg)), 1 / 10));
    // 2b. Track net-negative streak for the ach-net-neg achievement.
    const rate = netRate(state, cfg);
    if (rate < 0) { if (!state._netNegSince) state._netNegSince = Date.now(); }
    else state._netNegSince = 0;
    // 3. Timed completions.
    let timedDone = false;
    for (const t of timedTiers) {
      const ts = state.timedStates[t.id];
      if (!ts || !ts.active) continue;
      if (Date.now() - ts.startedAt >= (ts.duration_ms || t.duration_ms)) {
        const payout = timedPayout(state, cfg, t.id);
        state.bits = add(state.bits, payout);
        state.totalBits = add(state.totalBits, payout);
        ts.active = false;
        timedDone = true;
      }
    }
    if (timedDone) checkMessages('bit-earn', state, bellLoad());
    // 3b. Manager auto-fire + shutdown rule (§5.6/§6.3).
    runManagerAutoFire();
    // 4. Reveal.
    reveal();
    // 5. Partial re-render of the live tab.
    if (activeTab === 'bits') { paintShop(); paintTimed(); paintStats(); }
    else if (activeTab === 'managers') paintManagers();
    checkAchievements(state, cfg, bellLoad());
    // 6. Periodic save.
    if (++tickAcc >= 10) { tickAcc = 0; save(state); }
  }
  renderStage1._tickId = setInterval(tick, 100);

  renderAll();
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
