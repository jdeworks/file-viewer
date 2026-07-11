// combat-rows.js — Stage 4 Fractal Bastion: the shop + roster DOM row builders for the combat board.
//
// Pure element factories (no event listeners — ui-combat delegates clicks via the data-* attributes
// these stamp). Split out of ui-combat.js to keep that file under the LOC cap; the only state they read
// is the live `state.towers` + the current shop selection. `disclosed` (UX audit M1): on a fresh
// player's map 1 the damage-TYPE tag and the targeting preset control are suppressed (vanilla TD).

import { TOWER_TYPES, towerUpgradeCost, presetLabel } from './towers.js';
import { forksFor, forkDef } from './forks.js';
import { availableTowers, sellValue } from './combat-helpers.js';

// A compact one-line stat summary for a tower def (UX audit #4 — the shop sold names, not weapons).
// Shows `dmg · rng · rate` for attackers, or a role token for support/economy towers. The damage TYPE
// is appended only when `disclosed` (map 2+); on the vanilla first map it stays a plain number.
export function towerStatLine(def, disclosed) {
  const parts = [];
  if (Number(def.damage) > 0) {
    parts.push(`dmg ${def.damage}`);
    parts.push(def.range >= 99 ? 'global' : `rng ${def.range}`);
    if (Number(def.fireRate) > 0) parts.push(`${def.fireRate}/s`);
    if (disclosed && def.damageType) parts.push(def.damageType);
  } else if (def.incomePerWave) {
    parts.push(`+${def.incomePerWave}c / wave`);
  } else if (def.adjacencyBonus) {
    parts.push(`+${Math.round(def.adjacencyBonus * 100)}% adjacent · rng ${def.range}`);
  } else if (def.slow || def.pull) {
    const bits = [`rng ${def.range}`];
    if (def.slow) bits.unshift('slow');
    if (def.pull) bits.push('pull');
    parts.push(bits.join(' · '));
  } else {
    parts.push('support');
  }
  return parts.join(' · ');
}

// Shop buttons: the wave-1 wall of 14 is gated to a per-map drip (availableTowers); boss mode shows all.
// Each is a two-line button — name + cost, then the stat line — so choice is informed before buying.
// `cycles` (playtest: buttons stayed clickable + failed silently when unaffordable) disables a button
// whose cost exceeds the player's current cycles — reusing the SAME disabled-button styling the Armory
// screen already ships (ui-campaign.js canBuyArmory + .s4-maprow/.s4-armoryrow button:disabled CSS),
// not a new visual language.
export function shopRows({ placeable, isBoss, mapIndex, selected, disclosed, cycles = Infinity }) {
  const list = isBoss ? placeable : availableTowers(placeable, mapIndex);
  return list.map((type) => {
    const def = TOWER_TYPES[type];
    const btn = document.createElement('button');
    btn.type = 'button'; btn.dataset.tower = type;
    btn.className = `s4-shop-row${type === selected ? ' is-selected' : ''}`;
    btn.disabled = Number(def.cost) > Number(cycles);
    const head = document.createElement('span');
    head.className = 's4-shop-head';
    head.textContent = `${def.glyph} ${type} · ${def.cost}c`;
    const sub = document.createElement('span');
    sub.className = 's4-shop-sub';
    sub.textContent = towerStatLine(def, disclosed);
    btn.append(head, sub);
    return btn;
  });
}

// Roster rows: one per placed tower — targeting preset (hidden until disclosed), upgrade / fork-choice /
// fork-tag, then sell. `disclosed` gates the targeting control (map 1 = fixed FIRST, no toggle shown).
export function rosterRows(state, disclosed = true) {
  return (state.towers || []).map((tower) => {
    const wrap = document.createElement('div');
    wrap.className = 's4-roster-row';
    const def = TOWER_TYPES[tower.type] || {};
    const level = tower.level || 1;
    if (disclosed) {
      const tgt = document.createElement('button');
      tgt.type = 'button'; tgt.dataset.towerId = tower.id;
      tgt.textContent = `${def.glyph || '[?]'} L${level} ${tower.x},${tower.y} → ${presetLabel(tower.targetMode)}`;
      wrap.append(tgt);
    } else {
      const tag = document.createElement('span');
      tag.className = 's4-roster-name';
      tag.textContent = `${def.glyph || '[?]'} L${level} ${tower.x},${tower.y}`;
      wrap.append(tag);
    }
    if (level < 3) {
      const cost = towerUpgradeCost(tower.type, level);
      const up = document.createElement('button');
      up.type = 'button'; up.dataset.upgradeId = tower.id;
      up.disabled = cost > Number(state.cycles || 0);
      up.textContent = `upgrade (${cost})`;
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
