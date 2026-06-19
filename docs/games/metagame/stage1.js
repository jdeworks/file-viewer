// Stage 1 — Bit Foundry. The bespoke "pixel reveal" onboarding mechanic sits on top; below it a
// full tabbed idle-clicker (shop, timed buttons, achievements; managers + prestige stubbed for
// WP-S1-10). The commentary BELL (top-right) narrates every stage. Split out of metagame.js to
// keep that orchestrator under the LOC cap.
//
// Reveal: tapping the top area adds bits (×clickPower); current bits fill a 100-square grid toward
// the current Multiplier price. When full the button is interactive; buying Multiplier restarts the
// reveal. The tabs below host the real BigNum economy (shop / timed / stats / achievements).

import { clickTick } from './sounds.js';
import { ACHIEVEMENTS1 } from './achievements1.js';
import {
  netRate, passiveRate, managerCostPerSec, clickPower as economyClickPower,
  timedPayout, totalCost, maxAffordable, buyTier,
} from './s1economy.js';
import { fromNumber, add, sub, mulScalar, gte, toDisplay } from './bignum.js';
import { bellLoad, checkMessages, escapeHtml } from './s1bell.js';
import { checkAchievements, checkMilestones } from './s1achievements.js';
import { createManagersController } from './s1managers.js';
import { renderResetPanel as renderS1ResetPanel } from './s1reset.js';

const GRID_COLS = 20, GRID_ROWS = 5, GRID_CELLS = GRID_COLS * GRID_ROWS;   // 20×5 = 100

// ── BigNum helper for gate metrics (local, avoids circular imports) ──────────
// Handles both legacy plain numbers and BigNum {m,e} objects gracefully.
function bigToNum(bn) {
  if (bn === null || bn === undefined) return 0;
  if (typeof bn === 'number') return bn;   // legacy plain number
  if (!bn.m) return 0;
  return Math.min(bn.m * Math.pow(10, bn.e || 0), Number.MAX_VALUE);
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
  's1-mult':    (s) => s.tabsUnlocked,
  's1-box':     (s) => (s.owned['s1-mult'] || 0) >= 1,
  's1-boost':   (s) => gte(s.bits, { m: 500, e: 0 }) || (s.owned['s1-box'] || 0) >= 1,
  's1-cluster': (s) => (s.owned['s1-boost'] || 0) >= 1,
  's1-array':   (s) => (s.owned['s1-cluster'] || 0) >= 1,
  's1-neural':  (s) => gte(s.totalBits, { m: 1, e: 6 }),
  's1-quantum': (s) => (s.owned['s1-neural'] || 0) >= 3,
};

