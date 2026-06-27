// combat-rows.js — Stage 4 Fractal Bastion: the shop + roster DOM row builders for the combat board.
//
// Pure element factories (no event listeners — ui-combat delegates clicks via the data-* attributes
// these stamp). Split out of ui-combat.js to keep that file under the LOC cap; the only state they read
// is the live `state.towers` + the current shop selection.

import { TOWER_TYPES, towerUpgradeCost } from './towers.js';
import { forksFor, forkDef } from './forks.js';
import { availableTowers, sellValue } from './combat-helpers.js';

// Shop buttons: the wave-1 wall of 14 is gated to a per-map drip (availableTowers); boss mode shows all.
export function shopRows({ placeable, isBoss, mapIndex, selected }) {
  const list = isBoss ? placeable : availableTowers(placeable, mapIndex);
  return list.map((type) => {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.dataset.tower = type;
    btn.className = type === selected ? 'is-selected' : '';
    btn.textContent = `${TOWER_TYPES[type].glyph} ${type} (${TOWER_TYPES[type].cost})`;
    return btn;
  });
}

// Roster rows: one per placed tower — retarget button, then upgrade / fork-choice / fork-tag, then sell.
export function rosterRows(state) {
  return (state.towers || []).map((tower) => {
    const wrap = document.createElement('div');
    wrap.className = 's4-roster-row';
    const def = TOWER_TYPES[tower.type] || {};
    const level = tower.level || 1;
    const tgt = document.createElement('button');
    tgt.type = 'button'; tgt.dataset.towerId = tower.id;
    tgt.textContent = `${def.glyph || '[?]'} L${level} ${tower.x},${tower.y} → ${String(tower.targetMode || 'first').toUpperCase()}`;
    wrap.append(tgt);
    if (level < 3) {
      const up = document.createElement('button');
      up.type = 'button'; up.dataset.upgradeId = tower.id;
      up.textContent = `upgrade (${towerUpgradeCost(tower.type, level)})`;
      wrap.append(up);
    } else if (!tower.fork && forksFor(tower.type).length) {
      for (const f of forksFor(tower.type)) {
        const fb = document.createElement('button');
        fb.type = 'button'; fb.className = 's4-fork-btn'; fb.dataset.forkId = tower.id; fb.dataset.forkChoice = f.id;
        fb.textContent = `⑂ ${f.label}`; fb.title = f.desc;
        wrap.append(fb);
      }
    } else if (tower.fork) {
      const tag = document.createElement('span');
      tag.className = 's4-fork-tag';
      tag.textContent = `⑂ ${forkDef(tower)?.label || tower.fork}`;
      wrap.append(tag);
    }
    const sell = document.createElement('button');
    sell.type = 'button'; sell.className = 's4-sell-btn'; sell.dataset.sellId = tower.id;
    sell.textContent = `sell (${sellValue(tower)})`;
    wrap.append(sell);
    return wrap;
  });
}
