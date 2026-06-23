// s1shop.js — Stage 1 "Bits" tab: shop rows, timed builders, live stats + boss button.
// Split out of stage1.js (LOC cap). A controller in the same shape as s1managers.js: build the
// panel once (renderPanel), then dirty-checked paints drive the 100ms tick without churning DOM.
//
// Layout: each TIMED tier's row IS its run button — clicking the row starts a cycle whose progress
// fills the row background; the row shows "▸ +<reward>" idle and "<reward> · <time left>" while
// running. Buy controls live inside the row and stopPropagation so they don't also start a cycle.
// "Compute bits" is frozen above a scroll region so the tab can't sprawl as tiers unlock.
//
// hooks: { onEarn, onAfterBuy, onBoss, canFightBoss, isBeaten } — wiring back to the orchestrator.

import {
  netRate, timedPayout, timedProduction, totalCost, maxAffordable, buyTier, quantumPct, autoInterval,
  globalPull, achievMult,
} from './s1economy.js';
import { fromNumber, gte, toDisplay, toNumber } from './bignum.js';
import { bellLoad, checkMessages, escapeHtml } from './s1bell.js';
import { checkAchievements } from './s1achievements.js';
import { setText, setHidden, setHtml, setClass, bigToNum, bindActivate, bindHoldRepeat } from './s1dom.js';

// Buy-count selector options for the shop.
const BUY_COUNTS = [1, 10, 100, 'max'];

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