export function renderStage1(ctx) {
  const { host, state, save, stage, onExit, attachChrome, bell } = ctx;
  const cfg = stage();   // Stage 1 config from stages.js

  // ── State normalization on mount (legacy plain numbers → BigNum until WP-S1-12 lands) ──
  if (typeof state.bits === 'number') state.bits = fromNumber(state.bits);
  if (typeof state.totalBits === 'number') state.totalBits = fromNumber(state.totalBits || 0);
  if (state.totalBits == null) state.totalBits = fromNumber(0);
  state.owned = state.owned || {};
  if (state.owned['s1-cursor']) {
    state.owned['s1-mult'] = (state.owned['s1-mult'] || 0) + state.owned['s1-cursor'];
    delete state.owned['s1-cursor'];
    save(state);
  }
  if (!state.tabsUnlocked && bigToNum(state.bits) >= 150) {
    state.tabsUnlocked = true;
    save(state);
  }
  state.timedStates = state.timedStates || {};
  state.managers = state.managers || {};

  let soundOn = (state.milestones || []).includes('sound-unlock');
  let animOn  = (state.milestones || []).includes('anim-unlock');   // reserved for future tap anim
  void animOn;
  let activeTab = 'bits';

  const tiers = cfg.tiers || [];
  const multTier = tiers.find((t) => t.id === 's1-mult');
  const timedTiers = tiers.filter((t) => t.type === 'timed');
  const beaten = Array.isArray(state.defeated) && state.defeated.includes(1);

  // §8.1 / §10.2: all Stage 1 tiers owned ≥1 AND bits ≥ bossTicket.
  function allSubStagesOwned() {
    return tiers.every((t) => (state.owned[t.id] || 0) >= 1);
  }
  function canFightBoss() {
    return allSubStagesOwned() && cfg.bossTicket && gte(state.bits, cfg.bossTicket);
  }

  const tabVisible = {
    bits: () => true,
    managers: () => (state.owned['s1-box'] || 0) >= 1,
    achievements: () => (state.achievements || []).length >= 1,
    reset: () => canFightBoss(),
  };
  const TAB_LABELS = { bits: '🧮 Bits', managers: '🛠 Managers', achievements: '🏆 Achievements', reset: '🌀 Reset' };

  host.innerHTML =
    '<div class="mg-wrap mg-s1">'
    + '<div class="mg-s1-top">'
    + '  <div class="mg-s1-tap" aria-label="tap to compute"></div>'
    + '  <div class="mg-s1-stage">'
    + '    <button class="mg-s1-btn mg-compute" type="button">' + (multTier ? multTier.icon + ' ' + multTier.name : 'Compute') + '</button>'
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
    if (state.tabsUnlocked) return;   // phase 2: no pixel reveal
    const wrapper = host.querySelector('.mg-wrap.mg-s1');
    if (wrapper) wrapper.classList.toggle('mg-s1-empty', bigToNum(state.bits) <= 0 && bigToNum(state.totalBits) <= 0);
    const bits = bigToNum(state.bits);
    const owned = state.owned['s1-mult'] || 0;
    const cost = multTier ? totalCost(multTier, owned, 1) : fromNumber(GRID_CELLS);
    const target = Math.max(1, bigToNum(cost));
    const progress = Math.max(0, Math.min(1, bits / target));
    const n = bits <= 0 ? 0 : Math.min(GRID_CELLS, Math.max(1, Math.floor(GRID_CELLS * progress)));
    for (let i = 0; i < GRID_CELLS; i++) cells[i].classList.toggle('mg-s1-on', i < n);
    const done = progress >= 1;
    computeBtn.style.opacity = done ? '' : String(progress);
    computeBtn.classList.toggle('mg-s1-ready', done);
    grid.classList.toggle('mg-s1-clear', done);
    // Tap stays active at all times — clicking outside the button still adds bits even when ready.
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
      + '<button class="mg-compute mg-s1-earn" type="button">Compute bits</button>'
      + '<div class="mg-shop">' + tiers.map(shopRowHtml).join('') + '</div>'
      + '<div class="mg-s1-timers">' + timedTiers.map(timedBtnHtml).join('') + '</div>'
      + '<div class="mg-s1-stats" hidden></div>'
      + '<button class="mg-faceboss mg-s1-boss" type="button" hidden>⚔ Confront ' + (cfg.bossName || 'the boss') + '</button>'
      + '</div>';

    const earnBtn = panelsEl.querySelector('.mg-s1-earn');
    if (earnBtn) earnBtn.addEventListener('click', addBits);
    // Buy-count selectors (per-row remembered active count; default ×1).
    panelsEl.querySelectorAll('.mg-s1-buyn').forEach((b) => b.addEventListener('click', () => {
      const n = b.dataset.n === 'max' ? 'max' : Number(b.dataset.n);
      buyCounts[b.dataset.id] = n;
      state.buyMult = n;   // persist globally so it survives reload
      save(state);
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

  // Selected buy count per tier — persisted as a single global state.buyMult.
  // Initialize all tiers from the saved value so the selection survives reloads.
  const buyCounts = {};
  tiers.forEach((t) => { buyCounts[t.id] = state.buyMult ?? 1; });
  const countFor = (id) => buyCounts[id] ?? 1;

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
      checkMessages('buy', state, bs, bell);
      checkMessages('bit-lose', state, bs, bell);
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
    // Floor bits for display so fractional passive accumulation doesn't show (e.g. "3.5" → "3").
    const bitsDisplay = toDisplay(fromNumber(Math.floor(bigToNum(state.bits))));
    statsEl.innerHTML =
      '<span class="mg-s1-stat">Bits: <strong>' + bitsDisplay + '</strong></span>'
      + '<span class="mg-s1-stat">Total: <strong>' + toDisplay(state.totalBits) + '</strong></span>'
      + '<span class="mg-s1-stat' + (rate < 0 ? ' mg-s1-neg' : '') + '">Rate: <strong>'
      + (rate < 0 ? '-' : '') + toDisplay(fromNumber(Math.abs(rate))) + '/s</strong></span>';
    // Boss button: only when not yet beaten and the boss ticket is affordable.
    const bossBtn = panelsEl.querySelector('.mg-s1-boss');
    if (bossBtn) bossBtn.hidden = beaten || !canFightBoss();
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

  const managersController = createManagersController({ panelsEl, state, cfg, tiers, save, paintStats });

  function renderResetPanel() {
    renderS1ResetPanel({ panelsEl, state, cfg, save, renderAll });
  }

  function renderPanel() {
    if (activeTab !== 'bits' && !tabVisible[activeTab]()) activeTab = 'bits';   // tab vanished → fall back
    if (activeTab === 'bits') renderBitsPanel();
    else if (activeTab === 'managers') managersController.renderPanel();
    else if (activeTab === 'achievements') renderAchievementsPanel();
    else if (activeTab === 'reset') renderResetPanel();
  }

  // Full re-render of the dynamic UI (tabs + active panel + reveal). Used after a buy.
  function renderAll() {
    // Toggle phase: phase 1 = no tabs (pixel reveal only); phase 2 = tabs, no pixel button.
    const wrapper = host.querySelector('.mg-wrap.mg-s1');
    if (wrapper) {
      wrapper.classList.toggle('mg-s1-phase1', !state.tabsUnlocked);
      wrapper.classList.toggle('mg-s1-empty', !state.tabsUnlocked && bigToNum(state.bits) <= 0 && bigToNum(state.totalBits) <= 0);
    }
    renderTabs();
    renderPanel();
    if (!state.tabsUnlocked) reveal();
  }

  // ── Tab unlock: fires once when current bits reaches 150. Toggles phase -> tab layout appears. ──
  function checkTabUnlock() {
    if (state.tabsUnlocked) return;
    if (bigToNum(state.bits) >= 150) {
      state.tabsUnlocked = true;
      save(state);
      renderAll();
    }
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
    checkMessages('bit-earn', state, bs, bell);
    checkAchievements(state, cfg, bs);
    reveal();
    if (state.tabsUnlocked && activeTab === 'bits') { paintShop(); paintTimed(); paintStats(); }
    checkTabUnlock();
  }

  // ── Compute button purchase: buys one Multiplier using the same escalating shop price. ──
  function doPurchase() {
    if (!computeBtn.classList.contains('mg-s1-ready')) return;
    if (!multTier) return;
    const owned = state.owned[multTier.id] || 0;
    const cost = totalCost(multTier, owned, 1);
    if (!gte(state.bits, cost)) return;
    state.bits = sub(state.bits, cost);
    state.owned[multTier.id] = owned + 1;
    state.totalBought = (state.totalBought || 0) + 1;
    save(state);
    const bs = bellLoad();
    checkMessages('buy', state, bs, bell);
    checkMessages('bit-lose', state, bs, bell);
    checkAchievements(state, cfg, bs);
    renderAll();
  }

  // ── Tap area: full-screen click handler. Clicking the revealed button = purchase;
  //    clicking anywhere else (including pixels over the button) = addBits. ──
  tap.addEventListener('pointerdown', (e) => {
    if (computeBtn.classList.contains('mg-s1-ready')) {
      const r = computeBtn.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
        doPurchase();
        return;
      }
    }
    addBits();
  });
  // Keyboard / accessibility: space/enter on the button calls doPurchase directly.
  computeBtn.addEventListener('click', (e) => { e.stopPropagation(); doPurchase(); });

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
    if (timedDone) checkMessages('bit-earn', state, bellLoad(), bell);
    // 3b. Manager auto-fire + shutdown rule (§5.6/§6.3).
    managersController.runAutoFire();
    // 4. Reveal (phase 1 only; reveal() no-ops when tabsUnlocked).
    reveal();
    // 4b. Tab unlock check (passive rate could push bits to 250 without a tap).
    checkTabUnlock();
    // 5. Partial re-render of the live tab (phase 2 only — tabs are hidden in phase 1).
    if (state.tabsUnlocked) {
      if (activeTab === 'bits') { paintShop(); paintTimed(); paintStats(); }
      else if (activeTab === 'managers') managersController.paint();
    }
    checkAchievements(state, cfg, bellLoad());
    // 6. Periodic save.
    if (++tickAcc >= 10) { tickAcc = 0; save(state); }
  }
  renderStage1._tickId = setInterval(tick, 100);

  renderAll();
  attachChrome(host);
}

export const STAGE1 = { GRID_CELLS, GRID_COLS, GRID_ROWS };
