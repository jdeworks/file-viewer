import {
  applyRecursionBlueprintOpen,
  fightInfiniteLoop,
  getBossLockState,
  getTowerCoverage,
  placeTower,
} from './boss.js';
import { recursionBlueprintContent } from './content.js';
import { BTS_PATH, RECURSION_BLUEPRINT_PATH } from './messages.js';

export function renderStage4(ctx) {
  const { host, state, actions, achievements, bell, bts, viewer, save, onStageComplete } = ctx;
  const root = document.createElement('section');
  root.className = 'stage4-fractal-bastion';
  root.innerHTML = `
    <header class="s4-hud">
      <strong>FRACTAL BASTION</strong>
      <span>CYCLES <span data-field="cycles"></span></span>
      <span>WAVE <span data-field="wave"></span></span>
      <span>POINTS <span data-field="coverage"></span></span>
    </header>
    <div class="s4-layout">
      <pre class="s4-board" aria-label="fractal bastion board"></pre>
      <section class="s4-panel">
        <div class="s4-boss-title">THE INFINITE LOOP</div>
        <div data-field="bossStatus"></div>
        <div class="s4-hint" data-field="hint"></div>
        <div class="s4-points"></div>
      </section>
    </div>
    <ol class="s4-log"></ol>
    <div class="s4-controls">
      <button type="button" data-action="blueprint">open recursion_points.json</button>
      <button type="button" data-action="tower">place pulse at next point</button>
      <button type="button" data-action="boss">run boss wave</button>
      <button type="button" data-action="bts" hidden>open fractal_bastion.bts</button>
    </div>
  `;
  host.replaceChildren(root);

  const fields = Object.fromEntries([...root.querySelectorAll('[data-field]')].map((el) => [el.dataset.field, el]));
  const log = root.querySelector('.s4-log');
  const completeOnce = once((result) => onStageComplete?.(result));

  function repaint() {
    const lock = getBossLockState({ actions, state });
    fields.cycles.textContent = String(state.cycles);
    fields.wave.textContent = String(state.wave);
    fields.coverage.textContent = `${lock.coveredPoints}/${lock.totalPoints}`;
    fields.bossStatus.textContent = `${lock.unlocked ? 'UNLOCKED' : 'LOCKED'} / vulnerability ${lock.vulnerability} / hp ${state.boss.hp}`;
    fields.hint.textContent = lock.hint;
    root.querySelector('.s4-board').textContent = boardText(state);
    root.querySelector('.s4-points').replaceChildren(...pointRows(state));
    root.querySelector('[data-action="bts"]').hidden = !state.boss.defeated;
    log.replaceChildren(...state.log.slice(-6).map((line) => {
      const li = document.createElement('li');
      li.textContent = line;
      return li;
    }));
  }

  root.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    if (button.dataset.action === 'blueprint') {
      applyRecursionBlueprintOpen({ state, actions, achievements, bell, path: RECURSION_BLUEPRINT_PATH });
      viewer?.openFile?.(RECURSION_BLUEPRINT_PATH, {
        text: recursionBlueprintContent(state),
        mime: 'application/json',
        source: 'stage4',
      });
    }
    if (button.dataset.action === 'tower') {
      const point = getTowerCoverage(state).uncovered[0] || state.recursion.points[0];
      placeTower(state, { x: point.x, y: point.y, type: 'pulse_node' });
    }
    if (button.dataset.action === 'boss') {
      const result = fightInfiniteLoop({ state, actions });
      if (result.defeated) completeOnce({ stage: 4, defeated: true, btsPath: BTS_PATH });
    }
    if (button.dataset.action === 'bts') bts?.open?.(4);
    save?.();
    repaint();
  });

  repaint();
  return { repaint, destroy() { root.remove(); } };
}

function pointRows(state) {
  const coverage = getTowerCoverage(state);
  return state.recursion.points.map((point) => {
    const row = document.createElement('div');
    row.className = coverage.covered.includes(point) ? 'covered' : '';
    row.textContent = `${point.id}: ${point.x},${point.y} r${point.radius}`;
    return row;
  });
}

function boardText(state) {
  const width = 24;
  const height = 12;
  const grid = Array.from({ length: height }, () => Array.from({ length: width }, () => '.'));
  for (const point of state.recursion.points) {
    grid[point.y % height][point.x % width] = 'R';
  }
  for (const tower of state.towers) {
    grid[tower.y % height][tower.x % width] = 'T';
  }
  return grid.map((row) => row.join(' ')).join('\n');
}

function once(fn) {
  let called = false;
  return (value) => {
    if (called) return;
    called = true;
    fn(value);
  };
}
