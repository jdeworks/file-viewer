// Stage 1 — Bit Foundry. The bespoke "pixel reveal" onboarding mechanic sits on top; below it a
// full tabbed idle-clicker (shop, timed builders, achievements, managers, prestige). The commentary
// BELL (top-right) narrates every stage. This file is the orchestrator: it wires the reveal, tabs,
// economy controllers, and the tick loop together. The heavy sub-systems live in siblings:
//   s1layout.js  — static markup + grid constants + the Defrag-Echo glyph stylesheet
//   s1hud.js     — score / Gravitational-Pull chip + the help panel
//   s1reveal.js  — the phase-1 pixel-reveal grid
//   s1tick.js    — the 100 ms game tick (accrual, builders, managers, mechanics, save)
//
// Reveal: tapping the top area adds bits (×clickPower); current bits fill a 100-square grid toward
// the current Multiplier price. When full the button is interactive; buying Multiplier restarts the
// reveal. The tabs below host the real BigNum economy (shop / timed / stats / achievements / reset).

import { clickTick } from './sounds.js';
import { createShopController } from './s1shop.js';
import { clickPower as economyClickPower, totalCost } from './s1economy.js';
import { fromNumber, add, sub, gte } from './bignum.js';
import { bellLoad, checkMessages } from './s1bell.js';
import { checkAchievements, checkMilestones } from './s1achievements.js';
import { createManagersController } from './s1managers.js';
import { renderResetPanel as renderS1ResetPanel } from './s1reset.js';
import { renderAchievementsPanel as renderS1AchPanel } from './s1achpanel.js';
import { echoActive, echoTimeLeft, clickEcho } from './s1echoes.js';
import { installStage1Debug } from './s1debug.js';
import { setHidden, bigToNum } from './s1dom.js';
import { GRID_CELLS, GRID_COLS, GRID_ROWS, stage1Markup, injectEchoStyle } from './s1layout.js';
import { createHud } from './s1hud.js';
import { createReveal } from './s1reveal.js';
import { createTickLoop } from './s1tick.js';

