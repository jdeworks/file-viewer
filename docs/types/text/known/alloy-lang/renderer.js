const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.als-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.als-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0ea5e9;color:#fff;vertical-align:middle;margin-right:8px;}
.als-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.als-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.als-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.als-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.als-card strong{display:block;font-size:1.2rem;font-weight:700;}
.als-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.als-section{margin:14px 0;}
.als-section h3{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-2,#888);margin:0 0 6px;}
.als-table{width:100%;border-collapse:collapse;font-size:13px;}
.als-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);}
.als-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.als-table tr:last-child td{border-bottom:none;}
.als-pill{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;background:var(--bg-2,#e0f2fe);border:1px solid #bae6fd;color:#0369a1;font-family:ui-monospace,monospace;margin:2px 2px 2px 0;}
.als-cmd{font-family:ui-monospace,monospace;font-size:12px;background:var(--bg-2,#f6f8fa);padding:3px 7px;border-radius:5px;border:1px solid var(--border,#e0e0e0);}
`;

function parseAlloy(text) {
  const lines = (text || '').split(/\r?\n/);

  // Module name
  let moduleName = null;
  const modMatch = text.match(/\bmodule\s+(\S+)/);
  if (modMatch) moduleName = modMatch[1];

  // Signature definitions (sig <Name> / abstract sig / one sig / etc.)
  const sigs = [];
  for (const line of lines) {
    const t = line.trim();
    const sigMatch = t.match(/^(?:abstract\s+|one\s+|some\s+|lone\s+)?sig\s+(\w+)/);
    if (sigMatch) sigs.push(sigMatch[1]);
    // "extends" form: sig Foo extends Bar
    const extMatch = t.match(/\bsig\s+(\w+)\s+extends\s+/);
    if (extMatch && !sigs.includes(extMatch[1])) sigs.push(extMatch[1]);
  }

  // Predicates
  const preds = [];
  for (const line of lines) {
    const m = line.trim().match(/^pred\s+(\w+)/);
    if (m) preds.push(m[1]);
  }

  // Facts
  let factCount = 0;
  for (const line of lines) {
    if (/^fact\s*\w*\s*\{/.test(line.trim()) || /^fact\s*\{/.test(line.trim())) factCount++;
  }

  // Assertions
  const assertions = [];
  for (const line of lines) {
    const m = line.trim().match(/^assert\s+(\w+)/);
    if (m) assertions.push(m[1]);
  }

  // Check commands
  const checks = [];
  for (const line of lines) {
    const m = line.trim().match(/^check\s+(\w+)/);
    if (m) checks.push(m[1]);
  }

  // Run commands
  const runs = [];
  for (const line of lines) {
    const m = line.trim().match(/^run\s+(\w+)/);
    if (m) runs.push(m[1]);
  }

  return { moduleName, sigs, preds, factCount, assertions, checks, runs };
}

export function render(intake) {
  const parsed = parseAlloy(intake.text || '');
  const { moduleName, sigs, preds, factCount, assertions, checks, runs } = parsed;

  const host = document.createElement('div');
  host.className = 'als-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'als-title';
  const badge = document.createElement('span');
  badge.className = 'als-badge';
  badge.textContent = 'Alloy';
  title.appendChild(badge);
  title.appendChild(document.createTextNode(moduleName ? 'Module: ' + moduleName : 'Alloy Specification'));
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'als-sub';
  const parts = [];
  if (sigs.length) parts.push(`${sigs.length} sig${sigs.length !== 1 ? 's' : ''}`);
  if (preds.length) parts.push(`${preds.length} pred${preds.length !== 1 ? 's' : ''}`);
  if (factCount) parts.push(`${factCount} fact${factCount !== 1 ? 's' : ''}`);
  if (assertions.length) parts.push(`${assertions.length} assert${assertions.length !== 1 ? 'ions' : 'ion'}`);
  if (checks.length) parts.push(`${checks.length} check${checks.length !== 1 ? 's' : ''}`);
  if (runs.length) parts.push(`${runs.length} run${runs.length !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'als-summary';
  const cards = [
    { value: sigs.length, label: 'Signatures' },
    { value: preds.length, label: 'Predicates' },
    { value: factCount, label: 'Facts' },
    { value: assertions.length, label: 'Assertions' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'als-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Signatures list
  if (sigs.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'als-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Signatures';
    sec.appendChild(h3);
    for (const sig of sigs.slice(0, 30)) {
      const pill = document.createElement('span');
      pill.className = 'als-pill';
      pill.textContent = sig;
      sec.appendChild(pill);
    }
    host.appendChild(sec);
  }

  // Predicates list
  if (preds.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'als-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Predicates';
    sec.appendChild(h3);
    for (const pred of preds.slice(0, 20)) {
      const pill = document.createElement('span');
      pill.className = 'als-pill';
      pill.textContent = pred;
      sec.appendChild(pill);
    }
    host.appendChild(sec);
  }

  // Check / Run commands
  if (checks.length > 0 || runs.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'als-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Analysis Commands';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'als-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Kind</th><th>Name</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const name of assertions) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>assert</td><td>${esc(name)}</td>`;
      tbody.appendChild(tr);
    }
    for (const name of checks) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>check</td><td>${esc(name)}</td>`;
      tbody.appendChild(tr);
    }
    for (const name of runs) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>run</td><td>${esc(name)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  return { parentNode: host };
}
