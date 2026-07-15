// ui-campaign.js — Stage 4 Fractal Bastion: the campaign meta screens (map-select + Armory).
//
// Static screens (no rAF): map-select shows the five maps with lock/cleared state and gates the boss
// behind all-cleared; the Armory spends Glory on permanent campaign upgrades between maps. Both call
// back into the controller (run4.js / armory.js) and ask it to re-render. The combat board itself is
// ui-combat.js.

import { MAPS } from './maps.js';
import { mapUnlocked, mapCleared, bossUnlocked, allMapsCleared, campaignProgress, isVeteran } from './run4.js';
import { ARMORY_UPGRADES, armoryLevel, armoryCost, canBuyArmory } from './armory.js';
import { banner } from '../../shared/feedback.js';

export function renderMapSelect(host, controller) {
  const state = controller.state;
  const root = document.createElement('section');
  root.className = 'stage4-mapselect';
  const won = state.campaign.status === 'won' || state.boss?.defeated;
  // Progressive disclosure (M2/R1): a FRESH player (no map cleared) lands on a lean screen — map 1 is
  // the single primary START, and Glory/armory/boss meta stay hidden until the map-1 victory moment.
  const veteran = isVeteran(state) || won;

  function repaint() {
    const prog = campaignProgress(state);
    const bossReady = bossUnlocked(state);
    root.innerHTML = `
      <header class="s4-hud"><strong>FRACTAL BASTION${veteran ? ' — CAMPAIGN' : ''}</strong>
        ${veteran ? `<span>GLORY ${state.campaign.glory}</span>` : ''}
        <span>MAPS ${prog.cleared}/${prog.total}</span>
      </header>
      <p class="s4-hint">${won ? 'The Infinite Loop has stopped. The bastion holds.'
        : veteran ? 'Clear each map to unlock the next. The Infinite Loop opens only when all five are held.'
        : 'The recursion is leaking in. Hold the Outer Shell.'}</p>
      <ol class="s4-maplist">
        ${MAPS.map((m, i) => mapRow(m, i)).join('')}
      </ol>
      <div class="s4-controls">
        <button type="button" data-action="boss" class="s4-boss-chip" ${bossReady ? '' : 'disabled'}>${won ? 'The Infinite Loop (cleared)' : bossReady ? 'confront The Infinite Loop' : 'The Infinite Loop — locked · clear all five maps'}</button>
        ${veteran && !won ? '<button type="button" data-action="armory">⚙ armory</button>' : ''}
      </div>`;
  }

  function mapRow(m, i) {
    const unlocked = mapUnlocked(state, i);
    const cleared = mapCleared(state, i);
    const status = cleared ? 'CLEARED' : unlocked ? 'OPEN' : 'LOCKED';
    // Fresh player: map 1's button is the ONE primary START; other rows are locked anyway.
    const primary = !veteran && unlocked && !cleared;
    const label = cleared ? 'replay' : primary ? '▶ start' : 'enter';
    return `<li class="s4-maprow ${cleared ? 'is-cleared' : unlocked ? 'is-open' : 'is-locked'}">
      <span class="s4-mapglyph">${m.glyph}</span>
      <span class="s4-mapname">${m.name}</span>
      <span class="s4-mapwaves">${m.waveCount} waves</span>
      <span class="s4-maptheme">${m.theme}</span>
      <span class="s4-mapstatus">${status}</span>
      <button type="button" class="${primary ? 's4-primary' : ''}" data-select="${i}" ${unlocked ? '' : 'disabled'}>${label}</button>
    </li>`;
  }

  root.addEventListener('click', (event) => {
    const sel = event.target.closest('button[data-select]');
    if (sel) { controller.selectMap(Number(sel.dataset.select)); return; }
    const action = event.target.closest('button[data-action]');
    if (!action) return;
    if (action.dataset.action === 'boss' && allMapsCleared(state)) controller.enterBoss();
    else if (action.dataset.action === 'armory') controller.openArmory?.();
  });

  repaint();
  host.replaceChildren(root);
  return { repaint, destroy() { root.remove(); } };
}

export function renderArmory(host, controller) {
  const state = controller.state;
  const root = document.createElement('section');
  root.className = 'stage4-armory';
  // The map-1 victory moment (M2): the armory OPENS as the first-clear reward — announce it once.
  const firstOpen = (state.campaign.clearedMaps || []).length === 1 && !state.campaign.armoryOpened;
  if (firstOpen) { state.campaign.armoryOpened = true; setTimeout(() => banner(root, 'Glory earned — the armory opens'), 30); }

  function repaint() {
    root.innerHTML = `
      <header class="s4-hud"><strong>⚙ THE ARMORY</strong><span>GLORY ${state.campaign.glory}</span></header>
      <p class="s4-hint">${firstOpen ? 'You held the Outer Shell. ' : ''}Spend Glory on permanent campaign upgrades, then advance.</p>
      <ol class="s4-armorylist">${ARMORY_UPGRADES.map((u) => armoryRow(u)).join('')}</ol>
      <div class="s4-controls"><button type="button" data-action="continue">continue →</button></div>`;
  }

  function armoryRow(u) {
    const lvl = armoryLevel(state.campaign, u.id);
    const cost = armoryCost(state.campaign, u.id);
    const maxed = lvl >= u.maxLevel;
    const afford = canBuyArmory(state.campaign, u.id);
    return `<li class="s4-armoryrow">
      <span class="s4-armoryname">${u.label} <em>Lv ${lvl}/${u.maxLevel}</em></span>
      <span class="s4-armorydesc">${u.desc}</span>
      <button type="button" data-buy="${u.id}" ${maxed || !afford ? 'disabled' : ''}>${maxed ? 'MAX' : `buy (${cost})`}</button>
    </li>`;
  }

  root.addEventListener('click', (event) => {
    const buy = event.target.closest('button[data-buy]');
    if (buy) { const r = controller.buyArmory(buy.dataset.buy); if (r?.ok) repaint(); return; }
    if (event.target.closest('button[data-action="continue"]')) controller.leaveArmory();
  });

  repaint();
  host.replaceChildren(root);
  return { repaint, destroy() { root.remove(); } };
}
