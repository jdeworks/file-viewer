const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ext = (href, text) => `<a class="elm-link" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(text)} <span style="font-size:10px">↗</span></a>`;

const CSS = `
.elm-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-elm{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1293d8;color:#fff;vertical-align:middle;margin-right:8px;letter-spacing:.03em;}
.elm-name{font-size:20px;font-weight:700;margin:4px 0 2px;}
.elm-meta{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;}
.elm-chip{display:inline-flex;align-items:center;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:2px 8px;font-size:11px;font-family:ui-monospace,monospace;}
.elm-sec{margin:14px 0;}
.elm-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-2,#888);margin:0 0 6px;}
.elm-deps{list-style:none;margin:0;padding:0;}
.elm-deps li{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:4px 0;border-bottom:1px solid var(--border,#eee);}
.elm-dep-name{font:12px ui-monospace,monospace;}
.elm-dep-name a.elm-link{color:var(--accent,#0969da);text-decoration:none;}
.elm-dep-name a.elm-link:hover{text-decoration:underline;}
.elm-dep-ver{font:12px ui-monospace,monospace;color:var(--fg-2,#888);}
.elm-dirs{display:flex;flex-wrap:wrap;gap:6px;}
.elm-dir{display:inline-block;font-size:12px;padding:2px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = JSON.parse(intake.text || '{}'); } catch { cfg = {}; }

  const type = cfg.type || 'application'; // 'application' or 'package'
  const elmVersion = cfg['elm-version'] || '';
  const summary = cfg.summary || '';
  const version = cfg.version || '';
  const srcDirs = Array.isArray(cfg['source-directories']) ? cfg['source-directories'] : [];

  // dependencies
  let directDeps = [];
  let indirectDeps = [];
  if (type === 'application') {
    const direct = cfg.dependencies?.direct || {};
    const indirect = cfg.dependencies?.indirect || {};
    directDeps = Object.entries(direct).map(([n, v]) => ({ name: n, version: v }));
    indirectDeps = Object.entries(indirect).map(([n, v]) => ({ name: n, version: v }));
  } else {
    // package: deps is a plain object
    const d = cfg.dependencies || {};
    directDeps = Object.entries(d).map(([n, v]) => ({ name: n, version: v }));
  }

  const depLink = (name) => {
    const encoded = name.replace('/', '/');
    return ext(`https://package.elm-lang.org/packages/${encoded}/latest/`, name);
  };

  const depRows = (list) => list
    .map((d) => `<li><span class="elm-dep-name">${depLink(d.name)}</span><span class="elm-dep-ver">${esc(d.version)}</span></li>`)
    .join('');

  const typeLabel = type === 'package' ? 'Package' : 'Application';
  const typeChip = `<span class="elm-chip">${esc(typeLabel)}</span>`;
  const elmChip = elmVersion ? `<span class="elm-chip">Elm ${esc(elmVersion)}</span>` : '';
  const versionChip = version ? `<span class="elm-chip">v${esc(version)}</span>` : '';

  const srcHtml = srcDirs.length
    ? `<div class="elm-sec"><h3>Source Directories</h3><div class="elm-dirs">${srcDirs.map((d) => `<span class="elm-dir">${esc(d)}</span>`).join('')}</div></div>`
    : '';

  const directHtml = directDeps.length
    ? `<div class="elm-sec"><h3>Direct Dependencies (${directDeps.length})</h3><ul class="elm-deps">${depRows(directDeps)}</ul></div>`
    : '';

  const indirectHtml = indirectDeps.length
    ? `<div class="elm-sec"><h3>Indirect Dependencies (${indirectDeps.length})</h3><ul class="elm-deps">${depRows(indirectDeps)}</ul></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'elm-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="elm-name"><span class="badge-elm">Elm</span>${esc(type === 'package' && cfg.name ? cfg.name : 'elm.json')}</div>
<div class="elm-meta">${typeChip}${elmChip}${versionChip}</div>
${summary ? `<div style="color:var(--fg-2);margin:0 0 12px;font-size:13px;">${esc(summary)}</div>` : ''}
${srcHtml}${directHtml}${indirectHtml}`;

  return { parentNode: host };
}
