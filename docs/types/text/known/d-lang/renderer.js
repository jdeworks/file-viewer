const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.d-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.d-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#cc241d;color:#fff;vertical-align:middle;margin-right:8px;}
.d-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.d-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.d-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.d-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.d-card strong{display:block;font-size:1.2rem;font-weight:700;}
.d-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.d-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.d-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.d-list{margin:0;padding:0;list-style:none;}
.d-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.d-list li:last-child{border-bottom:none;}
.d-sub-hd{padding:5px 14px;font-size:11px;font-weight:700;color:var(--fg-2,#5a6678);background:var(--bg,#fff);text-transform:uppercase;letter-spacing:.04em;}
.d-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#dbeafe;color:#1e40af;font-weight:700;}
.d-tag-class{background:#ede9fe;color:#7c3aed;}
.d-tag-struct{background:#dcfce7;color:#166534;}
.d-tag-iface{background:#fce7f3;color:#9d174d;}
.d-tag-union{background:#fee2e2;color:#b91c1c;}
.d-tag-enum{background:#fef3c7;color:#92400e;}
.d-tag-tmpl{background:#dbeafe;color:#1e40af;}
.d-tag-fn{background:#dbeafe;color:#1d4ed8;}
.d-tag-field{background:#fef9c3;color:#854d0e;}
.d-tag-attr{background:#dcfce7;color:#166534;}
.d-tag-std{background:#e0f2fe;color:#075985;}
.d-tag-local{background:#fef3c7;color:#92400e;}
.d-name{font-weight:600;}
.d-type{color:#0e7490;}
.d-ret{color:#1d4ed8;}
.d-base{color:#9d174d;font-style:italic;}
.d-pkg{font-family:ui-monospace,monospace;font-size:13px;color:#cc241d;font-weight:700;}
.d-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.d-kw{color:#cc241d;font-weight:600;}
.d-comment{color:#6e7781;font-style:italic;}
.d-str{color:#0a6640;}
.d-num{color:#b45309;}
.d-attr{color:#7c3aed;}
`;

const D_KEYWORDS = new Set([
  'abstract', 'alias', 'align', 'asm', 'assert', 'auto', 'body', 'bool', 'break', 'byte',
  'case', 'cast', 'catch', 'cdouble', 'cent', 'cfloat', 'char', 'class', 'const', 'continue',
  'dchar', 'debug', 'default', 'delegate', 'delete', 'deprecated', 'do', 'double',
  'else', 'enum', 'export', 'extern', 'false', 'final', 'finally', 'float', 'for', 'foreach',
  'foreach_reverse', 'function', 'goto', 'idouble', 'if', 'ifloat', 'immutable', 'import', 'in',
  'inout', 'int', 'interface', 'invariant', 'is', 'lazy', 'long', 'macro', 'mixin', 'module',
  'new', 'nothrow', 'null', 'out', 'override', 'package', 'pragma', 'private', 'protected',
  'public', 'pure', 'real', 'ref', 'return', 'scope', 'shared', 'short', 'static', 'struct',
  'super', 'switch', 'synchronized', 'template', 'this', 'throw', 'true', 'try', 'typeid',
  'typeof', 'ubyte', 'ucent', 'uint', 'ulong', 'union', 'unittest', 'ushort', 'version', 'void',
  'wchar', 'while', 'with', '__gshared', '__traits',
]);

const D_ATTRS = new Set(['@safe', '@trusted', '@system', '@nogc', '@property', '@disable', '@live', 'nothrow', 'pure']);

// Keywords that may begin a "(...)" but are NOT declarations.
const CONTROL = new Set([
  'if', 'for', 'foreach', 'foreach_reverse', 'while', 'switch', 'catch', 'with', 'version',
  'synchronized', 'scope', 'return', 'do', 'else', 'try', 'finally', 'debug', 'assert', 'cast',
  'mixin', 'typeof', 'is', 'new', 'delete', 'throw', 'super', 'unittest', 'static', 'pragma',
  'in', 'out', 'invariant',
]);

// Leading tokens stripped off a function's return part (storage/visibility/attributes), leaving the type.
const RET_MODS = new Set([
  'private', 'public', 'package', 'protected', 'export', 'static', 'final', 'abstract',
  'override', 'deprecated', 'extern', 'nothrow', 'pure', 'synchronized', '__gshared', 'align',
]);
const FIELD_MODS = new Set([
  'private', 'public', 'package', 'protected', 'export', 'static', '__gshared', 'align',
  'deprecated', 'final',
]);

// Remove comments (//, /* */, nested /+ +/) while respecting string/char/backtick literals.
function stripAllComments(text) {
  let out = '', i = 0; const n = text.length;
  while (i < n) {
    const c = text[i], d = text[i + 1];
    if (c === '"' || c === '`' || c === "'") {
      const q = c; out += c; i++;
      while (i < n) {
        const ch = text[i];
        if (ch === '\\' && q !== '`') { out += ch + (text[i + 1] || ''); i += 2; continue; }
        out += ch; i++;
        if (ch === q) break;
      }
      continue;
    }
    if (c === '/' && d === '/') { while (i < n && text[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < n && !(text[i] === '*' && text[i + 1] === '/')) i++; i += 2; continue; }
    if (c === '/' && d === '+') {
      i += 2; let depth = 1;
      while (i < n && depth > 0) {
        if (text[i] === '/' && text[i + 1] === '+') { depth++; i += 2; continue; }
        if (text[i] === '+' && text[i + 1] === '/') { depth--; i += 2; continue; }
        i++;
      }
      continue;
    }
    out += c; i++;
  }
  return out;
}

// Blank string/char literal contents on a line so braces/parens inside them don't break depth tracking.
function blankLiterals(line) {
  let out = '', i = 0;
  while (i < line.length) {
    const c = line[i];
    if (c === '"' || c === "'" || c === '`') {
      const q = c; out += q; i++;
      while (i < line.length && line[i] !== q) { if (line[i] === '\\' && q !== '`') i++; i++; }
      out += q; i++;
      continue;
    }
    out += c; i++;
  }
  return out;
}

function balanced(s, open) {
  if (s[open] !== '(') return null;
  let d = 0;
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (c === '(') d++;
    else if (c === ')') { d--; if (d === 0) return { inner: s.slice(open + 1, i), end: i + 1 }; }
  }
  return null;
}

function splitTop(str) {
  const out = []; let d = 0, buf = '';
  for (const c of str) {
    if (c === '(' || c === '[' || c === '<') d++;
    else if (c === ')' || c === ']' || c === '>') d--;
    if (c === ',' && d === 0) { out.push(buf); buf = ''; } else buf += c;
  }
  if (buf.trim()) out.push(buf);
  return out;
}

function parseParams(str) {
  if (!str.trim()) return [];
  return splitTop(str).map((seg) => {
    const p = seg.trim().replace(/\s*=.*$/, '').trim().replace(/\.\.\.$/, '').trim();
    if (!p) return null;
    const parts = p.split(/\s+/);
    if (parts.length === 1) return { name: '', type: p };
    const name = parts.pop();
    if (!/^[A-Za-z_]\w*$/.test(name)) return { name: '', type: p };
    return { name, type: parts.join(' ') };
  }).filter(Boolean);
}

function stripRetMods(str) {
  const parts = str.split(/\s+/).filter(Boolean);
  while (parts.length && (parts[0].startsWith('@') || RET_MODS.has(parts[0]) ||
    /^(extern|align|pragma)\(/.test(parts[0]))) parts.shift();
  return parts.join(' ');
}

// Parse a single-line function/method signature → {name, returns, params, tparams} or null.
function parseFunctionSig(line) {
  const s = line.trim();
  const p1 = s.indexOf('(');
  if (p1 < 0) return null;
  const before = s.slice(0, p1);
  const nameM = before.match(/([A-Za-z_]\w*)\s*$/);
  if (!nameM) return null;
  const name = nameM[1];
  if (CONTROL.has(name)) return null;
  const retPart = before.slice(0, before.length - nameM[0].length).trim();
  if (/[=;]/.test(retPart)) return null;              // assignment / not a declaration
  const g1 = balanced(s, p1);
  if (!g1) return null;
  let params = g1.inner, tparams = null;
  const rest = s.slice(g1.end);
  const nextParen = rest.search(/\(/);
  if (nextParen >= 0 && rest.slice(0, nextParen).trim() === '') {
    const g2 = balanced(s, g1.end + nextParen);
    if (g2) { tparams = g1.inner; params = g2.inner; }
  }
  const isCtor = name === 'this' || name === '~this';
  return { name, returns: isCtor ? '' : stripRetMods(retPart), params: parseParams(params), tparams };
}

function parseField(line) {
  let s = line.trim().replace(/;.*$/, '').trim();
  if (!s || s.includes('(')) return null;
  s = s.replace(/\s*=.*$/, '').trim();
  const parts = s.split(/\s+/);
  if (parts.length < 2) return null;
  while (parts.length > 2 && FIELD_MODS.has(parts[0])) parts.shift();
  if (parts.length < 2) return null;
  const name = parts.pop();
  const type = parts.join(' ');
  if (!/^[A-Za-z_]\w*$/.test(name) || !type || CONTROL.has(type) || D_KEYWORDS.has(name)) return null;
  return { name, type };
}

// Parse D source into structured facts. Pure (no DOM) — exported for unit testing.
export function analyzeD(text) {
  const code = stripAllComments(text);
  const lines = code.split(/\r?\n/);

  let module = null, unittestCount = 0;
  const imports = { std: [], local: [] };
  const functions = [], aggregates = [], enums = [], aliases = [], constants = [], templates = [], versions = [];
  // aggregates: {kind,name,base,tparams,fields,methods}; enums: {name,members}; constants: {name,type,value}

  let depth = 0;
  const stack = [];          // {type:'agg'|'enum'|'template', ref, declDepth, entered}

  for (const raw of lines) {
    const line = blankLiterals(raw);
    while (stack.length) {
      const t = stack[stack.length - 1];
      if (t.entered && depth <= t.declDepth) stack.pop(); else break;
    }
    const startDepth = depth;
    const top = stack.length ? stack[stack.length - 1] : null;
    const trimmed = line.trim();

    handle: {
      if (!trimmed) break handle;

      const verM = trimmed.match(/^version\s*\(\s*(\w+)\s*\)/);
      if (verM) { if (!versions.includes(verM[1])) versions.push(verM[1]); break handle; }
      if (/^unittest\b/.test(trimmed)) { unittestCount++; break handle; }

      const inAgg = top && top.type === 'agg' && startDepth === top.declDepth + 1;
      const atTop = (!top && startDepth === 0) || (top && top.type === 'template' && startDepth === top.declDepth + 1);

      if (top && top.type === 'enum' && startDepth === top.declDepth + 1) {
        for (const seg of splitTop(trimmed.replace(/[{}]/g, ' '))) {
          const mm = seg.trim().match(/^([A-Za-z_]\w*)/);
          if (mm) top.ref.members.push(mm[1]);
        }
        break handle;
      }

      if (!module && startDepth === 0) {
        const modM = trimmed.match(/^module\s+([\w.]+)\s*;/);
        if (modM) { module = modM[1]; break handle; }
      }
      const impM = trimmed.match(/^(?:public\s+|private\s+|static\s+)?import\s+([\w.]+)/);
      if (impM && startDepth === 0) {
        const m = impM[1];
        (m.startsWith('std.') || m.startsWith('core.') || m.startsWith('etc.') ? imports.std : imports.local).push(m);
        break handle;
      }

      let m;
      if ((m = trimmed.match(/^alias\s+(\w+)\s*=\s*([^;]+);/))) { aliases.push({ name: m[1], type: m[2].trim() }); break handle; }
      if ((m = trimmed.match(/^alias\s+([\w.!()\[\]* ]+?)\s+(\w+)\s*;/))) { aliases.push({ name: m[2], type: m[1].trim() }); break handle; }

      // aggregates: class / struct / interface / union
      const aggM = trimmed.match(/^(?:(?:abstract|final|private|public|package|protected|export|static|shared|extern|deprecated)\s+)*(class|struct|interface|union)\s+(\w+)\s*(\([^)]*\))?\s*(?::\s*([^{]+?))?\s*\{?\s*$/);
      if (aggM) {
        const ref = { kind: aggM[1], name: aggM[2], tparams: (aggM[3] || '').trim(), base: (aggM[4] || '').trim(), fields: [], methods: [] };
        aggregates.push(ref);
        stack.push({ type: 'agg', ref, declDepth: startDepth, entered: false });
        break handle;
      }

      // enum: module-level constant (enum NAME = value) vs type with body
      const enumC = trimmed.match(/^enum\s+(\w+)\s*=\s*([^;]+);/);
      if (enumC && startDepth === 0) { constants.push({ name: enumC[1], type: 'enum', value: enumC[2].trim() }); break handle; }
      const enumM = trimmed.match(/^enum\s+(\w*)\s*(?::\s*\w+)?\s*\{?\s*$/);
      if (enumM) {
        const ref = { name: enumM[1] || '(anonymous)', members: [] };
        enums.push(ref);
        stack.push({ type: 'enum', ref, declDepth: startDepth, entered: false });
        break handle;
      }

      // template wrapper
      const tmplM = trimmed.match(/^(?:(?:private|public|package|protected)\s+)?template\s+(\w+)/);
      if (tmplM) {
        templates.push(tmplM[1]);
        stack.push({ type: 'template', ref: null, declDepth: startDepth, entered: false });
        break handle;
      }

      // module-level constants: immutable/const/shared Type NAME = value
      if (atTop && !top) {
        const constM = trimmed.match(/^(?:static\s+|__gshared\s+)?(?:immutable|const|shared)\b\s+(.+?)\s*=\s*([^;]+);/);
        if (constM) {
          const lhs = constM[1].trim().split(/\s+/);
          const cname = lhs.pop();
          if (/^[A-Za-z_]\w*$/.test(cname)) { constants.push({ name: cname, type: lhs.join(' ') || 'const', value: constM[2].trim() }); break handle; }
        }
      }

      // functions / methods
      if (inAgg || atTop) {
        const fn = parseFunctionSig(trimmed);
        if (fn) {
          const attrs = [];
          for (const a of ['@safe', '@trusted', '@nogc', '@property', '@system']) if (trimmed.includes(a)) attrs.push(a);
          if (/\bnothrow\b/.test(trimmed)) attrs.push('nothrow');
          fn.attrs = attrs;
          if (inAgg) top.ref.methods.push(fn); else functions.push(fn);
          break handle;
        }
      }

      // fields inside aggregates
      if (inAgg) { const f = parseField(trimmed); if (f) top.ref.fields.push(f); }
    }

    for (const ch of line) { if (ch === '{') depth++; else if (ch === '}') depth = Math.max(0, depth - 1); }
    for (const s of stack) if (depth > s.declDepth) s.entered = true;
  }

  return { module, imports, functions, aggregates, enums, aliases, constants, templates, versions, unittestCount };
}

function highlightD(text) {
  const lines = text.split(/\r?\n/);
  const result = [];
  let inBlock = false;
  for (const line of lines) {
    if (inBlock) {
      result.push('<span class="d-comment">' + esc(line) + '</span>');
      if (line.includes('*/')) inBlock = false;
      continue;
    }
    if (line.trim().startsWith('//')) { result.push('<span class="d-comment">' + esc(line) + '</span>'); continue; }
    let out = '', i = 0;
    while (i < line.length) {
      if (line[i] === '/' && line[i + 1] === '*') {
        const end = line.indexOf('*/', i + 2);
        if (end === -1) { out += '<span class="d-comment">' + esc(line.slice(i)) + '</span>'; inBlock = true; break; }
        out += '<span class="d-comment">' + esc(line.slice(i, end + 2)) + '</span>'; i = end + 2; continue;
      }
      if (line[i] === '/' && (line[i + 1] === '/' || line[i + 1] === '+')) { out += '<span class="d-comment">' + esc(line.slice(i)) + '</span>'; break; }
      if (line[i] === '@') {
        let j = i + 1; while (j < line.length && /\w/.test(line[j])) j++;
        const attr = line.slice(i, j);
        out += D_ATTRS.has(attr) ? '<span class="d-attr">' + esc(attr) + '</span>' : esc(attr);
        i = j; continue;
      }
      if (line[i] === '"') {
        let j = i + 1; while (j < line.length && line[j] !== '"') { if (line[j] === '\\') j++; j++; }
        j++; out += '<span class="d-str">' + esc(line.slice(i, j)) + '</span>'; i = j; continue;
      }
      if (/[0-9]/.test(line[i])) {
        let j = i; while (j < line.length && /[0-9a-fA-F._xXbBoOuUlLfF]/.test(line[j])) j++;
        out += '<span class="d-num">' + esc(line.slice(i, j)) + '</span>'; i = j; continue;
      }
      if (/[A-Za-z_]/.test(line[i])) {
        let j = i; while (j < line.length && /\w/.test(line[j])) j++;
        const word = line.slice(i, j);
        out += D_KEYWORDS.has(word) ? '<span class="d-kw">' + esc(word) + '</span>' : esc(word);
        i = j; continue;
      }
      out += esc(line[i]); i++;
    }
    result.push(out);
  }
  return result.join('\n');
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'd-section';
  const hd = document.createElement('div');
  hd.className = 'd-section-hd';
  hd.textContent = title;
  sec.appendChild(hd); host.appendChild(sec); return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'd-list'; sec.appendChild(ul); return ul; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
function tag(cls, t) { return `<span class="d-tag ${cls}">${esc(t)}</span>`; }
function subHd(sec, text) { const d = document.createElement('div'); d.className = 'd-sub-hd'; d.textContent = text; sec.appendChild(d); }
function paramsHtml(params) {
  return params.map((p) => p.type ? `<span class="d-type">${esc(p.type)}</span> ${esc(p.name)}` : esc(p.name)).join(', ');
}
function attrsHtml(attrs) { return (attrs || []).map((a) => tag('d-tag-attr', a)).join(' '); }
function fnHtml(f) {
  const a = f.attrs && f.attrs.length ? attrsHtml(f.attrs) + ' ' : '';
  const t = f.tparams != null ? `(${esc(f.tparams)})` : '';
  const ret = f.returns ? `<span class="d-ret">${esc(f.returns)}</span> ` : '';
  return `${a}${ret}<span class="d-name">${esc(f.name)}</span>${t}(${paramsHtml(f.params)})`;
}

export function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '');
  const facts = analyzeD(text);
  const { module, imports, functions, aggregates, enums, aliases, constants, templates, versions, unittestCount } = facts;
  const allImports = [...imports.std, ...imports.local];

  const host = document.createElement('div');
  host.className = 'd-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'd-title';
  const badge = document.createElement('span');
  badge.className = 'd-badge';
  badge.textContent = 'D Module';
  title.appendChild(badge);
  if (module) { const n = document.createElement('span'); n.className = 'd-pkg'; n.textContent = module; title.appendChild(n); }
  else title.appendChild(document.createTextNode(name));
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'd-sub';
  sub.textContent = [
    allImports.length && `${allImports.length} import${allImports.length !== 1 ? 's' : ''}`,
    aggregates.length && `${aggregates.length} type${aggregates.length !== 1 ? 's' : ''}`,
    functions.length && `${functions.length} function${functions.length !== 1 ? 's' : ''}`,
    enums.length && `${enums.length} enum${enums.length !== 1 ? 's' : ''}`,
    unittestCount && `${unittestCount} unittest${unittestCount !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'd-cards';
  for (const [value, label] of [[allImports.length, 'Imports'], [aggregates.length, 'Types'],
    [functions.length, 'Functions'], [enums.length, 'Enums'], [unittestCount, 'Unittests']]) {
    const card = document.createElement('div');
    card.className = 'd-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (allImports.length) {
    const MAX = 12;
    const ul = makeList(makeSection(host, `Imports (${allImports.length})`));
    let shown = 0;
    for (const imp of imports.std.slice(0, MAX)) { row(ul, `${tag('d-tag-std', 'std')} ${esc(imp)}`); shown++; }
    for (const imp of imports.local.slice(0, Math.max(0, MAX - shown))) { row(ul, `${tag('d-tag-local', 'local')} ${esc(imp)}`); shown++; }
    if (allImports.length > MAX) row(ul, `<span style="color:var(--fg-2,#888)">… and ${allImports.length - MAX} more</span>`);
  }

  if (aggregates.length) {
    const kindTag = { class: 'd-tag-class', struct: 'd-tag-struct', interface: 'd-tag-iface', union: 'd-tag-union' };
    const sec = makeSection(host, `Aggregates (${aggregates.length})`);
    for (const a of aggregates) {
      const head = `${tag(kindTag[a.kind] || 'd-tag', a.kind)} <span class="d-name">${esc(a.name)}</span>`
        + (a.tparams ? `<span class="d-type">(${esc(a.tparams)})</span>` : '')
        + (a.base ? ` <span class="d-base">: ${esc(a.base)}</span>` : '');
      const hd = document.createElement('div'); hd.className = 'd-sub-hd'; hd.style.textTransform = 'none'; hd.style.fontSize = '12px';
      hd.innerHTML = head; sec.appendChild(hd);
      if (a.fields.length || a.methods.length) {
        const ul = makeList(sec);
        for (const f of a.fields) row(ul, `${tag('d-tag-field', 'field')} <span class="d-type">${esc(f.type)}</span> <span class="d-name">${esc(f.name)}</span>`);
        for (const me of a.methods) row(ul, `${tag('d-tag-fn', 'fn')} ${fnHtml(me)}`);
      }
    }
  }

  if (enums.length) {
    const sec = makeSection(host, `Enums (${enums.length})`);
    for (const e of enums) {
      subHd(sec, `${e.name} (${e.members.length})`);
      const ul = makeList(sec);
      for (const mem of e.members) row(ul, `${tag('d-tag-enum', 'enum')} ${esc(mem)}`);
    }
  }

  if (functions.length) {
    const ul = makeList(makeSection(host, `Functions (${functions.length})`));
    for (const f of functions) row(ul, `${tag('d-tag-fn', 'fn')} ${fnHtml(f)}`);
  }

  if (templates.length) {
    const ul = makeList(makeSection(host, `Templates (${templates.length})`));
    for (const t of templates) row(ul, `${tag('d-tag-tmpl', 'template')} ${esc(t)}`);
  }

  if (aliases.length) {
    const ul = makeList(makeSection(host, `Aliases (${aliases.length})`));
    for (const a of aliases) row(ul, `${tag('d-tag', 'alias')} <span class="d-name">${esc(a.name)}</span> = <span class="d-type">${esc(a.type)}</span>`);
  }

  if (constants.length) {
    const ul = makeList(makeSection(host, `Constants (${constants.length})`));
    for (const c of constants) row(ul, `${tag('d-tag-field', c.type)} <span class="d-name">${esc(c.name)}</span> = ${esc(c.value)}`);
  }

  if (versions.length) {
    const ul = makeList(makeSection(host, `Version Conditions (${versions.length})`));
    for (const v of versions) row(ul, `version(${esc(v)})`);
  }

  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'd-pre';
  pre.innerHTML = highlightD(text);
  srcSec.appendChild(pre);

  return { parentNode: host };
}
