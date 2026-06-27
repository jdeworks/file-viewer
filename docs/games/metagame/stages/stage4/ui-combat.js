// ui-combat.js — Stage 4 Fractal Bastion: the tower-defense combat board.
//
// Used for BOTH a campaign map (mode 'map': play the map's waves) and the boss arena (mode 'boss':
// place coverage, then confront The Infinite Loop). Renders the ASCII board + tower shop + roster,
// runs the rAF tick loop (map mode), and exposes a synchronous advance() for the headless smoke.
// Pacing: tight spawn cadence (waves.js) + fast-forward 1×/2×/3× + call-wave-early bonus; the player
// calls each wave (no forced inter-wave gap). Campaign transitions are delegated to the controller.

import { buildPath } from './lsystem.js';
import { boardText } from './board.js';
import { startWave as engineStartWave, tick, waveComplete, queueWave } from './engine.js';
import { cycleTowerTarget, getBossLockState, placeTower, pushLog, fightInfiniteLoop } from './boss.js';
import { TOWER_TYPES } from './towers.js';
import { snapshotWave } from './state.js';
import { mapByIndex, mapPathSeed } from './maps.js';

const PLACEABLE = ['pulse_node', 'scatter_array', 'null_spike', 'attractor_field'];
const PERSIST_THROTTLE_MS = 1000;
const CALL_EARLY_BONUS = 20;
const SPEEDS = [1, 2, 3];

