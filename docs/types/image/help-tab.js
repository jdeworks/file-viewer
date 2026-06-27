// Help/Guide for the image editor. The Help button opens a FLOATING, draggable,
// closable modal (it doesn't reflow the toolbar/stage) that renders the lane-owned
// Markdown guide (editor-guide.md) to HTML the first time it's opened — markdown-it +
// DOMPurify are vendored and loaded lazily, fully offline. Extend the guide by editing
// the .md.
import { loadGlobal, vendor } from '../../core/script-loader.js';

const GUIDE_URL = new URL('./editor-guide.md', import.meta.url);

let cssInjected = false;
function injectStyle() {
  if (cssInjected) return; cssInjected = true;
  const s = document.createElement('style');
  s.id = 'imgv-help-css';
  s.textContent = `
    .imgv-help-btn{font-size:12px;padding:3px 11px;border:1px solid transparent;background:transparent;color:var(--fg);opacity:.62;border-radius:6px 6px 0 0;cursor:pointer;}
    .imgv-help-btn:hover{opacity:1;background:var(--bg);}
    .imgv-help-modal{position:fixed;z-index:60;top:12vh;left:50%;transform:translateX(-50%);width:min(620px,92vw);height:min(70vh,640px);
      display:flex;flex-direction:column;background:var(--bg-2,#252525);color:var(--fg,#ddd);border:1px solid var(--border,#444);
      border-radius:8px;box-shadow:0 10px 40px #0008;resize:both;overflow:hidden;min-width:280px;min-height:160px;font-family:var(--font-ui,sans-serif);}
    .imgv-help-modal[hidden]{display:none;}
    .imgv-help-bar{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--border,#444);cursor:move;user-select:none;background:var(--bg,#1e1e1e);}
    .imgv-help-bar strong{flex:1;font-size:13px;}
    .imgv-help-close{border:none;background:transparent;color:inherit;font-size:15px;cursor:pointer;line-height:1;}
    .imgv-help{flex:1;overflow:auto;padding:6px 16px 14px;line-height:1.55;font-size:13px;}
    .imgv-help h1{font-size:1.5em;margin:.2em 0 .4em;}
    .imgv-help h2{font-size:1.2em;margin:1.1em 0 .4em;border-bottom:1px solid var(--border);padding-bottom:3px;}
    .imgv-help h3{font-size:1.02em;margin:.9em 0 .3em;}
    .imgv-help p,.imgv-help ul,.imgv-help ol{margin:.4em 0;}
    .imgv-help ul,.imgv-help ol{padding-left:1.4em;}
    .imgv-help li{margin:.15em 0;}
    .imgv-help code{font-family:monospace;background:#0002;padding:.05em .35em;border-radius:4px;font-size:.92em;}
    .imgv-help blockquote{margin:.5em 0;padding:.2em .9em;border-left:3px solid var(--accent);opacity:.85;}
    .imgv-help a{color:var(--accent);}`;
  document.head.appendChild(s);
}

// mountHelpTab(host): wire the Help button to toggle a draggable guide modal.
export function mountHelpTab(host) {
  const btn = host.querySelector('.imgv-help-btn');
  if (!btn) return;
  injectStyle();
  let modal = null, body = null, rendered = false;

  function build() {
    modal = document.createElement('div');
    modal.className = 'imgv-help-modal';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="imgv-help-bar"><strong>Image editor guide</strong><button class="imgv-help-close" title="Close">✕</button></div>
      <div class="imgv-help">Loading guide…</div>`;
    (host.ownerDocument?.body || document.body).appendChild(modal);
    body = modal.querySelector('.imgv-help');
    modal.querySelector('.imgv-help-close').addEventListener('click', () => { modal.hidden = true; });
    makeDraggable(modal, modal.querySelector('.imgv-help-bar'));
  }

  async function renderOnce() {
    if (rendered) return; rendered = true;
    try {
      const [res, markdownit, DOMPurify] = await Promise.all([
        fetch(GUIDE_URL),
        loadGlobal(vendor('markdown-it/markdown-it.min.js'), 'markdownit'),
        loadGlobal(vendor('dompurify/purify.min.js'), 'DOMPurify'),
      ]);
      const md = markdownit({ html: false, linkify: true, typographer: true });
      body.innerHTML = DOMPurify.sanitize(md.render(await res.text()));
    } catch (e) {
      rendered = false;
      body.textContent = 'Could not load the guide: ' + ((e && e.message) || e);
    }
  }

  btn.addEventListener('click', () => {
    if (!modal) build();
    modal.hidden = !modal.hidden;
    if (!modal.hidden) renderOnce();
  });
}

// Drag the modal by its title bar (skips the close button). Switches from the
// centering transform to absolute left/top on first drag so it stays put.
function makeDraggable(modal, handle) {
  let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;
  handle.addEventListener('mousedown', (e) => {
    if (e.target.closest('.imgv-help-close')) return;
    dragging = true;
    const r = modal.getBoundingClientRect();
    modal.style.transform = 'none'; modal.style.left = r.left + 'px'; modal.style.top = r.top + 'px';
    sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
    e.preventDefault();
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  });
  function onMove(e) {
    if (!dragging) return;
    modal.style.left = Math.max(0, ox + e.clientX - sx) + 'px';
    modal.style.top = Math.max(0, oy + e.clientY - sy) + 'px';
  }
  function onUp() { dragging = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }
}
