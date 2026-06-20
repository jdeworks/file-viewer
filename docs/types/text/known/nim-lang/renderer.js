const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.nim-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.nim-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#ffe953;color:#1a1a1a;vertical-align:middle;margin-right:8px;}
.nim-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.nim-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.nim-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.nim-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.nim-card strong{display:block;font-size:1.2rem;font-weight:700;}
.nim-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.nim-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.nim-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.nim-list{margin:0;padding:0;list-style:none;}
.nim-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;}
.nim-list li:last-child{border-bottom:none;}
.nim-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#fef9c3;color:#713f12;font-weight:700;}
.nim-tag-macro{background:#ede9fe;color:#5b21b6;}
.nim-tag-tmpl{background:#fce7f3;color:#831843;}
.nim-tag-iter{background:#dcfce7;color:#14532d;}
.nim-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.nim-kw{color:#b45309;font-weight:600;}
.nim-str{color:#0a6640;}
.nim-comment{color:#6e7781;font-style:italic;}
.nim-num{color:#0369a1;}
.nim-pragma{color:#c026d3;}
.nim-proc{color:#7c3aed;}
`;

const NIM_KEYWORDS = new Set([
  'import', 'include', 'from', 'export', 'proc', 'func', 'method', 'iterator',
  'template', 'macro', 'type', 'var', 'let', 'const', 'when', 'if', 'elif',
  'else', 'case', 'of', 'for', 'while', 'do', 'try', 'except', 'finally',
  'raise', 'return', 'yield', 'break', 'continue', 'discard', 'addr', 'cast',
  'object', 'enum', 'tuple', 'nil', 'true', 'false', 'and', 'or', 'not',
  'in', 'notin', 'is', 'isnot', 'div', 'mod', 'shl', 'shr', 'xor',
]);

function analyzeNim(text) {
  const lines = text.split(/\r?\n/);
  const imports = [];
  const procs = [];
  const funcs = [];
  const methods = [];
  const types = [];
  const iterators = [];
  const templates = [];
  const macros = [];
  const consts = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;

    // Imports
    const impM = trimmed.match(/^import\s+(.+)/);
    if (impM) {
      const names = impM[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
      imports.push(...names);
      continue;
    }
    const fromM = trimmed.match(/^from\s+([\w/.]+)\s+import/);
    if (fromM) { imports.push(fromM[1]); continue; }

    // proc / func / method
    const procM = trimmed.match(/^proc\s+(\w+)/);
    if (procM) { procs.push(procM[1]); continue; }
    const funcM = trimmed.match(/^func\s+(\w+)/);
    if (funcM) { funcs.push(funcM[1]); continue; }
    const methodM = trimmed.match(/^method\s+(\w+)/);
    if (methodM) { methods.push(methodM[1]); continue; }

    // iterator / template / macro
    const iterM = trimmed.match(/^iterator\s+(\w+)/);
    if (iterM) { iterators.push(iterM[1]); continue; }
    const tmplM = trimmed.match(/^template\s+(\w+)/);
    if (tmplM) { templates.push(tmplM[1]); continue; }
    const macroM = trimmed.match(/^macro\s+(\w+)/);
    if (macroM) { macros.push(macroM[1]); continue; }

    // Type definitions: type block header and then indented items
    const typeDefM = trimmed.match(/^(\w+)\s*\*?\s*=\s*(?:object|enum|tuple|distinct|ref\s+object|ptr\s+object)/);
    if (typeDefM) { types.push(typeDefM[1]); continue; }

    // Const: const Name = value (single-line)
    const constM = trimmed.match(/^(\w+)\s*\*?\s*=\s*[^=]/);
    // Avoid matching procs with bodies; only match if in a const block context heuristically
    // We detect standalone const lines that look like simple constants
    if (constM && /^const\s/.test(trimmed)) { consts.push(constM[1]); }
    // multi-line const block: "const\n  NAME = value"
    const simpleConstM = trimmed.match(/^const\s+(\w+)\s*=/);
    if (simpleConstM) consts.push(simpleConstM[1]);
  }

  return { imports, procs, funcs, methods, types, iterators, templates, macros, consts };
}

function highlightNim(text) {
  const lines = text.split(/\r?\n/);
  const result = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Full-line comment
    if (trimmed.startsWith('#')) {
      result.push('<span class="nim-comment">' + esc(line) + '</span>');
      continue;
    }

    let out = '';
    let i = 0;
    while (i < line.length) {
      // Comment
      if (line[i] === '#') {
        out += '<span class="nim-comment">' + esc(line.slice(i)) + '</span>';
        break;
      }
      // Pragma {. ... .}
      if (line[i] === '{' && line[i + 1] === '.') {
        let j = i + 2;
        while (j < line.length && !(line[j] === '.' && line[j + 1] === '}')) j++;
        j += 2;
        out += '<span class="nim-pragma">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // String literals
      if (line[i] === '"') {
        // Triple-quoted
        if (line.slice(i, i + 3) === '"""') {
          let j = i + 3;
          while (j < line.length && line.slice(j, j + 3) !== '"""') j++;
          j += 3;
          out += '<span class="nim-str">' + esc(line.slice(i, j)) + '</span>';
          i = j;
          continue;
        }
        let j = i + 1;
        while (j < line.length && line[j] !== '"') {
          if (line[j] === '\\') j++;
          j++;
        }
        j++;
        out += '<span class="nim-str">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Char literals
      if (line[i] === "'") {
        let j = i + 1;
        if (line[j] === '\\') j++;
        j += 2;
        out += '<span class="nim-str">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Numbers
      if (/[0-9]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[0-9._xXbBoOuUiIfFeE]/.test(line[j])) j++;
        out += '<span class="nim-num">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Identifiers / keywords
      if (/[A-Za-z_]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[\w]/.test(line[j])) j++;
        const word = line.slice(i, j);
        if (NIM_KEYWORDS.has(word)) {
          const isProclike = ['proc', 'func', 'method', 'iterator', 'template', 'macro'].includes(word);
          out += `<span class="${isProclike ? 'nim-proc' : 'nim-kw'}">${esc(word)}</span>`;
        } else {
          out += esc(word);
        }
        i = j;
        continue;
      }
      out += esc(line[i]);
      i++;
    }
    result.push(out);
  }
  return result.join('\n');
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'nim-section';
  const hd = document.createElement('div');
  hd.className = 'nim-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'nim-list';
  sec.appendChild(ul);
  return ul;
}

function addTaggedList(host, title, items, tagText, tagClass) {
  if (!items.length) return;
  const sec = makeSection(host, `${title} (${items.length})`);
  const ul = makeList(sec);
  for (const item of items) {
    const li = document.createElement('li');
    const tag = document.createElement('span');
    tag.className = `nim-tag ${tagClass}`;
    tag.textContent = tagText;
    li.appendChild(tag);
    li.appendChild(document.createTextNode(' ' + item));
    ul.appendChild(li);
  }
}

export function render(intake) {
  const text = intake.text || '';
  const { imports, procs, funcs, methods, types, iterators, templates, macros, consts } = analyzeNim(text);

  const host = document.createElement('div');
  host.className = 'nim-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'nim-title';
  title.innerHTML = '<span class="nim-badge">Nim</span>';
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'nim-sub';
  const allProcs = procs.length + funcs.length + methods.length;
  const parts = [];
  parts.push(`${imports.length} import${imports.length !== 1 ? 's' : ''}`);
  parts.push(`${allProcs} proc/func${allProcs !== 1 ? 's' : ''}`);
  parts.push(`${types.length} type${types.length !== 1 ? 's' : ''}`);
  if (macros.length) parts.push(`${macros.length} macro${macros.length !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'nim-cards';
  const cardItems = [
    { value: imports.length, label: 'Imports' },
    { value: procs.length + funcs.length + methods.length, label: 'Procs/Funcs' },
    { value: types.length, label: 'Types' },
    { value: templates.length + macros.length, label: 'Templates/Macros' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'nim-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Imports
  if (imports.length > 0) {
    const sec = makeSection(host, `Imports (${imports.length})`);
    const ul = makeList(sec);
    for (const imp of imports) {
      const li = document.createElement('li');
      li.textContent = imp;
      ul.appendChild(li);
    }
  }

  // Procs / funcs / methods combined
  const allProcList = [
    ...procs.map((n) => ({ name: n, kind: 'proc' })),
    ...funcs.map((n) => ({ name: n, kind: 'func' })),
    ...methods.map((n) => ({ name: n, kind: 'method' })),
  ];
  if (allProcList.length > 0) {
    const sec = makeSection(host, `Procs & Funcs (${allProcList.length})`);
    const ul = makeList(sec);
    for (const { name, kind } of allProcList) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'nim-tag';
      tag.textContent = kind;
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  // Types
  if (types.length > 0) {
    const sec = makeSection(host, `Types (${types.length})`);
    const ul = makeList(sec);
    for (const t of types) {
      const li = document.createElement('li');
      li.textContent = t;
      ul.appendChild(li);
    }
  }

  // Iterators
  addTaggedList(host, 'Iterators', iterators, 'iter', 'nim-tag-iter');
  // Templates
  addTaggedList(host, 'Templates', templates, 'tmpl', 'nim-tag-tmpl');
  // Macros
  addTaggedList(host, 'Macros', macros, 'macro', 'nim-tag-macro');

  // Consts
  if (consts.length > 0) {
    const sec = makeSection(host, `Constants (${consts.length})`);
    const ul = makeList(sec);
    for (const c of consts) {
      const li = document.createElement('li');
      li.textContent = c;
      ul.appendChild(li);
    }
  }

  // Source
  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'nim-pre';
  pre.innerHTML = highlightNim(text);
  srcSec.appendChild(pre);

  return { parentNode: host };
}
