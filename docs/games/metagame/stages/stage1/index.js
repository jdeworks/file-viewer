import { stageByNumber } from '../../stages.js';
import { renderStage1 } from './renderer.js';
import { mountStage1Boss } from './boss.js';
import { defaultState as createDefaultState, normalizeState } from './state.js';

export { parseCheatConfig, parseCheatLine, shouldDisableCheat, maybeSetCheatDisabledAction } from './cheat.js';
export { stageMessages, actionMessages, announceCheatDisabled } from './messages.js';
export { stageAchievements, viewerToolAchievement, grantCheatDisabledAchievement } from './achievements.js';
export { normalizeState } from './state.js';
export { mountStage1Boss, hasCheatDisabledAction } from './boss.js';

export const stageMeta = {
  id: 1,
  slug: 'bit-foundry',
  name: 'Bit Foundry',
  bossName: 'The Defragmenter',
  btsPath: '/docs/bts/bit_foundry.bts',
  requiredAction: '1.cheat_disabled',
  requiredFile: 'docs/examples/Overwriter.frag',
};

export function defaultState(context) {
  return createDefaultState(context);
}

export function mountStage(ctx = {}) {
  const host = ctx.host;
  if (!host) throw new Error('Stage 1 mount requires a host element.');

  const state = normalizeState(ctx.state || defaultState(ctx), ctx);
  const stageConfig = ctx.stageConfig || stageByNumber(1);
  let bossCtl = null;
  let destroyed = false;

  const save = () => {
    if (typeof ctx.save === 'function') ctx.save();
  };

  const render = () => {
    if (destroyed) return;
    if (bossCtl && typeof bossCtl.destroy === 'function') bossCtl.destroy();
    bossCtl = null;
    renderStage1({
      host,
      state,
      save,
      bell: ctx.bell,
      stage: () => stageConfig,
      onExit: ctx.onExit,
      onBoss: () => {
        host.innerHTML = '<div class="mg-wrap mg-stage1-boss-host"></div>';
        const arena = host.querySelector('.mg-stage1-boss-host');
        bossCtl = mountStage1Boss(arena, {
          ...ctx,
          state,
          save,
          stageConfig,
          onRetreat: render,
        });
      },
      attachChrome: () => {},
    });
  };

  render();

  return {
    destroy() {
      destroyed = true;
      if (bossCtl && typeof bossCtl.destroy === 'function') bossCtl.destroy();
      bossCtl = null;
      host.innerHTML = '';
    },
  };
}
