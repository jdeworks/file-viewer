const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.vla-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.vla-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#6a0dad;color:#fff;vertical-align:middle;margin-right:8px;}
.vla-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.vla-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.vla-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.vla-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.vla-card strong{display:block;font-size:1.2rem;font-weight:700;}
.vla-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.vla-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.vla-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.vla-type-hd{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;}
.vla-list{margin:0;padding:0;list-style:none;}
.vla-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.vla-list li:last-child{border-bottom:none;}
.vla-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#e9d8fd;color:#6a0dad;font-weight:700;}
.vla-tag.class{background:#e9d8fd;color:#6a0dad;}
.vla-tag.interface{background:#d8edfd;color:#1a56db;}
.vla-tag.struct{background:#fef9c3;color:#854d0e;}
.vla-tag.enum{background:#d8fde9;color:#0a7440;}
.vla-tag.errordomain{background:#ffe4e6;color:#9f1239;}
.vla-tag.using{background:#dcfce7;color:#166534;}
.vla-tag.method{background:#dbeafe;color:#1d4ed8;}
.vla-tag.ctor{background:#fde68a;color:#92400e;}
.vla-tag.prop{background:#ede9fe;color:#7c3aed;}
.vla-tag.field{background:#e2e8f0;color:#475569;}
.vla-tag.signal{background:#fee2e2;color:#b91c1c;}
.vla-name{font-weight:600;}
.vla-gen{color:#15803d;}
.vla-type{color:#0e7490;}
.vla-ret{color:#1d4ed8;}
.vla-acc{color:#9f1239;font-style:italic;}
.vla-mod{color:#7c3aed;font-style:italic;}
.vla-base{color:#0e7490;}
.vla-throws{color:#b91c1c;font-style:italic;}
.vla-member{padding-left:26px;}
.vla-accessors{color:#7c3aed;}
`;

const ACCESS = ['public', 'private', 'protected', 'internal'];
const TYPE_MODS = ['abstract', 'sealed', 'static', 'partial', 'extern'];
const METHOD_MODS = ['static', 'virtual', 'override', 'abstract', 'new', 'inline', 'extern', 'async', 'delegate'];
const PARAM_MODS = ['ref', 'out', 'owned', 'unowned', 'weak', 'params', 'construct'];

// ---- low-level scanning helpers -------------------------------------------

// Strip // and /* */ comments and "string"/'char'/"""verbatim""" literals so
// braces/semicolons inside them never disturb structural parsing. Newlines kept.
function clean(text) {
  const s = String(text || '');
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '/' && s[i + 1] === '/') { while (i < s.length && s[i] !== '\n') i++; out += '\n'; continue; }
    if (c === '/' && s[i + 1] === '*') { i += 2; while (i < s.length && !(s[i] === '*' && s[i + 1] === '/')) { if (s[i] === '\n') out += '\n'; i++; } i++; continue; }
    if (c === '"' && s[i + 1] === '"' && s[i + 2] === '"') { i += 3; while (i < s.length && !(s[i] === '"' && s[i + 1] === '"' && s[i + 2] === '"')) { if (s[i] === '\n') out += '\n'; i++; } i += 2; out += '""'; continue; }
    if (c === '"' || c === '\'') { const q = c; i++; while (i < s.length && s[i] !== q) { if (s[i] === '\\') i++; i++; } out += q + q; continue; }
    out += c;
  }
  return out;
}

// Match a delimiter pair starting at src[open]; returns index of its partner.
function matchPair(src, open, oc, cc) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === oc) depth++;
    else if (src[i] === cc) { depth--; if (depth === 0) return i; }
  }
  return src.length - 1;
}
const matchBrace = (src, i) => matchPair(src, i, '{', '}');
const matchAngle = (src, i) => matchPair(src, i, '<', '>');

// Split on a top-level delimiter, ignoring nesting in () [] <> {}.
function splitTop(str, delim) {
  const out = [];
  let buf = '', p = 0, b = 0, a = 0, c = 0;
  for (const ch of str) {
    if (ch === '(') p++; else if (ch === ')') p--;
    else if (ch === '[') b++; else if (ch === ']') b--;
    else if (ch === '<') a++; else if (ch === '>') a = Math.max(0, a - 1);
    else if (ch === '{') c++; else if (ch === '}') c--;
    if (ch === delim && !p && !b && !a && !c) { out.push(buf); buf = ''; } else buf += ch;
  }
  if (buf.trim()) out.push(buf);
  return out.map((x) => x.trim()).filter(Boolean);
}

// ---- declaration parsers --------------------------------------------------

function takeLeading(words, allowed) {
  const taken = [];
  while (words.length && allowed.includes(words[0])) taken.push(words.shift());
  return taken;
}

// A parameter group: "[mod] Type name [= default]".
function parseParams(inside) {
  return splitTop(inside, ',').map((raw) => {
    let s = raw.trim(), mod = '';
    const mm = s.match(new RegExp('^(' + PARAM_MODS.join('|') + ')\\s+'));
    if (mm) { mod = mm[1]; s = s.slice(mm[0].length).trim(); }
    const eq = splitTop(s, '=');
    const left = (eq[0] || '').trim();
    const def = eq.length > 1 ? eq.slice(1).join('=').trim() : '';
    const wm = left.match(/^(.*?)(\b[A-Za-z_]\w*)\s*$/);
    const type = wm ? wm[1].trim() : left;
    const name = wm ? wm[2] : '';
    return { mod, type, name, def };
  }).filter((p) => p.type || p.name);
}

// Parse a method / constructor / signal signature.
function parseSignature(header, containerName) {
  let h = header.replace(/\s+/g, ' ').trim();
  let throwsList = [];
  const tm = h.match(/\bthrows\b([^{]*)$/);
  if (tm) { throwsList = splitTop(tm[1], ','); h = h.slice(0, tm.index).trim(); }
  const op = h.indexOf('(');
  if (op < 0) return null;
  const cp = matchPair(h, op, '(', ')');
  const params = parseParams(h.slice(op + 1, cp));
  let pre = h.slice(0, op).trim();
  // generics live right before "(": "map<T> ("
  let generics = '';
  const gm = pre.match(/<[^<>]*(?:<[^<>]*>[^<>]*)*>\s*$/);
  if (gm) { generics = gm[0].trim(); pre = pre.slice(0, gm.index).trim(); }
  const words = pre.split(/\s+/).filter(Boolean);
  const isSignal = words.includes('signal');
  const access = words.find((w) => ACCESS.includes(w)) || '';
  const modifiers = words.filter((w) => METHOD_MODS.includes(w) || w === 'signal');
  const rest = words.filter((w) => !ACCESS.includes(w) && !METHOD_MODS.includes(w) && w !== 'signal');
  let returns = '', name = '', isConstructor = false;
  if (rest.length >= 2) { name = rest[rest.length - 1]; returns = rest.slice(0, -1).join(' '); }
  else if (rest.length === 1) { name = rest[0]; isConstructor = !isSignal && (name === containerName || /^[A-Z]/.test(name)); }
  return { name, returns, params, access, modifiers, generics, throws: throwsList, isConstructor, isSignal };
}

// Parse a field / property head: "[access][mods] Type name".
function parseMember(head) {
  const words = head.replace(/\s+/g, ' ').trim().split(/\s+/).filter(Boolean);
  const access = words.find((w) => ACCESS.includes(w)) || '';
  const mods = words.filter((w) => ['static', 'const', 'abstract', 'virtual', 'override', 'weak', 'owned', 'unowned', 'new', 'extern'].includes(w));
  const rest = words.filter((w) => !ACCESS.includes(w) && !mods.includes(w));
  if (rest.length < 2) return null;
  const name = rest[rest.length - 1];
  if (!/^[A-Za-z_]\w*$/.test(name)) return null;
  return { name, type: rest.slice(0, -1).join(' '), access, modifiers: mods };
}

// Try to read a type declaration header (after the keyword's "{").
function parseType(header) {
  let h = header.replace(/\s+/g, ' ').trim();
  const lead = h.match(new RegExp('^((?:' + [...ACCESS, ...TYPE_MODS].join('|') + ')\\s+)*'));
  h = h.slice(lead[0].length);
  const km = h.match(/^(namespace|class|interface|struct|enum|errordomain)\s+([\w.]+)\s*/);
  if (!km) return null;
  let rest = h.slice(km[0].length).trim();
  let generics = '';
  if (rest.startsWith('<')) { const e = matchAngle(rest, 0); generics = rest.slice(0, e + 1); rest = rest.slice(e + 1).trim(); }
  let bases = [];
  if (rest.startsWith(':')) bases = splitTop(rest.slice(1), ',');
  return { kind: km[1], name: km[2], generics, bases };
}

function newType(t) {
  return { kind: t.kind, name: t.name, generics: t.generics, bases: t.bases, methods: [], properties: [], fields: [], signals: [], enumMembers: [] };
}

function parseEnumMembers(body) {
  // members precede the first ';' (after which enum methods may appear)
  const head = body.split(';')[0];
  return splitTop(head, ',').map((m) => (m.match(/^([A-Za-z_]\w*)/) || [])[1]).filter(Boolean);
}

// ---- main analyzer (pure, DOM-free) ---------------------------------------

export function analyzeVala(text) {
  const src = clean(text);
  const usings = [], namespaces = [], types = [], functions = [];
  const stack = []; // container frames: { container: typeObj|null }
  const container = () => (stack.length ? stack[stack.length - 1].container : null);
  let buf = '', paren = 0;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '(') { paren++; buf += ch; continue; }
    if (ch === ')') { paren = Math.max(0, paren - 1); buf += ch; continue; }
    if (paren > 0) { buf += ch; continue; }

    if (ch === '{') {
      const header = buf.trim(); buf = '';
      const ty = parseType(header);
      if (ty && ty.kind === 'namespace') { namespaces.push(ty.name); stack.push({ container: null }); continue; }
      if (ty) {
        const obj = newType(ty); types.push(obj);
        if (ty.kind === 'enum' || ty.kind === 'errordomain') {
          const end = matchBrace(src, i);
          obj.enumMembers = parseEnumMembers(src.slice(i + 1, end));
          i = end; continue;
        }
        stack.push({ container: obj }); continue;
      }
      // not a type: method/ctor/signal body, field initializer, property, or construct block
      const end = matchBrace(src, i);
      if (header.includes('(')) { // method / constructor / signal with a body (paren tested before '=')
        const sig = parseSignature(header, container() && container().name);
        if (sig) {
          const c = container();
          if (sig.isSignal && c) c.signals.push(sig);
          else if (c) c.methods.push(sig);
          else functions.push(sig);
        }
        i = end; continue;
      }
      if (header.includes('=')) { // field with an array/struct initializer block
        const mem = parseMember(header.split('=')[0]);
        if (mem && container()) container().fields.push(mem);
        i = end; continue;
      }
      if (/(^|\s)construct$/.test(header)) { i = end; continue; }
      const prop = parseMember(header);
      if (prop) { prop.accessors = readAccessors(src.slice(i + 1, end)); const c = container(); if (c) c.properties.push(prop); }
      i = end; continue;
    }

    if (ch === '}') { if (stack.length) stack.pop(); buf = ''; continue; }

    if (ch === ';') {
      const stmt = buf.trim(); buf = '';
      processStatement(stmt, container(), { usings, functions });
      continue;
    }
    buf += ch;
  }
  return { usings, namespaces, types, functions };
}

function readAccessors(body) {
  const acc = [];
  for (const kw of ['get', 'set', 'default']) if (new RegExp('(^|[^\\w])' + kw + '\\b').test(body)) acc.push(kw);
  return acc;
}

function processStatement(stmt, c, out) {
  if (!stmt) return;
  let m;
  if ((m = stmt.match(/^using\s+([\w.]+)$/))) { if (!out.usings.includes(m[1])) out.usings.push(m[1]); return; }
  if (stmt.includes('(')) { // abstract/virtual method or signal declared without a body
    const sig = parseSignature(stmt, c && c.name);
    if (sig) { if (sig.isSignal && c) c.signals.push(sig); else if (c) c.methods.push(sig); else out.functions.push(sig); }
    return;
  }
  if (c) { // a field
    const mem = parseMember(stmt.split('=')[0]);
    if (mem) c.fields.push(mem);
  }
}

// ---- rendering ------------------------------------------------------------

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'vla-section';
  const hd = document.createElement('div');
  hd.className = 'vla-section-hd';
  hd.innerHTML = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
const tag = (cls, t) => `<span class="vla-tag ${cls}">${esc(t)}</span>`;
function row(ul, html, cls) { const li = document.createElement('li'); if (cls) li.className = cls; li.innerHTML = html; ul.appendChild(li); }
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'vla-list'; sec.appendChild(ul); return ul; }

function paramsHtml(params) {
  return params.map((p) => {
    const mod = p.mod ? `<span class="vla-mod">${esc(p.mod)}</span> ` : '';
    const type = p.type ? `<span class="vla-type">${esc(p.type)}</span> ` : '';
    const def = p.def ? ` = ${esc(p.def)}` : '';
    return `${mod}${type}${esc(p.name)}${def}`;
  }).join(', ');
}

function methodHtml(m, kind) {
  const acc = m.access ? `<span class="vla-acc">${esc(m.access)}</span> ` : '';
  const mods = (m.modifiers || []).filter((x) => x !== 'signal').map((x) => `<span class="vla-mod">${esc(x)}</span>`).join(' ');
  const ret = m.returns ? `<span class="vla-ret">${esc(m.returns)}</span> ` : '';
  const gen = m.generics ? `<span class="vla-gen">${esc(m.generics)}</span>` : '';
  const thr = (m.throws && m.throws.length) ? ` <span class="vla-throws">throws ${esc(m.throws.join(', '))}</span>` : '';
  return `${tag(kind, kind === 'ctor' ? 'ctor' : (kind === 'signal' ? 'signal' : 'method'))} ${acc}${mods ? mods + ' ' : ''}${ret}<span class="vla-name">${esc(m.name)}</span>${gen}(${paramsHtml(m.params)})${thr}`;
}

function renderType(host, t) {
  const gen = t.generics ? `<span class="vla-gen">${esc(t.generics)}</span>` : '';
  const bases = (t.bases && t.bases.length) ? ` : <span class="vla-base">${esc(t.bases.join(', '))}</span>` : '';
  const sec = makeSection(host, `<span class="vla-type-hd">${tag(t.kind, t.kind)} <span class="vla-name">${esc(t.name)}</span>${gen}${bases}</span>`);
  const ul = makeList(sec);
  let any = false;
  for (const p of t.properties) {
    any = true;
    const acc = p.access ? `<span class="vla-acc">${esc(p.access)}</span> ` : '';
    const accessors = (p.accessors && p.accessors.length) ? ` <span class="vla-accessors">{ ${esc(p.accessors.join('; '))}; }</span>` : '';
    row(ul, `${tag('prop', 'prop')} ${acc}<span class="vla-type">${esc(p.type)}</span> <span class="vla-name">${esc(p.name)}</span>${accessors}`, 'vla-member');
  }
  for (const f of t.fields) {
    any = true;
    const acc = f.access ? `<span class="vla-acc">${esc(f.access)}</span> ` : '';
    row(ul, `${tag('field', 'field')} ${acc}<span class="vla-type">${esc(f.type)}</span> <span class="vla-name">${esc(f.name)}</span>`, 'vla-member');
  }
  for (const s of t.signals) { any = true; row(ul, methodHtml(s, 'signal'), 'vla-member'); }
  for (const m of t.methods) { any = true; row(ul, methodHtml(m, m.isConstructor ? 'ctor' : 'method'), 'vla-member'); }
  for (const em of t.enumMembers) { any = true; row(ul, `${tag('field', 'value')} <span class="vla-name">${esc(em)}</span>`, 'vla-member'); }
  if (!any) { const li = document.createElement('li'); li.className = 'vla-member'; li.textContent = '(no members)'; ul.appendChild(li); }
}

export function render(intake) {
  const text = (intake && intake.text) || '';
  const { usings, namespaces, types, functions } = analyzeVala(text);
  if (!types.length && !functions.length && !usings.length) return null;

  const methodCount = types.reduce((n, t) => n + t.methods.length, 0) + functions.length;
  const propCount = types.reduce((n, t) => n + t.properties.length, 0);
  const signalCount = types.reduce((n, t) => n + t.signals.length, 0);

  const host = document.createElement('div');
  host.className = 'vla-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'vla-title';
  title.innerHTML = `<span class="vla-badge">Vala</span>${namespaces.length ? esc(namespaces[0]) : 'Source File'}`;
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'vla-sub';
  sub.textContent = [
    types.length && `${types.length} type${types.length !== 1 ? 's' : ''}`,
    methodCount && `${methodCount} method${methodCount !== 1 ? 's' : ''}`,
    propCount && `${propCount} propert${propCount !== 1 ? 'ies' : 'y'}`,
    usings.length && `${usings.length} using`,
  ].filter(Boolean).join(' · ') || 'Vala source';
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'vla-cards';
  for (const { value, label } of [
    { value: types.length, label: 'Types' },
    { value: methodCount, label: 'Methods' },
    { value: propCount, label: 'Properties' },
    { value: signalCount, label: 'Signals' },
    { value: usings.length, label: 'Usings' },
  ]) {
    const card = document.createElement('div');
    card.className = 'vla-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  for (const t of types) renderType(host, t);

  if (functions.length) {
    const ul = makeList(makeSection(host, `Namespace Functions (${functions.length})`));
    for (const f of functions) row(ul, methodHtml(f, 'method'));
  }
  if (usings.length) {
    const ul = makeList(makeSection(host, `Using Directives (${usings.length})`));
    for (const u of usings) row(ul, `${tag('using', 'using')} <span class="vla-name">${esc(u)}</span>`);
  }

  return { parentNode: host };
}
