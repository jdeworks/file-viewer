const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.res-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.res-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e84040;color:#fff;vertical-align:middle;margin-right:8px;}
.res-badge-sub{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#fff0f0;color:#c02020;vertical-align:middle;margin-left:6px;}
.res-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.res-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.res-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.res-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.res-card strong{display:block;font-size:1.2rem;font-weight:700;}
.res-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.res-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.res-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.res-list{margin:0;padding:0;list-style:none;}
.res-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.res-list li:last-child{border-bottom:none;}
.res-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#fff0f0;color:#c02020;font-weight:700;}
.res-tag-fn{background:#e8f4fb;color:#1a3a5c;}
.res-tag-val{background:#f1f5f9;color:#475569;}
.res-tag-ext{background:#dcfce7;color:#166534;}
.res-tag-type{background:#fef9c3;color:#854d0e;}
.res-tag-mod{background:#ede9fe;color:#7c3aed;}
.res-tag-jsx{background:#fdf6ec;color:#7c5c2e;}
.res-name{font-weight:600;}
.res-type{color:#0e7490;}
.res-ret{color:#1d4ed8;}
.res-lbl{color:#9f1239;}
.res-meta{color:var(--fg-2,#6e7781);}
.res-attr{font-family:ui-monospace,monospace;font-size:11px;color:#c026d3;}
.res-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.res-kw{color:#e84040;font-weight:600;}
.res-str{color:#0a6640;}
.res-comment{color:#6e7781;font-style:italic;}
.res-num{color:#b45309;}
.res-dec{color:#c026d3;}
`;

const RES_KEYWORDS = new Set([
  'let', 'type', 'module', 'open', 'include', 'external', 'and', 'or', 'not',
  'if', 'else', 'switch', 'when', 'true', 'false', 'exception', 'raise',
  'try', 'with', 'as', 'rec', 'mutable', 'private', 'pub', 'async', 'await',
  'for', 'while', 'in', 'of', 'fun', 'lazy', 'assert', 'return',
]);

// ---- pure parsing (DOM-free, exported for unit testing) ----

function stripComments(text) {
  const s = String(text || '');
  let out = '', i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '"') { out += c; i++; while (i < s.length && s[i] !== '"') { if (s[i] === '\\') { out += s[i]; i++; } out += s[i]; i++; } if (i < s.length) { out += s[i]; i++; } continue; }
    if (c === '/' && s[i + 1] === '/') { while (i < s.length && s[i] !== '\n') i++; continue; }
    if (c === '/' && s[i + 1] === '*') { i += 2; while (i < s.length && !(s[i] === '*' && s[i + 1] === '/')) i++; i += 2; continue; }
    out += c; i++;
  }
  return out;
}

const stripStrings = (s) => s.replace(/"(?:[^"\\]|\\.)*"/g, '""');

function netDepth(s) {
  let d = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '=' && s[i + 1] === '>') { i++; continue; }
    if (c === '(' || c === '{' || c === '[') d++;
    else if (c === ')' || c === '}' || c === ']') d--;
  }
  return d;
}

// Find the slice closed by the bracket opening at index `i`. Returns {inner, end} (end is past closer).
function balanced(s, i) {
  const open = s[i], close = { '(': ')', '{': '}', '[': ']' }[open];
  let d = 0;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (c === '"') { j++; while (j < s.length && s[j] !== '"') { if (s[j] === '\\') j++; j++; } continue; }
    if (c === open) d++;
    else if (c === close) { d--; if (d === 0) return { inner: s.slice(i + 1, j), end: j + 1 }; }
  }
  return null;
}

// Split on a top-level separator char (paren/brace/bracket/angle aware; skips `=>`).
function splitTop(s, sep) {
  const out = []; let buf = '', d = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '=' && s[i + 1] === '>') { buf += '=>'; i++; continue; }
    if (c === '(' || c === '{' || c === '[' || c === '<') d++;
    else if (c === ')' || c === '}' || c === ']' || c === '>') d = Math.max(0, d - 1);
    if (c === sep && d === 0) { out.push(buf); buf = ''; continue; }
    buf += c;
  }
  out.push(buf);
  return out.map((x) => x.trim()).filter((x) => x.length);
}

// Index of `ch` at top nesting level (skips `=>`), or -1.
function topIndexOf(s, ch) {
  let d = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '=' && s[i + 1] === '>') { i++; continue; }
    if (c === '(' || c === '{' || c === '[' || c === '<') d++;
    else if (c === ')' || c === '}' || c === ']' || c === '>') d--;
    else if (d === 0 && c === ch) return i;
  }
  return -1;
}

// Merge raw lines into logical statements (bracket depth + dangling `=`/`|`/`,` continuations).
function logicalLines(src) {
  const lines = src.split(/\r?\n/);
  const out = []; let buf = '';
  for (let i = 0; i < lines.length; i++) {
    buf = buf ? buf + '\n' + lines[i] : lines[i];
    const depth = netDepth(stripStrings(buf));
    const trimEnd = buf.replace(/\s+$/, '');
    const last = trimEnd[trimEnd.length - 1];
    const next = (lines[i + 1] || '').trim();
    const cont = depth > 0 || last === '=' || last === '|' || last === ','
      || last === '>' || next.startsWith('|') || next.startsWith('}') || next.startsWith(')');
    if (!cont) { if (buf.trim()) out.push(buf); buf = ''; }
  }
  if (buf.trim()) out.push(buf);
  return out;
}

function parseParam(part) {
  let p = part.trim(); if (!p) return null;
  const label = p.startsWith('~'); if (label) p = p.slice(1);
  let optional = false;
  if (p.endsWith('=?')) { optional = true; p = p.slice(0, -2).trim(); }
  else { const eq = topIndexOf(p, '='); if (eq >= 0) { p = p.slice(0, eq).trim(); if (label) optional = true; } }
  let name = p, type = '';
  const ci = topIndexOf(p, ':');
  if (ci >= 0) { name = p.slice(0, ci).trim(); type = p.slice(ci + 1).trim(); }
  return { name, type, label, optional };
}

const parseParams = (inner) => splitTop(inner, ',').map(parseParam).filter(Boolean);

// Decide if a let body is an arrow function; capture its params + return annotation.
function parseFn(body) {
  body = body.trim();
  let m;
  if ((m = body.match(/^(~?[a-z_]\w*)\s*=>/))) return { isFn: true, params: parseParams(m[1]), returns: '' };
  if (body[0] === '(') {
    const b = balanced(body, 0);
    if (b) {
      const rest = body.slice(b.end).trim();
      const rm = rest.match(/^(?::\s*([^={]+?))?\s*=>/);
      if (rm) return { isFn: true, params: parseParams(b.inner), returns: (rm[1] || '').trim() };
    }
  }
  return { isFn: false, params: [], returns: '' };
}

function parseType(name, bodyRaw) {
  const t = { name, kind: 'abstract', fields: [], constructors: [], alias: '' };
  bodyRaw = (bodyRaw || '').trim();
  if (!bodyRaw) return t;
  if (bodyRaw[0] === '{') {
    t.kind = 'record';
    const b = balanced(bodyRaw, 0);
    const inner = b ? b.inner : bodyRaw.replace(/^\{|\}$/g, '');
    for (const f of splitTop(inner, ',')) {
      const fm = f.match(/^(mutable\s+)?(\w+)\s*:\s*([\s\S]+)$/);
      if (fm) t.fields.push({ name: fm[2], type: fm[3].trim(), mutable: !!fm[1] });
    }
  } else if (topIndexOf(bodyRaw, '|') >= 0 || /^\s*\|/.test(bodyRaw)) {
    t.kind = 'variant';
    for (const c of splitTop(bodyRaw, '|')) {
      const cm = c.match(/^(\w+)(?:\(([\s\S]*)\))?/);
      if (cm) t.constructors.push({ name: cm[1], args: cm[2] !== undefined ? splitTop(cm[2], ',') : [] });
    }
  } else {
    t.kind = 'alias';
    t.alias = bodyRaw;
  }
  return t;
}

function parseStmt(s, attrs, acc, parent) {
  let m;
  if ((m = s.match(/^open\s+([\w.]+)/))) { acc.opens.push(m[1]); return; }
  if ((m = s.match(/^include\s+([\w.]+)/))) { acc.includes.push(m[1]); return; }
  if (/^module\s/.test(s) && !/^module\s+type\b/.test(s)) {
    const nm = s.match(/^module\s+(\w+)/);
    if (nm) {
      acc.modules.push({ name: nm[1] });
      const bi = s.indexOf('{');
      if (bi >= 0) { const b = balanced(s, bi); if (b) walk(b.inner, acc, nm[1]); }
    }
    return;
  }
  if ((m = s.match(/^type\s+(\w+)(?:<[^>]*>)?\s*(?:=\s*([\s\S]*))?$/))) {
    acc.types.push(parseType(m[1], m[2]));
    return;
  }
  if ((m = s.match(/^external\s+(\w+)\s*:\s*([\s\S]*?)\s*=\s*"([^"]*)"\s*$/))) {
    acc.externals.push({ name: m[1], type: m[2].trim(), jsName: m[3], attrs });
    for (const a of attrs) acc.decorators.push(a);
    return;
  }
  if ((m = s.match(/^let\s+(rec\s+)?(\w+)\s*(?::\s*([\s\S]+?))?\s*=\s*([\s\S]*)$/))) {
    const name = m[2], annot = (m[3] || '').trim(), body = m[4].trim();
    const fn = parseFn(body);
    if (fn.isFn) acc.lets.push({ name, fn: true, params: fn.params, returns: fn.returns, type: annot, module: parent, attrs });
    else acc.lets.push({ name, fn: false, params: [], returns: '', type: annot, module: parent, attrs });
    for (const a of attrs) acc.decorators.push(a);
    return;
  }
}

function walk(src, acc, parent) {
  let pending = [];
  for (const stmt of logicalLines(src)) {
    let s = stmt.trim();
    const attrs = [...pending]; pending = [];
    let dm;
    while ((dm = s.match(/^@([\w.]+)(\([^)]*\))?\s*/))) { attrs.push('@' + dm[1] + (dm[2] || '')); s = s.slice(dm[0].length); }
    if (!s.trim()) { pending = attrs; continue; }
    parseStmt(s, attrs, acc, parent);
  }
}

export function analyzeReScript(text) {
  const acc = { opens: [], includes: [], types: [], lets: [], modules: [], externals: [], decorators: [] };
  const stripped = stripComments(String(text || ''));
  walk(stripped, acc, null);
  acc.decorators = [...new Set(acc.decorators)];
  acc.jsx = /@react\.component/.test(text) || /<[A-Za-z][\w.]*[\s/>]/.test(stripStrings(stripped));
  return acc;
}

// ---- DOM rendering ----

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'res-section';
  const hd = document.createElement('div');
  hd.className = 'res-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'res-list'; sec.appendChild(ul); return ul; }
function tag(cls, t) { return `<span class="res-tag ${cls}">${esc(t)}</span>`; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
function attrsHtml(attrs) { return (attrs && attrs.length) ? `<span class="res-attr">${esc(attrs.join(' '))}</span> ` : ''; }

function paramsHtml(params) {
  if (!params.length) return '<span class="res-meta">unit</span>';
  return params.map((p) => {
    const lbl = p.label ? '<span class="res-lbl">~</span>' : '';
    const ty = p.type ? `: <span class="res-type">${esc(p.type)}</span>` : '';
    return `${lbl}${esc(p.name)}${ty}${p.optional ? '=?' : ''}`;
  }).join(', ');
}

function highlightRes(text) {
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.trim().startsWith('//')) { out.push('<span class="res-comment">' + esc(line) + '</span>'); continue; }
    let s = '', i = 0;
    while (i < line.length) {
      if (line[i] === '/' && line[i + 1] === '/') { s += '<span class="res-comment">' + esc(line.slice(i)) + '</span>'; break; }
      if (line[i] === '@' && /[A-Za-z_]/.test(line[i + 1] || '')) { let j = i + 1; while (j < line.length && /[\w.]/.test(line[j])) j++; s += '<span class="res-dec">' + esc(line.slice(i, j)) + '</span>'; i = j; continue; }
      if (line[i] === '"') { let j = i + 1; while (j < line.length && line[j] !== '"') { if (line[j] === '\\') j++; j++; } j++; s += '<span class="res-str">' + esc(line.slice(i, j)) + '</span>'; i = j; continue; }
      if (/[0-9]/.test(line[i])) { let j = i; while (j < line.length && /[0-9._xXbBLl]/.test(line[j])) j++; s += '<span class="res-num">' + esc(line.slice(i, j)) + '</span>'; i = j; continue; }
      if (/[A-Za-z_]/.test(line[i])) { let j = i; while (j < line.length && /\w/.test(line[j])) j++; const w = line.slice(i, j); s += RES_KEYWORDS.has(w) ? '<span class="res-kw">' + esc(w) + '</span>' : esc(w); i = j; continue; }
      s += esc(line[i]); i++;
    }
    out.push(s);
  }
  return out.join('\n');
}

function card(cards, value, label) {
  const c = document.createElement('div'); c.className = 'res-card';
  const st = document.createElement('strong'); st.textContent = value;
  const sp = document.createElement('span'); sp.textContent = label;
  c.appendChild(st); c.appendChild(sp); cards.appendChild(c);
}

export async function render(intake) {
  const text = intake.text || '';
  const filename = (intake.name || intake.filename || '').toLowerCase();
  const facts = analyzeReScript(text);
  const { opens, includes, types, lets, modules, externals, jsx } = facts;
  if (!opens.length && !types.length && !lets.length && !modules.length && !externals.length) return null;

  const fnLets = lets.filter((l) => l.fn);
  const valLets = lets.filter((l) => !l.fn);
  const isInterface = filename.endsWith('.resi');

  const host = document.createElement('div');
  host.className = 'res-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'res-title';
  let titleHtml = `<span class="res-badge">ReScript ${isInterface ? 'Interface' : 'Module'}</span>`
    + `<span class="res-badge-sub">${isInterface ? '.resi' : '.res'}</span>`;
  if (jsx) titleHtml += ` ${tag('res-tag-jsx', 'JSX / React')}`;
  title.innerHTML = titleHtml;
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'res-sub';
  sub.textContent = [
    (opens.length + includes.length) && `${opens.length + includes.length} import${opens.length + includes.length !== 1 ? 's' : ''}`,
    types.length && `${types.length} type${types.length !== 1 ? 's' : ''}`,
    fnLets.length && `${fnLets.length} function${fnLets.length !== 1 ? 's' : ''}`,
    externals.length && `${externals.length} external${externals.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'res-cards';
  card(cards, opens.length + includes.length, 'Imports');
  card(cards, types.length, 'Types');
  card(cards, fnLets.length, 'Functions');
  card(cards, valLets.length, 'Values');
  card(cards, externals.length, 'Externals');
  card(cards, modules.length, 'Modules');
  host.appendChild(cards);

  if (opens.length || includes.length) {
    const ul = makeList(makeSection(host, `Imports (${opens.length + includes.length})`));
    for (const o of opens) row(ul, `${tag('res-tag', 'open')} <span class="res-name">${esc(o)}</span>`);
    for (const o of includes) row(ul, `${tag('res-tag', 'include')} <span class="res-name">${esc(o)}</span>`);
  }

  if (types.length) {
    const ul = makeList(makeSection(host, `Types (${types.length})`));
    for (const t of types) {
      let detail = '';
      if (t.kind === 'record') detail = `{ ${t.fields.map((f) => `${esc(f.name)}: <span class="res-type">${esc(f.type)}</span>`).join(', ')} }`;
      else if (t.kind === 'variant') detail = t.constructors.map((c) => esc(c.name) + (c.args.length ? `(<span class="res-type">${esc(c.args.join(', '))}</span>)` : '')).join(' <span class="res-meta">|</span> ');
      else if (t.kind === 'alias') detail = `= <span class="res-type">${esc(t.alias)}</span>`;
      row(ul, `${tag('res-tag-type', t.kind)} <span class="res-name">${esc(t.name)}</span> ${detail}`);
    }
  }

  if (modules.length) {
    const ul = makeList(makeSection(host, `Modules (${modules.length})`));
    for (const mod of modules) row(ul, `${tag('res-tag-mod', 'module')} <span class="res-name">${esc(mod.name)}</span>`);
  }

  if (fnLets.length) {
    const ul = makeList(makeSection(host, `Functions (${fnLets.length})`));
    for (const f of fnLets) {
      const ret = f.returns ? ` => <span class="res-ret">${esc(f.returns)}</span>` : '';
      const where = f.module ? ` <span class="res-meta">in ${esc(f.module)}</span>` : '';
      row(ul, `${attrsHtml(f.attrs)}<span class="res-name">${esc(f.name)}</span>(${paramsHtml(f.params)})${ret}${where}`);
    }
  }

  if (valLets.length) {
    const ul = makeList(makeSection(host, `Values (${valLets.length})`));
    for (const v of valLets) {
      const ty = v.type ? `: <span class="res-type">${esc(v.type)}</span>` : '';
      const where = v.module ? ` <span class="res-meta">in ${esc(v.module)}</span>` : '';
      row(ul, `${attrsHtml(v.attrs)}${tag('res-tag-val', 'let')} <span class="res-name">${esc(v.name)}</span>${ty}${where}`);
    }
  }

  if (externals.length) {
    const ul = makeList(makeSection(host, `Externals (${externals.length})`));
    for (const e of externals) {
      const ty = e.type ? `: <span class="res-type">${esc(e.type)}</span>` : '';
      row(ul, `${attrsHtml(e.attrs)}${tag('res-tag-ext', 'external')} <span class="res-name">${esc(e.name)}</span>${ty} <span class="res-meta">= "${esc(e.jsName)}"</span>`);
    }
  }

  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'res-pre';
  pre.innerHTML = highlightRes(text);
  srcSec.appendChild(pre);

  return { parentNode: host };
}
