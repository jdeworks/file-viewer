// s1reset.js — Stage 1 prestige/reset panel: the Gravitational Pull reset PLUS the Cores meta-shop
// and the post-prestige mechanic roster (one unlocked per prestige depth).

import { globalPull, pullGain } from './s1economy.js';
import { fromNumber, toDisplay } from './bignum.js';
import { bellLoad, checkMessages, escapeHtml } from './s1bell.js';
import { checkAchievements } from './s1achievements.js';
import { doPrestige, coreGain, MECHANICS, prestigeDepth, nextMechanic, mechanicUnlocked } from './s1prestige.js';
import { CORE_UPGRADES, coreLevel, coreCostOf, canBuyCore, buyCore } from './s1cores.js';
import { wirableTiers, isWired, togglePipeline, pipelineUpkeepOf } from './s1pipeline.js';
import { fluxMeter, fluxBoostTicks, fluxMult, fluxCanCash, cashFlux } from './s1flux.js';

const STYLE_ID = 'mg-s1-prestige-style';
function injectStyle() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
.mg-reset-balance { font:600 14px/1.2 ui-monospace,monospace; color:var(--accent); margin:4px 0 10px; }
.mg-reset-next { color:var(--accent); font-size:12px; }
.mg-core-shop,.mg-mech-roster { margin-top:14px; border-top:1px solid var(--border); padding-top:10px; }
.mg-core-shop-title,.mg-mech-title { font-size:11px; letter-spacing:2px; color:var(--fg-2); margin-bottom:8px; text-transform:uppercase; }
.mg-core-card { display:grid; grid-template-columns:1fr auto; gap:2px 10px; align-items:center; padding:7px 0; border-bottom:1px solid var(--border); }
.mg-core-head { font-weight:600; } .mg-core-head small { color:var(--fg-2); font-weight:400; }
.mg-core-desc { grid-column:1; font-size:12px; color:var(--fg-2); }
.mg-core-buy { grid-row:1/3; grid-column:2; background:var(--accent); color:var(--accent-fg); border:0; border-radius:7px; padding:7px 12px; cursor:pointer; font:600 13px ui-monospace,monospace; }
.mg-core-buy.mg-buy-locked { opacity:.45; pointer-events:none; }
.mg-core-max { grid-row:1/3; grid-column:2; color:#3fb950; font-weight:700; font-size:12px; }
.mg-mech-row { display:grid; grid-template-columns:auto 1fr; gap:2px 8px; padding:6px 0; opacity:.45; }
.mg-mech-row.mg-mech-on { opacity:1; }
.mg-mech-icon { grid-row:1/3; font-size:18px; } .mg-mech-name { font-weight:600; } .mg-mech-name small { color:var(--fg-2); font-weight:400; }
.mg-mech-blurb { grid-column:2; font-size:12px; color:var(--fg-2); }
.mg-pipe-shop { margin-top:14px; border-top:1px solid var(--border); padding-top:10px; }
.mg-pipe-row { display:grid; grid-template-columns:1fr auto auto; gap:10px; align-items:center; padding:6px 0; border-bottom:1px solid var(--border); opacity:.7; }
.mg-pipe-row.mg-pipe-on { opacity:1; }
.mg-pipe-name small { color:var(--fg-2); }
.mg-pipe-upkeep { font:600 12px ui-monospace,monospace; color:#e0742f; }
.mg-pipe-toggle { background:var(--bg); color:var(--fg); border:1px solid var(--border); border-radius:7px; padding:5px 12px; cursor:pointer; font-size:12px; }
.mg-pipe-row.mg-pipe-on .mg-pipe-toggle { background:var(--accent); color:var(--accent-fg); border-color:var(--accent); }
.mg-flux-shop { margin-top:14px; border-top:1px solid var(--border); padding-top:10px; }
.mg-flux-meter { height:14px; border-radius:7px; background:var(--border); overflow:hidden; margin-bottom:6px; }
.mg-flux-fill { height:100%; width:0%; background:var(--accent); transition:width .12s linear; }
.mg-flux-fill.mg-flux-boosting { background:#e0742f; }
.mg-flux-row { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.mg-flux-status { font:600 12px ui-monospace,monospace; color:var(--fg-2); }
.mg-flux-cash { background:var(--accent); color:var(--accent-fg); border:0; border-radius:7px; padding:6px 14px; cursor:pointer; font:600 12px ui-monospace,monospace; }
.mg-flux-cash.mg-buy-locked { opacity:.45; pointer-events:none; }
`;
  document.head.appendChild(el);
}

export function renderResetPanel(opts) {
  const { panelsEl, state } = opts;
  injectStyle();
  const gain = pullGain(state.totalBits);
  const newTotal = globalPull(state) * gain;
  const cores = coreGain(state.totalBits);
  const next = nextMechanic(state);
  panelsEl.innerHTML =
    '<div class="mg-s1-panel" data-panel="reset"><div class="mg-reset-panel">'
    + '<div class="mg-reset-title">🌀 Prestige</div>'
    + '<div class="mg-reset-balance">⬡ <strong>' + (state.cores || 0) + '</strong> Cores · depth ' + prestigeDepth(state) + '</div>'
    + '<p class="mg-reset-line">Reset now to gain <strong>×' + toDisplay(fromNumber(gain)) + '</strong> Pull (total <strong>×'
      + toDisplay(fromNumber(newTotal)) + '</strong>) and <strong>+' + cores + '</strong> ⬡ Cores.</p>'
    + (next ? '<p class="mg-reset-line mg-reset-next">Next prestige unlocks ' + next.icon + ' <strong>' + escapeHtml(next.name) + '</strong> — ' + escapeHtml(next.blurb) + '</p>' : '')
    + '<p class="mg-reset-line">All bits, buildings, and managers are lost.</p>'
    + '<p class="mg-reset-line mg-reset-keep">Cores, upgrades, achievements, and pull persist.</p>'
    + '<div class="mg-reset-actions">'
    + '<button class="mg-reset-go" type="button">Prestige</button>'
    + '<button class="mg-reset-cancel" type="button">Cancel</button>'
    + '</div>'
    + fluxHtml(state)
    + pipelineHtml(opts)
    + coreShopHtml(state)
    + mechanicsRosterHtml(state)
    + '</div></div>';
  panelsEl.querySelector('.mg-reset-go').addEventListener('click', () => doReset(opts));
  panelsEl.querySelector('.mg-reset-cancel').addEventListener('click', () => renderResetPanel(opts));
  panelsEl.querySelectorAll('.mg-core-buy').forEach((b) => b.addEventListener('click', () => {
    if (buyCore(state, b.dataset.id)) { opts.save(state); renderResetPanel(opts); }
  }));
  panelsEl.querySelectorAll('.mg-pipe-toggle').forEach((b) => b.addEventListener('click', () => {
    togglePipeline(state, b.dataset.id); opts.save(state); renderResetPanel(opts);
  }));
  const cashBtn = panelsEl.querySelector('.mg-flux-cash');
  if (cashBtn) cashBtn.addEventListener('click', () => { if (cashFlux(state)) { opts.save(state); paintResetPanel(panelsEl, state); } });
}

function fluxHtml(state) {
  if (!mechanicUnlocked(state, 'flux')) return '';
  return '<div class="mg-flux-shop"><div class="mg-core-shop-title">⚡ Flux — burst meter</div>'
    + '<div class="mg-flux-meter"><div class="mg-flux-fill"></div></div>'
    + '<div class="mg-flux-row"><span class="mg-flux-status"></span>'
    + '<button class="mg-flux-cash" type="button">Cash now ×1.5</button></div></div>';
}

// Live per-tick update of the flux meter + status (called from the stage1 tick when the Prestige tab
// is active, so the meter animates without a full panel rebuild).
export function paintResetPanel(panelsEl, state) {
  const fill = panelsEl.querySelector('.mg-flux-fill');
  if (fill) {
    const boosting = fluxBoostTicks(state) > 0;
    fill.style.width = (boosting ? 100 : fluxMeter(state)) + '%';
    fill.classList.toggle('mg-flux-boosting', boosting);
    const status = panelsEl.querySelector('.mg-flux-status');
    if (status) status.textContent = boosting
      ? '🔥 ×' + fluxMult(state).toFixed(1) + ' active (' + (fluxBoostTicks(state) / 10).toFixed(1) + 's)'
      : Math.floor(fluxMeter(state)) + '% — fills to ×3, or cash now';
    const cashBtn = panelsEl.querySelector('.mg-flux-cash');
    if (cashBtn) cashBtn.classList.toggle('mg-buy-locked', !fluxCanCash(state));
  }
}

function pipelineHtml(opts) {
  const { state, cfg } = opts;
  if (!mechanicUnlocked(state, 'pipeline')) return '';
  const rows = wirableTiers(cfg).map((t) => {
    const owned = (state.owned || {})[t.id] || 0;
    const wired = isWired(state, t.id);
    const upkeep = pipelineUpkeepOf(state, cfg, t.id);
    return '<div class="mg-pipe-row' + (wired ? ' mg-pipe-on' : '') + '">'
      + '<span class="mg-pipe-name">' + escapeHtml(t.icon + ' ' + t.name) + ' <small>×' + owned + '</small></span>'
      + '<span class="mg-pipe-upkeep">' + (wired ? toDisplay(fromNumber(upkeep)) + '/s' : '') + '</span>'
      + '<button class="mg-pipe-toggle" type="button" data-id="' + t.id + '">' + (wired ? 'Unwire' : 'Wire') + '</button>'
      + '</div>';
  }).join('');
  return '<div class="mg-pipe-shop"><div class="mg-core-shop-title">🔌 Pipeline — auto-run builders (upkeep)</div>' + rows + '</div>';
}

function coreShopHtml(state) {
  const rows = CORE_UPGRADES.map((up) => {
    const lvl = coreLevel(state, up.id);
    const maxed = lvl >= up.max;
    const cost = coreCostOf(up, lvl);
    const can = canBuyCore(state, up.id);
    const btn = maxed
      ? '<span class="mg-core-max">MAX</span>'
      : '<button class="mg-core-buy' + (can ? '' : ' mg-buy-locked') + '" type="button" data-id="' + up.id + '">' + cost + ' ⬡</button>';
    return '<div class="mg-core-card"><span class="mg-core-head">' + escapeHtml(up.icon) + ' ' + escapeHtml(up.name)
      + ' <small>Lv ' + lvl + (up.max > 1 ? '/' + up.max : '') + '</small></span>'
      + '<span class="mg-core-desc">' + escapeHtml(up.desc) + '</span>' + btn + '</div>';
  }).join('');
  return '<div class="mg-core-shop"><div class="mg-core-shop-title">⬡ Cores — permanent upgrades</div>' + rows + '</div>';
}

function mechanicsRosterHtml(state) {
  const depth = prestigeDepth(state);
  const rows = MECHANICS.map((m) => {
    const on = depth >= m.depth;
    return '<div class="mg-mech-row' + (on ? ' mg-mech-on' : '') + '">'
      + '<span class="mg-mech-icon">' + escapeHtml(m.icon) + '</span>'
      + '<span class="mg-mech-name">' + escapeHtml(m.name) + (on ? '' : ' <small>(prestige ' + m.depth + ')</small>') + '</span>'
      + '<span class="mg-mech-blurb">' + escapeHtml(m.blurb) + '</span></div>';
  }).join('');
  return '<div class="mg-mech-roster"><div class="mg-mech-title">Post-prestige mechanics</div>' + rows + '</div>';
}

function doReset(opts) {
  const { state, cfg, save, renderAll } = opts;
  doPrestige(state);
  state.runStartedAt = Date.now();
  save(state);
  checkMessages('prestige', state, bellLoad());
  checkAchievements(state, cfg, bellLoad());
  renderAll();
}
