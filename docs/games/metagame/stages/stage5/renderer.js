import { getBossLockState, raceTheJammer } from './boss.js';
import { runCalibrationTimeline } from './calibration.js';
import { createGameLoop } from './game-loop.js';
import { createEngine } from './engine.js';
import { renderTrackGrid } from './render-track.js';
import { ROUNDS, roundByIdx, isBossRound, FINAL_ROUND_ID } from './rounds.js';
import { UPGRADES, buyUpgrade } from './shop.js';
import { roundLogLine, GLYPH_LEGEND } from './content.js';
import { BTS_PATH, TRANSMISSION_HUM_PATH } from './messages.js';

const BOSS_IDX = ROUNDS.length - 1;

export function renderStage5(ctx) {
  const { host, state, actions, achievements, bell, bts, viewer, save, onStageComplete } = ctx;
  const root = document.createElement('section');
  root.className = 'stage5-signal-racer';
  root.tabIndex = 0;
  root.innerHTML = `
    <header class="s5-hud">
      <strong>SIGNAL RACER</strong>
      <span>ROUND <span data-field="round"></span></span>
      <span>INTEGRITY <span data-field="integrity"></span></span>
      <span>PACKETS <span data-field="packets"></span></span>
      <span>CALIBRATION <span data-field="calib"></span></span>
    </header>
    <div class="s5-layout">
      <pre class="s5-track-grid" data-field="arena" aria-label="signal racer track"></pre>
      <aside class="s5-side">
        <div class="s5-rounds" data-field="rounds"></div>
        <div class="s5-shop" data-field="shop"></div>
        <pre class="s5-legend" data-field="legend"></pre>
      </aside>
    </div>
    <section class="s5-boss-panel">
      <strong>THE JAMMER</strong>
      <div data-field="bossState"></div>
      <div class="s5-hint" data-field="hint"></div>
    </section>
    <ol class="s5-log"></ol>
    <div class="s5-controls">
      <button type="button" data-action="audio">open transmission_hum.mp3</button>
      <button type="button" data-action="bts" hidden>open signal_racer.bts</button>
    </div>
  `;
  host.replaceChildren(root);

  const fields = Object.fromEntries([...root.querySelectorAll('[data-field]')].map((el) => [el.dataset.field, el]));
  const log = root.querySelector('.s5-log');
  const completeOnce = once((result) => onStageComplete?.(result));

  let loop = null;
  let engine = null;
  let mode = 'select'; // 'select' | 'playing' | 'result'

  fields.legend.textContent = GLYPH_LEGEND.map(([g, t]) => `${g}  ${t}`).join('\n');

  function calibrated() {
    return getBossLockState({ actions, state }).unlocked;
  }

  function unlockedRounds() {
    return Math.min(BOSS_IDX, Number(state.run.clearedRounds || 0));
  }

  function startRound(idx) {
    if (mode === 'playing') return;
    const roundIdx = Math.max(0, Math.min(BOSS_IDX, Number(idx) || 0));
    if (roundIdx > unlockedRounds()) return;                 // gated: clear the prior rounds first
    if (isBossRound(roundIdx) && state.run.clearedRounds < BOSS_IDX) return; // boss only after the run
    loop = createGameLoop({
      state, seed: state.calibration.seed, roundIdx, calibrated: calibrated(),
      onPaint: paintArena,
      onEnd: handleEnd,
    });
    mode = 'playing';
    engine = createEngine({ onTick: () => loop.step(), getTickMs: () => loop.round.tickMs });
    engine.start();
    loop.paint();
    repaint();
  }

  function handleEnd({ result, round, roundIdx, packets }) {
    engine?.stop();
    engine = null;
    mode = 'result';
    if (result === 'clear') {
      pushLog(roundLogLine(roundIdx) + (packets ? ` (+${packets} packets)` : ''));
      if (!isBossRound(roundIdx)) {
        state.run.clearedRounds = Math.max(Number(state.run.clearedRounds || 0), roundIdx + 1);
      } else {
        const r = raceTheJammer({ state, actions });
        if (r.defeated) completeOnce({ stage: 5, defeated: true, btsPath: BTS_PATH });
      }
    } else {
      pushLog(round.id === FINAL_ROUND_ID
        ? 'the jammer held the throttle down. the counter-wave is not calibrated.'
        : 'signal integrity collapsed. recalibrate and run it again.');
    }
    persistAndPaint();
  }

  function paintArena(view) {
    fields.arena.textContent = renderTrackGrid({ table: view.table, tick: view.tick, lane: view.lane, lookAhead: view.lookAhead });
    fields.integrity.textContent = `${Math.round(view.integrity)}%`;
  }

  function repaint() {
    const lock = getBossLockState({ actions, state });
    const idx = Number(state.run.roundIdx || 0);
    fields.round.textContent = `${roundByIdx(idx).id}/${FINAL_ROUND_ID} ${roundByIdx(idx).label}`;
    if (mode !== 'playing') fields.integrity.textContent = `${Math.round(state.run.integrity)}%`;
    fields.packets.textContent = String(state.packets);
    fields.calib.textContent = lock.unlocked ? 'LOCKED-IN' : 'uncalibrated';
    fields.bossState.textContent = state.boss.defeated
      ? 'defeated. BTS trace available.'
      : `${lock.jammerSuppression} / ${lock.unlocked ? 'beatable' : 'suppression dominant'}`;
    fields.hint.textContent = lock.hint;
    renderRoundButtons();
    renderShop();
    root.querySelector('[data-action="bts"]').hidden = !state.boss.defeated;
    log.replaceChildren(...state.log.slice(-6).map((line) => {
      const li = document.createElement('li');
      li.textContent = line;
      return li;
    }));
  }

  function renderRoundButtons() {
    const unlocked = unlockedRounds();
    const cleared = Number(state.run.clearedRounds || 0);
    fields.rounds.replaceChildren(...ROUNDS.map((round, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.startRound = String(i);
      const boss = isBossRound(i);
      const locked = boss ? cleared < BOSS_IDX : i > unlocked;
      btn.disabled = locked || mode === 'playing';
      btn.textContent = `${round.id}. ${round.label}${i < cleared ? ' ✓' : ''}${locked ? ' 🔒' : ''}`;
      if (boss) btn.classList.add('s5-boss-btn');
      return btn;
    }));
  }

  function renderShop() {
    fields.shop.replaceChildren(...UPGRADES.map((u) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.buy = u.id;
      const owned = Boolean(state.shop?.[u.id]);
      btn.disabled = owned || mode === 'playing' || Number(state.packets) < u.cost;
      btn.title = u.desc;
      btn.textContent = owned ? `${u.label} ✓` : `${u.label} (${u.cost}p)`;
      return btn;
    }));
  }

  root.addEventListener('click', (event) => {
    const startBtn = event.target.closest('button[data-start-round]');
    if (startBtn) { startRound(Number(startBtn.dataset.startRound)); return; }
    const buyBtn = event.target.closest('button[data-buy]');
    if (buyBtn) { buyUpgrade(state, buyBtn.dataset.buy); persistAndPaint(); return; }
    const action = event.target.closest('button[data-action]');
    if (!action) return;
    if (action.dataset.action === 'audio') {
      viewer?.openFile?.(TRANSMISSION_HUM_PATH, { mime: 'audio/mpeg', source: 'stage5' });
    }
    if (action.dataset.action === 'bts') bts?.open?.(5);
    persistAndPaint();
  });

  const onKey = (event) => {
    if (mode !== 'playing' || !loop) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      loop.handleKey(event.key);
    }
  };
  root.addEventListener('keydown', onKey);

  repaint();

  // TEST/DEBUG hook (not a player affordance): drives the racer deterministically for the smoke. It
  // does NOT bypass anything — solveRun plays each real round optimally, and the boss still needs the
  // calibrated counter-wave (the real un-cheat = playing transmission_hum.mp3 for one full loop).
  window.__fvStage5 = {
    state: () => state,
    startRound,
    solveRound() { if (loop && mode === 'playing') return loop.autoSolve(); return null; },
    solveRun() {
      for (let i = 0; i < BOSS_IDX; i += 1) { startRound(i); if (loop && mode === 'playing') loop.autoSolve(); }
      return Number(state.run.clearedRounds || 0);
    },
    calibrate() {
      const samples = Array.from({ length: 16 }, (_, i) => ({ atMs: i * 1000, active: true, seeking: false }));
      runCalibrationTimeline({ state, actions, achievements, bell, file: TRANSMISSION_HUM_PATH, samples });
      persistAndPaint();
      return calibrated();
    },
    solveBoss() { startRound(BOSS_IDX); if (loop && mode === 'playing') return loop.autoSolve(); return null; },
  };

  return {
    repaint,
    destroy() {
      engine?.stop();
      if (window.__fvStage5) delete window.__fvStage5;
      root.removeEventListener('keydown', onKey);
      root.remove();
    },
  };

  function pushLog(line) {
    state.log = [...(state.log || []), line].slice(-8);
  }

  function persistAndPaint() {
    save?.();
    repaint();
  }
}

function once(fn) {
  let called = false;
  return (value) => {
    if (called) return;
    called = true;
    fn(value);
  };
}