export function createShopController({ panelsEl, state, cfg, tiers, save, bell, hooks = {} }) {
  const timedTiers = tiers.filter((t) => t.type === 'timed');

  // Selected buy count per tier — persisted as a single global state.buyMult.
  const buyCounts = {};
  tiers.forEach((t) => { buyCounts[t.id] = state.buyMult ?? 1; });
  const countFor = (id) => buyCounts[id] ?? 1;

  function effectiveN(t) {
    const sel = countFor(t.id);
    if (sel === 'max') return maxAffordable(state.bits, t, state.owned[t.id] || 0);
    return sel;
  }

  // Compact number display ("6", "1.23k", "4.00b"…) — used for counts that can grow large.
  const fmtN = (n) => toDisplay(fromNumber(n));

  // Reward one cycle pays: builders show the units they assemble; the rest, bits. Updates as the
  // owned count of the machine (or its boosters) changes — recomputed on every paint.
  function rewardLabel(t) {
    if (t.produces) {
      const prod = timedProduction(state, cfg, t.id);
      const target = tiers.find((x) => x.id === t.produces.targetId);
      const tName = target ? (target.icon + ' ' + target.name) : t.produces.targetId;
      return '+' + fmtN(prod ? prod.amount : (t.produces.perOwned || 1)) + ' ' + tName;
    }
    return '+' + toDisplay(timedPayout(state, cfg, t.id)) + ' bits';
  }

  // Steady output per second — shown when a manager has sped the cycle below the bar's useful range.
  function rateLabel(t, durMs) {
    const perSec = 1000 / durMs;
    const fmt = (n) => (n >= 100 ? toDisplay(fromNumber(n)) : String(Math.round(n * 10) / 10));
    if (t.produces) {
      const prod = timedProduction(state, cfg, t.id);
      const target = tiers.find((x) => x.id === t.produces.targetId);
      const tName = target ? (target.icon + ' ' + target.name) : t.produces.targetId;
      const per = (prod ? prod.amount : (t.produces.perOwned || 1)) * perSec;
      return '+' + fmt(per) + ' ' + tName + '/s';
    }
    return '+' + toDisplay(fromNumber(toNumber(timedPayout(state, cfg, t.id)) * perSec)) + ' bits/s';
  }

  // Live, effect-revealing blurb for the tiers whose benefit is otherwise invisible (Neural global
  // multiplier, Quantum tap %). Shows the CURRENT effect so buying one visibly moves a number.
  function blurbFor(t) {
    const owned = state.owned || {};
    switch (t.id) {
      case 's1-mult': {
        // Show the RESULTING per-tap bits (multiplier × gravity × achievements), not the raw base, so
        // a prestige visibly bumps it — just the final number, no breakdown.
        const tap = (1 + (owned['s1-mult'] || 0)) * globalPull(state) * achievMult(state);
        return '+' + fmtN(tap) + ' bits / tap';
      }
      case 's1-neural':
        return '×' + (1 + 0.25 * (owned['s1-neural'] || 0)).toFixed(2) + ' to all timers';
      case 's1-quantum': {
        const lvl = owned['s1-quantum'] || 0;
        const pct = quantumPct(lvl > 0 ? lvl : 1);   // preview lvl 1 when not yet owned
        return '+' + Math.round(pct * 100) + '% Bit Box/s per tap';
      }
      default:
        return t.desc || t.name;
    }
  }

  function shopRowHtml(t) {
    const owned = state.owned[t.id] || 0;
    const visible = (TIER_VISIBLE[t.id] || (() => true))(state);
    const desc = blurbFor(t);
    const timed = t.type === 'timed';
    const counts = BUY_COUNTS.map((n) =>
      '<button class="mg-mult-b mg-s1-buyn" type="button" data-id="' + t.id + '" data-n="' + n + '">'
      + (n === 'max' ? 'MAX' : '×' + n) + '</button>').join('');
    return '<div class="mg-buy mg-s1-shoprow' + (timed ? ' mg-s1-timedrow' : '') + '" data-id="' + t.id + '"'
      + (visible ? '' : ' hidden') + '>'
      + (timed ? '<div class="mg-s1-rowfill" aria-hidden="true"></div>' : '')
      + '<span class="mg-buy-name">' + escapeHtml(t.icon + ' ' + t.name) + ' <span class="mg-owned">×' + fmtN(owned) + '</span></span>'
      // Reward on its OWN line (timed rows) so the row is always 3 lines — its length changing while
      // running (e.g. "+780 bits · 2.1s") never adds a line and shifts the layout. Split into a
      // static amount part and a ticking time part so the 100ms countdown only rewrites the small
      // time node (not the whole "+780 bits · …" string) every tick.
      + (timed ? '<span class="mg-s1-rowreward"><span class="mg-s1-rr-amt"></span><span class="mg-s1-rr-time"></span></span>' : '')
      + '<span class="mg-buy-blurb">' + escapeHtml(desc) + '</span>'
      + '<span class="mg-s1-buyrow"><span class="mg-s1-counts">' + counts + '</span>'
      + '<button class="mg-buy-cost mg-s1-buybtn" type="button" data-id="' + t.id + '"></button></span>'
      + '</div>';
  }

  function renderPanel() {
    panelsEl.innerHTML =
      '<div class="mg-s1-panel" data-panel="bits">'
      + '<button class="mg-compute mg-s1-earn" type="button">Compute bits</button>'
      + '<div class="mg-shop">' + tiers.map(shopRowHtml).join('') + '</div>'
      + '<div class="mg-s1-stats" hidden></div>'
      + '<button class="mg-faceboss mg-s1-boss" type="button" hidden>⚔ Confront ' + (cfg.bossName || 'the boss')
      + (cfg.bossTicket ? ' — ' + toDisplay(cfg.bossTicket) : '') + '</button>'
      + '</div>';

    paintShop();
    paintTimed();
    paintStats();
  }

  // Event delegation: ONE click listener on the stable panelsEl routes every shop interaction.
  // renderPanel() rebuilds panelsEl's children and the 100ms tick repaints them, but the listener
  // lives on the parent — so a rebuild can never drop listeners or open a window where a tap lands
  // on a half-rebuilt control (the cause of "buy doesn't register until later"). Routing order puts
  // the inner buy controls before the timed-row, so a tap on a control never also starts a cycle.
  // Activate on pointerdown (mouse/touchpad) OR click (touch/keyboard) — a fast touchpad tap can
  // drop the pointerup/click, so the press is the reliable signal. See bindActivate in s1dom.js.
  bindActivate(panelsEl, (target) => {
    // Both the shop and managers controllers listen on the SAME panelsEl. Ignore activations that
    // landed in another tab's panel so each controller only acts on its own controls.
    if (!target.closest('[data-panel="bits"]')) return null;
    const buyn = target.closest('.mg-s1-buyn');
    if (buyn) {
      const n = buyn.dataset.n === 'max' ? 'max' : Number(buyn.dataset.n);
      buyCounts[buyn.dataset.id] = n;
      state.buyMult = n;   // persist globally so it survives reload
      save(state);
      paintShop();
      return buyn;
    }
    const buy = target.closest('.mg-s1-buybtn');
    if (buy) { doBuy(buy.dataset.id); return buy; }
    const boss = target.closest('.mg-s1-boss');
    if (boss) { hooks.onBoss && hooks.onBoss(); return boss; }
    const earn = target.closest('.mg-s1-earn');
    if (earn) { hooks.onEarn && hooks.onEarn(); return earn; }
    const row = target.closest('.mg-s1-timedrow');
    if (row) { startTimed(row.dataset.id); return row; }
    return null;
  });

  // Press-and-hold "Compute bits" to auto-fire every 250ms — so the user holds instead of rapid-
  // tapping (which trips the touchpad drag-lock). bindActivate fires the first earn on press; this
  // adds the repeat while held (and toggles .mg-s1-holding so CSS can show the hold affordance).
  bindHoldRepeat(panelsEl, '.mg-s1-earn', () => hooks.onEarn && hooks.onEarn(), 250);

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
      if (hooks.onAfterBuy) hooks.onAfterBuy();
    }
  }

  function startTimed(id) {
    const t = timedTiers.find((x) => x.id === id);
    if (!t || (state.owned[id] || 0) < 1) return;
    const ts = state.timedStates[id];
    if (ts && ts.active) {
      // Already running — flash the row.
      const row = panelsEl.querySelector('.mg-s1-shoprow[data-id="' + id + '"]');
      if (row) { row.classList.remove('mg-s1-flash'); void row.offsetWidth; row.classList.add('mg-s1-flash'); }
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
      setHidden(row, !visible);
      if (!visible) return;
      const owned = state.owned[t.id] || 0;
      setText(row.querySelector('.mg-owned'), '×' + fmtN(owned));
      // Effect-revealing blurb updates live (Neural Net ×1.00→×1.25, etc.) so a purchase shows.
      setText(row.querySelector('.mg-buy-blurb'), blurbFor(t));
      // Highlight the active count selector (guarded so a steady tick writes nothing).
      const sel = countFor(t.id);
      row.querySelectorAll('.mg-s1-buyn').forEach((b) => {
        const v = b.dataset.n === 'max' ? 'max' : Number(b.dataset.n);
        setClass(b, 'mg-mult-on', String(v) === String(sel));
      });
      const buyBtn = row.querySelector('.mg-s1-buybtn');
      // Capped tier sitting at its ceiling (Quantum Tap maxLevel) — show MAX LEVEL, nothing to buy.
      if (t.maxLevel != null && owned >= t.maxLevel) {
        setText(buyBtn, 'MAX LEVEL');
        setClass(buyBtn, 'mg-buy-locked', true);
        return;
      }
      // For MAX, show the price of 1 when you can't afford even one (so the cost is always visible).
      const maxN = sel === 'max' ? maxAffordable(state.bits, t, owned) : null;
      const displayN = sel === 'max' ? Math.max(1, maxN) : sel;
      const cost = totalCost(t, owned, displayN);
      const label = sel === 'max' ? 'MAX' : '×' + displayN;
      setText(buyBtn, 'Buy ' + label + ' — ' + toDisplay(cost));
      // Locked state is VISUAL only (.mg-buy-locked). Don't toggle the native `disabled` attribute:
      // the 100ms tick repaints this, and a button that flips disabled mid-press swallows the click.
      // An unaffordable tap is a harmless no-op anyway — doBuy/buyTier guard the actual purchase.
      const affordable = sel === 'max' ? (maxN >= 1) : gte(state.bits, cost);
      setClass(buyBtn, 'mg-buy-locked', !affordable);
    });
  }

  // Interval (ms) a hired, non-paused manager auto-fires this tier at, or null if none. A row driven
  // faster than the eye is shown as a STABLE "always full" bar instead of flickering its progress
  // through the real (micro-second) active/inactive cycle.
  function autoFireMs(t) {
    const mgr = (cfg.managers || []).find((m) => m.manages === t.id);
    const ms = mgr ? (state.managers || {})[mgr.id] : null;
    if (!ms || ms.level <= 0 || ms.paused) return null;
    return autoInterval(t.duration_ms, ms.level);
  }

  // Paints the timed-row state. EVERY write is guarded (React-style: only touch the DOM when a value
  // actually changes) so a steady row — especially a manager-driven "always full" one — costs zero
  // DOM ops per 100ms tick. Helpers below short-circuit when the target already holds the value.
  function paintTimed() {
    timedTiers.forEach((t) => {
      const row = panelsEl.querySelector('.mg-s1-shoprow[data-id="' + t.id + '"]');
      if (!row) return;
      const fill = row.querySelector('.mg-s1-rowfill');
      const amtEl = row.querySelector('.mg-s1-rr-amt');
      const timeEl = row.querySelector('.mg-s1-rr-time');
      if (!fill || !amtEl || !timeEl) return;
      const owned = state.owned[t.id] || 0;
      setClass(row, 'mg-s1-runnable', owned >= 1);
      // Fill via transform: scaleX (compositor-only) instead of width (which relayouts every frame).
      const setFill = (frac) => { const v = 'scaleX(' + frac + ')'; if (fill.style.transform !== v) fill.style.transform = v; };
      const setFast = (on) => setClass(fill, 'mg-s1-rowfill-fast', on);
      if (owned < 1) { setFast(false); setFill(0); setText(amtEl, ''); setText(timeEl, ''); return; }

      // Manager-driven faster than ~2 cycles/sec → one stable "always full" bar; the underlying
      // active/inactive flips are invisible, so don't re-render them (this was the per-tick churn).
      const auto = autoFireMs(t);
      if (auto != null && auto < 500) {
        setFast(true); setFill(1); setText(amtEl, rateLabel(t, auto)); setText(timeEl, '');
        return;
      }
      setFast(false);

      const ts = state.timedStates[t.id];
      if (ts && ts.active) {
        const elapsed = Date.now() - ts.startedAt;
        const dur = ts.duration_ms || t.duration_ms;
        setFill(Math.max(0, Math.min(1, elapsed / dur)));
        // Static amount stays put; only the small ·Xs node rewrites as the countdown ticks.
        setText(amtEl, rewardLabel(t) + ' · ');
        setText(timeEl, Math.max(0, (dur - elapsed) / 1000).toFixed(1) + 's');
      } else {
        setFill(0);
        setText(amtEl, '▸ ' + rewardLabel(t));
        setText(timeEl, '');
      }
    });
  }

  function paintStats() {
    const statsEl = panelsEl.querySelector('.mg-s1-stats');
    // Only compute the (expensive) net rate + rebuild the stats string when the panel is actually
    // shown — it's hidden by default, so this skips netRate() work every tick.
    if (statsEl && !statsEl.hidden) {
      const rate = netRate(state, cfg);
      // Floor bits for display so fractional passive accumulation doesn't show (e.g. "3.5" → "3").
      const bitsDisplay = toDisplay(fromNumber(Math.floor(bigToNum(state.bits))));
      setHtml(statsEl,
        '<span class="mg-s1-stat">Bits: <strong>' + bitsDisplay + '</strong></span>'
        + '<span class="mg-s1-stat">Total: <strong>' + toDisplay(state.totalBits) + '</strong></span>'
        + '<span class="mg-s1-stat' + (rate < 0 ? ' mg-s1-neg' : '') + '">Rate: <strong>'
        + (rate < 0 ? '-' : '') + toDisplay(fromNumber(Math.abs(rate))) + '/s</strong></span>');
    }
    // Boss button: only when not yet beaten and the boss ticket is affordable.
    const bossBtn = panelsEl.querySelector('.mg-s1-boss');
    if (bossBtn) setHidden(bossBtn, (hooks.isBeaten && hooks.isBeaten()) || !(hooks.canFightBoss && hooks.canFightBoss()));
  }

  return { renderPanel, paintShop, paintTimed, paintStats };
}
