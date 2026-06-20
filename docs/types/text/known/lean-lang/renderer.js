const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ln-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.ln-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#4f46e5;color:#fff;vertical-align:middle;margin-right:8px;}
.ln-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ln-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ln-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.ln-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.ln-card strong{display:block;font-size:1.2rem;font-weight:700;}
.ln-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.ln-section{margin:16px 0;}
.ln-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.ln-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.ln-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.ln-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.ln-table tr:last-child td{border-bottom:none;}
.ln-pre{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:14px;overflow:auto;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;margin-top:16px;white-space:pre-wrap;word-break:break-word;}
.ln-kw{color:#1d4ed8;font-weight:700;}
.ln-type{color:#0f766e;}
.ln-str{color:#b91c1c;}
.ln-num{color:#059669;}
.ln-comment{color:#888;font-style:italic;}
.ln-cmd{color:#9333ea;}
`;

const LEAN_KWS = [
  'theorem', 'lemma', 'def', 'abbrev', 'noncomputable', 'instance', 'class', 'structure',
  'inductive', 'coinductive', 'mutual', 'where', 'with',
  'import', 'open', 'namespace', 'end', 'section',
  'variable', 'universe', 'set_option',
  'if', 'then', 'else', 'match', 'with', 'fun', 'let', 'in', 'have', 'show', 'from',
  'return', 'do', 'by', 'exact', 'apply', 'rw', 'simp', 'ring', 'omega',
  'And', 'Or', 'Not', 'True', 'False', 'Prop', 'Sort', 'Type',
];

function parseLean(text) {
  const lines = (text || '').split(/\r?\n/);
  const namespaces = [];
  const theorems = [];
  const lemmas = [];
  const defs = [];
  const imports = [];

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('--')) continue;

    const importMatch = t.match(/^import\s+(\S+)/);
    if (importMatch && !imports.includes(importMatch[1])) imports.push(importMatch[1]);

    const nsMatch = t.match(/^namespace\s+(\S+)/);
    if (nsMatch && !namespaces.includes(nsMatch[1])) namespaces.push(nsMatch[1]);

    const thmMatch = t.match(/^(?:private\s+|protected\s+)?theorem\s+(\S+)/);
    if (thmMatch) theorems.push(thmMatch[1]);

    const lemmaMatch = t.match(/^(?:private\s+|protected\s+)?lemma\s+(\S+)/);
    if (lemmaMatch) lemmas.push(lemmaMatch[1]);

    const defMatch = t.match(/^(?:private\s+|protected\s+|noncomputable\s+)?def\s+(\S+)/);
    if (defMatch) defs.push(defMatch[1]);
  }

  return { namespaces, theorems, lemmas, defs, imports };
}

function highlightLeanLine(line) {
  if (!line) return '';
  let out = esc(line);
  // Strings
  out = out.replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;)/g, '<span class="ln-str">$1</span>');
  // Numbers
  out = out.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="ln-num">$1</span>');
  // Commands: #check, #eval, #print, etc.
  out = out.replace(/(#\w+)/g, '<span class="ln-cmd">$1</span>');
  // Keywords (longest first)
  const sorted = [...LEAN_KWS].sort((a, b) => b.length - a.length);
  for (const kw of sorted) {
    const re = new RegExp(`(?<![\\w])(${kw})(?![\\w])`, 'g');
    out = out.replace(re, '<span class="ln-kw">$1</span>');
  }
  return out;
}

function highlightLean(text) {
  const lines = text.split(/\r?\n/);
  const result = [];
  for (const line of lines) {
    const lcIdx = line.indexOf('--');
    if (lcIdx >= 0 && (lcIdx === 0 || /\s/.test(line[lcIdx - 1]))) {
      result.push(highlightLeanLine(line.slice(0, lcIdx)) + `<span class="ln-comment">${esc(line.slice(lcIdx))}</span>`);
      continue;
    }
    result.push(highlightLeanLine(line));
  }
  return result.join('\n');
}

export function render(intake) {
  const { namespaces, theorems, lemmas, defs, imports } = parseLean(intake.text || '');

  const host = document.createElement('div');
  host.className = 'ln-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'ln-title';
  title.innerHTML = '<span class="ln-badge">Lean 4</span>Source File';
  host.appendChild(title);

  const parts = [];
  if (namespaces.length) parts.push(`${namespaces.length} namespace${namespaces.length !== 1 ? 's' : ''}`);
  parts.push(`${theorems.length} theorem${theorems.length !== 1 ? 's' : ''}`);
  if (lemmas.length) parts.push(`${lemmas.length} lemma${lemmas.length !== 1 ? 's' : ''}`);
  parts.push(`${defs.length} def${defs.length !== 1 ? 's' : ''}`);
  if (imports.length) parts.push(`${imports.length} import${imports.length !== 1 ? 's' : ''}`);

  const sub = document.createElement('div');
  sub.className = 'ln-sub';
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'ln-summary';
  const cards = [
    { value: theorems.length + lemmas.length, label: 'Theorems/lemmas' },
    { value: defs.length, label: 'Definitions' },
    { value: namespaces.length, label: 'Namespaces' },
    { value: imports.length, label: 'Imports' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'ln-card';
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
    sec.className = 'ln-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Imports';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'ln-table';
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

  // Namespaces
  if (namespaces.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'ln-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Namespaces';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'ln-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const ns of namespaces.slice(0, 20)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(ns)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Theorems & lemmas
  const allThms = [...theorems.map((n) => ({ name: n, kind: 'theorem' })), ...lemmas.map((n) => ({ name: n, kind: 'lemma' }))];
  if (allThms.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'ln-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Theorems & Lemmas';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'ln-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th><th>Kind</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const { name, kind } of allThms.slice(0, 40)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(name)}</td><td>${esc(kind)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Definitions
  if (defs.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'ln-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Definitions';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'ln-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const name of defs.slice(0, 30)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(name)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Syntax-highlighted source
  const pre = document.createElement('pre');
  pre.className = 'ln-pre';
  pre.innerHTML = highlightLean(intake.text || '');
  host.appendChild(pre);

  return { parentNode: host };
}
