const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.idr-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.idr-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#b91c1c;color:#fff;vertical-align:middle;margin-right:8px;}
.idr-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.idr-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.idr-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.idr-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.idr-card strong{display:block;font-size:1.2rem;font-weight:700;}
.idr-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.idr-section{margin:16px 0;}
.idr-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.idr-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.idr-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.idr-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.idr-table tr:last-child td{border-bottom:none;}
.idr-tag{display:inline-block;padding:1px 7px;border-radius:10px;font-size:11px;font-weight:600;margin-right:4px;}
.idr-tag.total{background:#d8fde9;color:#0a7440;}
.idr-tag.partial{background:#fde8d8;color:#b45309;}
`;

function parseIdris(text) {
  const lines = (text || '').split(/\r?\n/);
  let moduleName = null;
  const imports = [];
  const dataTypes = [];
  const totalities = []; // { name, ann: 'total'|'partial' }
  let pendingTotality = null;

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('--')) continue;

    // module name
    const modMatch = t.match(/^module\s+([\w.]+)/);
    if (modMatch && !moduleName) moduleName = modMatch[1];

    // import
    const importMatch = t.match(/^import\s+([\w.]+)/);
    if (importMatch && !imports.includes(importMatch[1])) imports.push(importMatch[1]);

    // data type
    const dataMatch = t.match(/^data\s+(\w+)/);
    if (dataMatch) dataTypes.push(dataMatch[1]);

    // totality annotations
    const totalMatch = t.match(/^total\s+(\w+)/) || t.match(/^%total\s+(\w+)/);
    if (totalMatch) { totalities.push({ name: totalMatch[1], ann: 'total' }); pendingTotality = null; continue; }
    const partialMatch = t.match(/^partial\s+(\w+)/) || t.match(/^%partial\s+(\w+)/);
    if (partialMatch) { totalities.push({ name: partialMatch[1], ann: 'partial' }); pendingTotality = null; continue; }

    if (t === 'total' || t === '%total') { pendingTotality = 'total'; continue; }
    if (t === 'partial' || t === '%partial') { pendingTotality = 'partial'; continue; }
    if (pendingTotality) {
      const fnMatch = t.match(/^(\w+)\s*[:(]/);
      if (fnMatch) totalities.push({ name: fnMatch[1], ann: pendingTotality });
      pendingTotality = null;
    }
  }

  return { moduleName, imports, dataTypes, totalities };
}

export function render(intake) {
  const { moduleName, imports, dataTypes, totalities } = parseIdris(intake.text || '');

  const host = document.createElement('div');
  host.className = 'idr-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'idr-title';
  title.innerHTML = '<span class="idr-badge">Idris</span>' + esc(moduleName || 'Source File');
  host.appendChild(title);

  const parts = [];
  if (moduleName) parts.push(`module ${moduleName}`);
  if (imports.length) parts.push(`${imports.length} import${imports.length !== 1 ? 's' : ''}`);
  if (dataTypes.length) parts.push(`${dataTypes.length} data type${dataTypes.length !== 1 ? 's' : ''}`);
  if (totalities.length) parts.push(`${totalities.length} totality annotation${totalities.length !== 1 ? 's' : ''}`);

  const sub = document.createElement('div');
  sub.className = 'idr-sub';
  sub.textContent = parts.join(' · ') || 'Idris source';
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'idr-summary';
  const cards = [
    { value: imports.length, label: 'Imports' },
    { value: dataTypes.length, label: 'Data types' },
    { value: totalities.filter((t) => t.ann === 'total').length, label: 'Total' },
    { value: totalities.filter((t) => t.ann === 'partial').length, label: 'Partial' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'idr-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Imports
  if (imports.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'idr-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Imports';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'idr-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Module</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const imp of imports.slice(0, 30)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(imp)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Data types
  if (dataTypes.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'idr-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Data Types';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'idr-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const dt of dataTypes.slice(0, 30)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(dt)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Totality annotations
  if (totalities.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'idr-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Totality Annotations';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'idr-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Function</th><th>Annotation</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const t of totalities.slice(0, 30)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(t.name)}</td><td><span class="idr-tag ${esc(t.ann)}">${esc(t.ann)}</span></td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  return { parentNode: host };
}
