const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function detectBackend(buildSystem) {
  if (!buildSystem) return null;
  const requires = (buildSystem.requires || []).map((r) => String(r).toLowerCase());
  const backend = String(buildSystem['build-backend'] || '').toLowerCase();
  if (backend.includes('poetry') || requires.some((r) => r.includes('poetry'))) return 'Poetry';
  if (backend.includes('hatchling') || requires.some((r) => r.includes('hatch'))) return 'Hatch';
  if (backend.includes('flit') || requires.some((r) => r.includes('flit'))) return 'Flit';
  if (backend.includes('maturin') || requires.some((r) => r.includes('maturin'))) return 'Maturin';
  if (backend.includes('setuptools') || requires.some((r) => r.includes('setuptools'))) return 'setuptools';
  if (backend.includes('pdm') || requires.some((r) => r.includes('pdm'))) return 'PDM';
  if (backend.includes('scikit') || requires.some((r) => r.includes('scikit'))) return 'scikit-build';
  if (backend) return backend.split('.')[0];
  return null;
}

function parseDepList(deps) {
  if (!Array.isArray(deps)) return [];
  return deps.map((d) => {
    const s = String(d);
    const m = s.match(/^([A-Za-z0-9_.\-\[\]]+)(.*)/);
    return m ? { name: m[1], spec: m[2].trim() } : { name: s, spec: '' };
  });
}

const BACKEND_COLORS = {
  Poetry:      { bg: '#2c2d72', text: '#fff' },
  Hatch:       { bg: '#009485', text: '#fff' },
  Flit:        { bg: '#5c3d84', text: '#fff' },
  Maturin:     { bg: '#b7410e', text: '#fff' },
  setuptools:  { bg: '#3c7abf', text: '#fff' },
  PDM:          { bg: '#1d6696', text: '#fff' },
  'scikit-build': { bg: '#0056a0', text: '#fff' },
};

const CSS = `
.pyproject-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.pyproject-doc .badge-py{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#3776ab;color:#ffd343;vertical-align:middle;margin-right:6px;}
.pyproject-doc .badge-backend{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;vertical-align:middle;margin-left:4px;}
.pyproject-doc .pp-name{font-size:18px;font-weight:700;margin:0 0 2px;}
.pyproject-doc .pp-meta{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.pyproject-doc .pp-desc{font-size:13px;color:var(--fg-1,#555);margin:0 0 12px;}
.pyproject-doc .pp-sec{margin:14px 0;}
.pyproject-doc .pp-sec h3{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--fg-2,#888);margin:0 0 7px;font-weight:600;}
.pyproject-doc .pp-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.pyproject-doc .pp-row{display:flex;gap:8px;font-size:13px;padding:3px 0;}
.pyproject-doc .pp-key{color:var(--fg-2,#888);min-width:150px;flex-shrink:0;font-size:12px;font-family:ui-monospace,monospace;}
.pyproject-doc .pp-val{font-family:ui-monospace,monospace;word-break:break-all;font-size:12px;}
.pyproject-doc .pp-chips{display:flex;flex-wrap:wrap;gap:5px;margin:4px 0;}
.pyproject-doc .pp-dep{font-size:12px;padding:2px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.pyproject-doc .pp-dep .ver{color:var(--fg-2,#888);font-size:11px;}
.pyproject-doc .pp-group{display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.pyproject-doc .pp-tool{display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:3px 10px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a;}
.pyproject-doc .pp-build{font-size:12px;padding:8px 12px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.pyproject-doc .pp-kv-inline{color:var(--fg-2,#888);font-size:11px;}
`;

function depChips(deps, max = 15) {
  const shown = deps.slice(0, max);
  const more = deps.length - max;
  return shown.map((d) => `<span class="pp-dep">${esc(d.name)}${d.spec ? ` <span class="ver">${esc(d.spec)}</span>` : ''}</span>`).join('') +
    (more > 0 ? `<span class="pp-dep pp-kv-inline">+${more} more</span>` : '');
}

