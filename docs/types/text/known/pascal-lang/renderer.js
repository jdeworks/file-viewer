const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pas-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.pas-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e67e22;color:#fff;vertical-align:middle;margin-right:8px;}
.pas-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.pas-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.pas-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.pas-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.pas-card strong{display:block;font-size:1.2rem;font-weight:700;}
.pas-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.pas-section{margin:16px 0;}
.pas-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.pas-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.pas-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.pas-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.pas-table tr:last-child td{border-bottom:none;}
.pas-tag{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:600;background:var(--bg-3,#e5e7eb);color:var(--fg-2,#555);margin:0 3px 3px 0;}
.pas-kind{font-size:11px;color:var(--fg-2,#888);font-style:italic;}
`;

function parsePascal(text) {
  const lines = (text || '').split(/\r?\n/);
  let unitName = null;
  let programName = null;
  const uses = [];
  const procedures = [];
  const functions = [];
  const classes = [];
  const records = [];
  let inInterface = false;
  let inImplementation = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    // Skip comments
    if (line.startsWith('//') || line.startsWith('{') || line.startsWith('(*')) continue;

    // unit/program name
    const unitMatch = line.match(/^unit\s+(\w+)\s*;/i);
    if (unitMatch && !unitName) unitName = unitMatch[1];

    const programMatch = line.match(/^program\s+(\w+)\s*[;(]/i);
    if (programMatch && !programName) programName = programMatch[1];

    // Track sections
    if (/^interface\s*$/i.test(line) || /^interface\s+/i.test(line)) { inInterface = true; inImplementation = false; }
    if (/^implementation\s*$/i.test(line)) { inImplementation = true; inInterface = false; }

    // uses clause (single line, may be multi-line but capture first occurrence)
    const usesMatch = line.match(/^uses\s+(.+)/i);
    if (usesMatch) {
      const items = usesMatch[1].replace(/;.*$/, '').split(',').map((s) => s.trim()).filter(Boolean);
      for (const item of items) {
        const clean = item.split(/\s+in\s+/i)[0].trim();
        if (clean && !uses.includes(clean)) uses.push(clean);
      }
    }

    // class/record definitions
    const classMatch = line.match(/^(?:type\s+)?(\w+)\s*=\s*(?:class|object)(?:\s*\(([^)]*)\))?/i);
    if (classMatch) classes.push({ name: classMatch[1], parent: classMatch[2] || null });

    const recordMatch = line.match(/^(?:type\s+)?(\w+)\s*=\s*(?:packed\s+)?record\b/i);
    if (recordMatch && !classes.some((c) => c.name === recordMatch[1])) {
      records.push(recordMatch[1]);
    }

    // procedures and functions (interface section exports)
    const procMatch = line.match(/^procedure\s+(\w+(?:\.\w+)?)\s*(?:\([^)]*\))?\s*;/i);
    if (procMatch) {
      const name = procMatch[1];
      if (inInterface && !procedures.includes(name)) procedures.push(name);
    }

    const fnMatch = line.match(/^function\s+(\w+(?:\.\w+)?)\s*(?:\([^)]*\))?\s*(?::\s*\w+)?\s*;/i);
    if (fnMatch) {
      const name = fnMatch[1];
      if (inInterface && !functions.includes(name)) functions.push(name);
    }
  }

  return { unitName, programName, uses, procedures, functions, classes, records };
}

export function render(intake) {
  const { unitName, programName, uses, procedures, functions, classes, records } = parsePascal(intake.text || '');
  const moduleName = unitName || programName || null;
  const moduleKind = unitName ? 'unit' : programName ? 'program' : null;

  const host = document.createElement('div');
  host.className = 'pas-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'pas-title';
  title.innerHTML = `<span class="pas-badge">Pascal</span>${esc(moduleName || 'Source File')}${moduleKind ? ` <span class="pas-kind">(${esc(moduleKind)})</span>` : ''}`;
  host.appendChild(title);

  const subParts = [];
  if (procedures.length) subParts.push(`${procedures.length} procedure${procedures.length !== 1 ? 's' : ''}`);
  if (functions.length) subParts.push(`${functions.length} function${functions.length !== 1 ? 's' : ''}`);
  if (classes.length) subParts.push(`${classes.length} class${classes.length !== 1 ? 'es' : ''}`);
  if (records.length) subParts.push(`${records.length} record${records.length !== 1 ? 's' : ''}`);
  if (uses.length) subParts.push(`${uses.length} import${uses.length !== 1 ? 's' : ''}`);

  const sub = document.createElement('div');
  sub.className = 'pas-sub';
  sub.textContent = subParts.join(' · ') || 'Pascal source';
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'pas-summary';
  const cards = [
    { value: procedures.length, label: 'Procedures' },
    { value: functions.length, label: 'Functions' },
    { value: classes.length, label: 'Classes' },
    { value: uses.length, label: 'Uses' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'pas-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Uses clause
  if (uses.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'pas-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Uses Clause';
    sec.appendChild(h3);
    const div = document.createElement('div');
    for (const u of uses) {
      const tag = document.createElement('span');
      tag.className = 'pas-tag';
      tag.textContent = u;
      div.appendChild(tag);
    }
    sec.appendChild(div);
    host.appendChild(sec);
  }

  // Interface exports (procedures + functions)
  const exports_ = [
    ...procedures.map((n) => ({ name: n, kind: 'procedure' })),
    ...functions.map((n) => ({ name: n, kind: 'function' })),
  ];
  if (exports_.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'pas-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Interface Exports';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'pas-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th><th>Kind</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const { name, kind } of exports_.slice(0, 50)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(name)}</td><td>${esc(kind)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Classes
  if (classes.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'pas-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Classes';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'pas-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th><th>Parent</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const { name, parent } of classes.slice(0, 30)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(name)}</td><td>${esc(parent || '—')}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Records
  if (records.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'pas-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Records';
    sec.appendChild(h3);
    const div = document.createElement('div');
    for (const r of records) {
      const tag = document.createElement('span');
      tag.className = 'pas-tag';
      tag.textContent = r;
      div.appendChild(tag);
    }
    sec.appendChild(div);
    host.appendChild(sec);
  }

  return { parentNode: host };
}
