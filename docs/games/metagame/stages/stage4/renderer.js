// renderer.js — Stage 4 Fractal Bastion: the tower-defense game (wires the engine into the UI).
// Play waves to earn Cycles, place towers to cover the recursion points, read the blueprint (the
// un-cheat), then confront The Infinite Loop — reachable ONLY at the final wave, never from the
// start. The rAF loop drives live play; a __fvStage4 test hook drives the headless smoke (it never
// bypasses the boss gate, which still requires the blueprint action + tower coverage).

import { buildPath, waveGroupDepth } from './lsystem.js';
import { boardText } from './board.js';
import { startWave as engineStartWave, tick, waveComplete } from './engine.js';
import {
  cycleTowerTarget, fightInfiniteLoop, getBossLockState, getTowerCoverage, placeTower, pushLog,
} from './boss.js';
import { TOWER_TYPES } from './towers.js';
import { FINAL_WAVE } from './waves.js';
import { snapshotWave } from './state.js';
import { BTS_PATH, RECURSION_BLUEPRINT_PATH } from './messages.js';

const PLACEABLE = ['pulse_node', 'scatter_array', 'null_spike', 'attractor_field'];
const PERSIST_THROTTLE_MS = 1000; // mid-wave localStorage writes are throttled (the rAF loop is 60fps)

