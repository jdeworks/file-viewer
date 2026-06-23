// s1reset.js — Stage 1 prestige/reset panel.

import { globalPull, pullGain } from './s1economy.js';
import { ZERO, fromNumber, toDisplay } from './bignum.js';
import { bellLoad, checkMessages } from './s1bell.js';
import { checkAchievements } from './s1achievements.js';

export function renderResetPanel({ panelsEl, state, cfg, save, renderAll }) {
  const gain = pullGain(state.totalBits);
  const newTotal = globalPull(state) * gain;
  panelsEl.innerHTML =
    '<div class="mg-s1-panel" data-panel="reset">'
    + '<div class="mg-reset-panel">'
    + '<div class="mg-reset-title">Reset Stage 1?</div>'
    + '<p class="mg-reset-line">You will gain <strong>×' + toDisplay(fromNumber(gain)) + '</strong> Gravitational Pull (total <strong>×' + toDisplay(fromNumber(newTotal)) + '</strong>).</p>'
    + '<p class="mg-reset-line">All bits, buildings, and managers will be lost.</p>'
    + '<p class="mg-reset-line mg-reset-keep">Achievements and pull persist.</p>'
    + '<div class="mg-reset-actions">'
    + '<button class="mg-reset-go" type="button">Reset</button>'
    + '<button class="mg-reset-cancel" type="button">Cancel</button>'
    + '</div></div></div>';
  panelsEl.querySelector('.mg-reset-go').addEventListener('click', () => doReset({ state, cfg, save, renderAll }));
  panelsEl.querySelector('.mg-reset-cancel').addEventListener('click', () => renderResetPanel({ panelsEl, state, cfg, save, renderAll }));
}

function doReset({ state, cfg, save, renderAll }) {
  const gain = pullGain(state.totalBits);
  state.pullFactors = [...(state.pullFactors || []), gain];
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
