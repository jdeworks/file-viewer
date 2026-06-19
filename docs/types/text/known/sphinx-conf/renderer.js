const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sphinx-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-sphinx{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a4e8a;color:#fff;vertical-align:middle;margin-right:8px}
.sphinx-title{font-size:18px;font-weight:700;margin:0 0 4px}
.sphinx-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.sphinx-sec{margin:12px 0}
.sphinx-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.sphinx-meta{display:flex;flex-wrap:wrap;gap:10px;margin:4px 0}
.sphinx-kv{display:flex;gap:6px;align-items:baseline;font-size:13px;padding:4px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa)}
.sphinx-kv span:first-child{color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em}
.sphinx-kv span:last-child{font-family:ui-monospace,monospace;font-weight:600}
.sphinx-pills{display:flex;flex-wrap:wrap;gap:6px}
.sphinx-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
`;

function pyStr(text, key) {
  const m = new RegExp(`^\\s*${key}\\s*=\\s*['"]([^'"]+)['"]`, 'm').exec(text);
  return m ? m[1].trim() : null;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);

  const project = pyStr(text, 'project');
  const author = pyStr(text, 'author');
  const release = pyStr(text, 'release') || pyStr(text, 'version');
  const htmlTheme = pyStr(text, 'html_theme');
  const language = pyStr(text, 'language');

  // Extensions list
  const extensions = [];
  const extM = /^extensions\s*=\s*\[([^\]]+)\]/ms.exec(text);
  if (extM) {
    const re = /['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(extM[1])) !== null) extensions.push(m[1]);
  }

  // HTML static/template paths
  const staticPaths = [];
  const spM = /html_static_path\s*=\s*\[([^\]]+)\]/s.exec(text);
  if (spM) {
    const re = /['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(spM[1])) !== null) staticPaths.push(m[1]);
  }

  // Exclude patterns
  const hasAutoDoc = /autodoc/i.test(text);
  const hasNapolean = /napoleon/i.test(text);
  const hasViewcode = /viewcode/i.test(text);
  const hasMyST = /myst/i.test(text);

  const host = document.createElement('div');
  host.className = 'sphinx-doc';

  const metaItems = [
    project ? `<div class="sphinx-kv"><span>Project</span><span>${esc(project)}</span></div>` : '',
    author ? `<div class="sphinx-kv"><span>Author</span><span>${esc(author)}</span></div>` : '',
    release ? `<div class="sphinx-kv"><span>Release</span><span>${esc(release)}</span></div>` : '',
    language ? `<div class="sphinx-kv"><span>Language</span><span>${esc(language)}</span></div>` : '',
    htmlTheme ? `<div class="sphinx-kv"><span>Theme</span><span>${esc(htmlTheme)}</span></div>` : '',
  ].filter(Boolean).join('');

  const extHtml = extensions.length
    ? `<div class="sphinx-sec"><h3>Extensions (${extensions.length})</h3><div class="sphinx-pills">${extensions.map((e) => `<span class="sphinx-pill">${esc(e)}</span>`).join('')}</div></div>`
    : '';

  const featHtml = (hasAutoDoc || hasNapolean || hasViewcode || hasMyST)
    ? `<div class="sphinx-sec"><h3>Features</h3><div class="sphinx-pills">${[
        hasAutoDoc ? '<span class="sphinx-pill">autodoc</span>' : '',
        hasNapolean ? '<span class="sphinx-pill">napoleon (NumPy/Google docstrings)</span>' : '',
        hasViewcode ? '<span class="sphinx-pill">viewcode</span>' : '',
        hasMyST ? '<span class="sphinx-pill">MyST (Markdown)</span>' : '',
      ].filter(Boolean).join('')}</div></div>`
    : '';

  const pathsHtml = staticPaths.length
    ? `<div class="sphinx-sec"><h3>Static Paths</h3><div class="sphinx-pills">${staticPaths.map((p) => `<span class="sphinx-pill">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="sphinx-title"><span class="badge-sphinx">Sphinx</span>conf.py</div>
<div class="sphinx-sub">Sphinx documentation generator configuration</div>
${metaItems ? `<div class="sphinx-sec"><h3>Project Info</h3><div class="sphinx-meta">${metaItems}</div></div>` : ''}
${extHtml}${featHtml}${pathsHtml}`;
  return { parentNode: host };
}
