const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-sc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#ea580c;color:#fff;vertical-align:middle;margin-right:8px;}
.sc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.sc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.sc-sec{margin:12px 0;}
.sc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.sc-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.sc-row{display:flex;gap:8px;font-size:13px;padding:3px 0;}
.sc-key{color:var(--fg-2,#888);min-width:160px;flex-shrink:0;font-size:12px;font-family:ui-monospace,monospace;}
.sc-val{font-family:ui-monospace,monospace;word-break:break-all;}
.sc-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;}
.sc-chip{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;background:#fff7ed;border:1px solid #fed7aa;color:#c2410c;font-family:ui-monospace,monospace;}
.sc-chip.dep{background:#f0fdf4;border-color:#86efac;color:#166534;}
.sc-chip.ex{background:#eff6ff;border-color:#bfdbfe;color:#1e40af;}
.sc-badge-sec{display:inline-block;font-size:11px;padding:1px 7px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin-left:4px;color:var(--fg-2,#888);}
`;

function parseIni(text) {
  const secs = {};
  let cur = null;
  for (const rawLine of (text || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const sec = line.match(/^\[([^\]]+)\]/);
    if (sec) { cur = sec[1].trim(); secs[cur] = {}; continue; }
    if (cur) {
      const kv = line.match(/^([^=]+)=(.*)/);
      if (kv) {
        const key = kv[1].trim();
        const val = kv[2].trim();
        if (!(key in secs[cur])) secs[cur][key] = val;
      }
    }
  }
  return secs;
}

function row(label, value) {
  if (value == null || value === '') return '';
  return `<div class="sc-row"><span class="sc-key">${esc(label)}</span><span class="sc-val">${esc(value)}</span></div>`;
}

function parseList(val) {
  if (!val) return [];
  return val.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
}

export function render(intake) {
  const ini = parseIni(intake.text || '');

  // Normalise section lookups
  const getSection = (name) => {
    for (const k of Object.keys(ini)) {
      if (k.toLowerCase() === name.toLowerCase()) return ini[k];
    }
    return null;
  };

  const meta = getSection('metadata') || {};
  const opts = getSection('options') || {};
  const extras = getSection('options.extras_require') || {};
  const pytest = getSection('tool:pytest') || getSection('pytest') || {};
  const mypy = getSection('mypy') || {};
  const flake8 = getSection('flake8') || {};

  // [metadata]
  const name = meta['name'] || '';
  const version = meta['version'] || '';
  const author = meta['author'] || '';
  const email = meta['author_email'] || meta['author-email'] || '';
  const description = meta['description'] || '';
  const license = meta['license'] || '';
  const metaHtml = (name || version || author || description) ? `
<div class="sc-sec"><h3>[metadata]</h3><div class="sc-card">
${row('name', name)}
${row('version', version)}
${row('author', author)}
${row('author_email', email)}
${row('license', license)}
${description ? `<div class="sc-row"><span class="sc-key">description</span><span class="sc-val">${esc(description)}</span></div>` : ''}
</div></div>` : '';

  // [options]
  const packages = opts['packages'] || '';
  const pyVer = opts['python_requires'] || opts['python-requires'] || '';
  const deps = parseList(opts['install_requires'] || '');
  const optionsHtml = (packages || pyVer || deps.length) ? `
<div class="sc-sec"><h3>[options]</h3><div class="sc-card">
${row('packages', packages)}
${row('python_requires', pyVer)}
${deps.length ? `<div class="sc-row"><span class="sc-key">install_requires</span><span></span></div>
<div class="sc-chips">${deps.slice(0, 20).map((d) => `<span class="sc-chip dep">${esc(d)}</span>`).join('')}${deps.length > 20 ? `<span class="sc-chip">+${deps.length - 20} more</span>` : ''}</div>` : ''}
</div></div>` : '';

  // [options.extras_require]
  const extraKeys = Object.keys(extras);
  const extrasHtml = extraKeys.length ? `
<div class="sc-sec"><h3>[options.extras_require]</h3><div class="sc-card">
${extraKeys.map((k) => {
    const items = parseList(extras[k]);
    return `<div class="sc-row"><span class="sc-key">${esc(k)}</span><span class="sc-chips">${items.map((i) => `<span class="sc-chip ex">${esc(i)}</span>`).join('')}</span></div>`;
  }).join('')}
</div></div>` : '';

  // [tool:pytest] / [pytest]
  const testpaths = pytest['testpaths'] || '';
  const addopts = pytest['addopts'] || '';
  const minversion = pytest['minversion'] || '';
  const pytestHtml = (testpaths || addopts || minversion) ? `
<div class="sc-sec"><h3>[tool:pytest]</h3><div class="sc-card">
${row('testpaths', testpaths)}
${row('addopts', addopts)}
${row('minversion', minversion)}
</div></div>` : '';

  // [mypy]
  const mypyStrict = mypy['strict'] || '';
  const mypyPython = mypy['python_version'] || mypy['python-version'] || '';
  const mypyIgnore = mypy['ignore_missing_imports'] || '';
  const mypyHtml = (mypyStrict || mypyPython || mypyIgnore || Object.keys(mypy).length) ? `
<div class="sc-sec"><h3>[mypy]</h3><div class="sc-card">
${row('python_version', mypyPython)}
${row('strict', mypyStrict)}
${row('ignore_missing_imports', mypyIgnore)}
</div></div>` : '';

  // [flake8]
  const f8MaxLine = flake8['max-line-length'] || '';
  const f8IgnoreRaw = flake8['ignore'] || flake8['extend-ignore'] || '';
  const f8Ignore = f8IgnoreRaw.split(',').map((s) => s.trim()).filter(Boolean);
  const flake8Html = (f8MaxLine || f8Ignore.length) ? `
<div class="sc-sec"><h3>[flake8]</h3><div class="sc-card">
${row('max-line-length', f8MaxLine)}
${f8Ignore.length ? `<div class="sc-row"><span class="sc-key">ignore</span><span class="sc-chips">${f8Ignore.map((c) => `<span class="sc-chip">${esc(c)}</span>`).join('')}</span></div>` : ''}
</div></div>` : '';

  // summary
  const subParts = [];
  if (name) subParts.push(name);
  if (version) subParts.push(`v${version}`);
  if (deps.length) subParts.push(`${deps.length} dep${deps.length !== 1 ? 's' : ''}`);
  if (pyVer) subParts.push(`Python ${pyVer}`);
  const sub = subParts.join(' · ') || 'Python package configuration';

  // Tool sections present indicator
  const toolSecs = [
    pytest && Object.keys(pytest).length ? 'pytest' : '',
    mypy && Object.keys(mypy).length ? 'mypy' : '',
    flake8 && Object.keys(flake8).length ? 'flake8' : '',
  ].filter(Boolean);

  const host = document.createElement('div');
  host.className = 'sc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="sc-title"><span class="badge-sc">setup.cfg</span>${esc(name || 'Python Package')}${version ? ` <span style="font-weight:400;font-size:14px;color:var(--fg-2,#888);">v${esc(version)}</span>` : ''}${toolSecs.map((t) => `<span class="sc-badge-sec">${esc(t)}</span>`).join('')}</div>
<div class="sc-sub">${esc(sub)}</div>
${metaHtml}${optionsHtml}${extrasHtml}${pytestHtml}${mypyHtml}${flake8Html}`;
  return { parentNode: host };
}
