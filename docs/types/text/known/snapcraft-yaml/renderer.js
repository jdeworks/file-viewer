import { loadGlobal, vendor } from '../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.snap-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.snap-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e95420;color:#fff;vertical-align:middle;margin-right:8px;}
.snap-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.snap-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.snap-grid{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:0 0 16px;background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:10px 14px;}
.snap-lbl{font-size:11px;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em;white-space:nowrap;padding-top:2px;}
.snap-val{font:13px/1.5 ui-monospace,monospace;font-weight:600;word-break:break-all;}
.snap-confinement{display:inline-block;padding:1px 8px;border-radius:8px;font-size:11px;font-weight:700;font-family:ui-monospace,monospace;}
.snap-confinement.strict{background:#f0fdf4;border:1px solid #86efac;color:#166534;}
.snap-confinement.classic{background:#fff7ed;border:1px solid #fdba74;color:#9a3412;}
.snap-confinement.devmode{background:#fefce8;border:1px solid #fde047;color:#854d0e;}
.snap-sec{margin:16px 0;}
.snap-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.snap-table{width:100%;border-collapse:collapse;font-size:13px;}
.snap-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:4px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.snap-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.snap-table tr:last-child td{border-bottom:none;}
.snap-pill{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
`;

async function parseSnapcraft(text) {
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    return jsyaml.load(text) || {};
  } catch { return {}; }
}

export async function render(intake) {
  const text = intake.text || '';
  let cfg = {};
  try { cfg = await parseSnapcraft(text); } catch { cfg = {}; }
  if (typeof cfg !== 'object' || cfg === null) cfg = {};

  const name = cfg.name || '';
  const version = String(cfg.version || '');
  const summary = cfg.summary || '';
  const description = cfg.description || '';
  const confinement = cfg.confinement || '';
  const grade = cfg.grade || '';
  const base = cfg.base || '';
  const apps = cfg.apps && typeof cfg.apps === 'object' ? cfg.apps : {};
  const parts = cfg.parts && typeof cfg.parts === 'object' ? cfg.parts : {};
  const plugs = cfg.plugs && typeof cfg.plugs === 'object' ? cfg.plugs : {};
  const slots = cfg.slots && typeof cfg.slots === 'object' ? cfg.slots : {};

  const appNames = Object.keys(apps);
  const partNames = Object.keys(parts);
  const plugNames = Object.keys(plugs);
  const slotNames = Object.keys(slots);

  const host = document.createElement('div');
  host.className = 'snap-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const titleEl = document.createElement('div');
  titleEl.className = 'snap-title';
  titleEl.innerHTML = `<span class="snap-badge">Snapcraft</span>${esc(name || 'Snapcraft manifest')}`;
  host.appendChild(titleEl);

  const metaParts = [version && `v${version}`, confinement && confinement, grade && grade].filter(Boolean);
  const subEl = document.createElement('div');
  subEl.className = 'snap-sub';
  subEl.textContent = [summary, ...metaParts].filter(Boolean).join(' · ');
  host.appendChild(subEl);

  // Key metadata grid
  const grid = document.createElement('div');
  grid.className = 'snap-grid';
  const infoRows = [
    name && ['Name', name],
    version && ['Version', version],
    base && ['Base', base],
    grade && ['Grade', grade],
  ].filter(Boolean);
  for (const [lbl, val] of infoRows) {
    const l = document.createElement('span');
    l.className = 'snap-lbl';
    l.textContent = lbl;
    const v = document.createElement('span');
    v.className = 'snap-val';
    v.textContent = val;
    grid.appendChild(l);
    grid.appendChild(v);
  }
  // Confinement with color coding
  if (confinement) {
    const l = document.createElement('span');
    l.className = 'snap-lbl';
    l.textContent = 'Confinement';
    const v = document.createElement('span');
    const cls = confinement === 'strict' ? 'strict' : confinement === 'classic' ? 'classic' : confinement === 'devmode' ? 'devmode' : '';
    v.innerHTML = `<span class="snap-confinement ${cls}">${esc(confinement)}</span>`;
    grid.appendChild(l);
    grid.appendChild(v);
  }
  if (infoRows.length || confinement) host.appendChild(grid);

  // Description (truncated)
  if (description) {
    const sec = document.createElement('div');
    sec.className = 'snap-sec';
    const h3 = document.createElement('h3');
    h3.textContent = 'Description';
    sec.appendChild(h3);
    const p = document.createElement('p');
    p.style.cssText = 'font-size:13px;margin:0;color:var(--fg,#24292f);white-space:pre-wrap;';
    p.textContent = description.trim().slice(0, 400) + (description.length > 400 ? '…' : '');
    sec.appendChild(p);
    host.appendChild(sec);
  }

  // Apps table
  if (appNames.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'snap-sec';
    const h3 = document.createElement('h3');
    h3.textContent = `Apps (${appNames.length})`;
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'snap-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>App</th><th>Command</th><th>Plugs</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const aName of appNames.slice(0, 30)) {
      const app = apps[aName] || {};
      const cmd = app.command || '—';
      const appPlugs = Array.isArray(app.plugs) ? app.plugs : [];
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(aName)}</td><td>${esc(cmd)}</td><td>${appPlugs.slice(0, 5).map((p) => `<span class="snap-pill">${esc(p)}</span>`).join('') || '—'}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Parts table
  if (partNames.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'snap-sec';
    const h3 = document.createElement('h3');
    h3.textContent = `Parts (${partNames.length})`;
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'snap-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Part</th><th>Plugin</th><th>Source</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const pName of partNames.slice(0, 30)) {
      const part = parts[pName] || {};
      const plugin = part.plugin || '—';
      const source = part.source || '—';
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(pName)}</td><td>${esc(plugin)}</td><td>${esc(String(source).slice(0, 50))}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Plugs / Slots summary
  if (plugNames.length > 0 || slotNames.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'snap-sec';
    const h3 = document.createElement('h3');
    h3.textContent = 'Plugs / Slots';
    sec.appendChild(h3);
    const pills = document.createElement('div');
    if (plugNames.length > 0) {
      const lbl = document.createElement('span');
      lbl.style.cssText = 'font-size:11px;color:var(--fg-2,#888);margin-right:6px;';
      lbl.textContent = 'Plugs:';
      pills.appendChild(lbl);
      for (const p of plugNames.slice(0, 20)) {
        const pill = document.createElement('span');
        pill.className = 'snap-pill';
        pill.textContent = p;
        pills.appendChild(pill);
      }
    }
    if (slotNames.length > 0) {
      const lbl = document.createElement('span');
      lbl.style.cssText = 'font-size:11px;color:var(--fg-2,#888);margin:0 6px 0 10px;';
      lbl.textContent = 'Slots:';
      pills.appendChild(lbl);
      for (const s of slotNames.slice(0, 20)) {
        const pill = document.createElement('span');
        pill.className = 'snap-pill';
        pill.textContent = s;
        pills.appendChild(pill);
      }
    }
    sec.appendChild(pills);
    host.appendChild(sec);
  }

  return { parentNode: host };
}
