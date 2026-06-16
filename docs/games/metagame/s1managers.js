// s1managers.js — Stage 1 Managers tab and manager auto-fire loop.

import { netRate, managerHireCost, managerRunCost, autoInterval } from './s1economy.js';
import { fromNumber, sub, gte, toDisplay } from './bignum.js';
import { bellLoad, checkMessages, escapeHtml } from './s1bell.js';
import { checkAchievements } from './s1achievements.js';

export function createManagersController({ panelsEl, state, cfg, tiers, save, paintStats }) {
  const managers = cfg.managers || [];
  const managedTier = (mgr) => tiers.find((t) => t.id === mgr.manages);

  function mgrState(id) {
    state.managers = state.managers || {};
    return (state.managers[id] = state.managers[id] || { level: 0, paused: false, lastFire: 0 });
  }

  function mgrCardHtml(mgr) {
    const ms = mgrState(mgr.id);
    const mt = managedTier(mgr);
    const mtName = mt ? (mt.icon + ' ' + mt.name) : mgr.manages;
    if (ms.level === 0) {
      const cost = managerHireCost(mgr, 0, cfg);
      return '<div class="mg-mgr-card mg-mgr-unhired" data-id="' + mgr.id + '">'
        + '<span class="mg-mgr-head"><span class="mg-mgr-icon">' + escapeHtml(mgr.icon) + '</span>'
        + '<span class="mg-mgr-name">' + escapeHtml(mgr.name) + '</span></span>'
        + '<span class="mg-mgr-manages">Manages: ' + escapeHtml(mtName) + '</span>'
        + '<button class="mg-mgr-hire" type="button" data-id="' + mgr.id + '" data-act="hire">Hire — ' + toDisplay(cost) + '</button>'
        + '</div>';
    }
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

  function previewNetNeg(mgr) {
    const ms = mgrState(mgr.id);
    const saved = ms.level;
    ms.level = saved + 1;
    const r = netRate(state, cfg);
    ms.level = saved;
    return r < 0;
  }

  function renderPanel() {
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
      if (act === 'lvl') {
        const show = () => { if (previewNetNeg(mgr)) panelsEl.querySelector('.mg-mgr-net')?.classList.add('mg-net-neg-preview'); };
        const hide = () => panelsEl.querySelector('.mg-mgr-net')?.classList.remove('mg-net-neg-preview');
        b.addEventListener('mouseenter', show);
        b.addEventListener('focus', show);
        b.addEventListener('mouseleave', hide);
        b.addEventListener('blur', hide);
      }
    });
    paint();
  }

  function paint() {
    const rateNeg = netRate(state, cfg) < 0;
    const net = panelsEl.querySelector('.mg-mgr-net');
    if (net) net.classList.toggle('mg-s1-neg', rateNeg);
    let pausedChanged = false;
    managers.forEach((mgr) => {
      const ms = mgrState(mgr.id);
      const card = panelsEl.querySelector('.mg-mgr-card[data-id="' + mgr.id + '"]');
      if (!card) return;
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
    if (pausedChanged) renderPanel();
  }

  function mgrAction(mgr, act) {
    const ms = mgrState(mgr.id);
    if (act === 'fire') {
      ms.level = 0; ms.paused = false; ms.lastFire = 0;
      save(state);
      renderPanel();
      paintStats();
      return;
    }
    const cost = managerHireCost(mgr, ms.level, cfg);
    if (!gte(state.bits, cost)) return;
    state.bits = sub(state.bits, cost);
    ms.level++;
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
