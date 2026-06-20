const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.fth-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.fth-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e05c00;color:#fff;vertical-align:middle;margin-right:8px;}
.fth-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.fth-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.fth-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.fth-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.fth-card strong{display:block;font-size:1.2rem;font-weight:700;}
.fth-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.fth-section{margin:16px 0;}
.fth-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.fth-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.fth-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.fth-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.fth-table tr:last-child td{border-bottom:none;}
.fth-pre{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:14px;overflow:auto;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;margin-top:16px;white-space:pre-wrap;word-break:break-word;}
.fth-kw{color:#1d4ed8;font-weight:700;}
.fth-word{color:#7c3aed;}
.fth-comment{color:#888;font-style:italic;}
.fth-str{color:#b91c1c;}
.fth-num{color:#059669;}
`;

const FORTH_KWS = [
  'IF', 'THEN', 'ELSE', 'DO', 'LOOP', '+LOOP', 'BEGIN', 'UNTIL', 'WHILE', 'REPEAT',
  'VARIABLE', 'CONSTANT', 'VALUE', 'CREATE', 'ALLOT', 'DOES>', 'TO',
  'DUP', 'DROP', 'SWAP', 'OVER', 'ROT', 'PICK', 'ROLL',
  'EMIT', 'CR', 'SPACE', 'SPACES', 'TYPE', '.', '."',
  '@', '!', 'C@', 'C!', '+!',
  'AND', 'OR', 'XOR', 'NOT', 'INVERT',
  'RECURSE', 'EXIT', 'LEAVE',
  'HERE', 'CELL+', 'CELLS', 'CHARS', 'CHAR+',
  'DEPTH', 'WORDS',
];

function parseForth(text) {
  const lines = (text || '').split(/\r?\n/);
  const wordDefs = [];
  const variables = [];
  const constants = [];
  const stackComments = [];

  for (const line of lines) {
    const t = line.trim();

    // Skip pure comment lines (\ ...)
    if (t.startsWith('\\')) continue;

    // Word definitions: : NAME ... ;
    const wordMatch = t.match(/^:\s+([^\s(]+)/);
    if (wordMatch) {
      const name = wordMatch[1];
      // Extract inline stack comment if present
      const stackMatch = t.match(/\(\s*([^)]+)\s*\)/);
      wordDefs.push({ name, stack: stackMatch ? stackMatch[1] : '' });
    }

    // VARIABLE declarations
    const varMatch = t.match(/^([^\s]+)\s+VARIABLE\b|^VARIABLE\s+([^\s]+)/);
    if (varMatch) variables.push(varMatch[1] || varMatch[2]);

    // CONSTANT declarations
    const constMatch = t.match(/^([^\s]+)\s+CONSTANT\b|^CONSTANT\s+([^\s]+)/i);
    if (constMatch) constants.push(constMatch[1] || constMatch[2]);

    // Stack comments ( ... -- ... )
    const scMatches = [...t.matchAll(/\(\s*([^)]*--[^)]*)\s*\)/g)];
    for (const m of scMatches) stackComments.push(m[1].trim());
  }

  return { wordDefs, variables, constants, stackComments };
}

function highlightForthLine(line) {
  if (!line) return '';
  let out = esc(line);

  // Strings
  out = out.replace(/(\.&quot;[^&]*?&quot;)/g, '<span class="fth-str">$1</span>');
  // Numbers
  out = out.replace(/\b(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g, '<span class="fth-num">$1</span>');
  // Keywords (longest first)
  const sorted = [...FORTH_KWS].sort((a, b) => b.length - a.length);
  for (const kw of sorted) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?<![\\w])${escaped}(?![\\w])`, 'g');
    out = out.replace(re, `<span class="fth-kw">${esc(kw)}</span>`);
  }
  return out;
}

function highlightForth(text) {
  const lines = text.split(/\r?\n/);
  const result = [];
  for (const line of lines) {
    // Line comment: \ ...
    const lcIdx = line.indexOf('\\');
    // Stack/paren comment: ( ... )
    const pcMatch = line.match(/^(\s*\([^)]*\)\s*)$/);
    if (pcMatch) {
      result.push(`<span class="fth-comment">${esc(line)}</span>`);
      continue;
    }
    if (lcIdx >= 0 && (lcIdx === 0 || /\s/.test(line[lcIdx - 1]))) {
      result.push(highlightForthLine(line.slice(0, lcIdx)) + `<span class="fth-comment">${esc(line.slice(lcIdx))}</span>`);
      continue;
    }
    result.push(highlightForthLine(line));
  }
  return result.join('\n');
}

export function render(intake) {
  const { wordDefs, variables, constants, stackComments } = parseForth(intake.text || '');

  const host = document.createElement('div');
  host.className = 'fth-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'fth-title';
  title.innerHTML = '<span class="fth-badge">Forth</span>Source File';
  host.appendChild(title);

  const parts = [`${wordDefs.length} word${wordDefs.length !== 1 ? 's' : ''}`];
  if (variables.length) parts.push(`${variables.length} variable${variables.length !== 1 ? 's' : ''}`);
  if (constants.length) parts.push(`${constants.length} constant${constants.length !== 1 ? 's' : ''}`);
  if (stackComments.length) parts.push(`${stackComments.length} stack comment${stackComments.length !== 1 ? 's' : ''}`);

  const sub = document.createElement('div');
  sub.className = 'fth-sub';
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'fth-summary';
  const cards = [
    { value: wordDefs.length, label: 'Words' },
    { value: variables.length, label: 'Variables' },
    { value: constants.length, label: 'Constants' },
    { value: stackComments.length, label: 'Stack comments' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'fth-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Word definitions table
  if (wordDefs.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'fth-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Word Definitions';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'fth-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Word</th><th>Stack effect</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const { name, stack } of wordDefs.slice(0, 40)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(name)}</td><td>${esc(stack) || '<span style="color:var(--fg-2,#aaa)">—</span>'}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Variables
  if (variables.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'fth-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Variables';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'fth-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const name of variables.slice(0, 30)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(name)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Constants
  if (constants.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'fth-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Constants';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'fth-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const name of constants.slice(0, 30)) {
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
  pre.className = 'fth-pre';
  pre.innerHTML = highlightForth(intake.text || '');
  host.appendChild(pre);

  return { parentNode: host };
}
