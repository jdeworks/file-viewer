// Help/Guide tab for the image editor. Renders the lane-owned Markdown guide
// (editor-guide.md) to HTML the first time the Help tab is opened — markdown-it +
// DOMPurify are vendored and loaded lazily (same-origin), so opening the editor pays
// nothing until the user actually asks for help. Extend the guide by editing the .md.
import { loadGlobal, vendor } from '../../core/script-loader.js';

const GUIDE_URL = new URL('./editor-guide.md', import.meta.url);

let cssInjected = false;
function injectStyle() {
  if (cssInjected) return; cssInjected = true;
  const s = document.createElement('style');
  s.id = 'imgv-help-css';
  s.textContent = `
    .imgv-help{flex-basis:100%;max-height:min(60vh,560px);overflow:auto;padding:4px 14px 12px;
      line-height:1.55;font-size:13px;color:var(--fg);}
    .imgv-help h1{font-size:1.5em;margin:.2em 0 .4em;}
    .imgv-help h2{font-size:1.2em;margin:1.1em 0 .4em;border-bottom:1px solid var(--border);padding-bottom:3px;}
    .imgv-help h3{font-size:1.02em;margin:.9em 0 .3em;}
    .imgv-help p,.imgv-help ul,.imgv-help ol{margin:.4em 0;}
    .imgv-help ul,.imgv-help ol{padding-left:1.4em;}
    .imgv-help li{margin:.15em 0;}
    .imgv-help code{font-family:monospace;background:var(--bg-2,#0001);padding:.05em .35em;border-radius:4px;font-size:.92em;}
    .imgv-help blockquote{margin:.5em 0;padding:.2em .9em;border-left:3px solid var(--accent);opacity:.85;}
    .imgv-help a{color:var(--accent);}
    .imgv-help .imgv-help-status{opacity:.7;}`;
  document.head.appendChild(s);
}

// mountHelpTab(host): renders the guide into the host's Help tab panel the first time
// that tab is shown (lazy). No-op if the panel/tab aren't present.
export function mountHelpTab(host) {
  const panel = host.querySelector('.imgv-tabpanel[data-tab="help"]');
  const tab = host.querySelector('.imgv-tab[data-tab="help"]');
  if (!panel || !tab) return;
  injectStyle();
  const box = document.createElement('div');
  box.className = 'imgv-help';
  box.innerHTML = '<p class="imgv-help-status">Loading guide…</p>';
  panel.appendChild(box);

  let started = false;
  async function renderOnce() {
    if (started) return; started = true;
    try {
      const [res, markdownit, DOMPurify] = await Promise.all([
        fetch(GUIDE_URL),
        loadGlobal(vendor('markdown-it/markdown-it.min.js'), 'markdownit'),
        loadGlobal(vendor('dompurify/purify.min.js'), 'DOMPurify'),
      ]);
      const src = await res.text();
      const md = markdownit({ html: false, linkify: true, typographer: true });
      box.innerHTML = DOMPurify.sanitize(md.render(src));
    } catch (e) {
      started = false;   // allow a retry on next open
      box.innerHTML = `<p class="imgv-help-status">Could not load the guide: ${(e && e.message) || e}</p>`;
    }
  }
  tab.addEventListener('click', renderOnce);
  if (tab.classList.contains('active')) renderOnce();   // in case Help is the initial tab
}
