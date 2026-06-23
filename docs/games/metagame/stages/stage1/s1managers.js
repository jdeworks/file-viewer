// s1managers.js — Stage 1 Managers tab and manager auto-fire loop.

import { netRate, managerRunCost, managerRunCostAtLevel,
  managerTotalCost, managerMaxLevels, autoInterval } from './s1economy.js';
import { fromNumber, sub, gte, toDisplay } from './bignum.js';
import { bellLoad, checkMessages, escapeHtml } from './s1bell.js';
import { checkAchievements } from './s1achievements.js';
import { setHtml, bindActivate } from './s1dom.js';

const MGR_COUNTS = [1, 10, 100, 'max'];

export function createManagersController({ panelsEl, state, cfg, tiers, save, paintStats }) {
  const managers = cfg.managers || [];
  const managedTier = (mgr) => tiers.find((t) => t.id === mgr.manages);
  const mgrCountFor = () => state.mgrBuyMult ?? 1;
  const affordableLevels = (mgr) => managerMaxLevels(state.bits, mgr, mgrState(mgr.id).level, cfg);
  // Levels a click would buy/display: the selected count, or (for "max") the affordable amount.
  function displayLevels(mgr) {
    const sel = mgrCountFor();
    return sel === 'max' ? Math.max(1, affordableLevels(mgr)) : sel;
  }
  // Inner HTML of a hire/level button: "Hire/Level up [×N] — <total cost>" + the resulting ongoing/s.
  function actionBtnHtml(mgr) {
    const lvl = mgrState(mgr.id).level;
    const n = displayLevels(mgr);
    const cost = managerTotalCost(mgr, lvl, n, cfg);
    const ongoing = managerRunCostAtLevel(mgr, lvl + n, cfg);
    return (lvl === 0 ? 'Hire' : 'Level up') + (n > 1 ? ' ×' + n : '') + ' — ' + toDisplay(cost)
      + '<small class="mg-mgr-ongoing">ongoing ' + toDisplay(fromNumber(ongoing)) + '/s</small>';
  }

  // How many levels a Fire click sheds, given the selected buy count ("max" = all). Shown in the
  // button label so the action matches the ×1/×10/×100/MAX selector the player picked.
  function fireLevels(level) {
    const sel = mgrCountFor();
    return sel === 'max' ? level : Math.min(level, sel);
  }
  function fireBtnLabel(level) {
    const sel = mgrCountFor();
    if (sel === 'max') return 'Fire all';
    const n = Math.min(level, sel);
    return n > 1 ? 'Fire ×' + n : 'Fire';
  }

  function mgrState(id) {
    state.managers = state.managers || {};
    return (state.managers[id] = state.managers[id] || { level: 0, paused: false, lastFire: 0 });
  }

  function mgrCardHtml(mgr) {
    const ms = mgrState(mgr.id);
    const mt = managedTier(mgr);
    const mtName = mt ? (mt.icon + ' ' + mt.name) : mgr.manages;
    // Button shows BOTH the one-off hire price and the ongoing/sec it will cost once active, so the
    // running cost is never increased without being shown up front (`ongoing` = cost at next level).
    if (ms.level === 0) {
      return '<div class="mg-mgr-card mg-mgr-unhired" data-id="' + mgr.id + '">'
        + '<span class="mg-mgr-head"><span class="mg-mgr-icon">' + escapeHtml(mgr.icon) + '</span>'
        + '<span class="mg-mgr-name">' + escapeHtml(mgr.name) + '</span></span>'
        + '<span class="mg-mgr-manages">Manages: ' + escapeHtml(mtName) + '</span>'
        + '<button class="mg-mgr-hire" type="button" data-id="' + mgr.id + '" data-act="hire">' + actionBtnHtml(mgr) + '</button>'
        + '</div>';
    }
    const runCost = managerRunCost(mgr.id, state, cfg);
    return '<div class="mg-mgr-card mg-mgr-hired" data-id="' + mgr.id + '">'
      + '<span class="mg-mgr-head"><span class="mg-mgr-icon">' + escapeHtml(mgr.icon) + '</span>'
      + '<span class="mg-mgr-name">' + escapeHtml(mgr.name) + '</span>'
      + '<span class="mg-mgr-level">Level ' + ms.level + '</span></span>'
      + '<span class="mg-mgr-manages">Manages: ' + escapeHtml(mtName) + '</span>'
      + '<span class="mg-mgr-run">Running cost: <strong class="mg-mgr-runcost">' + toDisplay(fromNumber(runCost)) + '</strong>/s</span>'
      + (ms.paused ? '<span class="mg-mgr-paused">⏸ Paused (out of bits)</span>' : '')
      + '<span class="mg-mgr-actions">'
      + '<button class="mg-mgr-lvl" type="button" data-id="' + mgr.id + '" data-act="lvl">' + actionBtnHtml(mgr) + '</button>'
      + '<button class="mg-mgr-fire" type="button" data-id="' + mgr.id + '" data-act="fire">' + fireBtnLabel(ms.level) + '</button>'
      + '</span>'
      + '</div>';
  }

  function previewNetNeg(mgr) {
    const ms = mgrState(mgr.id);
    const saved = ms.level;
    ms.level = saved + 1;
    const r = netRate(state, cfg);
    ms.level = saved;
    return r < 0;
  }

  function renderPanel() {
    // Preserve the panel's scroll position across the full rebuild (hiring/leveling a manager calls
    // this) so the view doesn't jump back to the top.
    const prevScroll = panelsEl.querySelector('.mg-s1-panel')?.scrollTop || 0;
    const visible = managers.filter((mgr) => {
      const mt = managedTier(mgr);
      return mt && (state.owned[mt.id] || 0) >= 1;
    });
    const rate = netRate(state, cfg);
    const head = '<div class="mg-mgr-net' + (rate < 0 ? ' mg-s1-neg' : '') + '">Net rate: <strong>'
      + (rate < 0 ? '-' : '') + toDisplay(fromNumber(Math.abs(rate))) + '/s</strong></div>';
    const counts = MGR_COUNTS.map((n) =>
      '<button class="mg-mult-b mg-mgr-buyn" type="button" data-n="' + n + '">' + (n === 'max' ? 'MAX' : '×' + n) + '</button>').join('');
    const selector = visible.length
      ? '<div class="mg-mgr-buyrow"><span class="mg-mgr-buylabel">Buy</span><span class="mg-s1-counts">' + counts + '</span></div>'
      : '';
    const body = visible.length
      ? '<div class="mg-mgr-list">' + visible.map(mgrCardHtml).join('') + '</div>'
      : '<div class="mg-managers-stub">no managers available yet</div>';
    panelsEl.innerHTML = '<div class="mg-s1-panel" data-panel="managers">' + head + selector + body + '</div>';
    const newPanel = panelsEl.querySelector('.mg-s1-panel');
    if (newPanel && prevScroll) newPanel.scrollTop = prevScroll;

    // Buy-count selector active state is VISUAL (mg-mult-on); the clicks themselves are delegated.
    panelsEl.querySelectorAll('.mg-mgr-buyn').forEach((b) => {
      const v = b.dataset.n === 'max' ? 'max' : Number(b.dataset.n);
      b.classList.toggle('mg-mult-on', String(v) === String(mgrCountFor()));
    });
    paint();
  }

  // Event delegation on the stable panelsEl — survives every renderPanel() rebuild (which fires on
  // hire/level/fire AND whenever a manager auto-pauses/unpauses), so a click is never lost to a
  // mid-rebuild window. Routes buy-count selectors and the per-card hire/level/fire actions.
  // Activate on pointerdown (mouse/touchpad) OR click (touch/keyboard) — see bindActivate in s1dom.js.
  bindActivate(panelsEl, (target) => {
    // Shared panelsEl with the shop controller — only handle activations inside the managers panel.
    if (!target.closest('[data-panel="managers"]')) return null;
    const buyn = target.closest('.mg-mgr-buyn');
    if (buyn) { state.mgrBuyMult = buyn.dataset.n === 'max' ? 'max' : Number(buyn.dataset.n); save(state); renderPanel(); return buyn; }
    const act = target.closest('.mg-mgr-card [data-act]');
    if (act) { const mgr = managers.find((m) => m.id === act.dataset.id); if (mgr) mgrAction(mgr, act.dataset.act); return act; }
    return null;
  });
  // Net-negative preview when hovering/focusing a Level-up button (mouseover/focusin bubble, so they
  // delegate cleanly where mouseenter/focus would not).
  const netPreview = (on, target) => {
    const lvlBtn = target.closest && target.closest('.mg-mgr-lvl');
    if (!lvlBtn) return;
    const mgr = managers.find((m) => m.id === lvlBtn.dataset.id);
    const net = panelsEl.querySelector('.mg-mgr-net');
    if (!net) return;
    net.classList.toggle('mg-net-neg-preview', Boolean(on && mgr && previewNetNeg(mgr)));
  };
  panelsEl.addEventListener('mouseover', (e) => netPreview(true, e.target));
  panelsEl.addEventListener('mouseout', (e) => netPreview(false, e.target));
  panelsEl.addEventListener('focusin', (e) => netPreview(true, e.target));
  panelsEl.addEventListener('focusout', (e) => netPreview(false, e.target));

  function paint() {
    // Net rate is CURRENT state, recomputed every tick: as the builder chain assembles more Bit
    // Boxes, timedPayout(box)/interval rises, so this climbs over time. Update the number live
    // (renderPanel only sets it once) — guarded so a steady value writes nothing.
    const rate = netRate(state, cfg);
    const rateNeg = rate < 0;
    const net = panelsEl.querySelector('.mg-mgr-net');
    if (net) {
      net.classList.toggle('mg-s1-neg', rateNeg);
      const strong = net.querySelector('strong');
      if (strong) {
        const v = (rateNeg ? '-' : '') + toDisplay(fromNumber(Math.abs(rate))) + '/s';
        if (strong.textContent !== v) strong.textContent = v;
      }
    }
    managers.forEach((mgr) => {
      const ms = mgrState(mgr.id);
      const card = panelsEl.querySelector('.mg-mgr-card[data-id="' + mgr.id + '"]');
      if (!card) return;
      // Toggle the "⏸ Paused" indicator IN PLACE. Previously a paused-state flip triggered a full
      // renderPanel() (innerHTML swap) from the 100ms tick — if that landed while a button was being
      // pressed it detached the button, so the pointerup/click never fired (stuck "held" button +
      // lost tap). Adding/removing just the one span leaves every button element untouched.
      const indicator = card.querySelector('.mg-mgr-paused');
      const wantIndicator = ms.level >= 1 && ms.paused;
      if (wantIndicator && !indicator) {
        const span = document.createElement('span');
        span.className = 'mg-mgr-paused';
        span.textContent = '⏸ Paused (out of bits)';
        const actions = card.querySelector('.mg-mgr-actions');
        if (actions) card.insertBefore(span, actions); else card.appendChild(span);
      } else if (!wantIndicator && indicator) {
        indicator.remove();
      }
      const btn = card.querySelector(ms.level === 0 ? '.mg-mgr-hire' : '.mg-mgr-lvl');
      if (btn) {
        setHtml(btn, actionBtnHtml(mgr));   // refresh cost/count/ongoing live (esp. for "max")
        const n = displayLevels(mgr);
        const can = n >= 1 && gte(state.bits, managerTotalCost(mgr, ms.level, n, cfg));
        // Visual-only lock (no native `disabled` — toggling it every tick swallows mid-press clicks).
        btn.classList.toggle('mg-buy-locked', !can);
      }
      const runEl = card.querySelector('.mg-mgr-runcost');
      if (runEl) {
        const v = toDisplay(fromNumber(managerRunCost(mgr.id, state, cfg)));
        if (runEl.textContent !== v) runEl.textContent = v;
        runEl.classList.toggle('mg-mgr-runcost-neg', rateNeg);
      }
    });
  }

  function mgrAction(mgr, act) {
    const ms = mgrState(mgr.id);
    if (act === 'fire') {
      const dec = fireLevels(ms.level);
      ms.level = Math.max(0, ms.level - dec);
      if (ms.level === 0) { ms.paused = false; ms.lastFire = 0; }
      save(state);
      renderPanel();
      paintStats();
      return;
    }
    const n = displayLevels(mgr);
    const cost = managerTotalCost(mgr, ms.level, n, cfg);
    if (n < 1 || !gte(state.bits, cost)) return;
    state.bits = sub(state.bits, cost);
    ms.level += n;
    save(state);
    checkMessages('buy', state, bellLoad());
    checkAchievements(state, cfg, bellLoad());
    renderPanel();
    paintStats();
  }

  function runAutoFire() {
    const now = Date.now();
    const broke = state.bits.m === 0;
    const rate = netRate(state, cfg);
    if (rate < 0 && broke) {
      for (const mgr of managers) { const ms = mgrState(mgr.id); if (ms.level >= 1) ms.paused = true; }
    } else if (!broke) {
      for (const mgr of managers) { const ms = mgrState(mgr.id); if (ms.level >= 1 && ms.paused) ms.paused = false; }
    }
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

  return { renderPanel, paint, runAutoFire };
}
