const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.janet-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.janet-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1e7145;color:#fff;vertical-align:middle;margin-right:8px;}
.janet-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.janet-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.janet-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.janet-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.janet-card strong{display:block;font-size:1.2rem;font-weight:700;}
.janet-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.janet-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.janet-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.janet-list{margin:0;padding:0;list-style:none;}
.janet-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.janet-list li:last-child{border-bottom:none;}
.janet-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;}
.janet-tag-defn{background:#d1fae5;color:#065f46;}
.janet-tag-private{background:#f3f4f6;color:#374151;}
.janet-tag-macro{background:#fce7f3;color:#9d174d;}
.janet-tag-def{background:#dbeafe;color:#1e40af;}
.janet-tag-var{background:#fef3c7;color:#92400e;}
.janet-tag-import{background:#ede9fe;color:#5b21b6;}
.janet-tag-struct{background:#cffafe;color:#155e75;}
.janet-name{font-weight:600;}
.janet-params{color:#0e7490;}
.janet-arity{color:var(--fg-2,#6e7781);font-size:10px;}
.janet-val{color:#9333ea;}
.janet-alias{color:#5b21b6;}
.janet-doc-str{font-size:11px;color:var(--fg-2,#6e7781);font-style:italic;font-family:system-ui,sans-serif;margin-left:4px;}
.janet-mod{font-family:ui-monospace,monospace;font-size:13px;color:#1e7145;font-weight:700;}
`;

// ---- pure reader helpers (operate on comment-stripped, string-aware source) ----
const isSpace = (c) => c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === ',';
const isDelim = (c) => c === '(' || c === ')' || c === '[' || c === ']' || c === '{' || c === '}' || c === '"' || c === '`';

function skipWs(s, i) { while (i < s.length && isSpace(s[i])) i++; return i; }

function readString(s, i) {
  // s[i] === '"' ; returns { value, end } with end one past the closing quote
  let v = '';
  i++;
  while (i < s.length) {
    const c = s[i];
    if (c === '\\') { v += (s[i + 1] || ''); i += 2; continue; }
    if (c === '"') { i++; break; }
    v += c; i++;
  }
  return { value: v, end: i };
}

function readLongString(s, i) {
  // backtick long string: opening run of N backticks closes on the same run
  let n = 0; while (s[i] === '`') { n++; i++; }
  const close = '`'.repeat(n);
  const idx = s.indexOf(close, i);
  return { end: idx === -1 ? s.length : idx + n };
}

function readSymbol(s, i) {
  i = skipWs(s, i);
  const start = i;
  while (i < s.length && !isSpace(s[i]) && !isDelim(s[i])) i++;
  return { name: s.slice(start, i), end: i };
}

function readBracket(s, i) {
  // s[i] === '[' ; returns { body, end }
  let depth = 0; const start = i;
  for (; i < s.length; i++) {
    const c = s[i];
    if (c === '"') { i = readString(s, i).end - 1; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) return { body: s.slice(start + 1, i), end: i + 1 }; }
  }
  return { body: s.slice(start + 1), end: s.length };
}

function readForm(s, i) {
  // s[i] === '(' ; returns { body, end } where body is inside the outer parens
  let depth = 0; const start = i;
  for (; i < s.length; i++) {
    const c = s[i];
    if (c === '"') { i = readString(s, i).end - 1; continue; }
    if (c === '`') { i = readLongString(s, i).end - 1; continue; }
    if (c === '(') depth++;
    else if (c === ')') { depth--; if (depth === 0) return { body: s.slice(start + 1, i), end: i + 1 }; }
  }
  return { body: s.slice(start + 1), end: s.length };
}

// Split a Janet param vector body into top-level tokens (destructuring [...] / {...} kept whole).
function parseParams(body) {
  const params = []; let i = 0;
  while (i < body.length) {
    i = skipWs(body, i);
    if (i >= body.length) break;
    const c = body[i];
    if (c === '[' || c === '{') {
      const open = c, close = c === '[' ? ']' : '}';
      let depth = 0; const start = i;
      for (; i < body.length; i++) {
        if (body[i] === open) depth++;
        else if (body[i] === close) { depth--; if (depth === 0) { i++; break; } }
      }
      params.push(body.slice(start, i).replace(/\s+/g, ' '));
    } else {
      const start = i;
      while (i < body.length && !isSpace(body[i]) && body[i] !== '[' && body[i] !== ']' && body[i] !== '{' && body[i] !== '}') i++;
      params.push(body.slice(start, i));
    }
  }
  return params.filter(Boolean);
}

function arityOf(params) {
  const amp = params.indexOf('&');
  return { arity: amp === -1 ? params.length : amp, variadic: amp !== -1 };
}

// Remove `#` line comments while preserving string and backtick-long-string contents.
function stripComments(text) {
  const s = String(text || '');
  let out = ''; let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '"') { const r = readString(s, i); out += s.slice(i, r.end); i = r.end; continue; }
    if (c === '`') { const r = readLongString(s, i); out += s.slice(i, r.end); i = r.end; continue; }
    if (c === '#') { while (i < s.length && s[i] !== '\n') i++; continue; }
    out += c; i++;
  }
  return out;
}

const HEAD = /^\(\s*(defn-|defmacro|defstruct|defn|def|var|import|use|module)(?=[\s\n([{"])/;

// Read a `(defn name "doc"? [params] ...)` style head starting just after the keyword.
function readDefn(s, p) {
  const nm = readSymbol(s, p);
  let q = skipWs(s, nm.end);
  let doc = null;
  if (s[q] === '"') { const r = readString(s, q); doc = r.value; q = skipWs(s, r.end); }
  let params = [];
  if (s[q] === '[') params = parseParams(readBracket(s, q).body);
  const { arity, variadic } = arityOf(params);
  return { name: nm.name, doc, params, arity, variadic };
}

// Read a `(def name value...)` head; value = short preview of the next token/expression.
function readBinding(s, p) {
  const nm = readSymbol(s, p);
  let q = skipWs(s, nm.end);
  let doc = null;
  if (s[q] === '"') { const r = readString(s, q); doc = r.value; q = skipWs(s, r.end); }
  let value = '';
  if (q < s.length && s[q] !== ')') {
    if (s[q] === '(' || s[q] === '[' || s[q] === '{') {
      value = s.slice(q, q + 40).replace(/\s+/g, ' ').trim();
    } else {
      value = readSymbol(s, q).name;
    }
  }
  return { name: nm.name, value, doc };
}

// Parse Janet source into structured facts. Pure / DOM-free for unit testing.
export function analyzeJanet(text) {
  const s = stripComments(text);
  let moduleName = null;
  const imports = [], uses = [], functions = [], macros = [], defs = [], vars = [], structs = [];

  let i = 0, depth = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '"') { i = readString(s, i).end; continue; }
    if (c === '`') { i = readLongString(s, i).end; continue; }
    if (c === '(') {
      if (depth === 0) {
        const m = HEAD.exec(s.slice(i, i + 32));
        if (m) {
          const kw = m[1];
          const after = i + m[0].length;
          if (kw === 'defn' || kw === 'defn-') {
            const d = readDefn(s, after);
            if (d.name) functions.push({ ...d, private: kw === 'defn-' });
          } else if (kw === 'defmacro') {
            const d = readDefn(s, after);
            if (d.name) macros.push(d);
          } else if (kw === 'defstruct') {
            const nm = readSymbol(s, after);
            if (nm.name) structs.push({ name: nm.name });
          } else if (kw === 'def') {
            const b = readBinding(s, after);
            if (b.name) defs.push(b);
          } else if (kw === 'var') {
            const b = readBinding(s, after);
            if (b.name) vars.push(b);
          } else if (kw === 'import') {
            const end = readForm(s, i).end;
            const inner = s.slice(after, end - 1);
            const spec = (inner.match(/^\s*([^\s()[\]{}]+)/) || [])[1] || '';
            const alias = (inner.match(/:as\s+([^\s()[\]{}]+)/) || [])[1] || null;
            if (spec) imports.push({ spec, alias });
          } else if (kw === 'use') {
            const end = readForm(s, i).end;
            const inner = s.slice(after, end - 1);
            for (const mm of inner.matchAll(/(^|\s)([^\s()[\]{}:][^\s()[\]{}]*)/g)) uses.push(mm[2]);
          } else if (kw === 'module') {
            const nm = readSymbol(s, after);
            if (nm.name && !moduleName) moduleName = nm.name;
          }
        }
      }
      depth++; i++; continue;
    }
    if (c === ')') { depth = Math.max(0, depth - 1); i++; continue; }
    i++;
  }
  return { moduleName, imports, uses, functions, macros, defs, vars, structs };
}

// ---- rendering ----
function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'janet-section';
  const hd = document.createElement('div');
  hd.className = 'janet-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'janet-list'; sec.appendChild(ul); return ul; }
function tag(cls, t) { return `<span class="janet-tag ${cls}">${esc(t)}</span>`; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
function docHtml(doc) {
  if (!doc) return '';
  const d = doc.length > 64 ? doc.slice(0, 61) + '…' : doc;
  return ` <span class="janet-doc-str">${esc(d)}</span>`;
}
function fnHtml(f) {
  const params = `<span class="janet-params">[${esc(f.params.join(' '))}]</span>`;
  const ar = `<span class="janet-arity">arity ${f.arity}${f.variadic ? '+' : ''}</span>`;
  return `<span class="janet-name">${esc(f.name)}</span> ${params} ${ar}${docHtml(f.doc)}`;
}

export async function render(intake) {
  const text = intake.text || '';
  const { moduleName, imports, uses, functions, macros, defs, vars, structs } = analyzeJanet(text);
  const publics = functions.filter((f) => !f.private);
  const privates = functions.filter((f) => f.private);
  const importCount = imports.length + uses.length;

  const host = document.createElement('div');
  host.className = 'janet-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'janet-title';
  const badge = document.createElement('span');
  badge.className = 'janet-badge';
  badge.textContent = 'Janet Script';
  title.appendChild(badge);
  if (moduleName) { const n = document.createElement('span'); n.className = 'janet-mod'; n.textContent = moduleName; title.appendChild(n); }
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'janet-sub';
  const parts = [
    importCount && `${importCount} import${importCount !== 1 ? 's' : ''}`,
    functions.length && `${functions.length} fn${functions.length !== 1 ? 's' : ''}`,
    macros.length && `${macros.length} macro${macros.length !== 1 ? 's' : ''}`,
    defs.length && `${defs.length} def${defs.length !== 1 ? 's' : ''}`,
  ].filter(Boolean);
  sub.textContent = parts.length ? parts.join(' · ') : 'Janet source file';
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'janet-cards';
  for (const { value, label } of [
    { value: importCount, label: 'Imports' },
    { value: functions.length, label: 'Functions' },
    { value: macros.length, label: 'Macros' },
    { value: defs.length, label: 'Defs' },
    { value: vars.length, label: 'Vars' },
  ]) {
    const card = document.createElement('div');
    card.className = 'janet-card';
    const strong = document.createElement('strong'); strong.textContent = value;
    const span = document.createElement('span'); span.textContent = label;
    card.appendChild(strong); card.appendChild(span); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (importCount) {
    const ul = makeList(makeSection(host, `Imports (${importCount})`));
    for (const { spec, alias } of imports) {
      row(ul, `${tag('janet-tag-import', 'import')} <span class="janet-name">${esc(spec)}</span>`
        + (alias ? ` <span class="janet-alias">:as ${esc(alias)}</span>` : ''));
    }
    for (const u of uses) row(ul, `${tag('janet-tag-import', 'use')} <span class="janet-name">${esc(u)}</span>`);
  }

  if (publics.length) {
    const ul = makeList(makeSection(host, `Functions (${publics.length})`));
    for (const f of publics) row(ul, `${tag('janet-tag-defn', 'defn')} ${fnHtml(f)}`);
  }

  if (privates.length) {
    const ul = makeList(makeSection(host, `Private Functions (${privates.length})`));
    for (const f of privates) row(ul, `${tag('janet-tag-private', 'defn-')} ${fnHtml(f)}`);
  }

  if (macros.length) {
    const ul = makeList(makeSection(host, `Macros (${macros.length})`));
    for (const m of macros) row(ul, `${tag('janet-tag-macro', 'defmacro')} ${fnHtml(m)}`);
  }

  if (structs.length) {
    const ul = makeList(makeSection(host, `Structs / Prototypes (${structs.length})`));
    for (const st of structs) row(ul, `${tag('janet-tag-struct', 'defstruct')} <span class="janet-name">${esc(st.name)}</span>`);
  }

  if (defs.length) {
    const ul = makeList(makeSection(host, `Definitions (${defs.length})`));
    for (const d of defs) {
      row(ul, `${tag('janet-tag-def', 'def')} <span class="janet-name">${esc(d.name)}</span>`
        + (d.value ? ` = <span class="janet-val">${esc(d.value)}</span>` : '') + docHtml(d.doc));
    }
  }

  if (vars.length) {
    const ul = makeList(makeSection(host, `Mutable Vars (${vars.length})`));
    for (const v of vars) {
      row(ul, `${tag('janet-tag-var', 'var')} <span class="janet-name">${esc(v.name)}</span>`
        + (v.value ? ` = <span class="janet-val">${esc(v.value)}</span>` : '') + docHtml(v.doc));
    }
  }

  return { parentNode: host };
}
