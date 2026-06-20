import { loadGlobal, vendor } from '../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.fpm-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.fpm-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#4a90d9;color:#fff;vertical-align:middle;margin-right:8px;}
.fpm-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.fpm-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.fpm-grid{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:0 0 16px;background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:10px 14px;}
.fpm-lbl{font-size:11px;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em;white-space:nowrap;padding-top:2px;}
.fpm-val{font:13px/1.5 ui-monospace,monospace;font-weight:600;word-break:break-all;}
.fpm-sec{margin:16px 0;}
.fpm-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.fpm-table{width:100%;border-collapse:collapse;font-size:13px;}
.fpm-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:4px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.fpm-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.fpm-table tr:last-child td{border-bottom:none;}
.fpm-bs{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f0f4fa);border:1px solid var(--border,#d0d7de);font-family:ui-monospace,monospace;}
.fpm-pill{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
`;

async function parseManifest(text) {
  try { return JSON.parse(text); } catch { /* not JSON */ }
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    return jsyaml.load(text) || {};
  } catch { return {}; }
}

export async function render(intake) {
  const text = intake.text || '';
  let manifest = {};
  try { manifest = await parseManifest(text); } catch { manifest = {}; }

  const appId = manifest['app-id'] || manifest['id'] || '';
  const runtime = manifest['runtime'] || '';
  const runtimeVersion = manifest['runtime-version'] || '';
  const sdk = manifest['sdk'] || '';
  const branch = manifest['branch'] || '';
  const command = manifest['command'] || '';
  const buildOptions = manifest['build-options'] || null;
  const modules = Array.isArray(manifest['modules']) ? manifest['modules'] : [];
  const finishArgs = Array.isArray(manifest['finish-args']) ? manifest['finish-args'] : [];

  const host = document.createElement('div');
  host.className = 'fpm-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const titleEl = document.createElement('div');
  titleEl.className = 'fpm-title';
  titleEl.innerHTML = `<span class="fpm-badge">Flatpak</span>${esc(appId || 'Flatpak Manifest')}`;
  host.appendChild(titleEl);

  const runtimeFull = runtimeVersion ? `${runtime}//${runtimeVersion}` : runtime;
  const parts = [runtimeFull && `runtime ${runtimeFull}`, `${modules.length} module${modules.length !== 1 ? 's' : ''}`].filter(Boolean);
  const subEl = document.createElement('div');
  subEl.className = 'fpm-sub';
  subEl.textContent = parts.join(' · ');
  host.appendChild(subEl);

  // Key metadata grid
  const grid = document.createElement('div');
  grid.className = 'fpm-grid';
  const rows = [
    appId && ['App ID', appId],
    runtimeFull && ['Runtime', runtimeFull],
    sdk && ['SDK', sdk],
    branch && ['Branch', branch],
    command && ['Command', command],
  ].filter(Boolean);
  for (const [lbl, val] of rows) {
    const l = document.createElement('span');
    l.className = 'fpm-lbl';
    l.textContent = lbl;
    const v = document.createElement('span');
    v.className = 'fpm-val';
    v.textContent = val;
    grid.appendChild(l);
    grid.appendChild(v);
  }
  if (rows.length) host.appendChild(grid);

  // Build options summary
  if (buildOptions && typeof buildOptions === 'object') {
    const optKeys = Object.keys(buildOptions);
    if (optKeys.length > 0) {
      const sec = document.createElement('div');
      sec.className = 'fpm-sec';
      const h3 = document.createElement('h3');
      h3.textContent = 'Build Options';
      sec.appendChild(h3);
      const pills = document.createElement('div');
      for (const k of optKeys.slice(0, 10)) {
        const pill = document.createElement('span');
        pill.className = 'fpm-pill';
        const val = buildOptions[k];
        pill.textContent = typeof val === 'boolean' || typeof val === 'number' ? `${k}: ${val}` : k;
        pills.appendChild(pill);
      }
      sec.appendChild(pills);
      host.appendChild(sec);
    }
  }

  // Modules table
  if (modules.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'fpm-sec';
    const h3 = document.createElement('h3');
    h3.textContent = `Modules (${modules.length})`;
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'fpm-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>#</th><th>Name</th><th>Buildsystem</th><th>Sources</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (let i = 0; i < Math.min(modules.length, 40); i++) {
      const mod = modules[i];
      if (!mod || typeof mod !== 'object') continue;
      const name = mod.name || '—';
      const bs = mod.buildsystem || mod['buildsystem'] || '(auto)';
      const sources = Array.isArray(mod.sources) ? mod.sources.length : 0;
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${i + 1}</td><td>${esc(name)}</td><td><span class="fpm-bs">${esc(bs)}</span></td><td>${sources > 0 ? sources : '—'}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Finish-args (permissions)
  if (finishArgs.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'fpm-sec';
    const h3 = document.createElement('h3');
    h3.textContent = `Finish Args / Permissions (${finishArgs.length})`;
    sec.appendChild(h3);
    const pills = document.createElement('div');
    for (const arg of finishArgs.slice(0, 30)) {
      const pill = document.createElement('span');
      pill.className = 'fpm-pill';
      pill.textContent = String(arg);
      pills.appendChild(pill);
    }
    sec.appendChild(pills);
    host.appendChild(sec);
  }

  return { parentNode: host };
}