export function renderStage4(ctx) {
  const { host, state, actions, bts, viewer, save, onStageComplete, run } = ctx;
  const root = document.createElement('section');
  root.className = 'stage4-fractal-bastion';
  root.innerHTML = `
    <header class="s4-hud">
      <strong>FRACTAL BASTION</strong>
      <span>CYCLES <span data-field="cycles"></span></span>
      <span>INTEGRITY <span data-field="integrity"></span></span>
      <span>WAVE <span data-field="wave"></span></span>
      <span>POINTS <span data-field="coverage"></span></span>
    </header>
    <div class="s4-layout">
      <pre class="s4-board" aria-label="fractal bastion board"></pre>
      <section class="s4-panel">
        <div class="s4-boss-title">THE INFINITE LOOP</div>
        <div data-field="bossStatus"></div>
        <div class="s4-hint" data-field="hint"></div>
        <div class="s4-shop" data-field="shop"></div>
        <div class="s4-roster" data-field="roster"></div>
      </section>
    </div>
    <ol class="s4-log"></ol>
    <div class="s4-controls">
      <button type="button" data-action="start-wave">start wave</button>
      <button type="button" data-action="confront" hidden>confront The Infinite Loop</button>
      <button type="button" data-action="blueprint">open recursion_points.json</button>
      <button type="button" data-action="bts" hidden>open fractal_bastion.bts</button>
    </div>
  `;
  host.replaceChildren(root);

  const fields = Object.fromEntries([...root.querySelectorAll('[data-field]')].map((el) => [el.dataset.field, el]));
  const log = root.querySelector('.s4-log');
  const board = root.querySelector('.s4-board');
  const completeOnce = once((result) => onStageComplete?.(result));
  let selected = 'pulse_node';
  let path = rebuildPath();
  let raf = null;
  let lastPersistMs = -Infinity;

  function rebuildPath() {
    return buildPath(state.recursion?.pointSetId || 'x', waveGroupDepth(state.waveNumber || 1));
  }

  // Snapshot the in-flight wave into the run-state slot (in-memory, every tick — cheap). `save?.()`
  // (throttled / on hide / on settle) is what flushes that snapshot to localStorage for reload-resume.
  function checkpointWave(overrides) {
    if (run && typeof run.checkpoint === 'function') {
      run.checkpoint({ ...snapshotWave(state), ...overrides, runTag: run.seed });
    }
  }

  // When a wave ends, mark the snapshot non-resumable (waveActive:false) and flush it so a reload does
  // not re-resume (and re-clear) a wave that is already over.
  function endWaveSnapshot() {
    checkpointWave({ waveActive: false });
    if (run && typeof run.flush === 'function') run.flush();
  }

  function persistNow() {
    if (run && typeof run.flush === 'function') run.flush();
    save?.();
  }

  function repaint() {
    const lock = getBossLockState({ actions, state });
    const atBoss = (state.waveNumber || 1) >= FINAL_WAVE && !state.boss.defeated;
    fields.cycles.textContent = String(state.cycles);
    fields.integrity.textContent = String(state.integrity);
    fields.wave.textContent = `${Math.min(state.waveNumber || 1, FINAL_WAVE)}/${FINAL_WAVE}`;
    fields.coverage.textContent = `${lock.coveredPoints}/${lock.totalPoints}`;
    fields.bossStatus.textContent = `${lock.unlocked ? 'UNLOCKED' : 'LOCKED'} / hp ${state.boss.hp}`;
    fields.hint.textContent = lock.hint;
    fields.shop.replaceChildren(...shopRows());
    fields.roster.replaceChildren(...rosterRows());
    board.textContent = boardText(state, path.tiles);
    root.querySelector('[data-action="start-wave"]').hidden = atBoss || state.boss.defeated;
    root.querySelector('[data-action="confront"]').hidden = !atBoss;
    root.querySelector('[data-action="bts"]').hidden = !state.boss.defeated;
    log.replaceChildren(...(state.log || []).slice(-6).map((line) => {
      const li = document.createElement('li');
      li.textContent = line;
      return li;
    }));
  }

  function shopRows() {
    return PLACEABLE.map((type) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.tower = type;
      btn.className = type === selected ? 'is-selected' : '';
      btn.textContent = `${TOWER_TYPES[type].glyph} ${type} (${TOWER_TYPES[type].cost})`;
      return btn;
    });
  }

  // Tower roster: one button per placed tower; clicking cycles its targeting priority (First/Last/
  // Closest/Strongest/Weakest). AoE towers hit everything in range, so the mode is single-target only.
  function rosterRows() {
    return (state.towers || []).map((tower) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.towerId = tower.id;
      const def = TOWER_TYPES[tower.type] || {};
      const aoe = def.aoe ? ' (aoe)' : '';
      btn.textContent = `${def.glyph || '[?]'} ${tower.x},${tower.y} → ${String(tower.targetMode || 'first').toUpperCase()}${aoe}`;
      return btn;
    });
  }

  function startWaveAction() {
    if (state.waveActive || state.boss.defeated || (state.waveNumber || 1) >= FINAL_WAVE) return;
    path = rebuildPath();
    engineStartWave(state, state.waveNumber, path.tiles);
    lastPersistMs = -Infinity;
    checkpointWave();
    persistNow(); // persist the freshly-started wave so an immediate reload resumes it
    runLoop();
  }

  function runLoop() {
    stopLoop();
    let last = null;
    const step = (ts) => {
      const dt = last == null ? 16 : Math.min(100, ts - last);
      last = ts;
      tick(state, dt, path.tiles);
      checkpointWave();
      if (settleWave()) { raf = null; return; }
      if ((state.combatClockMs || 0) - lastPersistMs >= PERSIST_THROTTLE_MS) { lastPersistMs = state.combatClockMs; save?.(); }
      repaint();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  function stopLoop() { if (raf != null) { cancelAnimationFrame(raf); raf = null; } }

  // Returns true (and stops the loop) when the wave ends (cleared or failed).
  function settleWave() {
    if (state.waveFailed) { stopLoop(); pushLog(state, 'integrity collapsed — the bastion folds.'); endWaveSnapshot(); repaint(); save?.(); return true; }
    if (waveComplete(state)) { onWaveCleared(); endWaveSnapshot(); repaint(); save?.(); return true; }
    return false;
  }

  function onWaveCleared() {
    const prevDepth = waveGroupDepth(state.waveNumber);
    state.waveNumber = (state.waveNumber || 1) + 1;
    state.integrity = Math.min(100, (state.integrity || 0) + 10); // small regen between waves
    if (waveGroupDepth(state.waveNumber) !== prevDepth) path = rebuildPath();
  }

  function confront() {
    if ((state.waveNumber || 1) < FINAL_WAVE) return;
    const result = fightInfiniteLoop({ state, actions });
    if (result.defeated) {
      if (run && typeof run.reset === 'function') run.reset(); // stage cleared → drop the resume slot
      completeOnce({ stage: 4, defeated: true, btsPath: BTS_PATH });
    }
  }

  function place(x, y, type) {
    const r = placeTower(state, { x, y, type: type || selected });
    repaint(); save?.();
    return r;
  }

  root.addEventListener('click', (event) => {
    const rosterBtn = event.target.closest('button[data-tower-id]');
    if (rosterBtn) { cycleTowerTarget(state, rosterBtn.dataset.towerId); repaint(); save?.(); return; }
    const towerBtn = event.target.closest('button[data-tower]');
    if (towerBtn) { selected = towerBtn.dataset.tower; repaint(); return; }
    const cell = boardCell(event);
    if (cell) { place(cell.x, cell.y); return; }
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    switch (button.dataset.action) {
      case 'start-wave': startWaveAction(); break;
      case 'confront': confront(); break;
      case 'blueprint':
        // NO in-game bypass: opening the REAL static file fires 4.recursion_blueprint_read via
        // openViewerFile → recordMetagameViewerOpen (basename recursion_points.json). This button is
        // only a navigation hint to that file; it never sets the action itself.
        viewer?.openFile?.(RECURSION_BLUEPRINT_PATH, { mime: 'application/json', source: 'stage4' });
        break;
      case 'bts': bts?.open?.(4); break;
      default: return;
    }
    save?.();
    repaint();
  });

  // Map a click on the board <pre> to a grid cell (best-effort char math; live play only).
  function boardCell(event) {
    if (!event.target.closest('.s4-board')) return null;
    const rect = board.getBoundingClientRect();
    const cols = (board.textContent.split('\n')[0] || '').length || 40;
    const rows = board.textContent.split('\n').length || 40;
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * cols);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * rows);
    if (x < 0 || y < 0 || x >= cols || y >= rows) return null;
    return { x, y };
  }

  // TEST/DEBUG hook (not a player affordance): drives the smoke without brittle pixel clicks. It does
  // NOT bypass the boss gate — confront still needs the blueprint action + tower coverage.
  window.__fvStage4 = {
    state: () => state,
    startWave: startWaveAction,
    // Advance the active wave synchronously (no rAF) for deterministic headless testing.
    advance(ms = 20000, dt = 100) {
      let t = 0;
      while (t < ms && state.waveActive) { tick(state, dt, path.tiles); checkpointWave(); if (settleWave()) break; t += dt; }
      repaint();
    },
    setWave(n) { state.waveNumber = Math.max(1, Math.trunc(n) || 1); path = rebuildPath(); repaint(); },
    place,
    cycleTarget(id) { const m = cycleTowerTarget(state, id); repaint(); return m; },
    confront,
  };

  // Persist the in-flight wave to localStorage when the tab is hidden / unloaded so a reload resumes
  // the exact wave (the rAF loop only saves on a throttle / wave end).
  const onHide = () => { if (typeof document === 'undefined' || document.visibilityState === 'hidden') persistNow(); };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onHide);
  if (typeof window !== 'undefined') window.addEventListener('pagehide', persistNow);

  // Resume a mid-flight wave restored by mountStage (state.waveActive true on entry).
  if (state.waveActive && !state.boss.defeated && (state.waveNumber || 1) < FINAL_WAVE) {
    path = rebuildPath();
    runLoop();
  }

  repaint();
  return {
    repaint,
    destroy() {
      stopLoop();
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onHide);
      if (typeof window !== 'undefined') window.removeEventListener('pagehide', persistNow);
      if (window.__fvStage4) delete window.__fvStage4;
      root.remove();
    },
  };
}

function once(fn) {
  let called = false;
  return (value) => { if (called) return; called = true; fn(value); };
}
