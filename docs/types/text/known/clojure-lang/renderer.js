const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.clj-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.clj-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#5881d8;color:#fff;vertical-align:middle;margin-right:8px;}
.clj-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.clj-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.clj-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.clj-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:90px;}
.clj-card strong{display:block;font-size:1.2rem;font-weight:700;}
.clj-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.clj-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.clj-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.clj-list{margin:0;padding:0;list-style:none;}
.clj-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.clj-list li:last-child{border-bottom:none;}
.clj-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;}
.clj-tag-req{background:#e0f2fe;color:#0369a1;}
.clj-tag-imp{background:#dcfce7;color:#166534;}
.clj-tag-fn{background:#dbeafe;color:#1d4ed8;}
.clj-tag-priv{background:#fee2e2;color:#b91c1c;}
.clj-tag-def{background:#fef9c3;color:#854d0e;}
.clj-tag-macro{background:#ede9fe;color:#7c3aed;}
.clj-tag-proto{background:#ffe4e6;color:#9f1239;}
.clj-tag-rec{background:#fce7f3;color:#a21caf;}
.clj-tag-multi{background:#cffafe;color:#0e7490;}
.clj-name{font-weight:600;}
.clj-params{color:#0e7490;}
.clj-alias{color:#7c3aed;font-weight:600;}
.clj-meta{color:var(--fg-2,#888);font-style:italic;}
.clj-ns{font-family:ui-monospace,monospace;font-size:13px;color:#5881d8;font-weight:700;}
.clj-method{color:var(--fg-2,#666);padding-left:10px;}
`;

// ---------------------------------------------------------------------------
// A minimal, forgiving Clojure reader. Produces nested nodes:
//   { t:'(' | '[' | '{' | '#{', c:[...] }  collection
//   { t:'a', v:'symbol-or-literal' }        atom (symbol/number/keyword/char)
//   { t:'s', v:'string-contents' }          string / regex
// Handles ; comments, "strings", \char literals and the common reader macros
// ('  `  ~  ~@  @  ^meta  #_  #{  #(  #"  #'  #tag) without choking on nesting.
function readAll(text) {
  const src = String(text || '');
  const n = src.length;
  let i = 0;
  const isWs = (c) => c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === ',' || c === '\f';
  const isEnd = (c) => c === undefined || isWs(c) || c === '(' || c === ')' || c === '[' || c === ']'
    || c === '{' || c === '}' || c === '"' || c === ';';

  function skipWs() {
    while (i < n) {
      const c = src[i];
      if (isWs(c)) { i++; continue; }
      if (c === ';') { while (i < n && src[i] !== '\n') i++; continue; }
      break;
    }
  }

  function readString() { // src[i] === '"'
    i++;
    let v = '';
    while (i < n) {
      const c = src[i++];
      if (c === '\\') { v += c + (src[i] !== undefined ? src[i] : ''); i++; continue; }
      if (c === '"') break;
      v += c;
    }
    return { t: 's', v };
  }

  function readColl(close, t) {
    const c = [];
    while (i < n) {
      skipWs();
      if (i >= n) break;
      const ch = src[i];
      if (ch === close) { i++; break; }
      if (ch === ')' || ch === ']' || ch === '}') { i++; continue; } // mismatched close: skip
      const f = readForm();
      if (f) c.push(f); else break;
    }
    return { t, c };
  }

  function readForm() {
    skipWs();
    if (i >= n) return null;
    const c = src[i];
    if (c === "'" || c === '`' || c === '@') { i++; return readForm(); }
    if (c === '~') { i++; if (src[i] === '@') i++; return readForm(); }
    if (c === '^') { i++; readForm(); return readForm(); } // metadata: drop meta, read target
    if (c === '#') {
      const d = src[i + 1];
      if (d === '_') { i += 2; readForm(); return readForm(); } // #_ discard
      if (d === '{') { i += 2; return readColl('}', '#{'); }
      if (d === '(') { i += 2; return readColl(')', '('); } // #() anon fn -> list
      if (d === '"') { i += 1; return readString(); }        // regex literal
      if (d === "'") { i += 2; return readForm(); }          // #' var quote
      i++; readForm(); return readForm();                    // #tag value -> read tag then value
    }
    if (c === '(') { i++; return readColl(')', '('); }
    if (c === '[') { i++; return readColl(']', '['); }
    if (c === '{') { i++; return readColl('}', '{'); }
    if (c === '"') return readString();
    if (c === '\\') { // char literal: \a \space \newline \(  ...
      i++;
      let v = '\\';
      if (i < n) v += src[i++];
      while (i < n && !isEnd(src[i])) v += src[i++];
      return { t: 'a', v };
    }
    let v = '';
    while (i < n && !isEnd(src[i])) v += src[i++];
    if (v === '') { i++; return readForm(); } // stray char
    return { t: 'a', v };
  }

  const forms = [];
  while (true) {
    skipWs();
    if (i >= n) break;
    const f = readForm();
    if (!f) break;
    forms.push(f);
  }
  return forms;
}

const aval = (node) => (node && node.t === 'a' ? node.v : null);

// "[a b & more]" -> { names:[...], tokens:[...], arity, variadic }
function parseParams(vec) {
  const tokens = [], names = [];
  let variadic = false, fixed = 0;
  for (const child of (vec && vec.c) || []) {
    if (child.t === 'a' && child.v === '&') { variadic = true; tokens.push('&'); continue; }
    let nm;
    if (child.t === 'a') nm = child.v;
    else if (child.t === '[') nm = '[…]';
    else if (child.t === '{') nm = '{…}';
    else nm = '?';
    tokens.push(nm);
    names.push(nm);
    if (!variadic) fixed++;
  }
  return { names, tokens, arity: fixed, variadic };
}

// defn / defn- / defmacro: name + one-or-many arities (param vectors).
function parseDefn(rest) {
  const name = aval(rest[0]);
  let idx = 1;
  let doc = null;
  if (rest[idx] && rest[idx].t === 's') { doc = rest[idx].v; idx++; }
  if (rest[idx] && rest[idx].t === '{') idx++; // attr-map
  const arities = [];
  if (rest[idx] && rest[idx].t === '[') {
    arities.push(parseParams(rest[idx]));
  } else {
    for (let k = idx; k < rest.length; k++) {
      const node = rest[k];
      if (node && node.t === '(' && node.c[0] && node.c[0].t === '[') arities.push(parseParams(node.c[0]));
    }
  }
  const first = arities[0] || { names: [], tokens: [], arity: 0, variadic: false };
  return {
    name, doc, arities,
    multiArity: arities.length > 1,
    params: first.names,
    tokens: first.tokens,
    arity: first.arity,
    variadic: first.variadic || arities.some((a) => a.variadic),
  };
}

// (method-name [args]) inside defprotocol / defrecord / deftype bodies.
function parseMethods(rest, startIdx) {
  const methods = [];
  for (let k = startIdx; k < rest.length; k++) {
    const node = rest[k];
    if (node && node.t === '(' && node.c[0] && node.c[0].t === 'a') {
      const vec = node.c.find((x) => x.t === '[');
      if (vec) methods.push({ name: node.c[0].v, params: parseParams(vec) });
    }
  }
  return methods;
}

function nodeStr(node) {
  if (!node) return '';
  if (node.t === 's') return '"' + node.v + '"';
  if (node.t === 'a') return node.v;
  if (node.t === '[') return '[' + node.c.map(nodeStr).join(' ') + ']';
  if (node.t === '#{') return '#{' + node.c.map(nodeStr).join(' ') + '}';
  if (node.t === '{') return '{' + node.c.map(nodeStr).join(' ') + '}';
  return '(' + node.c.map(nodeStr).join(' ') + ')';
}

function parseNs(rest) {
  const name = aval(rest[0]);
  const requires = [], imports = [];
  for (let k = 1; k < rest.length; k++) {
    const clause = rest[k];
    if (!clause || clause.t !== '(' || !clause.c.length) continue;
    const kw = aval(clause.c[0]);
    const specs = clause.c.slice(1);
    if (kw === ':require' || kw === ':use') {
      for (const spec of specs) {
        if (spec.t === '[') {
          const ns = aval(spec.c[0]);
          let alias = null;
          const ai = spec.c.findIndex((x) => x.t === 'a' && x.v === ':as');
          if (ai >= 0 && spec.c[ai + 1]) alias = aval(spec.c[ai + 1]);
          if (ns) requires.push({ ns, alias });
        } else if (spec.t === 'a' && spec.v) {
          requires.push({ ns: spec.v, alias: null });
        }
      }
    } else if (kw === ':import') {
      for (const spec of specs) {
        if (spec.t === '(' || spec.t === '[') {
          const pkg = aval(spec.c[0]);
          for (let j = 1; j < spec.c.length; j++) {
            const cls = aval(spec.c[j]);
            if (cls) imports.push(pkg ? pkg + '.' + cls : cls);
          }
        } else if (spec.t === 'a' && spec.v) {
          imports.push(spec.v);
        }
      }
    }
  }
  return { name, requires, imports };
}

// Parse Clojure source into structured facts. Pure (no DOM) so it is unit-testable.
export function analyzeClojure(text) {
  const forms = readAll(text);
  let namespace = null;
  let requires = [], imports = [];
  const functions = [], defs = [], macros = [], protocols = [], records = [],
    multimethods = [], methods = [];

  for (const form of forms) {
    if (!form || form.t !== '(' || !form.c.length) continue;
    const head = aval(form.c[0]);
    if (!head) continue;
    const rest = form.c.slice(1);
    switch (head) {
      case 'ns': {
        const ns = parseNs(rest);
        if (!namespace) namespace = ns.name;
        requires = requires.concat(ns.requires);
        imports = imports.concat(ns.imports);
        break;
      }
      case 'defn':
      case 'defn-':
        functions.push({ ...parseDefn(rest), private: head === 'defn-' });
        break;
      case 'defmacro':
        macros.push(parseDefn(rest));
        break;
      case 'def':
      case 'defonce':
      case 'def-': {
        const name = aval(rest[0]);
        if (name) defs.push({ name, kind: head });
        break;
      }
      case 'defprotocol': {
        const name = aval(rest[0]);
        if (name) protocols.push({ name, methods: parseMethods(rest, 1) });
        break;
      }
      case 'defrecord':
      case 'deftype': {
        const name = aval(rest[0]);
        const fieldVec = rest[1] && rest[1].t === '[' ? parseParams(rest[1]) : { names: [] };
        if (name) records.push({ name, kind: head, fields: fieldVec.names, methods: parseMethods(rest, 2) });
        break;
      }
      case 'defmulti': {
        const name = aval(rest[0]);
        if (name) multimethods.push({ name, dispatch: rest[1] ? nodeStr(rest[1]) : '' });
        break;
      }
      case 'defmethod': {
        const name = aval(rest[0]);
        const vec = rest.find((x) => x.t === '[');
        if (name) methods.push({ name, dispatch: rest[1] ? nodeStr(rest[1]) : '', params: vec ? parseParams(vec) : { names: [], tokens: [] } });
        break;
      }
      default:
        break;
    }
  }

  return { namespace, requires, imports, functions, defs, macros, protocols, records, multimethods, methods };
}

// ---------------------------------------------------------------------------
function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'clj-section';
  const hd = document.createElement('div');
  hd.className = 'clj-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'clj-list'; sec.appendChild(ul); return ul; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
function tag(cls, t) { return `<span class="clj-tag ${cls}">${esc(t)}</span>`; }
function sig(tokens) { return `<span class="clj-params">[${esc((tokens || []).join(' '))}]</span>`; }

export async function render(intake) {
  const text = intake.text || '';
  const preview = text.slice(0, 4000);
  if (!/\(\s*(?:ns|defn-?|def|defmacro|defprotocol|defrecord|deftype|defmulti)\b/.test(preview)) return null;

  const facts = analyzeClojure(text);
  const { namespace, requires, imports, functions, defs, macros, protocols, records, multimethods, methods } = facts;

  if (!namespace && !functions.length && !defs.length && !macros.length && !protocols.length && !records.length) return null;

  const host = document.createElement('div');
  host.className = 'clj-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'clj-title';
  const badge = document.createElement('span');
  badge.className = 'clj-badge';
  badge.textContent = 'Clojure';
  title.appendChild(badge);
  if (namespace) { const nsEl = document.createElement('span'); nsEl.className = 'clj-ns'; nsEl.textContent = namespace; title.appendChild(nsEl); }
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'clj-sub';
  sub.textContent = [
    requires.length && `${requires.length} require${requires.length !== 1 ? 's' : ''}`,
    functions.length && `${functions.length} fn${functions.length !== 1 ? 's' : ''}`,
    defs.length && `${defs.length} def${defs.length !== 1 ? 's' : ''}`,
    macros.length && `${macros.length} macro${macros.length !== 1 ? 's' : ''}`,
    (protocols.length + records.length) && `${protocols.length + records.length} type${(protocols.length + records.length) !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ') || 'Clojure source';
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'clj-cards';
  for (const { value, label } of [
    { value: requires.length, label: 'Requires' },
    { value: functions.length, label: 'Functions' },
    { value: defs.length, label: 'Defs' },
    { value: macros.length, label: 'Macros' },
    { value: protocols.length + records.length, label: 'Types' },
    { value: multimethods.length, label: 'Multimethods' },
  ]) {
    const card = document.createElement('div');
    card.className = 'clj-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (requires.length) {
    const ul = makeList(makeSection(host, `Requires (${requires.length})`));
    for (const r of requires) {
      const alias = r.alias ? ` <span class="clj-meta">:as</span> <span class="clj-alias">${esc(r.alias)}</span>` : '';
      row(ul, `${tag('clj-tag-req', 'require')} <span class="clj-name">${esc(r.ns)}</span>${alias}`);
    }
  }
  if (imports.length) {
    const ul = makeList(makeSection(host, `Imports (${imports.length})`));
    for (const im of imports) row(ul, `${tag('clj-tag-imp', 'import')} <span class="clj-name">${esc(im)}</span>`);
  }
  if (functions.length) {
    const ul = makeList(makeSection(host, `Functions (${functions.length})`));
    for (const f of functions) {
      const priv = f.private ? tag('clj-tag-priv', 'private') + ' ' : '';
      const multi = f.multiArity ? ` <span class="clj-meta">multi-arity (${f.arities.map((a) => a.arity + (a.variadic ? '+' : '')).join(', ')})</span>` : '';
      const sigs = f.multiArity ? f.arities.map((a) => sig(a.tokens)).join(' ') : sig(f.tokens);
      row(ul, `${priv}${tag('clj-tag-fn', 'defn')} <span class="clj-name">${esc(f.name)}</span> ${sigs}${multi}`);
    }
  }
  if (macros.length) {
    const ul = makeList(makeSection(host, `Macros (${macros.length})`));
    for (const m of macros) row(ul, `${tag('clj-tag-macro', 'defmacro')} <span class="clj-name">${esc(m.name)}</span> ${sig(m.tokens)}`);
  }
  if (protocols.length) {
    const ul = makeList(makeSection(host, `Protocols (${protocols.length})`));
    for (const p of protocols) {
      row(ul, `${tag('clj-tag-proto', 'defprotocol')} <span class="clj-name">${esc(p.name)}</span>`);
      for (const me of p.methods) row(ul, `<span class="clj-method">${esc(me.name)} ${esc('[' + me.params.tokens.join(' ') + ']')}</span>`);
    }
  }
  if (records.length) {
    const ul = makeList(makeSection(host, `Records & Types (${records.length})`));
    for (const r of records) {
      const fields = r.fields.length ? ` <span class="clj-params">[${esc(r.fields.join(' '))}]</span>` : '';
      row(ul, `${tag('clj-tag-rec', r.kind)} <span class="clj-name">${esc(r.name)}</span>${fields}`);
      for (const me of r.methods) row(ul, `<span class="clj-method">${esc(me.name)} ${esc('[' + me.params.tokens.join(' ') + ']')}</span>`);
    }
  }
  if (defs.length) {
    const ul = makeList(makeSection(host, `Defs & Vars (${defs.length})`));
    for (const d of defs) row(ul, `${tag('clj-tag-def', d.kind)} <span class="clj-name">${esc(d.name)}</span>`);
  }
  if (multimethods.length || methods.length) {
    const ul = makeList(makeSection(host, `Multimethods (${multimethods.length})`));
    for (const mm of multimethods) {
      row(ul, `${tag('clj-tag-multi', 'defmulti')} <span class="clj-name">${esc(mm.name)}</span>`);
      for (const me of methods.filter((x) => x.name === mm.name)) {
        row(ul, `<span class="clj-method">${esc(me.name)} ${esc(me.dispatch)} ${esc('[' + me.params.tokens.join(' ') + ']')}</span>`);
      }
    }
    for (const me of methods.filter((x) => !multimethods.some((mm) => mm.name === x.name))) {
      row(ul, `${tag('clj-tag-multi', 'defmethod')} <span class="clj-name">${esc(me.name)}</span> <span class="clj-meta">${esc(me.dispatch)}</span> ${sig(me.params.tokens)}`);
    }
  }

  return { parentNode: host };
}
