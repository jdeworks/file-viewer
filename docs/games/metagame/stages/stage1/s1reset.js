// s1reset.js — Stage 1 prestige/reset panel: the Gravitational Pull reset PLUS the Cores meta-shop
// and the post-prestige mechanic roster (one unlocked per prestige depth).

import { globalPull, pullGain } from './s1economy.js';
import { fromNumber, toDisplay } from './bignum.js';
import { bellLoad, checkMessages, escapeHtml } from './s1bell.js';
import { checkAchievements } from './s1achievements.js';
import { doPrestige, coreGain, MECHANICS, prestigeDepth, nextMechanic } from './s1prestige.js';
import { CORE_UPGRADES, coreLevel, coreCostOf, canBuyCore, buyCore } from './s1cores.js';

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
    + coreShopHtml(state)
    + mechanicsRosterHtml(state)
    + '</div></div>';
  panelsEl.querySelector('.mg-reset-go').addEventListener('click', () => doReset(opts));
  panelsEl.querySelector('.mg-reset-cancel').addEventListener('click', () => renderResetPanel(opts));
  panelsEl.querySelectorAll('.mg-core-buy').forEach((b) => b.addEventListener('click', () => {
    if (buyCore(state, b.dataset.id)) { opts.save(state); renderResetPanel(opts); }
  }));
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
