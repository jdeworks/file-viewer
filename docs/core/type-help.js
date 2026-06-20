import { loadGlobal, vendor } from './script-loader.js';

const CSS = `
.th-body { padding: 16px 20px; line-height: 1.6; font: 14px/1.6 system-ui, sans-serif; color: var(--fg, #24292f); }
.th-body h1 { font-size: 18px; font-weight: 700; margin: 0 0 8px; }
.th-body h2 { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--fg-2, #888); margin: 18px 0 6px; border-bottom: 1px solid var(--border, #e0e0e0); padding-bottom: 4px; }
.th-body h3 { font-size: 13px; font-weight: 600; margin: 12px 0 4px; }
.th-body p { margin: 0 0 10px; }
.th-body code { font: 12px/1.4 ui-monospace, monospace; background: var(--bg-2, #f6f8fa); border: 1px solid var(--border, #e0e0e0); border-radius: 3px; padding: 1px 4px; }
.th-body pre { background: var(--bg-2, #f6f8fa); border: 1px solid var(--border, #e0e0e0); border-radius: 6px; padding: 10px 14px; overflow-x: auto; margin: 0 0 10px; }
.th-body pre code { background: none; border: none; padding: 0; }
.th-body table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 0 0 12px; }
.th-body th { text-align: left; color: var(--fg-2, #888); font-size: 11px; text-transform: uppercase; padding: 4px 8px 4px 0; border-bottom: 2px solid var(--border, #e0e0e0); }
.th-body td { padding: 5px 8px 5px 0; border-bottom: 1px solid var(--border, #f0f0f0); vertical-align: top; font-size: 13px; }
.th-body ul, .th-body ol { margin: 0 0 10px; padding-left: 20px; }
.th-body li { margin: 2px 0; }
.th-body a { color: var(--link, #0969da); }
.th-body blockquote { margin: 0 0 10px; padding: 8px 12px; background: var(--bg-2, #f6f8fa); border-left: 3px solid var(--border, #e0e0e0); color: var(--fg-2, #888); font-style: italic; }
.th-empty { padding: 32px 20px; text-align: center; color: var(--fg-2, #888); font-size: 13px; }
`;

let _styleInjected = false;
function injectStyle() {
  if (_styleInjected) return;
  _styleInjected = true;
  const s = document.createElement('style');
  s.textContent = CSS;
  document.head.appendChild(s);
}

export async function buildTypeHelp(typeId) {
  injectStyle();
  const body = document.getElementById('typeHelpBody');
  const titleEl = document.getElementById('typeHelpTitle');
  if (!body) return;
  body.innerHTML = '<p class="th-empty">Loading…</p>';
  if (titleEl) titleEl.textContent = typeId ? `${typeId} — docs` : 'Type docs';

  if (!typeId) {
    body.innerHTML = '<p class="th-empty">No file loaded.</p>';
    return;
  }

  try {
    const resp = await fetch(`readme/${typeId}.md`);
    if (!resp.ok) {
      body.innerHTML = `<p class="th-empty">No documentation available for <strong>${typeId}</strong> yet.</p>`;
      return;
    }
    const mdText = await resp.text();
    const markdownit = await loadGlobal(vendor('markdown-it/markdown-it.min.js'), 'markdownit');
    const md = markdownit({ html: false, linkify: true, typographer: false, breaks: false });
    const html = md.render(mdText);
    body.innerHTML = `<div class="th-body">${html}</div>`;
    // Make internal readme links work by opening them in the viewer via click handler
    body.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href');
      if (href && !href.startsWith('http') && !href.startsWith('#')) {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener');
      } else if (href && href.startsWith('http')) {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener');
      }
    });
  } catch {
    body.innerHTML = `<p class="th-empty">Failed to load documentation for ${typeId}.</p>`;
  }
}
