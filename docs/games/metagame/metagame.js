import { loadSave, persistSave, resetSave } from './save.js';
import * as actions from './action-flags.js';
import * as achievements from './achievements.js';
import * as bell from './bell.js';
import * as bts from './bts.js';
import { createStageRegistry } from './registry.js';
import { createViewerBridge } from './viewer-bridge.js';
import * as stage1 from './stages/stage1/index.js';
import * as stage2 from './stages/stage2/index.js';
import * as stage3 from './stages/stage3/index.js';
import * as stage4 from './stages/stage4/index.js';
import * as stage5 from './stages/stage5/index.js';
import * as stage6 from './stages/stage6/index.js';
import * as stage7 from './stages/stage7/index.js';
import * as stage8 from './stages/stage8/index.js';
import * as stage9 from './stages/stage9/index.js';
import * as stage10 from './stages/stage10/index.js';

const registry = createStageRegistry([
  stage1,
  stage2,
  stage3,
  stage4,
  stage5,
  stage6,
  stage7,
  stage8,
  stage9,
  stage10,
]);

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function ensureStageStates(save) {
  for (const mod of registry.listStages()) {
    const id = mod.stageMeta.id;
    if (!save.stageState[id] || !Object.keys(save.stageState[id]).length) {
      save.stageState[id] = mod.defaultState({ save, now: Date.now() });
    }
  }
}

function createServices(getSave, persist, viewer) {
  actions.bindActionSaveProvider(getSave, persist);
  achievements.bindAchievementSaveProvider(getSave, persist);
  bell.bindBellSaveProvider(getSave, persist);
  bts.bindBtsSaveProvider(getSave, persist, () => registry);
  const off = actions.subscribeToActions((detail) => {
    const record = achievements.unlockAchievementForAction(detail.stage, detail.action, detail);
    if (record) bell.showBell(`${detail.stage}.${detail.action}`, record.title || record.id, { stage: detail.stage, detail });
  });
  return {
    actions,
    achievements,
    bell,
    bts: {
      ...bts,
      open: (stage) => bts.openBts(stage, viewer),
    },
    destroy: off,
  };
}

export function mount(host, { onExit } = {}) {
  let saveData = loadSave();
  ensureStageStates(saveData);
  saveData = persistSave(saveData);

  const viewer = createViewerBridge();
  const persist = () => {
    actions.mirrorActionsToSave(saveData);
    saveData = persistSave(saveData);
  };
  const services = createServices(() => saveData, persist, viewer);

  let mounted = null;

  function selectStage(stage) {
    saveData.currentStage = Number(stage);
    persist();
    render();
  }

  function completeStage(stage) {
    const id = Number(stage);
    if (!saveData.defeated.includes(id)) saveData.defeated.push(id);
    if (id < 10 && !saveData.unlockedStages.includes(id + 1)) saveData.unlockedStages.push(id + 1);
    saveData.currentStage = id < 10 ? id + 1 : id;
    bell.showBell(`stage${id}.defeated`, `${registry.getStageMeta(id)?.name || `Stage ${id}`} cleared.`, { stage: id });
    persist();
    render();
  }

  function renderShell() {
    host.innerHTML = `
      <div class="mg-wrap mg-v3">
        <header class="mg-v3-head">
          <div>
            <div class="mg-stage-banner">Defragmenter</div>
            <strong>${esc(registry.getStageMeta(saveData.currentStage)?.name || 'Stage')}</strong>
          </div>
          <div class="mg-v3-head-actions">
            <button class="mg-sfx-btn" type="button" data-action="sfx" aria-label="Toggle sound effects"></button>
            <div class="mg-v3-bell"></div>
            <button class="mg-back" type="button" data-action="exit">Back to arcade</button>
          </div>
        </header>
        <nav class="mg-v3-stages" aria-label="Metagame stages"></nav>
        <main class="mg-v3-host"></main>
        <div class="mg-v3-debug" hidden></div>
      </div>`;
    host.querySelector('[data-action="exit"]').addEventListener('click', () => onExit?.());
    const sfxBtn = host.querySelector('[data-action="sfx"]');
    const paintSfx = () => {
      const on = !saveData.global.sfxOff;
      sfxBtn.textContent = on ? '🔊' : '🔇';
      sfxBtn.classList.toggle('mg-sfx-off', !on);
      sfxBtn.setAttribute('aria-pressed', String(on));
    };
    sfxBtn.addEventListener('click', () => {
      saveData.global.sfxOff = !saveData.global.sfxOff;
      persist();
      paintSfx();
    });
    paintSfx();
    const nav = host.querySelector('.mg-v3-stages');
    nav.replaceChildren(...registry.listStages().filter((mod) => saveData.unlockedStages.includes(mod.stageMeta.id)).map((mod) => {
      const meta = mod.stageMeta;
      const defeated = saveData.defeated.includes(meta.id);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mg-v3-stage';
      button.dataset.stage = String(meta.id);
      button.textContent = `${meta.id}. ${meta.name}${defeated ? ' *' : ''}`;
      button.addEventListener('click', () => selectStage(meta.id));
      nav.appendChild(button);
      return button;
    }));
    mountBell(host.querySelector('.mg-v3-bell'));
  }

  function render() {
    mounted?.destroy?.();
    mounted = null;
    renderShell();
    const mod = registry.getStage(saveData.currentStage) || registry.getStage(1);
    const stageState = saveData.stageState[mod.stageMeta.id] || mod.defaultState({ save: saveData });
    saveData.stageState[mod.stageMeta.id] = stageState;
    mounted = mod.mountStage({
      host: host.querySelector('.mg-v3-host'),
      state: stageState,
      save: persist,
      actions,
      achievements,
      bell: services.bell,
      bts: services.bts,
      sfxEnabled: () => !saveData.global.sfxOff,
      orchestrator: { save: saveData, selectStage },
      viewer,
      onExit,
      onStageComplete: () => completeStage(mod.stageMeta.id),
    });
  }

  let bellDotUnsub = null;
  function mountBell(target) {
    if (bellDotUnsub) { bellDotUnsub(); bellDotUnsub = null; }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mg-bell-btn';
    button.setAttribute('aria-label', 'Notifications');
    button.innerHTML = '🔔<span class="mg-bell-dot" hidden></span>';
    const dot = button.querySelector('.mg-bell-dot');
    const panel = document.createElement('div');
    panel.className = 'mg-bell-panel';
    panel.hidden = true;
    target.replaceChildren(button, panel);
    const refreshDot = () => { dot.hidden = services.bell.listBellLog({ unseenOnly: true }).length === 0; };
    button.addEventListener('click', () => {
      panel.hidden = !panel.hidden;
      if (!panel.hidden) {
        panel.innerHTML = services.bell.listBellLog().slice(-8).reverse().map((line) => `<div class="mg-bell-msg">${esc(line.text)}</div>`).join('') || '<div class="mg-bell-empty">nothing here</div>';
        for (const rec of services.bell.listBellLog({ unseenOnly: true })) services.bell.markBellSeen(rec.id);
        refreshDot();
      }
    });
    bellDotUnsub = services.bell.subscribeToBell(refreshDot);
    refreshDot();
  }

  render();

  return {
    destroy() {
      mounted?.destroy?.();
      if (bellDotUnsub) { bellDotUnsub(); bellDotUnsub = null; }
      services.destroy();
      persist();
      host.innerHTML = '';
    },
    _debug: {
      getSave: () => saveData,
      reset: () => { saveData = resetSave(); ensureStageStates(saveData); render(); },
      selectStage,
    },
  };
}
