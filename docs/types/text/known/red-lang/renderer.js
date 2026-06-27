const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.red-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.red-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e74c3c;color:#fff;vertical-align:middle;margin-right:8px;}
.red-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.red-name{font-family:ui-monospace,monospace;font-size:15px;color:#c0392b;}
.red-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.red-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.red-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.red-card strong{display:block;font-size:1.2rem;font-weight:700;}
.red-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.red-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.red-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.red-list{margin:0;padding:0;list-style:none;}
.red-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.red-list li:last-child{border-bottom:none;}
.red-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#f0f0f0;font-weight:700;}
.red-tag-func{background:#dbeafe;color:#1d4ed8;}
.red-tag-ctx{background:#ede9fe;color:#7c3aed;}
.red-tag-inc{background:#dcfce7;color:#166534;}
.red-tag-set{background:#fef9c3;color:#854d0e;}
.red-fname{font-weight:600;}
.red-arg{color:#0e7490;}
.red-type{color:#9f1239;}
.red-ref{color:#7c3aed;}
.red-ret{color:#1d4ed8;}
.red-meta{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px;}
.red-meta dt{font-weight:600;color:var(--fg-2,#666);font-size:11px;text-transform:uppercase;}
.red-meta dd{margin:0 0 6px;font-family:ui-monospace,monospace;}
.red-meta dd:last-child{margin-bottom:0;}
`;

const WORD_END = '[]()"{};';
const DEF_KW = new Set(['func', 'function', 'does', 'has', 'context', 'object', 'make']);

// Scan a balanced [..] or (..) block from `open`, honoring strings/braces/comments. DOM-free.
function findBlock(s, open, o = '[', cl = ']') {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (c === ';') { while (i < s.length && s[i] !== '\n') i++; continue; }
    if (c === '"') { i++; while (i < s.length && s[i] !== '"') { if (s[i] === '^') i++; i++; } continue; }
    if (c === '{') { i++; let d = 1; while (i < s.length && d > 0) { if (s[i] === '{') d++; else if (s[i] === '}') d--; i++; } i--; continue; }
    if (c === o) depth++;
    else if (c === cl) { depth--; if (depth === 0) return { inner: s.slice(open + 1, i), end: i }; }
  }
  return { inner: s.slice(open + 1), end: s.length - 1 };
}

// Flat Red token stream at one nesting level: set-words, refinements, words, strings, blocks. Blocks
// are returned whole (not recursed), so a top-level scan never sees a function body's inner words.
function tokenizeRed(s) {
  const toks = [];
  const isSpace = (c) => /\s/.test(c);
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (isSpace(c)) { i++; continue; }
    if (c === ';') { while (i < s.length && s[i] !== '\n') i++; continue; }
    if (c === '"') { let j = i + 1, v = ''; while (j < s.length && s[j] !== '"') { if (s[j] === '^') { v += s[j + 1] || ''; j += 2; continue; } v += s[j++]; } i = j + 1; toks.push({ kind: 'string', value: v }); continue; }
    if (c === '{') { let j = i + 1, d = 1, v = ''; while (j < s.length && d > 0) { if (s[j] === '{') { d++; } else if (s[j] === '}') { d--; if (d === 0) break; } v += s[j++]; } i = j + 1; toks.push({ kind: 'string', value: v }); continue; }
    if (c === '[') { const b = findBlock(s, i); i = b.end + 1; toks.push({ kind: 'block', value: b.inner }); continue; }
    if (c === '(') { const b = findBlock(s, i, '(', ')'); i = b.end + 1; toks.push({ kind: 'paren', value: b.inner }); continue; }
    if (c === '/') { let j = i + 1, v = ''; while (j < s.length && !isSpace(s[j]) && !WORD_END.includes(s[j])) v += s[j++]; i = j; toks.push({ kind: 'refinement', value: v }); continue; }
    let j = i, v = '';
    while (j < s.length && !isSpace(s[j]) && !WORD_END.includes(s[j])) v += s[j++];
    i = j;
    if (v.endsWith(':')) toks.push({ kind: 'setword', value: v.slice(0, -1) });
    else toks.push({ kind: 'word', value: v });
  }
  return toks;
}

const typeOf = (block) => block.trim().split(/\s+/).filter(Boolean).join(' ');

// Parse a function spec block: `name [type!] /ref local [type!] return: [type!]` → args+refinements+return.
function parseSpec(specRaw) {
  const args = [], refinements = [];
  let returns = null, lastArg = null, mode = 'args', expectReturn = false;
  for (const tk of tokenizeRed(specRaw)) {
    if (tk.kind === 'string') continue;                      // arg doc-string
    if (tk.kind === 'refinement') {
      if (tk.value === 'local' || tk.value === 'extern') { mode = 'local'; lastArg = null; }
      else { refinements.push(tk.value); lastArg = null; }
      continue;
    }
    if (tk.kind === 'setword') {
      if (tk.value === 'return') { expectReturn = true; lastArg = null; continue; }
      const a = { name: tk.value, type: null }; if (mode === 'args') args.push(a); lastArg = a; continue;
    }
    if (tk.kind === 'word') {
      const a = { name: tk.value, type: null }; if (mode === 'args') args.push(a); lastArg = a; continue;
    }
    if (tk.kind === 'block') {
      if (expectReturn) { returns = typeOf(tk.value); expectReturn = false; lastArg = null; }
      else if (lastArg) { lastArg.type = typeOf(tk.value); lastArg = null; }
    }
  }
  return { args, refinements, returns };
}

function parseHeader(src) {
  const m = /(?:^|[^\w!?=+\-*<>/.])Red\s*\[/.exec(src);
  if (!m) return null;
  const open = src.indexOf('[', m.index);
  if (open < 0) return null;
  const { inner } = findBlock(src, open);
  const toks = tokenizeRed(inner);
  const fields = {};
  for (let k = 0; k < toks.length; k++) {
    if (toks[k].kind !== 'setword') continue;
    const key = toks[k].value;
    const next = toks[k + 1];
    let val = '';
    if (next) {
      if (next.kind === 'string') val = next.value;
      else if (next.kind === 'block') val = next.value.trim().split(/\s+/).filter(Boolean).join(', ');
      else { const parts = []; let q = k + 1; while (q < toks.length && toks[q].kind !== 'setword') { parts.push(toks[q].value); q++; } val = parts.join(' '); }
    }
    fields[key] = val;
  }
  return fields;
}

// Parse Red source into structured, DOM-free facts. Exported for unit testing.
export function analyzeRed(text) {
  const src = String(text || '');
  const header = parseHeader(src);
  const functions = [], objects = [], includes = [], setWords = [];

  let m;
  const incRe = /#include\s+(?:%([^\s\];]+)|"([^"]+)")/g;
  while ((m = incRe.exec(src))) { const f = m[1] || m[2]; if (!includes.includes(f)) includes.push(f); }

  const toks = tokenizeRed(src);
  for (let k = 0; k < toks.length; k++) {
    const t = toks[k];
    if (t.kind !== 'setword') continue;
    const name = t.value;
    const nx = toks[k + 1];
    if (nx && nx.kind === 'word' && (nx.value === 'func' || nx.value === 'function')) {
      const spec = toks[k + 2] && toks[k + 2].kind === 'block' ? parseSpec(toks[k + 2].value) : { args: [], refinements: [], returns: null };
      functions.push({ name, kind: nx.value, args: spec.args, refinements: spec.refinements, returns: spec.returns });
    } else if (nx && nx.kind === 'word' && nx.value === 'has') {
      const spec = toks[k + 2] && toks[k + 2].kind === 'block' ? parseSpec(toks[k + 2].value) : { args: [], refinements: [], returns: null };
      functions.push({ name, kind: 'has', args: spec.args, refinements: spec.refinements, returns: spec.returns });
    } else if (nx && nx.kind === 'word' && nx.value === 'does') {
      functions.push({ name, kind: 'does', args: [], refinements: [], returns: null });
    } else if (nx && nx.kind === 'word' && (nx.value === 'context' || nx.value === 'object')) {
      objects.push({ name, kind: nx.value });
    } else if (nx && nx.kind === 'word' && nx.value === 'make' && toks[k + 2] && toks[k + 2].kind === 'word' && toks[k + 2].value === 'object!') {
      objects.push({ name, kind: 'object' });
    } else if (nx && !(nx.kind === 'word' && DEF_KW.has(nx.value))) {
      if (!setWords.includes(name)) setWords.push(name);
    }
  }

  return { header, functions, objects, includes, setWords };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'red-section';
  const hd = document.createElement('div');
  hd.className = 'red-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
const makeList = (sec) => { const ul = document.createElement('ul'); ul.className = 'red-list'; sec.appendChild(ul); return ul; };
const tag = (cls, t) => `<span class="red-tag ${cls}">${esc(t)}</span>`;
const row = (ul, html) => { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); };

function argsHtml(fn) {
  const args = fn.args.map((a) => `<span class="red-arg">${esc(a.name)}</span>${a.type ? ` <span class="red-type">[${esc(a.type)}]</span>` : ''}`);
  const refs = fn.refinements.map((r) => `<span class="red-ref">/${esc(r)}</span>`);
  return [...args, ...refs].join(' ');
}

export function render(intake) {
  const text = intake.text || '';
  const { header, functions, objects, includes, setWords } = analyzeRed(text);
  if (!header && !functions.length && !objects.length && !includes.length) return null;

  const host = document.createElement('div');
  host.className = 'red-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'red-title';
  const badge = document.createElement('span');
  badge.className = 'red-badge';
  badge.textContent = 'Red';
  title.appendChild(badge);
  const nm = document.createElement('span');
  nm.className = 'red-name';
  nm.textContent = (header && header.Title) || 'Red script';
  title.appendChild(nm);
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'red-sub';
  sub.textContent = [
    functions.length && `${functions.length} function${functions.length !== 1 ? 's' : ''}`,
    objects.length && `${objects.length} object${objects.length !== 1 ? 's' : ''}`,
    includes.length && `${includes.length} include${includes.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ') || 'Red/Rebol script';
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'red-cards';
  for (const { value, label } of [
    { value: functions.length, label: 'Functions' },
    { value: objects.length, label: 'Objects' },
    { value: setWords.length, label: 'Set-words' },
    { value: includes.length, label: 'Includes' },
  ]) {
    const card = document.createElement('div');
    card.className = 'red-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (header && Object.keys(header).length) {
    const sec = makeSection(host, 'Header');
    const dl = document.createElement('dl');
    dl.className = 'red-meta';
    for (const [k, v] of Object.entries(header)) {
      const dt = document.createElement('dt'); dt.textContent = k;
      const dd = document.createElement('dd'); dd.textContent = v;
      dl.appendChild(dt); dl.appendChild(dd);
    }
    sec.appendChild(dl);
  }

  if (functions.length) {
    const ul = makeList(makeSection(host, `Functions (${functions.length})`));
    for (const fn of functions) {
      const ret = fn.returns ? ` <span class="red-ret">return: [${esc(fn.returns)}]</span>` : '';
      row(ul, `${tag('red-tag-func', fn.kind)} <span class="red-fname">${esc(fn.name)}</span> [${argsHtml(fn)}]${ret}`);
    }
  }

  if (objects.length) {
    const ul = makeList(makeSection(host, `Objects / Contexts (${objects.length})`));
    for (const o of objects) row(ul, `${tag('red-tag-ctx', o.kind)} <span class="red-fname">${esc(o.name)}</span>`);
  }

  if (includes.length) {
    const ul = makeList(makeSection(host, `Includes (${includes.length})`));
    for (const inc of includes) row(ul, `${tag('red-tag-inc', '#include')} ${esc(inc)}`);
  }

  if (setWords.length) {
    const ul = makeList(makeSection(host, `Set-words (${setWords.length})`));
    for (const w of setWords.slice(0, 40)) row(ul, `${tag('red-tag-set', 'set-word')} <span class="red-fname">${esc(w)}</span>`);
  }

  return { parentNode: host };
}