export function renderStage1(ctx) {
  const { host, state, save, stage, onExit, attachChrome, bell } = ctx;
  void onExit;
  const sfxOn = () => (typeof ctx.sfxEnabled === 'function' ? ctx.sfxEnabled() : true);
  const cfg = stage();   // Stage 1 config from stages.js

  // ── State normalization on mount (legacy plain numbers → BigNum) ──
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

  // Prestige unlocks once total bits ever earned reaches "ab" (10^18).
  const RESET_THRESHOLD = { m: 1, e: 18 };   // "1.00ab"
  const tabVisible = {
    bits: () => true,
    managers: () => (state.owned['s1-box'] || 0) >= 1,
    achievements: () => (state.achievements || []).length >= 1,
    reset: () => gte(state.totalBits, RESET_THRESHOLD) || (state.prestigeCount || 0) >= 1,
  };
  const TAB_STEPS = {
    bits: { number: 1, label: '🧮 Bits' },
    managers: { number: 2, label: '🛠 Managers' },
    achievements: { number: 3, label: '🏆 Achievements' },
    reset: { number: 4, label: '🌀 Prestige' },
  };

  host.innerHTML = stage1Markup(multTier);

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
  const echoEl = $('.mg-s1-echo');

  // ── Defrag Echo glyph (prestige mechanic #4) — clickable attention target ──
  injectEchoStyle();
  function updateEcho() {
    if (!echoEl) return;
    const active = echoActive(state);
    setHidden(echoEl, !active);
    if (active) {
      const tEl = echoEl.querySelector('.mg-s1-echo-t');
      if (tEl) tEl.textContent = (echoTimeLeft(state) / 10).toFixed(0) + 's';
    }
  }
  if (echoEl) echoEl.addEventListener('click', (e) => {
    e.stopPropagation();
    if (clickEcho(state, cfg)) { save(state); updateEcho(); updateHud(); }
  });

  // ── Score HUD + help panel (s1hud.js) ──
  const { updateHud, toggleHelp } = createHud({ hudEl, scoreValEl, gravEl, helpEl, state });

  // ── Pixel-reveal grid (s1reveal.js) ──
  const { reveal } = createReveal({ host, grid, computeBtn, state, multTier });

  // ── Tab framework (dirty-checked: rebuilt only when the visible set / active tab changes) ──
  let tabsSig = null;
  function renderTabs() {
    const visible = Object.keys(TAB_STEPS).filter((id) => tabVisible[id]());
    const sig = visible.join(',') + '|' + activeTab;
    if (sig === tabsSig) return;
    tabsSig = sig;
    tabsEl.innerHTML = visible
      .map((id) => {
        const step = TAB_STEPS[id];
        const current = id === activeTab;
        return '<button class="mg-s1-tab' + (current ? ' mg-s1-tab-on' : '')
          + '" type="button" role="tab" data-tab="' + id + '" data-step="' + step.number
          + '" aria-selected="' + current + '"' + (current ? ' aria-current="step"' : '') + '>'
          + '<span class="mg-s1-step">Step ' + step.number + '</span><span>' + step.label + '</span></button>';
      })
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

  // After a buy: reveal newly-unlocked rows/tabs by repainting in place (keeps Bits-tab scroll put).
  function afterBuy() {
    if (!state.tabsUnlocked) { renderAll(); return; }
    renderTabs();
    if (activeTab === 'bits') { paintShop(); paintTimed(); paintStats(); }
    else renderPanel();
    updateHud();
  }

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
    const wrapper = host.querySelector('.mg-wrap.mg-s1');
    if (wrapper) {
      wrapper.classList.toggle('mg-s1-phase1', !state.tabsUnlocked);
      wrapper.classList.toggle('mg-s1-empty', !state.tabsUnlocked && bigToNum(state.bits) <= 0 && bigToNum(state.totalBits) <= 0);
    }
    renderTabs();
    renderPanel();
    updateHud();
    updateEcho();
    if (!state.tabsUnlocked) reveal();
  }

  // ── Tab unlock: fires once when current bits reaches 150. Toggles phase → tab layout appears. ──
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
    // A tap only changes the bit count — refresh affordability + the score HUD.
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

  // ── Tap area: full-screen click handler. Revealed button = purchase; anywhere else = addBits. ──
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
  computeBtn.addEventListener('click', (e) => { e.stopPropagation(); doPurchase(); });

  // ── Game tick loop (§5.5) — single 100ms interval; cleared on re-render. ──
  if (renderStage1._tickId) { clearInterval(renderStage1._tickId); renderStage1._tickId = null; }
  const { tick } = createTickLoop({
    host, grid, state, cfg, bell, save, timedTiers, multTier, panelsEl,
    managersController, getActiveTab: () => activeTab,
    reveal, checkTabUnlock, updateHud, updateEcho, renderTabs,
    paintShop, paintTimed, paintStats,
    onTeardown: () => {
      clearInterval(renderStage1._tickId); renderStage1._tickId = null;
      if (renderStage1._debug) { renderStage1._debug.destroy(); renderStage1._debug = null; }
    },
  });
  renderStage1._tickId = setInterval(tick, 100);

  renderAll();
  attachChrome(host);

  // TEST/DEBUG hook (window.__fvStage1) — drives the headless smoke without real-time waiting.
  if (renderStage1._debug && typeof renderStage1._debug.destroy === 'function') renderStage1._debug.destroy();
  renderStage1._debug = installStage1Debug({
    state, cfg, save, renderAll, tick, addBits,
    canFightBoss, allSubStagesOwned,
    onStageComplete: ctx.onStageComplete, updateEcho,
  });

  // Expose the help toggle and renderAll so the orchestrator can wire them up.
  // renderAll is used by the dev-menu dev(id) path to repaint after a cheat.
  return { toggleHelp, renderAll };
}

export const STAGE1 = { GRID_CELLS, GRID_COLS, GRID_ROWS };
