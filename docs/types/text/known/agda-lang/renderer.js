const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.agda-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.agda-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0ea5e9;color:#fff;vertical-align:middle;margin-right:8px;}
.agda-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.agda-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.agda-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.agda-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.agda-card strong{display:block;font-size:1.2rem;font-weight:700;}
.agda-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.agda-section{margin:16px 0;}
.agda-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.agda-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.agda-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.agda-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.agda-table tr:last-child td{border-bottom:none;}
.agda-pre{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:14px;overflow:auto;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;margin-top:16px;white-space:pre-wrap;word-break:break-word;}
.agda-kw{color:#1d4ed8;font-weight:700;}
.agda-type{color:#0f766e;}
.agda-str{color:#b91c1c;}
.agda-num{color:#059669;}
.agda-comment{color:#888;font-style:italic;}
`;

const AGDA_KWS = [
  'module', 'where', 'import', 'open', 'using', 'hiding', 'renaming',
  'data', 'record', 'field', 'constructor', 'postulate',
  'with', 'rewrite', 'infix', 'infixl', 'infixr',
  'let', 'in', 'if', 'then', 'else', 'do',
  'forall', 'λ', 'Set', 'Prop', 'Level',
  'abstract', 'private', 'instance', 'macro',
  'mutual', 'codata', 'coinductive',
  'variable', 'pattern', 'syntax',
  'BUILTIN', 'OPTIONS', 'FOREIGN',
];

function parseAgda(text) {
  const lines = (text || '').split(/\r?\n/);
  const imports = [];
  const dataTypes = [];
  const records = [];
  let moduleName = '';

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('--')) continue;

    const modMatch = t.match(/^module\s+(\S+)\s+where/);
    if (modMatch && !moduleName) moduleName = modMatch[1];

    const importMatch = t.match(/^(?:open\s+)?import\s+(\S+)/);
    if (importMatch && !imports.includes(importMatch[1])) imports.push(importMatch[1]);

    const dataMatch = t.match(/^data\s+(\S+)/);
    if (dataMatch) dataTypes.push(dataMatch[1]);

    const recMatch = t.match(/^record\s+(\S+)/);
    if (recMatch) records.push(recMatch[1]);
  }

  return { moduleName, imports, dataTypes, records };
}

function highlightAgdaLine(line) {
  if (!line) return '';
  let out = esc(line);
  // Strings
  out = out.replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;)/g, '<span class="agda-str">$1</span>');
  // Numbers
  out = out.replace(/\b(\d+)\b/g, '<span class="agda-num">$1</span>');
  // Pragmas
  out = out.replace(/(\{-#[^#]*#-\})/g, '<span class="agda-comment">$1</span>');
  // Keywords (longest first)
  const sorted = [...AGDA_KWS].sort((a, b) => b.length - a.length);
  for (const kw of sorted) {
    if (/[^\w]/.test(kw)) continue; // skip symbol-only keywords for regex safety
    const re = new RegExp(`(?<![\\w])(${kw})(?![\\w])`, 'g');
    out = out.replace(re, '<span class="agda-kw">$1</span>');
  }
  return out;
}

function highlightAgda(text) {
  const lines = text.split(/\r?\n/);
  const result = [];
  let inBlockComment = false;

  for (const line of lines) {
    if (inBlockComment) {
      const endIdx = line.indexOf('-}');
      if (endIdx >= 0) {
        result.push(`<span class="agda-comment">${esc(line.slice(0, endIdx + 2))}</span>` + highlightAgdaLine(line.slice(endIdx + 2)));
        inBlockComment = false;
      } else {
        result.push(`<span class="agda-comment">${esc(line)}</span>`);
      }
      continue;
    }

    const blockStart = line.indexOf('{-');
    if (blockStart >= 0 && !line.slice(blockStart).startsWith('{-#')) {
      const blockEnd = line.indexOf('-}', blockStart + 2);
      if (blockEnd >= 0) {
        result.push(highlightAgdaLine(line.slice(0, blockStart)) + `<span class="agda-comment">${esc(line.slice(blockStart, blockEnd + 2))}</span>` + highlightAgdaLine(line.slice(blockEnd + 2)));
      } else {
        result.push(highlightAgdaLine(line.slice(0, blockStart)) + `<span class="agda-comment">${esc(line.slice(blockStart))}</span>`);
        inBlockComment = true;
      }
      continue;
    }

    const lcIdx = line.indexOf('--');
    if (lcIdx >= 0) {
      result.push(highlightAgdaLine(line.slice(0, lcIdx)) + `<span class="agda-comment">${esc(line.slice(lcIdx))}</span>`);
      continue;
    }
    result.push(highlightAgdaLine(line));
  }
  return result.join('\n');
}

export function render(intake) {
  const { moduleName, imports, dataTypes, records } = parseAgda(intake.text || '');

  const host = document.createElement('div');
  host.className = 'agda-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'agda-title';
  title.innerHTML = `<span class="agda-badge">Agda</span>${moduleName ? esc(moduleName) : 'Source File'}`;
  host.appendChild(title);

  const parts = [];
  if (moduleName) parts.push(`module ${moduleName}`);
  if (imports.length) parts.push(`${imports.length} import${imports.length !== 1 ? 's' : ''}`);
  if (dataTypes.length) parts.push(`${dataTypes.length} data type${dataTypes.length !== 1 ? 's' : ''}`);
  if (records.length) parts.push(`${records.length} record${records.length !== 1 ? 's' : ''}`);

  const sub = document.createElement('div');
  sub.className = 'agda-sub';
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'agda-summary';
  const cards = [
    { value: dataTypes.length, label: 'Data types' },
    { value: records.length, label: 'Records' },
    { value: imports.length, label: 'Imports' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'agda-card';
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
    sec.className = 'agda-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Imports';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'agda-table';
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

  // Data types & records
  const allTypes = [...dataTypes.map((n) => ({ name: n, kind: 'data' })), ...records.map((n) => ({ name: n, kind: 'record' }))];
  if (allTypes.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'agda-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Data Types & Records';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'agda-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th><th>Kind</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const { name, kind } of allTypes.slice(0, 30)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(name)}</td><td>${esc(kind)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Syntax-highlighted source
  const pre = document.createElement('pre');
  pre.className = 'agda-pre';
  pre.innerHTML = highlightAgda(intake.text || '');
  host.appendChild(pre);

  return { parentNode: host };
}
