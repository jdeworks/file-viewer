const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function tomlScalar(text, key) {
  const m = new RegExp('^' + key + '\\s*=\\s*"?([^"\\n]+)"?', 'm').exec(text);
  return m ? m[1].trim() : null;
}

function sectionDeps(text, header) {
  const re = new RegExp('^\\[' + header + '\\][\\s\\S]*?(?=^\\[|$)', 'm');
  const m = re.exec(text);
  if (!m) return [];
  const block = m[0];
  const deps = [];
  const lineRe = /^(\S+)\s*=\s*"([^"]*)"/gm;
  let lm;
  while ((lm = lineRe.exec(block)) !== null) {
    const key = lm[1];
    if (key === header.split('.').pop()) continue; // skip header key
    if (!key.startsWith('[')) deps.push({ name: key, version: lm[2] });
  }
  return deps;
}

const CSS = `
.gleam-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-gleam{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#ffaff3;color:#2f2f2f;vertical-align:middle;margin-right:8px;letter-spacing:.03em;}
.gleam-name{font-size:20px;font-weight:700;margin:4px 0 2px;}
.gleam-meta{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;}
.gleam-chip{display:inline-flex;align-items:center;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:2px 8px;font-size:11px;font-family:ui-monospace,monospace;}
.gleam-desc{color:var(--fg-2,#888);margin:0 0 14px;font-size:13px;}
.gleam-sec{margin:14px 0;}
.gleam-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-2,#888);margin:0 0 6px;}
.gleam-deps{list-style:none;margin:0;padding:0;}
.gleam-deps li{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:4px 0;border-bottom:1px solid var(--border,#eee);}
.gleam-dep-name{font:12px ui-monospace,monospace;color:var(--accent,#0969da);}
.gleam-dep-ver{font:12px ui-monospace,monospace;color:var(--fg-2,#888);}
`;

export function render(intake) {
  const text = intake.text || '';

  const name = tomlScalar(text, 'name') || '(unnamed)';
  const version = tomlScalar(text, 'version') || '';
  const description = tomlScalar(text, 'description') || '';
  const target = tomlScalar(text, 'target') || '';
  const gleamVersion = tomlScalar(text, 'gleam') || '';

  // Parse [dependencies] and [dev-dependencies]
  const deps = sectionDeps(text, 'dependencies');
  const devDeps = sectionDeps(text, 'dev-dependencies');

  const targetChip = target
    ? `<span class="gleam-chip">${esc(target === 'javascript' ? 'JavaScript target' : target === 'erlang' ? 'Erlang target' : target)}</span>`
    : '';
  const gleamChip = gleamVersion ? `<span class="gleam-chip">gleam ${esc(gleamVersion)}</span>` : '';

  const depRows = (list) => list
    .map((d) => `<li><span class="gleam-dep-name">${esc(d.name)}</span><span class="gleam-dep-ver">${esc(d.version)}</span></li>`)
    .join('');

  const depsHtml = deps.length
    ? `<div class="gleam-sec"><h3>Dependencies (${deps.length})</h3><ul class="gleam-deps">${depRows(deps)}</ul></div>`
    : '';
  const devDepsHtml = devDeps.length
    ? `<div class="gleam-sec"><h3>Dev Dependencies (${devDeps.length})</h3><ul class="gleam-deps">${depRows(devDeps)}</ul></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'gleam-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="gleam-name"><span class="badge-gleam">Gleam</span>${esc(name)}${version ? `<span style="font-size:14px;font-weight:400;color:var(--fg-2);margin-left:8px">v${esc(version)}</span>` : ''}</div>
<div class="gleam-meta">${targetChip}${gleamChip}</div>
${description ? `<div class="gleam-desc">${esc(description)}</div>` : ''}
${depsHtml}${devDepsHtml}`;

  return { parentNode: host };
}
