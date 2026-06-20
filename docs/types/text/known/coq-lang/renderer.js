const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.coq-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.coq-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#dc2626;color:#fff;vertical-align:middle;margin-right:8px;}
.coq-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.coq-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.coq-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.coq-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.coq-card strong{display:block;font-size:1.2rem;font-weight:700;}
.coq-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.coq-section{margin:14px 0;}
.coq-section h3{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-2,#888);margin:0 0 6px;}
.coq-table{width:100%;border-collapse:collapse;font-size:13px;}
.coq-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);}
.coq-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.coq-table tr:last-child td{border-bottom:none;}
.coq-pills{display:flex;flex-wrap:wrap;gap:5px;}
.coq-pill{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;background:var(--bg-2,#fef2f2);border:1px solid #fecaca;color:#991b1b;font-family:ui-monospace,monospace;}
`;

function parseCoq(text) {
  const lines = (text || '').split(/\r?\n/);

  // Module name
  let moduleName = null;
  const modMatch = text.match(/\bModule\s+(\w+)/);
  if (modMatch) moduleName = modMatch[1];

  // Require Import list
  const requires = [];
  for (const line of lines) {
    const m = line.trim().match(/^Require\s+(?:Import\s+|Export\s+)?(.+?)\.?\s*$/);
    if (m) {
      const mods = m[1].trim().split(/\s+/);
      for (const mod of mods) {
        if (mod && mod !== 'Import' && mod !== 'Export') requires.push(mod.replace(/\.$/, ''));
      }
    }
  }

  // Definition / Fixpoint count
  let defCount = 0;
  let fixpointCount = 0;
  for (const line of lines) {
    const t = line.trim();
    if (/^Definition\s+/.test(t)) defCount++;
    if (/^Fixpoint\s+/.test(t) || /^Function\s+/.test(t)) fixpointCount++;
  }

  // Theorem / Lemma / Corollary count
  let theoremCount = 0;
  let lemmaCount = 0;
  let corollaryCount = 0;
  for (const line of lines) {
    const t = line.trim();
    if (/^Theorem\s+/.test(t)) theoremCount++;
    else if (/^Lemma\s+/.test(t)) lemmaCount++;
    else if (/^Corollary\s+/.test(t)) corollaryCount++;
  }

  // Inductive types
  const inductives = [];
  for (const line of lines) {
    const m = line.trim().match(/^(?:Inductive|CoInductive)\s+(\w+)/);
    if (m) inductives.push(m[1]);
  }

  return { moduleName, requires, defCount, fixpointCount, theoremCount, lemmaCount, corollaryCount, inductives };
}

export function render(intake) {
  const parsed = parseCoq(intake.text || '');
  const { moduleName, requires, defCount, fixpointCount, theoremCount, lemmaCount, corollaryCount, inductives } = parsed;

  const host = document.createElement('div');
  host.className = 'coq-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'coq-title';
  const badge = document.createElement('span');
  badge.className = 'coq-badge';
  badge.textContent = 'Coq';
  title.appendChild(badge);
  title.appendChild(document.createTextNode(moduleName ? 'Module: ' + moduleName : 'Coq Source File'));
  host.appendChild(title);

  const totalProofs = theoremCount + lemmaCount + corollaryCount;
  const sub = document.createElement('div');
  sub.className = 'coq-sub';
  const parts = [];
  if (totalProofs) parts.push(`${totalProofs} proof item${totalProofs !== 1 ? 's' : ''}`);
  if (defCount + fixpointCount) parts.push(`${defCount + fixpointCount} definition${(defCount + fixpointCount) !== 1 ? 's' : ''}`);
  if (inductives.length) parts.push(`${inductives.length} inductive type${inductives.length !== 1 ? 's' : ''}`);
  if (requires.length) parts.push(`${requires.length} import${requires.length !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'coq-summary';
  const cards = [
    { value: theoremCount + lemmaCount + corollaryCount, label: 'Theorems/Lemmas' },
    { value: defCount + fixpointCount, label: 'Definitions' },
    { value: inductives.length, label: 'Inductive Types' },
    { value: requires.length, label: 'Imports' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'coq-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Require Import list
  if (requires.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'coq-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Require Import';
    sec.appendChild(h3);
    const pills = document.createElement('div');
    pills.className = 'coq-pills';
    for (const req of requires.slice(0, 30)) {
      const p = document.createElement('span');
      p.className = 'coq-pill';
      p.textContent = req;
      pills.appendChild(p);
    }
    sec.appendChild(pills);
    host.appendChild(sec);
  }

  // Inductive types
  if (inductives.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'coq-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Inductive Types';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'coq-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Type Name</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const name of inductives.slice(0, 20)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(name)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Theorems / Lemmas breakdown
  if (totalProofs > 0) {
    const sec = document.createElement('div');
    sec.className = 'coq-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Proof Items';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'coq-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Kind</th><th>Count</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    const rows = [['Theorem', theoremCount], ['Lemma', lemmaCount], ['Corollary', corollaryCount]];
    for (const [kind, count] of rows) {
      if (!count) continue;
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(kind)}</td><td>${count}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  return { parentNode: host };
}
