const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.fctr-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.fctr-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#d97706;color:#fff;vertical-align:middle;margin-right:8px;}
.fctr-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.fctr-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.fctr-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.fctr-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.fctr-card strong{display:block;font-size:1.2rem;font-weight:700;}
.fctr-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.fctr-section{margin:16px 0;}
.fctr-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.fctr-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.fctr-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.fctr-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.fctr-table tr:last-child td{border-bottom:none;}
.fctr-pre{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:14px;overflow:auto;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;margin-top:16px;white-space:pre-wrap;word-break:break-word;}
.fctr-kw{color:#d97706;font-weight:700;}
.fctr-str{color:#b91c1c;}
.fctr-comment{color:#888;font-style:italic;}
.fctr-stack{color:#7c3aed;}
`;

function parseFactor(text) {
  const lines = (text || '').split(/\r?\n/);
  let vocab = '';
  const usingImports = [];
  const wordDefs = [];
  const tuples = [];
  const symbols = [];
  const constants = [];

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('!')) continue;

    // IN: vocabulary
    const inMatch = t.match(/^IN:\s+(\S+)/);
    if (inMatch && !vocab) vocab = inMatch[1];

    // USING: imports (may span multiple tokens until ;)
    const usingMatch = t.match(/^USING:\s+(.+?)(?:\s*;.*)?$/);
    if (usingMatch) {
      const items = usingMatch[1].split(/\s+/).filter(s => s && s !== ';');
      usingImports.push(...items);
    }

    // Word definitions: : word-name ( stack -- effect ) body ;
    const wordMatch = t.match(/^:\s+(\S+)\s*\(/);
    if (wordMatch) wordDefs.push(wordMatch[1]);

    // TUPLE: name slots ;
    const tupleMatch = t.match(/^TUPLE:\s+(\w+)/);
    if (tupleMatch) tuples.push(tupleMatch[1]);

    // SYMBOL: name
    const symbolMatch = t.match(/^SYMBOL:\s+(\S+)/);
    if (symbolMatch) symbols.push(symbolMatch[1]);

    // CONSTANT: name value
    const constMatch = t.match(/^CONSTANT:\s+(\S+)/);
    if (constMatch) constants.push(constMatch[1]);
  }

  return { vocab, usingImports, wordDefs, tuples, symbols, constants };
}

function highlightFactor(text) {
  const DECL_KWS = ['USING:', 'IN:', 'SYMBOL:', 'TUPLE:', 'CONSTANT:', 'GENERIC:', 'UNION:', 'INTERSECTION:', 'MIXIN:', 'SINGLETON:', 'ALIAS:', 'DEFER:', 'MEMO:', 'ERROR:'];
  const CTRL_KWS = ['if', 'unless', 'when', 'loop', 'do', 'call', 'execute', 'dup', 'drop', 'swap', 'over', 'rot', 'pick', 'nip', 'tuck', 'keep', 'bi', 'tri', 'map', 'each', 'reduce', 'filter'];
  const lines = text.split(/\r?\n/);
  return lines.map(line => {
    // Line comment
    const ciIdx = line.indexOf('!');
    // Only treat ! as comment if it's at start or after whitespace (not inside a word)
    const isComment = ciIdx === 0 || (ciIdx > 0 && /\s/.test(line[ciIdx - 1]));
    if (isComment && ciIdx >= 0) {
      return highlightFactorLine(line.slice(0, ciIdx), DECL_KWS, CTRL_KWS) + `<span class="fctr-comment">${esc(line.slice(ciIdx))}</span>`;
    }
    return highlightFactorLine(line, DECL_KWS, CTRL_KWS);
  }).join('\n');
}

function highlightFactorLine(line, DECL_KWS, CTRL_KWS) {
  let out = esc(line);
  // Strings
  out = out.replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;)/g, '<span class="fctr-str">$1</span>');
  // Stack effect comments ( -- )
  out = out.replace(/(\([^)]*--[^)]*\))/g, '<span class="fctr-stack">$1</span>');
  // Declaration keywords (ALL_CAPS:)
  for (const kw of DECL_KWS) {
    const escaped = kw.replace(/:/g, '\\:');
    out = out.replace(new RegExp(`\\b${escaped}`, 'g'), `<span class="fctr-kw">${kw}</span>`);
  }
  // Word definition colon
  out = out.replace(/^(\s*)(: )/, '$1<span class="fctr-kw">: </span>');
  // Control keywords
  for (const kw of CTRL_KWS) {
    const re = new RegExp(`(?<![\\w])(${kw})(?![\\w])`, 'g');
    out = out.replace(re, '<span class="fctr-kw">$1</span>');
  }
  return out;
}

export function render(intake) {
  const { vocab, usingImports, wordDefs, tuples, symbols, constants } = parseFactor(intake.text || '');

  const host = document.createElement('div');
  host.className = 'fctr-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'fctr-title';
  title.innerHTML = `<span class="fctr-badge">Factor</span>${esc(vocab || 'Source File')}`;
  host.appendChild(title);

  const parts = [`${wordDefs.length} word${wordDefs.length !== 1 ? 's' : ''}`];
  if (usingImports.length) parts.push(`${usingImports.length} import${usingImports.length !== 1 ? 's' : ''}`);
  if (tuples.length) parts.push(`${tuples.length} tuple${tuples.length !== 1 ? 's' : ''}`);
  if (symbols.length) parts.push(`${symbols.length} symbol${symbols.length !== 1 ? 's' : ''}`);

  const sub = document.createElement('div');
  sub.className = 'fctr-sub';
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'fctr-summary';
  const cards = [
    { value: wordDefs.length, label: 'Words' },
    { value: usingImports.length, label: 'Imports' },
    { value: tuples.length, label: 'Tuples' },
    { value: symbols.length + constants.length, label: 'Symbols/Consts' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'fctr-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // USING: imports
  if (usingImports.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'fctr-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'USING: Imports';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'fctr-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Vocabulary</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const name of usingImports.slice(0, 30)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(name)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Word definitions
  if (wordDefs.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'fctr-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Word Definitions';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'fctr-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Word</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const name of wordDefs.slice(0, 40)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(name)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Tuples & Symbols
  const decls = [...tuples.map(n => ({ name: n, kind: 'TUPLE' })), ...symbols.map(n => ({ name: n, kind: 'SYMBOL' })), ...constants.map(n => ({ name: n, kind: 'CONSTANT' }))];
  if (decls.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'fctr-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Declarations';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'fctr-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th><th>Kind</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const { name, kind } of decls.slice(0, 30)) {
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
  pre.className = 'fctr-pre';
  pre.innerHTML = highlightFactor(intake.text || '');
  host.appendChild(pre);

  return { parentNode: host };
}
