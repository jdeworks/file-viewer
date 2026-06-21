// Shared mode bar for the side-by-side overlay. One radio-style switch governs BOTH panes:
//   • Current  — the two independent panes as built (each keeps its own Source/Preview/Split
//                toggle + toolbar); panes scroll independently.
//   • Raw      — force both panes to their Monaco source; per-pane toggles hidden; independent scroll.
//   • Preview  — force both panes to their rendered preview; per-pane toggles hidden.
//   • Diff     — replace the two panes with ONE full-width Monaco diff (pane1.text ↔ pane2.text),
//                synced scroll handled natively by Monaco. Disabled when either file is binary.
//
// This module owns only the mode-bar + diff orchestration; the panes themselves live in
// sidebyside-pane.js. It is overlay-local: the diff rawview is NOT the global state.rawview.
import { themeIsDark } from './state.js';
import { pickType } from './detect.js';
import { createRawView } from './rawview.js';

const MODES = ['current', 'raw', 'preview', 'diff'];
const LS_KEY = 'fv:sbs:mode';

export function rememberedMode() {
  let m = null;
  try { m = localStorage.getItem(LS_KEY); } catch { /* private mode */ }
  return MODES.includes(m) ? m : 'current';
}
function persistMode(m) { try { localStorage.setItem(LS_KEY, m); } catch { /* ignore */ } }

function resolveLanguage(type, intake) {
  const sl = type.syntaxLanguage;
  return (typeof sl === 'function' ? sl(intake) : sl) || 'plaintext';
}

// Wire the shared mode bar into `headEl` and govern `panes` + the `body` (two .sbs-pane) / a
// lazily-built diff host. Returns { setMode, current(), destroy() }.
export function initModeBar(headEl, body, panes, { initialMode } = {}) {
  const intake1 = panes[0].intake;
  const eitherBinary = panes.some((p) => !!p.intake.isBinary);

  const bar = document.createElement('div');
  bar.className = 'sbs-mode';
  bar.setAttribute('role', 'tablist');
  bar.setAttribute('aria-label', 'Side-by-side mode');

  const diffHost = document.createElement('div');
  diffHost.className = 'sbs-diff';
  diffHost.style.display = 'none';
  body.parentNode.insertBefore(diffHost, body.nextSibling);

  let diffRv = null;        // overlay-local Monaco diff (lazy)
  let mode = MODES.includes(initialMode) ? initialMode : 'current';

  const btns = [];
  for (const [m, label] of [['current', 'Current'], ['raw', 'Raw'], ['preview', 'Preview'], ['diff', 'Diff']]) {
    const b = document.createElement('button');
    b.className = 'sbs-mode-btn';
    b.dataset.sbsMode = m;
    b.textContent = label;
    b.type = 'button';
    if (m === 'diff' && eitherBinary) {
      b.disabled = true;
      b.title = 'Diff not available for binary files';
    } else {
      b.addEventListener('click', () => apply(m, true));
    }
    bar.appendChild(b);
    btns.push(b);
  }
  // Insert between the title and the close button (close is the last child of the head).
  const closeBtn = headEl.querySelector('.sbs-close');
  headEl.insertBefore(bar, closeBtn);

  async function ensureDiff() {
    if (diffRv) return diffRv;
    const { type } = pickType(intake1);
    diffRv = await createRawView(diffHost, {
      originalText: intake1.text || '',
      currentText: panes[1].intake.text || '',
      language: resolveLanguage(type, intake1),
      theme: themeIsDark() ? 'dark' : 'light',
      options: { readOnly: true, originalEditable: false },
    });
    diffRv.setMode('diff');
    return diffRv;
  }

  function disposeDiff() {
    diffRv?.dispose();
    diffRv = null;
    diffHost.innerHTML = '';
  }

  async function apply(next, fromUser) {
    if (next === 'diff' && eitherBinary) return;     // guarded; button is also disabled
    mode = next;
    if (fromUser) persistMode(next);
    syncButtons();

    if (next === 'diff') {
      body.style.display = 'none';
      diffHost.style.display = '';
      const rv = await ensureDiff();
      rv.layout();
      return;
    }

    // Leaving diff → restore the two panes and drop the diff editor.
    disposeDiff();
    diffHost.style.display = 'none';
    body.style.display = '';

    if (next === 'current') {
      panes.forEach((p) => { p.setToggleVisible(true); });
      return;                       // each pane keeps whatever per-pane view it last had
    }
    // Raw / Preview: the shared bar governs — hide per-pane toggles, force the view.
    const view = next === 'raw' ? 'source' : 'preview';
    panes.forEach((p) => { p.setToggleVisible(false); });
    await Promise.all(panes.map((p) => p.setView(view)));
  }

  function syncButtons() {
    btns.forEach((b) => {
      const on = b.dataset.sbsMode === mode;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }

  const ready = apply(mode, false);

  return {
    ready,
    current: () => mode,
    setMode: (m) => apply(m, true),
    destroy() { disposeDiff(); },
  };
}
