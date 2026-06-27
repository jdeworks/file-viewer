// Stage 1 — Bit Foundry. The bespoke "pixel reveal" onboarding mechanic sits on top; below it a
// full tabbed idle-clicker (shop, timed buttons, achievements; managers + prestige stubbed for
// WP-S1-10). The commentary BELL (top-right) narrates every stage. Split out of metagame.js to
// keep that orchestrator under the LOC cap.
//
// Reveal: tapping the top area adds bits (×clickPower); current bits fill a 100-square grid toward
// the current Multiplier price. When full the button is interactive; buying Multiplier restarts the
// reveal. The tabs below host the real BigNum economy (shop / timed / stats / achievements).

import { clickTick } from './sounds.js';
import { renderAchievementsPanel as renderS1AchPanel } from './s1achpanel.js';
import { createShopController } from './s1shop.js';
import {
  netRate, passiveRate, managerCostPerSec, clickPower as economyClickPower,
  timedPayout, timedProduction, totalCost, globalPull,
} from './s1economy.js';
import { fromNumber, add, sub, mulScalar, gte, toDisplay } from './bignum.js';
import { bellLoad, checkMessages, escapeHtml } from './s1bell.js';
import { checkAchievements, checkMilestones } from './s1achievements.js';
import { createManagersController } from './s1managers.js';
import { renderResetPanel as renderS1ResetPanel, paintResetPanel as paintS1ResetPanel } from './s1reset.js';
import { tickMechanics, incomeMult } from './s1mechanics.js';
import { coreAutoMult } from './s1cores.js';
import { setText, setHidden, setHtml, bigToNum } from './s1dom.js';

const GRID_COLS = 20, GRID_ROWS = 5, GRID_CELLS = GRID_COLS * GRID_ROWS;   // 20×5 = 100

/* ─────────────────────────────────────────────────────────────────────────────
   Stage 1 render: pixel-reveal top section + a tabbed idle clicker below it. The "Bits" tab
   (shop + timed builders + stats) is owned by s1shop.js; this file orchestrates the reveal,
   tabs, tick loop, score/help HUD, and economy plumbing.
   ───────────────────────────────────────────────────────────────────────────── */

