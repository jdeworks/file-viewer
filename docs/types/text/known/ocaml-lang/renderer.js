const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ocaml-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.ocaml-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e07c16;color:#fff;vertical-align:middle;margin-right:8px;}
.ocaml-iface-badge{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#fff3e0;color:#e07c16;border:1px solid #e07c16;vertical-align:middle;margin-left:6px;}
.ocaml-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ocaml-mod{font-family:ui-monospace,monospace;font-size:13px;color:#e07c16;font-weight:700;}
.ocaml-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ocaml-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.ocaml-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.ocaml-card strong{display:block;font-size:1.2rem;font-weight:700;}
.ocaml-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.ocaml-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.ocaml-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.ocaml-list{margin:0;padding:0;list-style:none;}
.ocaml-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.ocaml-list li:last-child{border-bottom:none;}
.ocaml-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;flex-shrink:0;}
.ocaml-tag-open{background:#dcfce7;color:#166534;}
.ocaml-tag-incl{background:#cffafe;color:#0e7490;}
.ocaml-tag-mod{background:#ede9fe;color:#7c3aed;}
.ocaml-tag-sig{background:#f3e8ff;color:#9333ea;}
.ocaml-tag-variant{background:#fef9c3;color:#854d0e;}
.ocaml-tag-record{background:#fee2e2;color:#b91c1c;}
.ocaml-tag-alias{background:#e0f2fe;color:#0369a1;}
.ocaml-tag-fn{background:#dbeafe;color:#1d4ed8;}
.ocaml-tag-rec{background:#fce7f3;color:#be185d;}
.ocaml-tag-val{background:#dcfce7;color:#15803d;}
.ocaml-tag-exc{background:#ffe4e6;color:#9f1239;}
.ocaml-tag-ext{background:#e5e7eb;color:#374151;}
.ocaml-name{font-weight:600;}
.ocaml-type{color:#0e7490;}
.ocaml-ret{color:#1d4ed8;}
.ocaml-ctor{color:#854d0e;font-weight:600;}
.ocaml-of{color:#6e7781;}
`;

// Strip OCaml (* ... *) comments (nested), copying string literals verbatim so a "(*" inside a
// string is not treated as a comment. Pure helper for the parser.
function stripComments(src) {
  let out = '', i = 0, depth = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (depth === 0 && c === '"') {
      out += '"'; i++;
      while (i < n) {
        if (src[i] === '\\') { out += src[i] + (src[i + 1] || ''); i += 2; continue; }
        if (src[i] === '"') { out += '"'; i++; break; }
        out += src[i]; i++;
      }
      continue;
    }
    if (c === '(' && d === '*') { depth++; i += 2; continue; }
    if (depth > 0 && c === '*' && d === ')') { depth--; i += 2; continue; }
    if (depth > 0) { i++; continue; }
    out += c; i++;
  }
  return out;
}

// Split into top-level declarations. A new declaration begins on a line that starts (column 0, no
// leading whitespace) with a structure keyword; indented lines (bodies, struct members) attach to
// the current declaration. `and` continues the previous let/type group.
const STARTER = /^(let|type|val|module|open|include|exception|external|class|and)\b/;
function declarations(src) {
  const out = [];
  let cur = null;
  for (const line of src.split(/\r?\n/)) {
    if (STARTER.test(line)) { if (cur != null) out.push(cur); cur = line; }
    else if (cur != null) cur += '\n' + line;
  }
  if (cur != null) out.push(cur);
  return out.map((d) => d.replace(/[ \t]+/g, ' ').replace(/\n+/g, '\n').trim()).filter(Boolean);
}

// First `=` at bracket depth 0 that is the binding `=` (not part of <=, >=, :=, ==, <>).
function bindingEq(s) {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (c === '=' && depth === 0) {
      if ('<>:!='.includes(s[i - 1])) continue;
      if (s[i + 1] === '=') continue;
      return i;
    }
  }
  return -1;
}

// First `:` at bracket depth 0 (not :: or :=) — used to peel a `: rettype` annotation.
function depthZeroColon(s) {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (c === ':' && depth === 0) {
      if (s[i - 1] === ':' || s[i + 1] === ':' || s[i + 1] === '=') continue;
      return i;
    }
  }
  return -1;
}

// Parse a function parameter list: a sequence of `(name : type)` groups and/or bare identifiers
// (labels ~x / ?x are unwrapped to the name).
function parseParams(rest) {
  const params = [];
  let i = 0;
  while (i < rest.length) {
    if (/\s/.test(rest[i])) { i++; continue; }
    if (rest[i] === '(') {
      let depth = 0, j = i;
      for (; j < rest.length; j++) { if (rest[j] === '(') depth++; else if (rest[j] === ')') { depth--; if (depth === 0) { j++; break; } } }
      const inner = rest.slice(i + 1, j - 1).trim();
      const ci = inner.indexOf(':');
      if (ci >= 0) params.push({ name: inner.slice(0, ci).trim(), type: inner.slice(ci + 1).trim() });
      else if (inner) params.push({ name: inner, type: null });
      i = j;
    } else {
      let j = i;
      while (j < rest.length && !/\s/.test(rest[j]) && rest[j] !== '(') j++;
      params.push({ name: rest.slice(i, j).replace(/^[~?]/, ''), type: null });
      i = j;
    }
  }
  return params;
}

function buildSignature(name, params, returns) {
  const ps = params.map((p) => (p.type ? `(${p.name} : ${p.type})` : p.name)).join(' ');
  return `${name}${ps ? ' ' + ps : ''}${returns ? ' : ' + returns : ''}`;
}

// `let [rec] name params [: ret] = ...` → structured function (null for entry points / patterns).
function parseLet(decl) {
  let s = decl.replace(/^(let|and)\b/, '').trim();
  let isRec = false;
  if (/^rec\b/.test(s)) { isRec = true; s = s.replace(/^rec\b/, '').trim(); }
  const eq = bindingEq(s);
  let head = (eq >= 0 ? s.slice(0, eq) : s).trim();
  const nm = head.match(/^([A-Za-z_][\w']*)/);
  if (!nm) return null;
  const name = nm[1];
  let rest = head.slice(name.length).trim();
  let returns = null;
  const ci = depthZeroColon(rest);
  if (ci >= 0) { returns = rest.slice(ci + 1).trim() || null; rest = rest.slice(0, ci).trim(); }
  const params = parseParams(rest);
  return { name, params, returns, rec: isRec, signature: buildSignature(name, params, returns) };
}

function parseRecordFields(body) {
  const m = body.match(/\{([\s\S]*)\}/);
  if (!m) return [];
  return m[1].split(';').map((f) => f.trim()).filter(Boolean).map((f) => {
    const mm = f.match(/^(mutable\s+)?([\w']+)\s*:\s*([\s\S]+)$/);
    return mm ? { name: mm[2], type: mm[3].replace(/\s+/g, ' ').trim(), mutable: !!mm[1] } : { name: f, type: null, mutable: false };
  });
}

function parseConstructors(body) {
  return body.split('|').map((s) => s.trim()).filter(Boolean).map((c) => {
    const mm = c.match(/^([A-Z][\w']*)(?:\s+of\s+([\s\S]+))?$/);
    return mm ? { name: mm[1], of: mm[2] ? mm[2].replace(/\s+/g, ' ').trim() : null } : null;
  }).filter(Boolean);
}

// `type [params] name = <body>` and continuation `and ...` — classify as variant / record / alias.
function parseType(decl, into) {
  const t = decl.trim();
  const m = t.match(/^(?:type|and)\s+([\s\S]*?)=([\s\S]*)$/);
  if (!m) {
    const am = t.match(/^(?:type|and)\s+(?:\([^)]*\)\s*|(?:'[\w']+\s+)*)?([a-z_][\w']*)/);
    if (am) into.aliases.push({ name: am[1] });
    return;
  }
  const lhs = m[1].trim(), body = m[2].trim();
  const nm = lhs.match(/([a-z_][\w']*)\s*$/);
  const name = nm ? nm[1] : lhs;
  if (/^\{/.test(body) || (/\{[\s\S]*\}/.test(body) && !body.includes('|'))) {
    into.records.push({ name, fields: parseRecordFields(body) });
  } else if (/\|/.test(body) || /^[A-Z]/.test(body)) {
    const cons = parseConstructors(body);
    if (cons.length) into.variants.push({ name, constructors: cons });
    else into.aliases.push({ name });
  } else {
    into.aliases.push({ name });
  }
}

// Parse OCaml source into structured facts. Exported, pure (no DOM) for unit testing.
export function analyzeOCaml(text) {
  const src = stripComments(String(text || ''));
  const opens = [], includes = [], functions = [], values = [];
  const variants = [], records = [], aliases = [], modules = [], moduleTypes = [];
  const exceptions = [], externals = [];
  let hasEntryPoint = false, lastKind = null;
  const typeBucket = { variants, records, aliases };

  for (const decl of declarations(src)) {
    let m;
    if ((m = decl.match(/^open\s+([A-Z][\w.]*)/))) { if (!opens.includes(m[1])) opens.push(m[1]); lastKind = null; continue; }
    if ((m = decl.match(/^include\s+([A-Z][\w.]*)/))) { if (!includes.includes(m[1])) includes.push(m[1]); lastKind = null; continue; }
    if ((m = decl.match(/^exception\s+([A-Z][\w']*)(?:\s+of\s+([\s\S]+))?/))) {
      exceptions.push({ name: m[1], of: m[2] ? m[2].replace(/\s+/g, ' ').trim() : null }); lastKind = null; continue;
    }
    if ((m = decl.match(/^external\s+([\w']+)\s*:\s*([\s\S]+?)=\s*"/))) {
      externals.push({ name: m[1], type: m[2].replace(/\s+/g, ' ').trim() }); lastKind = null; continue;
    }
    if ((m = decl.match(/^val\s+([\w']+)\s*:\s*([\s\S]+)/))) {
      values.push({ name: m[1], type: m[2].replace(/\s+/g, ' ').trim() }); lastKind = 'val'; continue;
    }
    if (/^module\s+type\b/.test(decl)) {
      const mm = decl.match(/^module\s+type\s+([A-Z][\w']*)/);
      if (mm) moduleTypes.push(mm[1]); lastKind = null; continue;
    }
    if (/^module\b/.test(decl)) {
      const mm = decl.match(/^module\s+([A-Z][\w']*)/);
      if (mm) {
        let kind = 'module';
        if (/\bstruct\b/.test(decl)) kind = 'struct';
        else if (/\bfunctor\b/.test(decl) || /=\s*[A-Z][\w.]*\s*\(/.test(decl)) kind = 'functor';
        else if (/\bsig\b/.test(decl)) kind = 'sig';
        modules.push({ name: mm[1], kind });
      }
      lastKind = null; continue;
    }
    if (/^type\b/.test(decl)) { parseType(decl, typeBucket); lastKind = 'type'; continue; }
    if (/^let\b/.test(decl)) {
      const fn = parseLet(decl);
      if (fn) functions.push(fn); else if (/^let\s*\(\s*\)\s*=/.test(decl)) hasEntryPoint = true;
      lastKind = 'let'; continue;
    }
    if (/^and\b/.test(decl)) {
      if (lastKind === 'type') parseType(decl, typeBucket);
      else if (lastKind === 'let') { const fn = parseLet(decl); if (fn) functions.push(fn); }
      continue;
    }
  }

  const moduleName = modules.length ? modules[0].name : null;
  return { moduleName, opens, includes, functions, values, variants, records, aliases, modules, moduleTypes, exceptions, externals, hasEntryPoint };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'ocaml-section';
  const hd = document.createElement('div');
  hd.className = 'ocaml-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'ocaml-list'; sec.appendChild(ul); return ul; }
function tag(cls, t) { return `<span class="ocaml-tag ${cls}">${esc(t)}</span>`; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
function paramsHtml(params) {
  if (!params.length) return '';
  return ' ' + params.map((p) => (p.type
    ? `(<span class="ocaml-name">${esc(p.name)}</span> : <span class="ocaml-type">${esc(p.type)}</span>)`
    : `<span class="ocaml-name">${esc(p.name)}</span>`)).join(' ');
}

export async function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').toLowerCase();
  const isInterface = name.endsWith('.mli');
  const info = analyzeOCaml(text);

  let displayModule = info.moduleName;
  if (!displayModule) {
    const base = name.split('/').pop().replace(/\.(ml|mli)$/, '');
    if (base) displayModule = base.charAt(0).toUpperCase() + base.slice(1);
  }

  const host = document.createElement('div');
  host.className = 'ocaml-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'ocaml-title';
  let titleHtml = '<span class="ocaml-badge">OCaml</span>';
  titleHtml += `<span class="ocaml-iface-badge">${isInterface ? 'Interface (.mli)' : 'Implementation (.ml)'}</span>`;
  if (displayModule) titleHtml += ` <span class="ocaml-mod">${esc(displayModule)}</span>`;
  title.innerHTML = titleHtml;
  host.appendChild(title);

  const types = info.variants.length + info.records.length + info.aliases.length;
  const sub = document.createElement('div');
  sub.className = 'ocaml-sub';
  sub.textContent = [
    info.opens.length && `${info.opens.length} open${info.opens.length !== 1 ? 's' : ''}`,
    info.modules.length && `${info.modules.length} module${info.modules.length !== 1 ? 's' : ''}`,
    types && `${types} type${types !== 1 ? 's' : ''}`,
    info.functions.length && `${info.functions.length} function${info.functions.length !== 1 ? 's' : ''}`,
    info.values.length && `${info.values.length} val${info.values.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ') || 'No declarations found';
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'ocaml-cards';
  for (const { value, label } of [
    { value: info.opens.length, label: 'Opens' },
    { value: info.modules.length + info.moduleTypes.length, label: 'Modules' },
    { value: types, label: 'Types' },
    { value: info.functions.length, label: 'Functions' },
    { value: info.values.length, label: isInterface ? 'Val decls' : 'Vals' },
    { value: info.exceptions.length, label: 'Exceptions' },
  ]) {
    const card = document.createElement('div');
    card.className = 'ocaml-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (info.opens.length) {
    const ul = makeList(makeSection(host, `Opens (${info.opens.length})`));
    for (const o of info.opens) row(ul, `${tag('ocaml-tag-open', 'open')} <span class="ocaml-name">${esc(o)}</span>`);
  }
  if (info.includes.length) {
    const ul = makeList(makeSection(host, `Includes (${info.includes.length})`));
    for (const inc of info.includes) row(ul, `${tag('ocaml-tag-incl', 'include')} <span class="ocaml-name">${esc(inc)}</span>`);
  }
  if (info.modules.length || info.moduleTypes.length) {
    const ul = makeList(makeSection(host, `Modules (${info.modules.length + info.moduleTypes.length})`));
    for (const md of info.modules) row(ul, `${tag('ocaml-tag-mod', md.kind)} <span class="ocaml-name">${esc(md.name)}</span>`);
    for (const mt of info.moduleTypes) row(ul, `${tag('ocaml-tag-sig', 'module type')} <span class="ocaml-name">${esc(mt)}</span>`);
  }
  if (info.variants.length) {
    const ul = makeList(makeSection(host, `Variant Types (${info.variants.length})`));
    for (const v of info.variants) {
      const ctors = v.constructors.map((c) => `<span class="ocaml-ctor">${esc(c.name)}</span>${c.of ? ` <span class="ocaml-of">of ${esc(c.of)}</span>` : ''}`).join(' | ');
      row(ul, `${tag('ocaml-tag-variant', 'variant')} <span class="ocaml-name">${esc(v.name)}</span> = ${ctors}`);
    }
  }
  if (info.records.length) {
    const ul = makeList(makeSection(host, `Record Types (${info.records.length})`));
    for (const r of info.records) {
      const fields = r.fields.map((f) => `${f.mutable ? '<span class="ocaml-of">mutable </span>' : ''}<span class="ocaml-name">${esc(f.name)}</span> : <span class="ocaml-type">${esc(f.type)}</span>`).join('; ');
      row(ul, `${tag('ocaml-tag-record', 'record')} <span class="ocaml-name">${esc(r.name)}</span> = { ${fields} }`);
    }
  }
  if (info.aliases.length) {
    const ul = makeList(makeSection(host, `Type Aliases (${info.aliases.length})`));
    for (const a of info.aliases) row(ul, `${tag('ocaml-tag-alias', 'type')} <span class="ocaml-name">${esc(a.name)}</span>`);
  }
  if (info.functions.length) {
    const ul = makeList(makeSection(host, `Functions (${info.functions.length})`));
    for (const f of info.functions) {
      const ret = f.returns ? ` : <span class="ocaml-ret">${esc(f.returns)}</span>` : '';
      row(ul, (f.rec ? tag('ocaml-tag-rec', 'rec') + ' ' : '') + tag('ocaml-tag-fn', 'let')
        + ` <span class="ocaml-name">${esc(f.name)}</span>${paramsHtml(f.params)}${ret}`);
    }
  }
  if (info.values.length) {
    const ul = makeList(makeSection(host, `Val Signatures (${info.values.length})`));
    for (const v of info.values) row(ul, `${tag('ocaml-tag-val', 'val')} <span class="ocaml-name">${esc(v.name)}</span> : <span class="ocaml-type">${esc(v.type)}</span>`);
  }
  if (info.exceptions.length) {
    const ul = makeList(makeSection(host, `Exceptions (${info.exceptions.length})`));
    for (const e of info.exceptions) row(ul, `${tag('ocaml-tag-exc', 'exception')} <span class="ocaml-name">${esc(e.name)}</span>${e.of ? ` <span class="ocaml-of">of ${esc(e.of)}</span>` : ''}`);
  }
  if (info.externals.length) {
    const ul = makeList(makeSection(host, `External Bindings (${info.externals.length})`));
    for (const ext of info.externals) row(ul, `${tag('ocaml-tag-ext', 'external')} <span class="ocaml-name">${esc(ext.name)}</span> : <span class="ocaml-type">${esc(ext.type)}</span>`);
  }

  return { parentNode: host };
}
