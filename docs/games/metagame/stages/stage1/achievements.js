import { ACHIEVEMENTS1 } from '../../achievements1.js';

export const stageAchievements = ACHIEVEMENTS1;

export const viewerToolAchievement = {
  id: 'stage1.cheat_disabled',
  legacyId: 'ach-boss-cheat-found',
  stage: 1,
  name: 'protection disabled.',
};

export function grantCheatDisabledAchievement(ctx = {}) {
  const api = ctx.achievements;
  const achievement = viewerToolAchievement;
  if (!api) return false;
  if (typeof api.unlock === 'function') {
    api.unlock(achievement.id, achievement);
    return true;
  }
  if (typeof api.add === 'function') {
    api.add(achievement.id, achievement);
    return true;
  }
  if (typeof api.setAchievement === 'function') {
    api.setAchievement(achievement);
    return true;
  }
  return false;
}
