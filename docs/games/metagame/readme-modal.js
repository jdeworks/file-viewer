// Shared metagame "Stage rules" modal — one mechanism reused for whichever stage is active.
//
// Clicking the 📖 header button (wired in metagame.js, next to the bell) opens this overlay, which
// fetches the ACTIVE stage's same-origin README.md, renders it to HTML with the VENDORED markdown-it,
// sanitizes the result with the VENDORED DOMPurify, and shows it in a scrollable, mobile-friendly
// modal. Everything is same-origin / offline — no CDN, no off-origin request.
import { loadGlobal, vendor } from '../../core/script-loader.js';

function ensureStyles() {
  if (document.getElementById('mg-readme-modal-styles')) return;
  const link = document.createElement('link');
  link.id = 'mg-readme-modal-styles';
  link.rel = 'stylesheet';
  link.href = new URL('./readme-modal.css', import.meta.url).href;
  document.head.append(link);
}

// Resolve the README for a stage to a same-origin URL relative to this module.
function readmeUrl(stageId) {
  return new URL(`./stages/stage${Number(stageId)}/README.md`, import.meta.url).href;
}

let mdInstance = null;
async function renderMarkdown(text) {
  const [markdownit, DOMPurify] = await Promise.all([
    loadGlobal(vendor('markdown-it/markdown-it.min.js'), 'markdownit'),
    loadGlobal(vendor('dompurify/purify.min.js'), 'DOMPurify'),
  ]);
  // html:false — our READMEs are plain markdown; we never need raw HTML passthrough, and disabling it
  // is one less thing for the sanitizer to have to scrub.
  if (!mdInstance) mdInstance = markdownit({ html: false, linkify: true, typographer: true });
  return DOMPurify.sanitize(mdInstance.render(String(text || '')));
}

let openOverlay = null;

// Open (or replace) the stage-rules modal for `stageId`. `stageName` is shown in the header.
// Returns the overlay element. Resolving the markdown is async; the body shows a loading state first
// and a graceful message if the README is missing or fails to fetch.
export function openReadmeModal({ stageId, stageName } = {}) {
  ensureStyles();
  closeReadmeModal();

  const overlay = document.createElement('div');
  overlay.className = 'mg-readme-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', `${stageName || 'Stage'} rules`);
  overlay.innerHTML = `
    <div class="mg-readme-panel">
      <div class="mg-readme-head">
        <span class="mg-readme-title">📖 ${escapeHtml(stageName || 'Stage')} — Rules</span>
        <button type="button" class="mg-readme-x" data-readme="close" aria-label="Close rules">✕</button>
      </div>
      <div class="mg-readme-body" tabindex="0"><p class="mg-readme-msg">loading…</p></div>
    </div>`;
  document.body.append(overlay);
  openOverlay = overlay;

  const body = overlay.querySelector('.mg-readme-body');
  const close = () => closeReadmeModal();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('[data-readme="close"]').addEventListener('click', close);
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  document.addEventListener('keydown', onKey, true);
  overlay._cleanup = () => document.removeEventListener('keydown', onKey, true);
  overlay.querySelector('.mg-readme-x').focus();

  (async () => {
    try {
      const res = await fetch(readmeUrl(stageId));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await renderMarkdown(await res.text());
      if (openOverlay === overlay) body.innerHTML = html;
    } catch {
      if (openOverlay === overlay) {
        body.innerHTML = '<p class="mg-readme-msg">No rules are available for this stage yet.</p>';
      }
    }
  })();

  return overlay;
}

export function closeReadmeModal() {
  if (!openOverlay) return;
  openOverlay._cleanup?.();
  openOverlay.remove();
  openOverlay = null;
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
  ));
}
