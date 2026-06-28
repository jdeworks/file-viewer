// renderer.js — Stage 4 Fractal Bastion: the CAMPAIGN dispatcher.
//
// Stage 4 is a 5-map campaign (run4.js): the player clears maps of growing length (5/10/15/25/35
// waves), spends Glory in the Armory between maps, and may confront The Infinite Loop ONLY once all
// five maps are cleared (boss-never-from-start, enforced by run4). This module owns the screen
// container, the run-state wave snapshot, the save plumbing, and the __fvStage4 test hook; it
// delegates the actual screens to ui-combat.js (board) and ui-campaign.js (map-select / Armory).
//
// The blueprint un-cheat is unchanged and load-bearing: the boss folds all damage away until the REAL
// recursion_points.json file is opened in the viewer (action 4.recursion_blueprint_read), and only
// then does recursion-point coverage land damage — see boss.js / messages.js.

import { mountCombat } from './ui-combat.js';
import { renderMapSelect, renderArmory } from './ui-campaign.js';
import {
  ensureCampaign, selectMap, recordWaveCleared, leaveArmory, enterBoss, winCampaign,
  seatAtBoss, debugClearMap, bossUnlocked,
} from './run4.js';
import { buyArmory } from './armory.js';
import { snapshotWave, restoreWave } from './state.js';
import { BTS_PATH, RECURSION_BLUEPRINT_PATH } from './messages.js';

export function renderStage4(ctx) {
  const { host, state, actions, bts, viewer, save, onStageComplete, run } = ctx;
  ensureCampaign(state);
  ensureStyles();

  const root = document.createElement('section');
  root.className = 'stage4-fractal-bastion';
  root.innerHTML = '<div class="s4-screen" data-screen></div>';
  host.replaceChildren(root);
  const screen = root.querySelector('[data-screen]');
  const completeOnce = once((result) => onStageComplete?.(result));
  let active = null;

  function persistNow() { run?.flush?.(); save?.(); }
  function checkpointWave(snap) { if (run?.checkpoint) run.checkpoint({ ...snap, runTag: run.seed }); }
  function endWaveSnapshot() { checkpointWave({ ...snapshotWave(state), waveActive: false }); run?.flush?.(); }

  const controller = {
    state, actions,
    persist: persistNow,
    checkpointWave,
    endWaveSnapshot,
    openBlueprint() {
      // NO in-game bypass: opening the REAL static file fires 4.recursion_blueprint_read via
      // recordMetagameViewerOpen. This button is only a navigation hint to that file.
      viewer?.openFile?.(RECURSION_BLUEPRINT_PATH, { mime: 'application/json', source: 'stage4' });
    },
    openBts() { bts?.open?.(4); },
    selectMap(i) { const r = selectMap(state, i); if (r.ok) { persistNow(); render(); } return r; },
    recordWaveCleared() { const r = recordWaveCleared(state); save?.(); return r; },
    leaveArmory() { leaveArmory(state); save?.(); render(); },
    leaveCombat() { ensureCampaign(state).status = 'map-select'; persistNow(); render(); },
    buyArmory(id) { const r = buyArmory(state.campaign, id); if (r.ok) { save?.(); active?.repaint?.(); } return r; },
    enterBoss() { const r = enterBoss(state); if (r.ok) { run?.reset?.(); persistNow(); render(); } return r; },
    onBossWin() { winCampaign(state); run?.reset?.(); persistNow(); render(); completeOnce({ stage: 4, defeated: true, btsPath: BTS_PATH }); },
    onWaveFailed() { /* the wave is lost; the player may retry it from the same map */ },
    rerender() { render(); },
    // debug-only (smoke); never a player affordance
    seatAtBoss() { seatAtBoss(state); persistNow(); render(); },
    debugClearMap() { debugClearMap(state); save?.(); render(); },
  };

  function destroyActive() { if (active?.destroy) active.destroy(); active = null; }

  function render() {
    destroyActive();
    const status = state.campaign.status;
    if (status === 'combat') active = mountCombat({ host: screen, state, controller, mode: 'map' });
    else if (status === 'boss') active = mountCombat({ host: screen, state, controller, mode: 'boss' });
    else if (status === 'armory') active = renderArmory(screen, controller);
    else active = renderMapSelect(screen, controller); // map-select | won
    refreshHook();
  }

  // Run-state resume: if we reload mid-combat with a matching live-wave snapshot, restore the wave
  // BEFORE the combat screen mounts (it resumes the rAF loop on entry when state.waveActive is true).
  if (state.campaign.status === 'combat' && run) {
    const snap = run.restore();
    if (snap && snap.runTag === run.seed && snap.waveActive && !state.boss?.defeated) restoreWave(state, snap);
  }

  function refreshHook() {
    // TEST/DEBUG hook (not a player affordance): drives the smoke without brittle pixel clicks. It
    // does NOT bypass the boss gate — the boss still needs all maps cleared + the blueprint + coverage.
    window.__fvStage4 = {
      state: () => state,
      status: () => state.campaign.status,
      selectMap: (i) => controller.selectMap(i),
      startWave: () => active?.hook?.startWave?.(),
      advance: (ms, dt) => active?.hook?.advance?.(ms, dt),
      callEarly: () => active?.hook?.callEarly?.(),
      setSpeed: (n) => active?.hook?.setSpeed?.(n),
      place: (x, y, t) => active?.hook?.place?.(x, y, t),
      setWave: (n) => active?.hook?.setWave?.(n),
      cycleTarget: (id) => active?.hook?.cycleTarget?.(id),
      upgrade: (id) => active?.hook?.upgrade?.(id),
      pickFork: (id, forkId) => active?.hook?.pickFork?.(id, forkId),
      confront: () => active?.hook?.confront?.(),
      buyArmory: (id) => controller.buyArmory(id),
      leaveArmory: () => controller.leaveArmory(),
      enterBoss: () => controller.enterBoss(),
      seatAtBoss: () => controller.seatAtBoss(),
      debugClearMap: () => controller.debugClearMap(),
      bossUnlocked: () => bossUnlocked(state),
    };
  }

  const onHide = () => { if (typeof document === 'undefined' || document.visibilityState === 'hidden') persistNow(); };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onHide);
  if (typeof window !== 'undefined') window.addEventListener('pagehide', persistNow);

  render();
  return {
    repaint: () => active?.repaint?.(),
    destroy() {
      destroyActive();
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onHide);
      if (typeof window !== 'undefined') window.removeEventListener('pagehide', persistNow);
      if (window.__fvStage4) delete window.__fvStage4;
      root.remove();
    },
  };
}

function ensureStyles() {
  const id = 'stage4-fractal-bastion-styles';
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id; link.rel = 'stylesheet';
  link.href = new URL('./styles.css', import.meta.url).href;
  document.head.append(link);
}

function once(fn) {
  let called = false;
  return (value) => { if (called) return; called = true; fn(value); };
}
