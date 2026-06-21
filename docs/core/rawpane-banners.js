// Editor status banners for the raw pane: the in-memory edit disclaimer, the "autosave found"
// restore banner, and the word/line/char count bar. Extracted from rawpane.js for modularity —
// these are self-contained DOM/state helpers (no callbacks into the editor core).
import { state, $ } from './state.js';
import { clearAutosave } from './autosave.js';

const DISCLAIMER_KEY = 'fv:edit-disclaimer';

function setDisclaimerVisible(visible) {
  const el = $('editDisclaimer');
  if (!el) return;
  el.hidden = !visible;
  $('rawPane')?.classList.toggle('has-disclaimer', visible);
}

// Show the in-memory edit banner. Wires the dismiss buttons once, idempotently.
export function showEditDisclaimer() {
  if (localStorage.getItem(DISCLAIMER_KEY) === 'never') return;
  const el = $('editDisclaimer');
  if (!el) return;
  setDisclaimerVisible(true);
  if (el.dataset.wired) return;
  el.dataset.wired = '1';
  el.querySelector('.edit-disclaimer-close').addEventListener('click', () => setDisclaimerVisible(false));
  el.querySelector('.edit-disclaimer-never').addEventListener('click', () => {
    try { localStorage.setItem(DISCLAIMER_KEY, 'never'); } catch { /* private mode */ }
    setDisclaimerVisible(false);
  });
}

function formatAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return Math.floor(diff / 86400000) + 'd ago';
}

export function showAutosaveBanner(saved) {
  const el = $('autosaveBanner');
  if (!el) return;
  el.querySelector('.autosave-age').textContent = `Autosave from ${formatAgo(saved.ts)} found.`;
  el.hidden = false;
  $('rawPane')?.classList.add('has-autosave');

  if (!el.dataset.wired) {
    el.dataset.wired = '1';
    el.querySelector('.autosave-restore').addEventListener('click', () => {
      state.rawview?.setValue?.(saved.text);
      state.intake = { ...state.intake, text: saved.text };
      el.hidden = true;
      $('rawPane')?.classList.remove('has-autosave');
    });
    el.querySelector('.autosave-dismiss').addEventListener('click', () => {
      el.hidden = true;
      $('rawPane')?.classList.remove('has-autosave');
      clearAutosave(state.intake?.filename || state.intake?.name);
    });
  }
}

export function updateWordCount(text, typeId) {
  const bar = document.getElementById('wordCountBar');
  if (!bar) return;
  if (!text || state.intake?.isBinary) {
    bar.hidden = true;
    document.getElementById('rawPane')?.classList.remove('has-wordcount');
    return;
  }
  const lines = text.split('\n').length;
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  let label;
  if (typeId === 'markdown') {
    const readMins = Math.ceil(words / 200);
    label = `${words.toLocaleString()} words · ${chars.toLocaleString()} chars · ~${readMins} min read`;
  } else if (typeId === 'text') {
    label = `${lines.toLocaleString()} lines · ${words.toLocaleString()} words · ${chars.toLocaleString()} chars`;
  } else {
    label = `${lines.toLocaleString()} lines · ${chars.toLocaleString()} chars`;
  }
  bar.textContent = label;
  bar.hidden = false;
  document.getElementById('rawPane')?.classList.add('has-wordcount');
}

export function hideWordCount() {
  const bar = document.getElementById('wordCountBar');
  if (bar) bar.hidden = true;
  document.getElementById('rawPane')?.classList.remove('has-wordcount');
}
