import { MESSAGES1 } from '../../messages1.js';

export const stageMessages = MESSAGES1;

export const actionMessages = {
  cheatDisabled: {
    id: 'stage1.cheat_disabled',
    text: 'the unfair routine has been removed.',
  },
};

export function announceCheatDisabled(ctx = {}) {
  const bell = ctx.bell;
  if (!bell) return false;
  const msg = actionMessages.cheatDisabled;
  if (typeof bell.add === 'function') {
    bell.add(msg.id, msg.text);
    return true;
  }
  if (typeof bell.push === 'function') {
    bell.push(msg);
    return true;
  }
  if (typeof bell.notify === 'function') {
    bell.notify(msg.text, msg);
    return true;
  }
  return false;
}