export function renderStage1(ctx) {
  const { host, state, save, stage, onExit, attachChrome, bell } = ctx;
  const sfxOn = () => (typeof ctx.sfxEnabled === 'function' ? ctx.sfxEnabled() : true);
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

  // Prestige unlocks once total bits ever earned reaches "ab" (10^18) — the point where a reset
  // yields a meaningful Gravitational Pull gain — independent of (and well before) the boss ticket.
  const RESET_THRESHOLD = { m: 1, e: 18 };   // "1.00ab"
  const tabVisible = {
    bits: () => true,
    managers: () => (state.owned['s1-box'] || 0) >= 1,
    achievements: () => (state.achievements || []).length >= 1,
    // Visible once a prestige is affordable OR after any prestige (so the Cores shop / mechanic
    // roster stays reachable while totalBits is rebuilding toward the next reset).
    reset: () => gte(state.totalBits, RESET_THRESHOLD) || (state.prestigeCount || 0) >= 1,
  };
  const TAB_LABELS = { bits: '🧮 Bits', managers: '🛠 Managers', achievements: '🏆 Achievements', reset: '🌀 Prestige' };

  host.innerHTML =
    '<div class="mg-wrap mg-s1">'
    + '<div class="mg-s1-hud" hidden>'
    + '  <span class="mg-s1-grav" hidden>🌀 ×1.0</span>'
    + '  <span class="mg-s1-score"><strong class="mg-s1-score-val">0</strong> bits</span>'
    + '</div>'
    + '<div class="mg-s1-help" hidden></div>'
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
  const hudEl = $('.mg-s1-hud');
  const scoreValEl = $('.mg-s1-score-val');
  const gravEl = $('.mg-s1-grav');
  const helpEl = $('.mg-s1-help');

  // ── Score HUD + helper buttons (progressive disclosure) ──────────────────────
  // Score counter appears at 400 total bits collected; the help affordance appears once the
  // player has banked 1000 bits at once (sticky), so the explanations arrive when they're useful.
  const HELP_SECTIONS = [
    ['👆 Tap', 'Tap the top area to compute bits. The ✖ Multiplier adds +1 bit per tap each level.'],
    ['🧰 Bit Box', 'Tap it to run a timed cycle that pays out bits. Your main income.'],
    ['📡 Signal Booster', 'Each cycle BUILDS Bit Boxes for you (and boosts their payout). It makes machines, not bits.'],
    ['🧊 Core Cluster', 'Each cycle BUILDS Signal Boosters — a machine that builds the machine that builds boxes.'],
    ['🛠 Managers', 'Hire one to auto-run a builder for a per-second bit cost. Watch the net rate stays positive.'],
    ['🌀 Reset', 'Once your total reaches ~1ab bits you may reset for a permanent ×pull multiplier on everything.'],
  ];
  function renderHelp() {
    setHtml(helpEl, '<div class="mg-s1-help-title">How the Foundry works</div>'
      + HELP_SECTIONS.map(([h, b]) =>
        '<div class="mg-s1-help-row"><strong>' + escapeHtml(h) + '</strong><span>' + escapeHtml(b) + '</span></div>').join(''));
  }
  // The help affordance now lives in the metagame header (next to SFX); this toggles the panel.
  function toggleHelp() {
    const open = helpEl.hidden;
    if (open) renderHelp();
    setHidden(helpEl, !open);
  }
  let lastScoreAt = 0;
  function updateHud() {
    // Once unlocked the score stays visible — the 'score-unlock' milestone persists across a prestige
    // reset (which zeroes totalBits), so gate on it rather than the live total. The score chip is an
    // absolute top-right overlay (see games.css), so revealing it never reflows the play area.
    const scoreOn = (state.milestones || []).includes('score-unlock') || bigToNum(state.totalBits) >= 400;
    setHidden(hudEl, !scoreOn);
    if (!scoreOn) return;
    // Gravitational Pull chip — shown once a prestige has earned pull (×>1); guarded so it only
    // writes when the value changes.
    const grav = globalPull(state);
    if (grav > 1.0001) { setText(gravEl, '🌀 ×' + toDisplay(fromNumber(grav))); setHidden(gravEl, false); }
    else setHidden(gravEl, true);
    // Bits score is recomputed at most every 0.25s (the 100ms tick would otherwise rewrite it 10×/s).
    const now = Date.now();
    if (now - lastScoreAt >= 250) {
      lastScoreAt = now;
      setText(scoreValEl, toDisplay(fromNumber(Math.floor(bigToNum(state.bits)))));
    }
  }

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
  // Dirty-checked: the tab bar is only rebuilt when the set of visible tabs or the active tab
  // changes. Without this it was recreated on every builder completion (i.e. ~every tick once
  // managers auto-fire), churning the DOM + listeners and breaking devtools inspection.
  let tabsSig = null;
  function renderTabs() {
    const visible = Object.keys(TAB_LABELS).filter((id) => tabVisible[id]());
    const sig = visible.join(',') + '|' + activeTab;
    if (sig === tabsSig) return;
    tabsSig = sig;
    tabsEl.innerHTML = visible
      .map((id) => '<button class="mg-s1-tab' + (id === activeTab ? ' mg-s1-tab-on' : '') + '" type="button" role="tab" data-tab="' + id + '">' + TAB_LABELS[id] + '</button>')
      .join('');
    tabsEl.querySelectorAll('.mg-s1-tab').forEach((b) => b.addEventListener('click', () => {
      activeTab = b.dataset.tab;
      renderTabs();
      renderPanel();
    }));
  }

  // ── Bits tab (shop + timed builders + stats) — owned by s1shop.js ──
  const shop = createShopController({
    panelsEl, state, cfg, tiers, save, bell,
    hooks: {
      onEarn: addBits,
      onAfterBuy: afterBuy,
      onBoss: () => ctx.onBoss && ctx.onBoss(),
      canFightBoss,
      isBeaten: () => beaten,
    },
  });
  const renderBitsPanel = () => shop.renderPanel();
  const paintShop = () => shop.paintShop();
  const paintTimed = () => shop.paintTimed();
  const paintStats = () => shop.paintStats();

  // After a buy: reveal newly-unlocked rows/tabs by repainting in place rather than rebuilding the
  // panel's innerHTML — keeps the Bits-tab scroll position put. (Full renderAll is only needed for
  // the one-time phase-1 → phase-2 transition.)
  function afterBuy() {
    if (!state.tabsUnlocked) { renderAll(); return; }
    renderTabs();
    if (activeTab === 'bits') { paintShop(); paintTimed(); paintStats(); }
    else renderPanel();
    updateHud();
  }

  // ── Achievements tab (rendered by s1achpanel.js — locked + unlocked, with multipliers) ──
  function renderAchievementsPanel() {
    renderS1AchPanel({ panelsEl, state });
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
    updateHud();
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
    if (soundOn && sfxOn()) clickTick();
    checkMessages('bit-earn', state, bs, bell);
    checkAchievements(state, cfg, bs);
    reveal();
    // A tap only changes the bit count — refresh affordability + the score HUD. Timed fill-bars and
    // stats don't change on a tap, so the 100ms tick keeps those current instead of repainting them
    // on every tap. Keeps fast tapping cheap (less layout/paint per click).
    if (state.tabsUnlocked && activeTab === 'bits') paintShop();
    checkTabUnlock();
    updateHud();
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
    // 1. Passive accrual (scaled by the post-prestige income multiplier: Cores yield × Flux × Resonance).
    const incMult = incomeMult(state, cfg);
    const passive = mulScalar(fromNumber(passiveRate(state, cfg) * incMult), 1 / 10);
    state.bits = add(state.bits, passive);
    state.totalBits = add(state.totalBits, passive);
    // 2. Manager cost drain (0 until WP-S1-10, but still call it).
    state.bits = sub(state.bits, mulScalar(fromNumber(managerCostPerSec(state, cfg)), 1 / 10));
    // 2b. Track net-negative streak for the ach-net-neg achievement.
    const rate = netRate(state, cfg);
    if (rate < 0) { if (!state._netNegSince) state._netNegSince = Date.now(); }
    else state._netNegSince = 0;
    // 3. Timed completions. Builder tiers assemble units of the tier below; others pay bits.
    let timedDone = false;
    let builtUnits = false;
    for (const t of timedTiers) {
      const ts = state.timedStates[t.id];
      if (!ts || !ts.active) continue;
      if (Date.now() - ts.startedAt >= (ts.duration_ms || t.duration_ms)) {
        if (t.produces) {
          const prod = timedProduction(state, cfg, t.id);
          if (prod && prod.amount > 0) {
            state.owned[prod.targetId] = (state.owned[prod.targetId] || 0) + prod.amount;
            builtUnits = true;
          }
        } else {
          const payout = mulScalar(timedPayout(state, cfg, t.id), incMult);
          state.bits = add(state.bits, payout);
          state.totalBits = add(state.totalBits, payout);
        }
        ts.active = false;
        timedDone = true;
      }
    }
    if (timedDone) checkMessages('bit-earn', state, bellLoad(), bell);
    // A built unit bumps owned counts (shop labels/payouts) and can unlock a tier row or tab.
    // The rows already exist in the DOM, so paintShop/paintTimed reveal them; renderTabs catches a
    // freshly-unlocked tab. No full panel rebuild → running timer bars don't flicker.
    if (builtUnits && state.tabsUnlocked) {
      renderTabs();
      if (activeTab === 'bits') { paintShop(); paintTimed(); }
    }
    // 3b. Manager auto-fire + shutdown rule (§5.6/§6.3).
    managersController.runAutoFire();
    // 3c. Post-prestige mechanics (pipeline/flux/entropy/echoes/resonance) — deterministic, tick-driven.
    const mech = tickMechanics(state, cfg);
    if (mech.producedUnits && state.tabsUnlocked) {
      renderTabs();
      if (activeTab === 'bits') { paintShop(); paintTimed(); }
    }
    // 3d. Auto-Tapper Cores upgrade: buy a Multiplier whenever affordable.
    if (coreAutoMult(state) && multTier) {
      const lvl = state.owned[multTier.id] || 0;
      const cost = totalCost(multTier, lvl, 1);
      if (gte(state.bits, cost)) {
        state.bits = sub(state.bits, cost);
        state.owned[multTier.id] = lvl + 1;
        state.totalBought = (state.totalBought || 0) + 1;
      }
    }
    // 4. Reveal (phase 1 only; reveal() no-ops when tabsUnlocked).
    reveal();
    // 4b. Tab unlock check (passive rate could push bits to 250 without a tap).
    checkTabUnlock();
    // 4c. Score HUD / helper unlock + live bit count (guarded, so a steady state writes nothing).
    updateHud();
    // 5. Partial re-render of the live tab (phase 2 only — tabs are hidden in phase 1).
    if (state.tabsUnlocked) {
      if (activeTab === 'bits') { paintShop(); paintTimed(); paintStats(); }
      else if (activeTab === 'managers') managersController.paint();
      else if (activeTab === 'reset') paintS1ResetPanel(panelsEl, state);
    }
    // A newly-unlocked achievement may reveal the Achievements tab — refresh the tab bar so it
    // appears immediately (returns true only on the rare unlock tick).
    if (checkAchievements(state, cfg, bellLoad()) && state.tabsUnlocked) renderTabs();
    // 6. Periodic save.
    if (++tickAcc >= 10) { tickAcc = 0; save(state); }
  }
  renderStage1._tickId = setInterval(tick, 100);

  renderAll();
  attachChrome(host);

  // Expose the help toggle so the orchestrator can wire it to the header help button.
  return { toggleHelp };
}

export const STAGE1 = { GRID_CELLS, GRID_COLS, GRID_ROWS };