export function render(intake) {
  const cfg = intake.parsed || {};
  const project = cfg.project || {};
  const buildSys = cfg['build-system'] || {};
  const tool = cfg.tool || {};

  // [project] PEP 621
  const name = project.name || tool?.poetry?.name || '—';
  const version = project.version || tool?.poetry?.version || '—';
  const description = project.description || tool?.poetry?.description || '';
  const pyReq = project['requires-python'] || '';
  const license = typeof project.license === 'string' ? project.license
    : project.license?.text || project.license?.file || '';
  const authors = (project.authors || tool?.poetry?.authors || [])
    .slice(0, 3).map((a) => (typeof a === 'string' ? a : a?.name || a?.email || '')).filter(Boolean);
  const maintainers = (project.maintainers || [])
    .slice(0, 2).map((a) => (typeof a === 'string' ? a : a?.name || '')).filter(Boolean);

  // Build backend
  const backend = detectBackend(buildSys);
  const backendRequires = (buildSys.requires || []).map(String);

  // Dependencies
  const deps = parseDepList(project.dependencies || []);
  const poetryDeps = Object.entries(tool?.poetry?.dependencies || {})
    .filter(([k]) => k.toLowerCase() !== 'python')
    .map(([k, v]) => ({ name: k, spec: typeof v === 'string' ? v : '' }));
  const allDeps = deps.length ? deps : poetryDeps;

  // Optional deps
  const optDeps = project['optional-dependencies'] || {};
  const optGroups = Object.entries(optDeps);

  // Poetry dev deps
  const poetryDevDeps = Object.entries(tool?.poetry?.['dev-dependencies'] || {})
    .map(([k, v]) => ({ name: k, spec: typeof v === 'string' ? v : '' }));
  const poetryGroupDeps = Object.entries(tool?.poetry?.group || {}).flatMap(([grp, g]) =>
    Object.entries(g?.dependencies || {}).map(([k, v]) => ({ name: k, spec: typeof v === 'string' ? v : '', group: grp }))
  );

  // Tool sections
  const pytest = tool?.pytest?.['ini_options'] || tool?.pytest || {};
  const mypy = tool?.mypy || {};
  const ruff = tool?.ruff || {};
  const black = tool?.black || {};
  const isort = tool?.isort || {};
  const toolSectionNames = Object.keys(tool).filter(Boolean);

  const host = document.createElement('div');
  host.className = 'pyproject-doc';

  const bc = backend ? BACKEND_COLORS[backend] || { bg: '#555', text: '#fff' } : null;
  const backendBadge = backend
    ? `<span class="badge-backend" style="background:${bc.bg};color:${bc.text};">${esc(backend)}</span>`
    : '';

  // Build system section
  const buildHtml = (backend || backendRequires.length) ? `
<div class="pp-sec"><h3>Build system</h3><div class="pp-build">
  <strong>${esc(backend || buildSys['build-backend'] || 'unknown')}</strong>
  ${backendRequires.length ? `<span class="pp-kv-inline"> · requires: ${backendRequires.map(esc).join(', ')}</span>` : ''}
</div></div>` : '';

  // [project] metadata
  const metaRows = [
    authors.length ? `<div class="pp-row"><span class="pp-key">authors</span><span class="pp-val">${authors.map(esc).join(', ')}</span></div>` : '',
    maintainers.length ? `<div class="pp-row"><span class="pp-key">maintainers</span><span class="pp-val">${maintainers.map(esc).join(', ')}</span></div>` : '',
    license ? `<div class="pp-row"><span class="pp-key">license</span><span class="pp-val">${esc(license)}</span></div>` : '',
  ].filter(Boolean).join('');

  const projectHtml = metaRows ? `<div class="pp-sec"><h3>[project]</h3><div class="pp-card">${metaRows}</div></div>` : '';

  // Dependencies
  const depsHtml = allDeps.length ? `
<div class="pp-sec"><h3>Dependencies (${allDeps.length})</h3>
<div class="pp-chips">${depChips(allDeps)}</div></div>` : '';

  // Dev deps (poetry)
  const devDepsAll = [...poetryDevDeps, ...poetryGroupDeps];
  const devHtml = devDepsAll.length ? `
<div class="pp-sec"><h3>Dev dependencies (${devDepsAll.length})</h3>
<div class="pp-chips">${depChips(devDepsAll)}</div></div>` : '';

  // Optional dep groups
  const optHtml = optGroups.length ? `
<div class="pp-sec"><h3>Optional dependency groups</h3>
<div class="pp-chips">${optGroups.map(([g, ds]) => {
    const count = Array.isArray(ds) ? ds.length : 0;
    return `<span class="pp-group">${esc(g)}${count ? ` <span class="pp-kv-inline">(${count})</span>` : ''}</span>`;
  }).join('')}</div></div>` : '';

  // Tool configs
  const pytestRows = [
    pytest.testpaths ? `<div class="pp-row"><span class="pp-key">testpaths</span><span class="pp-val">${esc(Array.isArray(pytest.testpaths) ? pytest.testpaths.join(', ') : pytest.testpaths)}</span></div>` : '',
    pytest.addopts ? `<div class="pp-row"><span class="pp-key">addopts</span><span class="pp-val">${esc(pytest.addopts)}</span></div>` : '',
    (pytest.markers && Array.isArray(pytest.markers) && pytest.markers.length) ? `<div class="pp-row"><span class="pp-key">markers</span><span class="pp-val">${esc(pytest.markers.slice(0,3).join(', '))}${pytest.markers.length > 3 ? '…' : ''}</span></div>` : '',
  ].filter(Boolean).join('');
  const pytestHtml = pytestRows ? `<div class="pp-sec"><h3>[tool.pytest.ini_options]</h3><div class="pp-card">${pytestRows}</div></div>` : '';

  const mypyRows = [
    mypy.python_version ? `<div class="pp-row"><span class="pp-key">python_version</span><span class="pp-val">${esc(mypy.python_version)}</span></div>` : '',
    mypy.strict != null ? `<div class="pp-row"><span class="pp-key">strict</span><span class="pp-val">${esc(String(mypy.strict))}</span></div>` : '',
    mypy.ignore_missing_imports != null ? `<div class="pp-row"><span class="pp-key">ignore_missing_imports</span><span class="pp-val">${esc(String(mypy.ignore_missing_imports))}</span></div>` : '',
  ].filter(Boolean).join('');
  const mypyHtml = mypyRows ? `<div class="pp-sec"><h3>[tool.mypy]</h3><div class="pp-card">${mypyRows}</div></div>` : '';

  const ruffKeys = Object.keys(ruff).filter(Boolean).slice(0, 6);
  const ruffHtml = ruffKeys.length ? `<div class="pp-sec"><h3>[tool.ruff]</h3><div class="pp-card">
${ruffKeys.map((k) => {
    const v = ruff[k];
    const vs = Array.isArray(v) ? v.join(', ') : String(v ?? '');
    return `<div class="pp-row"><span class="pp-key">${esc(k)}</span><span class="pp-val">${esc(vs)}</span></div>`;
  }).join('')}</div></div>` : '';

  const blackKeys = Object.keys(black).slice(0, 4);
  const blackHtml = blackKeys.length ? `<div class="pp-sec"><h3>[tool.black]</h3><div class="pp-card">
${blackKeys.map((k) => `<div class="pp-row"><span class="pp-key">${esc(k)}</span><span class="pp-val">${esc(String(black[k] ?? ''))}</span></div>`).join('')}
</div></div>` : '';

  const isortKeys = Object.keys(isort).slice(0, 4);
  const isortHtml = isortKeys.length ? `<div class="pp-sec"><h3>[tool.isort]</h3><div class="pp-card">
${isortKeys.map((k) => `<div class="pp-row"><span class="pp-key">${esc(k)}</span><span class="pp-val">${esc(String(isort[k] ?? ''))}</span></div>`).join('')}
</div></div>` : '';

  // Other tool sections summary
  const knownTools = new Set(['pytest', 'mypy', 'ruff', 'black', 'isort', 'poetry', 'hatch', 'pdm']);
  const otherTools = toolSectionNames.filter((t) => !knownTools.has(t));
  const otherToolsHtml = otherTools.length ? `
<div class="pp-sec"><h3>Other tool configs (${otherTools.length})</h3>
<div class="pp-chips">${otherTools.map((t) => `<span class="pp-tool">${esc(t)}</span>`).join('')}</div></div>` : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="pp-name"><span class="badge-py">Python</span>${esc(name)}${backendBadge}${version !== '—' ? ` <span style="font-weight:400;font-size:14px;color:var(--fg-2,#888);">v${esc(version)}</span>` : ''}</div>
<div class="pp-meta">${pyReq ? `Python ${esc(pyReq)}` : ''}${pyReq && (license || authors.length) ? ' · ' : ''}${license ? esc(license) : ''}${authors.length && !license ? authors.map(esc).join(', ') : ''}</div>
${description ? `<div class="pp-desc">${esc(description)}</div>` : ''}
${buildHtml}${projectHtml}${depsHtml}${devHtml}${optHtml}${pytestHtml}${mypyHtml}${ruffHtml}${blackHtml}${isortHtml}${otherToolsHtml}`;

  return { parentNode: host };
}
