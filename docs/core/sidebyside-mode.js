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
import { themeIsDark, state, activeRawviews } from './state.js';
import { pickType } from './detect.js';
import { createRawView } from './rawview.js';
import { applyMonacoOptions } from './settings-schema.js';
import { sourceTextOf } from './intake.js';

const MODES = ['current', 'raw', 'preview', 'diff', 'merge'];
const KV_TYPES = new Set(['env', 'ini']);   // key=value types that support the missing-aware Merge
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
  const typeIds = panes.map((p) => pickType(p.intake).type.id);
  const bothKv = typeIds.every((id) => KV_TYPES.has(id));   // both env/ini → offer Merge
  const eitherEnv = typeIds.includes('env');                // env pair → suppress secret-exposing text Diff
  // Serialize in the section-aware dialect when either side is ini; flat env otherwise.
  const kvTypeId = typeIds.includes('ini') ? 'ini' : 'env';

  const bar = document.createElement('div');
  bar.className = 'sbs-mode';
  bar.setAttribute('role', 'tablist');
  bar.setAttribute('aria-label', 'Side-by-side mode');

  const diffHost = document.createElement('div');
  diffHost.className = 'sbs-diff';
  diffHost.style.display = 'none';
  body.parentNode.insertBefore(diffHost, body.nextSibling);

  const mergeHost = document.createElement('div');
  mergeHost.className = 'sbs-merge';
  mergeHost.style.display = 'none';
  body.parentNode.insertBefore(mergeHost, diffHost.nextSibling);

  let diffRv = null;        // overlay-local Monaco diff (lazy)
  let mergeMod = null;      // overlay-local merge UI (lazy)
  let mode = MODES.includes(initialMode) ? initialMode : 'current';
  if (mode === 'merge' && !bothKv) mode = 'current';
  if (mode === 'diff' && (eitherBinary || eitherEnv)) mode = 'current';

  // Base modes; Merge is appended only for env/ini pairs.
  const modeDefs = [['current', 'Current'], ['raw', 'Raw'], ['preview', 'Preview'], ['diff', 'Diff']];
  if (bothKv) modeDefs.push(['merge', 'Merge']);
  const btns = [];
  for (const [m, label] of modeDefs) {
    const b = document.createElement('button');
    b.className = 'sbs-mode-btn';
    b.dataset.sbsMode = m;
    b.textContent = label;
    b.type = 'button';
    if (m === 'diff' && (eitherBinary || eitherEnv)) {
      b.disabled = true;
      b.title = eitherEnv ? 'Text diff disabled for .env (would expose secrets) — use Merge' : 'Diff not available for binary files';
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
      originalText: sourceTextOf(intake1),
      currentText: sourceTextOf(panes[1].intake),
      language: resolveLanguage(type, intake1),
      theme: themeIsDark() ? 'dark' : 'light',
      // Honor the user's editor settings (font/wrap/tab size/…) in the compare diff too.
      options: { readOnly: true, originalEditable: false, ...applyMonacoOptions(state.settingsModel?.values || {}) },
    });
    if (diffRv) activeRawviews.add(diffRv);
    diffRv.setMode('diff');
    return diffRv;
  }

  function disposeDiff() {
    if (diffRv) activeRawviews.delete(diffRv);
    diffRv?.dispose();
    diffRv = null;
    diffHost.innerHTML = '';
  }

  async function ensureMerge() {
    if (mergeMod) return mergeMod;
    const { mountMerge } = await import('./kv-merge-ui.js');
    mergeMod = mountMerge(mergeHost, panes[0].intake, panes[1].intake, kvTypeId);
    return mergeMod;
  }
  function disposeMerge() {
    mergeMod?.destroy?.();
    mergeMod = null;
    mergeHost.innerHTML = '';
  }

  async function apply(next, fromUser) {
    if (next === 'diff' && (eitherBinary || eitherEnv)) return;   // guarded; button is also disabled
    if (next === 'merge' && !bothKv) return;
    mode = next;
    if (fromUser) persistMode(next);
    syncButtons();

    if (next === 'diff') {
      disposeMerge(); mergeHost.style.display = 'none';
      body.style.display = 'none';
      diffHost.style.display = '';
      const rv = await ensureDiff();
      rv.layout();
      return;
    }
    if (next === 'merge') {
      disposeDiff(); diffHost.style.display = 'none';
      body.style.display = 'none';
      mergeHost.style.display = '';
      await ensureMerge();
      return;
    }

    // Leaving diff/merge → restore the two panes and drop the overlay editors.
    disposeDiff();
    diffHost.style.display = 'none';
    disposeMerge();
    mergeHost.style.display = 'none';
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
    mergeApi: () => mergeMod?.api || null,   // test seam: read/drive the merge model
    destroy() { disposeDiff(); disposeMerge(); },
  };
}
