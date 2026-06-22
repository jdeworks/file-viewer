import { mountDefragmenter } from './boss1.js';

export function hasCheatDisabledAction(ctx = {}) {
  const actions = ctx.actions;
  if (!actions || typeof actions.hasAction !== 'function') return false;
  return Boolean(actions.hasAction(1, 'cheat_disabled'));
}

export function mountStage1Boss(arena, ctx = {}) {
  const saveStage = () => {
    if (typeof ctx.save === 'function') ctx.save();
  };

  const ctl = mountDefragmenter(arena, {
    stage: ctx.stageConfig,
    state: ctx.state,
    save: saveStage,
    actions: ctx.actions,
    onDefeat: () => {
      if (typeof ctx.onStageComplete === 'function') {
        ctx.onStageComplete({ stage: 1, defeated: true });
      }
    },
    onRetreat: ctx.onRetreat,
  });

  return {
    destroy() {
      if (ctl && typeof ctl.destroy === 'function') ctl.destroy();
    },
  };
}
