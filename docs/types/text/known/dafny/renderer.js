const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.dfy-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.dfy-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#6a0dad;color:#fff;vertical-align:middle;margin-right:8px;}
.dfy-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.dfy-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.dfy-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.dfy-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.dfy-card strong{display:block;font-size:1.2rem;font-weight:700;}
.dfy-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.dfy-section{margin:16px 0;}
.dfy-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.dfy-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.dfy-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.dfy-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-size:13px;}
.dfy-table tr:last-child td{border-bottom:none;}
.dfy-mono{font-family:ui-monospace,monospace;font-size:12px;}
.dfy-spec-pill{display:inline-block;padding:2px 8px;border-radius:8px;font-size:11px;font-weight:600;margin:2px;border:1px solid;}
.dfy-spec-requires{background:#fef3c7;color:#92400e;border-color:#fcd34d;}
.dfy-spec-ensures{background:#d1fae5;color:#065f46;border-color:#6ee7b7;}
.dfy-spec-invariant{background:#ede9fe;color:#5b21b6;border-color:#c4b5fd;}
`;

function parseDafny(text) {
  const lines = (text || '').split(/\r?\n/);
  const modules = [];
  const classes = [];
  const methods = [];
  const functions = [];
  const predicates = [];
  let requiresCount = 0;
  let ensuresCount = 0;
  let invariantCount = 0;
  let modifiesCount = 0;

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('//')) continue;

    const moduleM = t.match(/^module\s+(\w[\w.]*)/);
    if (moduleM && !modules.includes(moduleM[1])) modules.push(moduleM[1]);

    const classM = t.match(/^(?:abstract\s+)?class\s+(\w+)/);
    if (classM && !classes.includes(classM[1])) classes.push(classM[1]);

    const methodM = t.match(/^method\s+(\w+)/);
    if (methodM) methods.push(methodM[1]);

    const fnM = t.match(/^function(?:\s+method)?\s+(\w+)/);
    if (fnM) functions.push(fnM[1]);

    const predM = t.match(/^predicate\s+(\w+)/);
    if (predM) predicates.push(predM[1]);

    if (/^\s*requires\b/.test(line)) requiresCount++;
    if (/^\s*ensures\b/.test(line)) ensuresCount++;
    if (/^\s*invariant\b/.test(line)) invariantCount++;
    if (/^\s*modifies\b/.test(line)) modifiesCount++;
  }

  return { modules, classes, methods, functions, predicates, requiresCount, ensuresCount, invariantCount, modifiesCount };
}

export function render(intake) {
  const { modules, classes, methods, functions, predicates, requiresCount, ensuresCount, invariantCount, modifiesCount } = parseDafny(intake.text || '');

  const host = document.createElement('div');
  host.className = 'dfy-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'dfy-title';
  const filename = (intake.name || intake.filename || 'sample.dfy').split('/').pop();
  title.innerHTML = `<span class="dfy-badge">Dafny</span>${esc(filename)}`;
  host.appendChild(title);

  const subParts = [];
  if (modules.length) subParts.push(`${modules.length} module${modules.length !== 1 ? 's' : ''}`);
  if (classes.length) subParts.push(`${classes.length} class${classes.length !== 1 ? 'es' : ''}`);
  subParts.push(`${methods.length + functions.length} callable${methods.length + functions.length !== 1 ? 's' : ''}`);
  const specTotal = requiresCount + ensuresCount + invariantCount;
  if (specTotal) subParts.push(`${specTotal} spec clause${specTotal !== 1 ? 's' : ''}`);

  const sub = document.createElement('div');
  sub.className = 'dfy-sub';
  sub.textContent = subParts.join(' · ') || 'Dafny Verification Language';
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'dfy-summary';
  const cards = [
    { value: methods.length, label: 'Methods' },
    { value: functions.length, label: 'Functions' },
    { value: predicates.length, label: 'Predicates' },
    { value: classes.length, label: 'Classes' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'dfy-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Specification clauses summary
  const specSec = document.createElement('div');
  specSec.className = 'dfy-section';
  const specH3 = document.createElement('h3');
  specH3.textContent = 'Correctness Contracts';
  specSec.appendChild(specH3);
  const specDiv = document.createElement('div');
  const specItems = [
    { count: requiresCount, label: 'requires', cssClass: 'dfy-spec-requires' },
    { count: ensuresCount, label: 'ensures', cssClass: 'dfy-spec-ensures' },
    { count: invariantCount, label: 'invariant', cssClass: 'dfy-spec-invariant' },
  ];
  for (const { count, label, cssClass } of specItems) {
    const pill = document.createElement('span');
    pill.className = `dfy-spec-pill ${cssClass}`;
    pill.textContent = `${count} ${label}`;
    specDiv.appendChild(pill);
  }
  if (modifiesCount > 0) {
    const modPill = document.createElement('span');
    modPill.className = 'dfy-spec-pill';
    modPill.style.cssText = 'background:var(--bg-2,#f0f4f8);color:var(--fg,#333);border-color:var(--border,#ccc);';
    modPill.textContent = `${modifiesCount} modifies`;
    specDiv.appendChild(modPill);
  }
  specSec.appendChild(specDiv);
  host.appendChild(specSec);

  // Modules
  if (modules.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'dfy-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Modules';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'dfy-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Module</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const mod of modules) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="dfy-mono">${esc(mod)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Classes
  if (classes.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'dfy-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Classes';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'dfy-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Class</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const cls of classes) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="dfy-mono">${esc(cls)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Methods + Functions
  const callables = [
    ...methods.map((n) => ({ name: n, kind: 'method' })),
    ...functions.map((n) => ({ name: n, kind: 'function' })),
    ...predicates.map((n) => ({ name: n, kind: 'predicate' })),
  ];
  if (callables.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'dfy-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Methods, Functions & Predicates';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'dfy-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th><th>Kind</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const { name, kind } of callables.slice(0, 30)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="dfy-mono">${esc(name)}</td><td>${esc(kind)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  return { parentNode: host };
}
