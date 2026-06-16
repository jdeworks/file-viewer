// s1achievements.js — Stage 1 milestones and achievement checks.

import { ACHIEVEMENTS1 } from './achievements1.js';
import { bellAdd, bellLoad, bellSave } from './s1bell.js';

function bigToNum(bn) {
  if (bn === null || bn === undefined) return 0;
  if (typeof bn === 'number') return bn;
  if (!bn.m) return 0;
  return Math.min(bn.m * Math.pow(10, bn.e || 0), Number.MAX_VALUE);
}

const MILESTONES = [
  { id: 'sound-unlock',  threshold: 1000,  msg: 'I can hear something' },
  { id: 'anim-unlock',   threshold: 10000, msg: 'something changed'    },
];

export function checkMilestones(state, bs, save) {
  const achieved = state.milestones || [];
  for (const m of MILESTONES) {
    if (achieved.includes(m.id)) continue;
    if (bigToNum(state.totalBits) >= m.threshold) {
      state.milestones = achieved;
      state.milestones.push(m.id);
      bellAdd(m.id, m.msg, bs);
      save(state);
    }
  }
}

export function checkAchievements(state, cfg, bs) {
  if (!cfg) return false;
  const achieved = state.achievements || [];
  let changed = false;
  for (const ach of ACHIEVEMENTS1) {
    if (achieved.includes(ach.id) || ach.id === 'ach-boss-cheat-found') continue;
    try {
      if (!ach.condition(state, cfg)) continue;
    } catch { continue; }
    achieved.push(ach.id);
    state.achievements = achieved;
    changed = true;
    const bsLocal = bs || bellLoad();
    bellAdd(ach.id, ach.bell, bsLocal);
    if (bsLocal !== bs) bellSave(bsLocal);
  }
  return changed;
}
