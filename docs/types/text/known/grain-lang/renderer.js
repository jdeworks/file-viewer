const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.grn-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.grn-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#059669;color:#fff;vertical-align:middle;margin-right:8px;}
.grn-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.grn-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.grn-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.grn-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.grn-card strong{display:block;font-size:1.2rem;font-weight:700;}
.grn-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.grn-section{margin:16px 0;}
.grn-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.grn-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.grn-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.grn-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.grn-table tr:last-child td{border-bottom:none;}
.grn-pre{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:14px;overflow:auto;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;margin-top:16px;white-space:pre-wrap;word-break:break-word;}
.grn-kw{color:#059669;font-weight:700;}
.grn-str{color:#b91c1c;}
.grn-comment{color:#888;font-style:italic;}
.grn-type{color:#1d4ed8;}
`;

function parseGrain(text) {
  const lines = (text || '').split(/\r?\n/);
  let moduleName = '';
  const imports = [];
  const exports = [];
  const types = [];

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('//')) continue;

    // module declaration
    const modMatch = t.match(/^module\s+(\w+)/);
    if (modMatch && !moduleName) moduleName = modMatch[1];

    // import statements: import Foo from "bar"
    const importMatch = t.match(/^import\s+(\w+)\s+from\s+"([^"]+)"/);
    if (importMatch) imports.push({ name: importMatch[1], from: importMatch[2] });

    // from "bar" import { Foo, Bar }
    const fromMatch = t.match(/^from\s+"([^"]+)"\s+import\s+\{([^}]+)\}/);
    if (fromMatch) {
      const names = fromMatch[2].split(',').map(s => s.trim()).filter(Boolean);
      for (const name of names) imports.push({ name, from: fromMatch[1] });
    }

    // export let / export rec
    const exportMatch = t.match(/^export\s+(?:let\s+rec\s+|let\s+)(\w+)/);
    if (exportMatch) exports.push(exportMatch[1]);

    // record types
    const recordMatch = t.match(/^(?:export\s+)?record\s+(\w+)/);
    if (recordMatch) types.push({ name: recordMatch[1], kind: 'record' });

    // enum types
    const enumMatch = t.match(/^(?:export\s+)?enum\s+(\w+)/);
    if (enumMatch) types.push({ name: enumMatch[1], kind: 'enum' });
  }

  return { moduleName, imports, exports, types };
}

function highlightGrain(text) {
  const KWS = ['module', 'let', 'import', 'from', 'export', 'record', 'enum', 'match', 'if', 'else', 'while', 'for', 'return', 'void', 'true', 'false', 'and', 'or', 'not', 'rec', 'type', 'when', 'include', 'provide'];
  const lines = text.split(/\r?\n/);
  return lines.map(line => {
    const ciIdx = line.indexOf('//');
    if (ciIdx >= 0) {
      return highlightGrainLine(line.slice(0, ciIdx), KWS) + `<span class="grn-comment">${esc(line.slice(ciIdx))}</span>`;
    }
    return highlightGrainLine(line, KWS);
  }).join('\n');
}

function highlightGrainLine(line, KWS) {
  let out = esc(line);
  out = out.replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;)/g, '<span class="grn-str">$1</span>');
  out = out.replace(/\b([A-Z]\w*)\b/g, '<span class="grn-type">$1</span>');
  const sorted = [...KWS].sort((a, b) => b.length - a.length);
  for (const kw of sorted) {
    const re = new RegExp(`(?<![\\w])(${kw})(?![\\w])`, 'g');
    out = out.replace(re, '<span class="grn-kw">$1</span>');
  }
  return out;
}

export function render(intake) {
  const { moduleName, imports, exports, types } = parseGrain(intake.text || '');

  const host = document.createElement('div');
  host.className = 'grn-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'grn-title';
  title.innerHTML = `<span class="grn-badge">Grain</span>${esc(moduleName || 'Source File')}`;
  host.appendChild(title);

  const parts = [`${imports.length} import${imports.length !== 1 ? 's' : ''}`];
  if (exports.length) parts.push(`${exports.length} export${exports.length !== 1 ? 's' : ''}`);
  if (types.length) parts.push(`${types.length} type${types.length !== 1 ? 's' : ''}`);

  const sub = document.createElement('div');
  sub.className = 'grn-sub';
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'grn-summary';
  const cards = [
    { value: imports.length, label: 'Imports' },
    { value: exports.length, label: 'Exports' },
    { value: types.filter(t => t.kind === 'record').length, label: 'Records' },
    { value: types.filter(t => t.kind === 'enum').length, label: 'Enums' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'grn-card';
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
    sec.className = 'grn-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Imports';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'grn-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th><th>From</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const { name, from } of imports.slice(0, 30)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(name)}</td><td>${esc(from)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Exports
  if (exports.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'grn-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Exported Names';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'grn-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const name of exports.slice(0, 30)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(name)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Types
  if (types.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'grn-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Types';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'grn-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th><th>Kind</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const { name, kind } of types.slice(0, 20)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(name)}</td><td>${esc(kind)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Source
  const pre = document.createElement('pre');
  pre.className = 'grn-pre';
  pre.innerHTML = highlightGrain(intake.text || '');
  host.appendChild(pre);

  return { parentNode: host };
}