export function mountCombat({ host, state, controller, mode = 'map' }) {
  const isBoss = mode === 'boss';
  const mapIndex = state.campaign?.mapIndex ?? 0;
  const map = mapByIndex(mapIndex);

  const root = document.createElement('section');
  root.className = 'stage4-combat';
  root.innerHTML = `
    <header class="s4-hud">
      <strong>${isBoss ? 'THE INFINITE LOOP' : `${map.glyph} ${map.name.toUpperCase()}`}</strong>
      <span>CYCLES <span data-field="cycles"></span></span>
      <span>INTEGRITY <span data-field="integrity"></span></span>
      <span>${isBoss ? 'POINTS' : 'WAVE'} <span data-field="progress"></span></span>
      <button type="button" data-action="leave" class="s4-leave">${isBoss ? 'retreat' : '← maps'}</button>
    </header>
    <div class="s4-layout">
      <pre class="s4-board" aria-label="fractal bastion board"></pre>
      <section class="s4-panel">
        <div class="s4-hint" data-field="hint"></div>
        <div class="s4-shop" data-field="shop"></div>
        <div class="s4-roster" data-field="roster"></div>
      </section>
    </div>
    <ol class="s4-log"></ol>
    <div class="s4-controls">
      ${isBoss ? '' : `
        <button type="button" data-action="start-wave">start wave</button>
        <button type="button" data-action="call-early" hidden>call next wave (+${CALL_EARLY_BONUS})</button>
        <button type="button" data-action="speed">speed 1×</button>`}
      ${isBoss ? '<button type="button" data-action="confront">confront The Infinite Loop</button>' : ''}
      <button type="button" data-action="blueprint">open recursion_points.json</button>
    </div>
  `;
  host.replaceChildren(root);

  const fields = Object.fromEntries([...root.querySelectorAll('[data-field]')].map((el) => [el.dataset.field, el]));
  const logEl = root.querySelector('.s4-log');
  const board = root.querySelector('.s4-board');
  let selected = 'pulse_node';
  let speed = 1;
  let raf = null;
  let lastPersistMs = -Infinity;
  let alive = true;
  let path = buildPath(isBoss ? (state.recursion?.pointSetId || 'x') : mapPathSeed(state.recursion?.pointSetId, mapIndex), isBoss ? 3 : map.depth);
  if (!Number.isFinite(state.wavePeak)) state.wavePeak = state.waveNumber || 1;

  // ── persistence ──────────────────────────────────────────────────────────
  function checkpointWave(overrides) { controller.checkpointWave?.({ ...snapshotWave(state), ...overrides }); }
  function endWaveSnapshot() { controller.endWaveSnapshot?.(); }

  // ── render ───────────────────────────────────────────────────────────────
  function repaint() {
    if (!alive) return;
    const lock = getBossLockState({ actions: controller.actions, state });
    fields.cycles.textContent = String(state.cycles);
    fields.integrity.textContent = `${state.integrity}/${state.maxIntegrity || state.integrity}`;
    fields.progress.textContent = isBoss
      ? `${lock.coveredPoints}/${lock.totalPoints}`
      : `${Math.min(state.waveNumber || 1, map.waveCount)}/${map.waveCount}`;
    fields.hint.textContent = isBoss ? lock.hint : (state.waveActive ? 'hold the line — call the next wave early for bonus cycles' : 'place towers, then start the wave');
    fields.shop.replaceChildren(...shopRows());
    fields.roster.replaceChildren(...rosterRows());
    board.textContent = boardText(state, path.tiles);
    if (!isBoss) {
      root.querySelector('[data-action="call-early"]').hidden = !state.waveActive || (state.wavePeak || 1) >= map.waveCount;
      root.querySelector('[data-action="speed"]').textContent = `speed ${speed}×`;
    }
    logEl.replaceChildren(...(state.log || []).slice(-6).map((line) => { const li = document.createElement('li'); li.textContent = line; return li; }));
  }

  function shopRows() {
    return PLACEABLE.map((type) => {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.dataset.tower = type;
      btn.className = type === selected ? 'is-selected' : '';
      btn.textContent = `${TOWER_TYPES[type].glyph} ${type} (${TOWER_TYPES[type].cost})`;
      return btn;
    });
  }
  function rosterRows() {
    return (state.towers || []).map((tower) => {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.dataset.towerId = tower.id;
      const def = TOWER_TYPES[tower.type] || {};
      btn.textContent = `${def.glyph || '[?]'} ${tower.x},${tower.y} → ${String(tower.targetMode || 'first').toUpperCase()}${def.aoe ? ' (aoe)' : ''}`;
      return btn;
    });
  }

  // ── wave loop (map mode) ─────────────────────────────────────────────────
  function startWaveAction() {
    if (isBoss || state.waveActive || (state.waveNumber || 1) > map.waveCount) return;
    engineStartWave(state, state.waveNumber, path.tiles);
    state.wavePeak = state.waveNumber;
    lastPersistMs = -Infinity;
    checkpointWave(); controller.persist?.();
    runLoop();
  }

  // Call the next wave while the current one is still live: pour its enemies in for bonus cycles.
  function callEarly() {
    if (isBoss || !state.waveActive || (state.wavePeak || 1) >= map.waveCount) return;
    state.wavePeak = (state.wavePeak || state.waveNumber) + 1;
    queueWave(state, state.wavePeak);
    state.cycles = (state.cycles || 0) + CALL_EARLY_BONUS;
    pushLog(state, `wave ${state.wavePeak} called early (+${CALL_EARLY_BONUS} cycles).`);
    checkpointWave(); repaint();
  }

  function setSpeed(n) {
    speed = SPEEDS.includes(Number(n)) ? Number(n) : SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    repaint();
    return speed;
  }

  function runLoop() {
    stopLoop();
    let last = null;
    const stepFn = (ts) => {
      const dt = (last == null ? 16 : Math.min(100, ts - last)) * speed;
      last = ts;
      tick(state, dt, path.tiles);
      checkpointWave();
      if (settleWave()) { raf = null; return; }
      if ((state.combatClockMs || 0) - lastPersistMs >= PERSIST_THROTTLE_MS) { lastPersistMs = state.combatClockMs; controller.persist?.(); }
      repaint();
      raf = requestAnimationFrame(stepFn);
    };
    raf = requestAnimationFrame(stepFn);
  }
  function stopLoop() { if (raf != null) { cancelAnimationFrame(raf); raf = null; } }

  // Returns true (and stops the loop) when the wave ends. On a map clear it asks the controller to
  // re-render (→ Armory), which destroys THIS component — so guard everything after with `alive`.
  function settleWave() {
    if (state.waveFailed) {
      stopLoop(); pushLog(state, 'integrity collapsed — the bastion folds.'); endWaveSnapshot();
      controller.onWaveFailed?.(); repaint(); controller.persist?.(); return true;
    }
    if (waveComplete(state)) {
      const cleared = creditWaves();
      endWaveSnapshot(); controller.persist?.();
      if (cleared) { stopLoop(); controller.rerender(); return true; }
      repaint();
      return true;
    }
    return false;
  }

  // Credit every wave whose enemies were in the cleared blob (≥1; more if waves were called early).
  function creditWaves() {
    const target = Math.max(state.wavePeak || state.waveNumber, state.waveNumber);
    let cleared = false;
    while ((state.waveNumber || 1) <= target && !cleared) {
      const r = controller.recordWaveCleared();
      if (r.mapCleared) cleared = true;
    }
    if (!cleared) state.wavePeak = state.waveNumber;
    return cleared;
  }

  // ── boss ─────────────────────────────────────────────────────────────────
  function confront() {
    if (!isBoss) return null;
    const result = fightInfiniteLoop({ state, actions: controller.actions });
    if (result.defeated) { controller.onBossWin(); return result; }
    repaint(); controller.persist?.();
    return result;
  }

  // ── placement ────────────────────────────────────────────────────────────
  function place(x, y, type) {
    const r = placeTower(state, { x, y, type: type || selected });
    repaint(); controller.persist?.();
    return r;
  }
  function cycleTarget(id) { const m = cycleTowerTarget(state, id); repaint(); controller.persist?.(); return m; }
  function setWave(n) { state.waveNumber = Math.max(1, Math.trunc(n) || 1); state.wavePeak = state.waveNumber; repaint(); }

  // ── events ───────────────────────────────────────────────────────────────
  root.addEventListener('click', (event) => {
    const rosterBtn = event.target.closest('button[data-tower-id]');
    if (rosterBtn) { cycleTarget(rosterBtn.dataset.towerId); return; }
    const towerBtn = event.target.closest('button[data-tower]');
    if (towerBtn) { selected = towerBtn.dataset.tower; repaint(); return; }
    const cell = boardCell(event);
    if (cell) { place(cell.x, cell.y); return; }
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    switch (button.dataset.action) {
      case 'start-wave': startWaveAction(); break;
      case 'call-early': callEarly(); break;
      case 'speed': setSpeed(); break;
      case 'confront': confront(); break;
      case 'leave': stopLoop(); controller.leaveCombat?.(); break;
      case 'blueprint': controller.openBlueprint?.(); break;
      default: break;
    }
  });

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

  // Resume a mid-flight wave restored by the dispatcher (state.waveActive true on entry).
  if (!isBoss && state.waveActive && (state.waveNumber || 1) <= map.waveCount) runLoop();

  repaint();
  return {
    repaint,
    destroy() { alive = false; stopLoop(); root.remove(); },
    hook: {
      // Synchronous wave runner for the headless smoke (no rAF).
      advance(ms = 30000, dt = 100) {
        let t = 0;
        while (t < ms && state.waveActive) { tick(state, dt * speed, path.tiles); checkpointWave(); if (settleWave()) break; t += dt; }
        if (alive) repaint();
      },
      startWave: startWaveAction, callEarly, setSpeed, place, cycleTarget, setWave, confront,
    },
  };
}
