// combat-popover.js — Stage 4 Fractal Bastion: the placed-tower STATS POPOVER (UX audit #3, S8-B pattern).
//
// Tapping a placed tower opens ONE popover with its live stats + the verbs that were formerly buried in
// the roster list: retarget (preset), upgrade / tier-3 fork, sell. The buttons carry the SAME data-*
// attributes ui-combat's root click-delegation already handles (data-tower-id / data-upgrade-id /
// data-fork-id+data-fork-choice / data-sell-id), so a popover verb routes through the exact same engine
// handler as the roster did. One popover at a time; closes on outside tap, Esc, or a sell. 40px targets.
// `disclosed` (M1) hides the damage-type line + the targeting control on a fresh player's map 1.

import { TOWER_TYPES, towerUpgradeCost, presetLabel } from './towers.js';
import { forksFor, forkDef } from './forks.js';
import { sellValue } from './combat-helpers.js';

let active = null; // { el, towerId, onDocClick, onKey }

export function popoverTowerId() { return active?.towerId || null; }

export function closeTowerPopover() {
  if (!active) return;
  document.removeEventListener('click', active.onDocClick, true);
  document.removeEventListener('keydown', active.onKey, true);
  active.el.remove();
  active = null;
}

// Open (or refresh) the popover for `tower`, anchored under `anchor` (a client-rect {left,top,bottom})
// inside `root` (position: relative). Re-calling for the same tower refreshes content in place.
export function openTowerPopover({ root, anchor, state, tower, disclosed = true, onClose }) {
  if (!tower) return null;
  const refreshing = active && active.towerId === tower.id;
  if (!refreshing) closeTowerPopover();
  const el = refreshing ? active.el : document.createElement('div');
  el.className = 's4-popover';
  el.setAttribute('role', 'menu');
  el.setAttribute('aria-label', `${tower.type} actions`);
  el.innerHTML = popoverHTML(tower, disclosed, state);
  if (refreshing) return el;

  root.appendChild(el);
  position(el, anchor, root);
  const onDocClick = (event) => {
    if (el.contains(event.target)) return;
    if (event.target.closest?.('.s4-board')) return; // board taps are handled by ui-combat (may reopen)
    closeTowerPopover(); onClose?.();
  };
  const onKey = (event) => { if (event.key === 'Escape') { event.preventDefault(); closeTowerPopover(); onClose?.(); } };
  active = { el, towerId: tower.id, onDocClick, onKey };
  setTimeout(() => {
    if (active && active.el === el) {
      document.addEventListener('click', onDocClick, true);
      document.addEventListener('keydown', onKey, true);
    }
  }, 0);
  return el;
}

function popoverHTML(tower, disclosed, state) {
  const def = TOWER_TYPES[tower.type] || {};
  const level = tower.level || 1;
  const cycles = Number(state?.cycles || 0);
  const stat = [];
  if (Number(def.damage) > 0) {
    stat.push(`dmg ${def.damage}`);
    stat.push(def.range >= 99 ? 'global' : `rng ${def.range}`);
    if (Number(def.fireRate) > 0) stat.push(`${def.fireRate}/s`);
    if (disclosed && def.damageType) stat.push(def.damageType);
  } else {
    stat.push(def.role ? def.role.split('—')[0].trim() : 'support');
  }
  let verbs = '';
  if (disclosed) {
    verbs += `<button type="button" class="s4-pop-btn" data-tower-id="${tower.id}">target ▸ ${presetLabel(tower.targetMode)}</button>`;
  }
  if (level < 3) {
    const upCost = towerUpgradeCost(tower.type, level);
    verbs += `<button type="button" class="s4-pop-btn" data-upgrade-id="${tower.id}"${upCost > cycles ? " disabled" : ""}>upgrade (${upCost}c)</button>`;
  } else if (!tower.fork && forksFor(tower.type).length) {
    for (const f of forksFor(tower.type)) {
      verbs += `<button type="button" class="s4-pop-btn s4-fork-btn" data-fork-id="${tower.id}" data-fork-choice="${f.id}" title="${escAttr(f.desc)}">⑂ ${f.label}</button>`;
    }
  } else if (tower.fork) {
    verbs += `<span class="s4-fork-tag">⑂ ${forkDef(tower)?.label || tower.fork}</span>`;
  }
  verbs += `<button type="button" class="s4-pop-btn s4-sell-btn" data-sell-id="${tower.id}">sell (${sellValue(tower)}c)</button>`;
  return `<div class="s4-pop-head"><b>${def.glyph || '[?]'} ${tower.type}</b> · L${level} @ ${tower.x},${tower.y}</div>`
    + `<div class="s4-pop-stat">${stat.join(' · ')}</div>`
    + `<div class="s4-pop-actions">${verbs}</div>`;
}

function position(el, anchor, root) {
  const r = root.getBoundingClientRect();
  const top = (anchor?.bottom ?? r.top) - r.top + 4;
  el.style.top = `${Math.max(4, top)}px`;
  const w = el.offsetWidth || 200;
  let left = (anchor?.left ?? r.left) - r.left;
  const max = root.clientWidth - w - 6;
  if (left > max) left = Math.max(4, max);
  el.style.left = `${Math.max(4, left)}px`;
}

function escAttr(s) { return String(s || '').replace(/"/g, '&quot;'); }
