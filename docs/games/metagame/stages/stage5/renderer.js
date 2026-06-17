import { getBossLockState, raceTheJammer } from './boss.js';
import { applyCalibrationTick } from './calibration.js';
import { raceHudModel } from './content.js';
import { BTS_PATH, LOOP_DURATION_MS, TRANSMISSION_HUM_PATH } from './messages.js';

export function renderStage5(ctx) {
  const { host, state, actions, achievements, bell, bts, viewer, save, onStageComplete } = ctx;
  const root = document.createElement('section');
  root.className = 'stage5-signal-racer';
  root.innerHTML = `
    <header class="s5-hud">
      <strong>SIGNAL RACER</strong>
      <span data-field="position"></span>
      <span>LAP <span data-field="lap"></span></span>
      <span>TIME <span data-field="time"></span></span>
      <span>BOOST <span data-field="boost"></span></span>
      <span>INTEGRITY <span data-field="integrity"></span></span>
    </header>
    <div class="s5-track" aria-label="signal racer track">
      <div class="s5-car player"></div>
      <div class="s5-car jammer"></div>
    </div>
    <section class="s5-wave-panel">
      <div>JAMMER <span data-field="jammerWave"></span></div>
      <div>COUNTER <span data-field="counterWave"></span></div>
      <div class="s5-hint" data-field="hint"></div>
    </section>
    <ol class="s5-log"></ol>
    <div class="s5-controls">
      <button type="button" data-action="audio">open transmission_hum.mp3</button>
      <button type="button" data-action="calibrate">simulate full loop</button>
      <button type="button" data-action="boss">race The Jammer</button>
      <button type="button" data-action="bts" hidden>open signal_racer.bts</button>
    </div>
  `;
  host.replaceChildren(root);

  const fields = Object.fromEntries([...root.querySelectorAll('[data-field]')].map((el) => [el.dataset.field, el]));
  const log = root.querySelector('.s5-log');
  const completeOnce = once((result) => onStageComplete?.(result));

  function repaint() {
    const lock = getBossLockState({ actions, state });
    const hud = raceHudModel({ state, calibrated: lock.unlocked });
    fields.position.textContent = hud.position;
    fields.lap.textContent = hud.lap;
    fields.time.textContent = hud.time;
    fields.boost.textContent = hud.boost;
    fields.integrity.textContent = hud.integrity;
    fields.jammerWave.textContent = waveGlyphs(hud.jammerWave);
    fields.counterWave.textContent = hud.counterWave.length ? waveGlyphs(hud.counterWave) : 'not calibrated';
    fields.hint.textContent = `${lock.jammerSuppression} / ${lock.hint}`;
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
    if (button.dataset.action === 'audio') viewer?.openFile?.(TRANSMISSION_HUM_PATH, { mime: 'audio/mpeg', source: 'stage5' });
    if (button.dataset.action === 'calibrate') {
      applyCalibrationTick({
        state,
        actions,
        achievements,
        bell,
        file: TRANSMISSION_HUM_PATH,
        deltaMs: LOOP_DURATION_MS,
        active: true,
      });
    }
    if (button.dataset.action === 'boss') {
      const result = raceTheJammer({ state, actions });
      if (result.defeated) completeOnce({ stage: 5, defeated: true, btsPath: BTS_PATH });
    }
    if (button.dataset.action === 'bts') bts?.open?.(5);
    save?.();
    repaint();
  });

  repaint();
  return { repaint, destroy() { root.remove(); } };
}

function waveGlyphs(samples) {
  return samples.map((value) => (value > 0.35 ? '^' : value < -0.35 ? 'v' : '-')).join('');
}

function once(fn) {
  let called = false;
  return (value) => {
    if (called) return;
    called = true;
    fn(value);
  };
}
