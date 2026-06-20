const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.setupcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.setupcfg-doc .badge-sc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#FFD43B;color:#212529;vertical-align:middle;margin-right:8px;}
.setupcfg-doc .sc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.setupcfg-doc .sc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.setupcfg-doc .sc-sec{margin:14px 0;}
.setupcfg-doc .sc-sec h3{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--fg-2,#888);margin:0 0 8px;font-weight:600;}
.setupcfg-doc .sc-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.setupcfg-doc .sc-row{display:flex;gap:8px;font-size:13px;padding:3px 0;}
.setupcfg-doc .sc-key{color:var(--fg-2,#888);min-width:160px;flex-shrink:0;font-size:12px;font-family:ui-monospace,monospace;}
.setupcfg-doc .sc-val{font-family:ui-monospace,monospace;word-break:break-all;font-size:12px;}
.setupcfg-doc .sc-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;}
.setupcfg-doc .sc-chip{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;background:#fff7ed;border:1px solid #fed7aa;color:#c2410c;font-family:ui-monospace,monospace;}
.setupcfg-doc .sc-chip.dep{background:#f0fdf4;border-color:#86efac;color:#166534;}
.setupcfg-doc .sc-chip.ex{background:#eff6ff;border-color:#bfdbfe;color:#1e40af;}
.setupcfg-doc .sc-chip.ep{background:#fdf4ff;border-color:#e9d5ff;color:#7e22ce;}
.setupcfg-doc .sc-badge-tool{display:inline-block;font-size:11px;padding:1px 7px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin-left:4px;color:var(--fg-2,#888);}
`;

function parseIni(text) {
  const secs = {};
  // Track multi-line values (continuation lines start with whitespace)
  let cur = null;
  let lastKey = null;
  for (const rawLine of (text || '').split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line || line.trim().startsWith('#') || line.trim().startsWith(';')) continue;
    const sec = line.match(/^\[([^\]]+)\]/);
    if (sec) { cur = sec[1].trim(); secs[cur] = secs[cur] || {}; lastKey = null; continue; }
    if (cur) {
      // Continuation line
      if (/^\s+\S/.test(line) && lastKey) {
        secs[cur][lastKey] += '\n' + line.trim();
        continue;
      }
      const kv = line.match(/^([^=:]+)[=:](.*)/);
      if (kv) {
        lastKey = kv[1].trim();
        if (!(lastKey in secs[cur])) secs[cur][lastKey] = kv[2].trim();
      }
    }
  }
  return secs;
}

function getSection(ini, name) {
  for (const k of Object.keys(ini)) {
    if (k.toLowerCase() === name.toLowerCase()) return ini[k];
  }
  return null;
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

  const meta = getSection(ini, 'metadata') || {};
  const opts = getSection(ini, 'options') || {};
  const extras = getSection(ini, 'options.extras_require') || {};
  const entryPts = getSection(ini, 'options.entry_points') || {};
  const pytest = getSection(ini, 'tool:pytest') || getSection(ini, 'pytest') || {};
  const mypy = getSection(ini, 'mypy') || {};
  const flake8 = getSection(ini, 'flake8') || {};
  const isort = getSection(ini, 'isort') || {};

  // [metadata]
  const name = meta['name'] || '';
  const version = meta['version'] || '';
  const author = meta['author'] || '';
  const email = meta['author_email'] || meta['author-email'] || '';
  const description = meta['description'] || '';
  const license = meta['license'] || '';
  const url = meta['url'] || meta['project_urls'] || '';

  const metaRows = [
    row('name', name),
    row('version', version),
    row('author', author + (email ? ` <${email}>` : '')),
    row('license', license),
    row('url', url),
    description ? `<div class="sc-row"><span class="sc-key">description</span><span class="sc-val">${esc(description)}</span></div>` : '',
  ].filter(Boolean).join('');
  const metaHtml = metaRows ? `<div class="sc-sec"><h3>[metadata]</h3><div class="sc-card">${metaRows}</div></div>` : '';

  // [options]
  const packages = opts['packages'] || '';
  const pyVer = opts['python_requires'] || opts['python-requires'] || '';
  const installRequires = parseList(opts['install_requires'] || '');

  const optRows = [
    row('packages', packages),
    row('python_requires', pyVer),
  ].filter(Boolean).join('');
  const optionsHtml = (optRows || installRequires.length) ? `
<div class="sc-sec"><h3>[options]</h3><div class="sc-card">
${optRows}
${installRequires.length ? `<div class="sc-row"><span class="sc-key">install_requires</span></div>
<div class="sc-chips">${installRequires.slice(0, 15).map((d) => `<span class="sc-chip dep">${esc(d)}</span>`).join('')}${installRequires.length > 15 ? `<span class="sc-chip">+${installRequires.length - 15} more</span>` : ''}</div>` : ''}
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

  // [options.entry_points] — console_scripts
  const csRaw = entryPts['console_scripts'] || '';
  const consoleScripts = parseList(csRaw).slice(0, 5);
  const entryHtml = consoleScripts.length ? `
<div class="sc-sec"><h3>[options.entry_points] console_scripts</h3><div class="sc-card">
<div class="sc-chips">${consoleScripts.map((s) => `<span class="sc-chip ep">${esc(s)}</span>`).join('')}</div>
</div></div>` : '';

  // [tool:pytest]
  const testpaths = pytest['testpaths'] || '';
  const addopts = pytest['addopts'] || '';
  const minversion = pytest['minversion'] || '';
  const pytestRows = [
    row('testpaths', testpaths),
    row('addopts', addopts),
    row('minversion', minversion),
  ].filter(Boolean).join('');
  const pytestHtml = pytestRows ? `<div class="sc-sec"><h3>[tool:pytest]</h3><div class="sc-card">${pytestRows}</div></div>` : '';

  // [mypy]
  const mypyRows = [
    row('python_version', mypy['python_version'] || mypy['python-version'] || ''),
    row('strict', mypy['strict'] || ''),
    row('ignore_missing_imports', mypy['ignore_missing_imports'] || ''),
    row('disallow_untyped_defs', mypy['disallow_untyped_defs'] || ''),
  ].filter(Boolean).join('');
  const mypyHtml = mypyRows ? `<div class="sc-sec"><h3>[mypy]</h3><div class="sc-card">${mypyRows}</div></div>` : '';

  // [flake8]
  const f8MaxLine = flake8['max-line-length'] || '';
  const f8IgnoreRaw = flake8['ignore'] || flake8['extend-ignore'] || '';
  const f8Ignore = f8IgnoreRaw.split(',').map((s) => s.trim()).filter(Boolean);
  const f8ExcludeRaw = flake8['exclude'] || '';
  const f8Exclude = f8ExcludeRaw.split(',').map((s) => s.trim()).filter(Boolean);
  const flake8Html = (f8MaxLine || f8Ignore.length || f8Exclude.length) ? `
<div class="sc-sec"><h3>[flake8]</h3><div class="sc-card">
${row('max-line-length', f8MaxLine)}
${f8Ignore.length ? `<div class="sc-row"><span class="sc-key">ignore</span><span class="sc-chips">${f8Ignore.map((c) => `<span class="sc-chip">${esc(c)}</span>`).join('')}</span></div>` : ''}
${f8Exclude.length ? `<div class="sc-row"><span class="sc-key">exclude</span><span class="sc-chips">${f8Exclude.map((c) => `<span class="sc-chip">${esc(c)}</span>`).join('')}</span></div>` : ''}
</div></div>` : '';

  // [isort]
  const isortProfile = isort['profile'] || '';
  const isortRows = [
    row('profile', isortProfile),
    row('line_length', isort['line_length'] || isort['line-length'] || ''),
    row('multi_line_output', isort['multi_line_output'] || ''),
  ].filter(Boolean).join('');
  const isortHtml = isortRows ? `<div class="sc-sec"><h3>[isort]</h3><div class="sc-card">${isortRows}</div></div>` : '';

  // Summary
  const toolSecs = [
    Object.keys(pytest).length ? 'pytest' : '',
    Object.keys(mypy).length ? 'mypy' : '',
    Object.keys(flake8).length ? 'flake8' : '',
    Object.keys(isort).length ? 'isort' : '',
  ].filter(Boolean);

  const subParts = [];
  if (name) subParts.push(name);
  if (version) subParts.push(`v${version}`);
  if (installRequires.length) subParts.push(`${installRequires.length} dep${installRequires.length !== 1 ? 's' : ''}`);
  if (pyVer) subParts.push(`Python ${pyVer}`);
  const sub = subParts.join(' · ') || 'Python package configuration';

  const host = document.createElement('div');
  host.className = 'setupcfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="sc-title"><span class="badge-sc">setuptools</span>${esc(name || 'Python Package')}${version ? ` <span style="font-weight:400;font-size:14px;color:var(--fg-2,#888);">v${esc(version)}</span>` : ''}${toolSecs.map((t) => `<span class="sc-badge-tool">${esc(t)}</span>`).join('')}</div>
<div class="sc-sub">${esc(sub)}</div>
${metaHtml}${optionsHtml}${extrasHtml}${entryHtml}${pytestHtml}${mypyHtml}${flake8Html}${isortHtml}`;
  return { parentNode: host };
}
