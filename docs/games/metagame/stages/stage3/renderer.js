import { defeatMemoryLeak, getBossLockState, tryRestoreDiffKey } from './boss.js';
import { memoryV1Text, memoryV2Text } from './content.js';
import { BTS_PATH, MEMORY_V1_PATH, MEMORY_V2_PATH } from './messages.js';

export function renderStage3(ctx) {
  const { host, state, actions, achievements, bell, bts, viewer, save, onStageComplete } = ctx;
  const root = document.createElement('section');
  root.className = 'stage3-memory-grid';
  root.innerHTML = `
    <header class="s3-hud">
      <strong>MEMORY GRID</strong>
      <span>REGISTERS <span data-field="registers"></span></span>
      <span>RETAINED <span data-field="retained"></span>/8</span>
      <span>KEY ID <span data-field="keyId"></span></span>
    </header>
    <div class="s3-layout">
      <aside class="s3-library"></aside>
      <main>
        <pre class="s3-grid" aria-label="memory nonogram preview"></pre>
        <section class="s3-boss">
          <div class="s3-boss-title">THE MEMORY LEAK</div>
          <div data-field="bossStatus"></div>
          <div class="s3-hint" data-field="hint"></div>
          <label class="s3-key-label">restoration key <input class="s3-key" spellcheck="false"></label>
        </section>
      </main>
    </div>
    <ol class="s3-log"></ol>
    <div class="s3-controls">
      <button type="button" data-action="v1">open memory_v1.log</button>
      <button type="button" data-action="v2">open memory_v2.log</button>
      <button type="button" data-action="restore">restore key</button>
      <button type="button" data-action="boss">solve leak</button>
      <button type="button" data-action="bts" hidden>open memory_grid.bts</button>
    </div>
  `;
  host.replaceChildren(root);

  const fields = Object.fromEntries([...root.querySelectorAll('[data-field]')].map((el) => [el.dataset.field, el]));
  const log = root.querySelector('.s3-log');
  const keyInput = root.querySelector('.s3-key');
  const completeOnce = once((result) => onStageComplete?.(result));

  function repaint() {
    const lock = getBossLockState({ actions, state });
    fields.registers.textContent = String(state.registers);
    fields.retained.textContent = String(state.retained);
    fields.keyId.textContent = state.memoryPair.runId;
    fields.bossStatus.textContent = `${lock.unlocked ? 'UNLOCKED' : 'LOCKED'} / columns ${lock.columnClues} / corruption ${lock.corruptionRate}`;
    fields.hint.textContent = lock.hint;
    root.querySelector('.s3-grid').textContent = memoryGrid(lock.unlocked);
    root.querySelector('.s3-library').innerHTML = fragmentLibrary(state);
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
    if (button.dataset.action === 'v1') viewer?.openFile?.(MEMORY_V1_PATH, { text: memoryV1Text(state), source: 'stage3' });
    if (button.dataset.action === 'v2') viewer?.openFile?.(MEMORY_V2_PATH, { text: memoryV2Text(state), source: 'stage3' });
    if (button.dataset.action === 'restore') tryRestoreDiffKey({ state, actions, achievements, bell, input: keyInput.value });
    if (button.dataset.action === 'boss' && defeatMemoryLeak(state)) {
      completeOnce({ stage: 3, defeated: true, btsPath: BTS_PATH });
    }
    if (button.dataset.action === 'bts') bts?.open?.(3);
    save?.();
    repaint();
  });

  repaint();
  return { repaint, destroy() { root.remove(); } };
}

function memoryGrid(unlocked) {
  const cols = unlocked ? '2 1 3 1 2' : '? ? ? ? ?';
  return [
    `columns: ${cols}`,
    'rows:    1 3 1 3 1',
    '',
    unlocked ? '. # . # .' : '. ? . ? .',
    unlocked ? '# # # . .' : '? ? ? . .',
    unlocked ? '. # . . #' : '. ? . . ?',
    unlocked ? '. . # # #' : '. . ? ? ?',
    unlocked ? '# . . # .' : '? . . ? .',
  ].join('\n');
}

function fragmentLibrary(state) {
  const retained = Number(state.retained || 0);
  return Array.from({ length: 4 }, (_, i) => {
    const active = i < retained;
    return `<div class="s3-fragment${active ? ' retained' : ''}">fragment ${i + 1}: ${active ? 'retained' : 'unstable'}</div>`;
  }).join('');
}

function once(fn) {
  let called = false;
  return (value) => {
    if (called) return;
    called = true;
    fn(value);
  };
}
