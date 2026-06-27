const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.fnl-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.fnl-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2d6a4f;color:#d8f3dc;vertical-align:middle;margin-right:8px;}
.fnl-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.fnl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.fnl-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.fnl-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.fnl-card strong{display:block;font-size:1.2rem;font-weight:700;}
.fnl-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.fnl-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.fnl-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.fnl-list{margin:0;padding:0;list-style:none;}
.fnl-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.fnl-list li:last-child{border-bottom:none;}
.fnl-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#d8f3dc;color:#2d6a4f;font-weight:700;}
.fnl-tag-fn{background:#e0f2fe;color:#0369a1;}
.fnl-tag-lambda{background:#ede9fe;color:#7f52ff;}
.fnl-tag-macro{background:#fef3c7;color:#92400e;}
.fnl-tag-var{background:#fce7f3;color:#9d174d;}
.fnl-tag-global{background:#fee2e2;color:#b91c1c;}
.fnl-tag-req{background:#f0fdf4;color:#15803d;}
.fnl-name{font-weight:600;}
.fnl-param{color:#0e7490;}
.fnl-rest{color:#9f1239;font-style:italic;}
.fnl-arity{color:#5a6678;}
.fnl-as{color:#15803d;font-weight:600;}
.fnl-doc-str{display:block;color:var(--fg-2,#888);font-style:italic;font-family:system-ui,sans-serif;padding-left:4px;}
`;

// ── Reader (paren/bracket/string/comment-aware) ──────────────────────────────
// Fennel is a Lisp: `;` line comments, "..." strings, ( ) lists, [ ] vectors,
// { } tables. Reader-macro punctuation (` , ' #) is non-delimiting so it sticks
// to atoms — harmless for top-level structure extraction.
function tokenize(src) {
  const toks = [];
  let i = 0; const n = src.length;
  const delim = (c) => c === '(' || c === ')' || c === '[' || c === ']' ||
    c === '{' || c === '}' || c === '"' || c === ';' ||
    c === ' ' || c === '\t' || c === '\r' || c === '\n';
  while (i < n) {
    const c = src[i];
    if (c === ';') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === ' ' || c === '\t' || c === '\r' || c === '\n') { i++; continue; }
    if (c === '(' || c === '[' || c === '{') { toks.push({ type: 'open', value: c }); i++; continue; }
    if (c === ')' || c === ']' || c === '}') { toks.push({ type: 'close', value: c }); i++; continue; }
    if (c === '"') {
      i++; let s = '';
      while (i < n && src[i] !== '"') {
        if (src[i] === '\\') { s += (src[i + 1] || ''); i += 2; } else { s += src[i]; i++; }
      }
      i++; toks.push({ type: 'str', value: s }); continue;
    }
    let a = '';
    while (i < n && !delim(src[i])) { a += src[i]; i++; }
    toks.push({ type: 'atom', value: a });
  }
  return toks;
}

// Build nested nodes. Leaf = {type:'atom'|'str', value}; branch = {t:'list'|'vec'|'map', c:[…]}.
function readForms(text) {
  const toks = tokenize(text);
  let pos = 0;
  function seq(top) {
    const items = [];
    while (pos < toks.length) {
      const tk = toks[pos];
      if (tk.type === 'close') { pos++; if (top) continue; return items; }
      if (tk.type === 'open') {
        pos++;
        const t = tk.value === '(' ? 'list' : tk.value === '[' ? 'vec' : 'map';
        items.push({ t, c: seq(false) });
      } else { pos++; items.push(tk); }
    }
    return items;
  }
  return seq(true);
}

const isList = (x) => x && x.t === 'list';
const isVec = (x) => x && x.t === 'vec';
const isLeaf = (x) => x && (x.type === 'atom' || x.type === 'str');
const head = (node) => (isList(node) && isLeaf(node.c[0]) && node.c[0].type === 'atom' ? node.c[0].value : null);

// Normalize a module reference: "lume" / :lume / lume → "lume".
function moduleName(node) {
  if (!isLeaf(node)) return null;
  if (node.type === 'str') return node.value;
  return node.value.replace(/^:/, '');
}

// Extract param names + arity from a [ … ] binding vector. `&` marks a rest arg;
// destructuring [..]/{..} positions collapse to a placeholder but still count.
function paramsOf(vec) {
  const params = []; let variadic = false;
  for (const it of vec.c) {
    if (isLeaf(it) && it.type === 'atom' && it.value === '&') { variadic = true; continue; }
    if (isLeaf(it)) params.push(it.value);
    else if (isVec(it)) params.push('[…]');
    else if (it.t === 'map') params.push('{…}');
  }
  return { params, arity: params.length, variadic };
}

// Count nested loop forms (recursively, since they nest inside fns).
function countLoops(nodes, acc) {
  for (const nd of nodes) {
    if (isList(nd)) {
      const h = head(nd);
      if (h === 'each') acc.each++;
      else if (h === 'for') acc.for++;
      else if (h === 'while') acc.while++;
    }
    if (nd && nd.c) countLoops(nd.c, acc);
  }
  return acc;
}

// Parse Fennel source into structured facts. Exported (pure, no DOM) for unit testing.
export function analyzeFennel(text) {
  const forms = readForms(text || '');
  const requires = [];     // { module, as }
  const functions = [];    // { name, params, arity, variadic, kind, doc }
  const locals = [];       // names (non-require local bindings)
  const vars = [];         // names
  const globals = [];      // names
  const macros = [];       // { name, params, arity, variadic } | { name, kind:'macros' }
  const macroImports = []; // module names

  for (const form of forms) {
    if (!isList(form)) continue;
    const h = head(form);
    const c = form.c;

    if (h === 'require') { requires.push({ module: moduleName(c[1]), as: null }); continue; }

    if (h === 'local' || h === 'var' || h === 'global') {
      const target = c[1];
      const val = c[2];
      // require binding: (local m (require :mod)) / (global g (require ...))
      if (isList(val) && head(val) === 'require') {
        requires.push({ module: moduleName(val.c[1]), as: isLeaf(target) ? target.value : null });
        continue;
      }
      const name = isLeaf(target) ? target.value : (isVec(target) ? '[…]' : '{…}');
      if (h === 'local') locals.push(name);
      else if (h === 'var') vars.push(name);
      else globals.push(name);
      continue;
    }

    if (h === 'fn' || h === 'lambda' || h === 'λ') {
      const kind = h === 'fn' ? 'fn' : 'lambda';
      let name = null, vecIdx = 1;
      if (isLeaf(c[1])) { name = c[1].value; vecIdx = 2; } // named; else anonymous
      const vec = isVec(c[vecIdx]) ? c[vecIdx] : null;
      const p = vec ? paramsOf(vec) : { params: [], arity: 0, variadic: false };
      const docNode = c[vecIdx + 1];
      const doc = isLeaf(docNode) && docNode.type === 'str' ? docNode.value : null;
      functions.push({ name: name || '(anonymous)', kind, ...p, doc });
      continue;
    }

    if (h === 'macro') {
      const vec = isVec(c[2]) ? c[2] : null;
      const p = vec ? paramsOf(vec) : { params: [], arity: 0, variadic: false };
      macros.push({ name: isLeaf(c[1]) ? c[1].value : '(anonymous)', kind: 'macro', ...p });
      continue;
    }
    if (h === 'macros') {
      // (macros { name1 (fn …) name2 (fn …) }) — record the defined keys.
      const tbl = c[1];
      if (tbl && tbl.t === 'map') {
        for (let k = 0; k < tbl.c.length; k += 2) {
          if (isLeaf(tbl.c[k])) macros.push({ name: tbl.c[k].value.replace(/^:/, ''), kind: 'macros' });
        }
      }
      continue;
    }
    if (h === 'import-macros') {
      const mod = moduleName(c[c.length - 1]);
      if (mod) macroImports.push(mod);
      continue;
    }
  }

  const loops = countLoops(forms, { each: 0, for: 0, while: 0 });
  return { requires, functions, locals, vars, globals, macros, macroImports, loops };
}

// ── Rendering ────────────────────────────────────────────────────────────────
function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'fnl-section';
  const hd = document.createElement('div');
  hd.className = 'fnl-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'fnl-list'; sec.appendChild(ul); return ul; }
function tag(cls, t) { return `<span class="fnl-tag ${cls}">${esc(t)}</span>`; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }

function paramsHtml(fn) {
  const parts = fn.params.map((p) => `<span class="fnl-param">${esc(p)}</span>`);
  if (fn.variadic) parts.push('<span class="fnl-rest">&amp;…</span>');
  const ar = `<span class="fnl-arity"> · ${fn.variadic ? fn.arity + '+' : fn.arity}-ary</span>`;
  return `[${parts.join(' ')}]${ar}`;
}

export async function render(intake) {
  const text = intake.text || '';
  const { requires, functions, locals, vars, globals, macros, macroImports, loops } = analyzeFennel(text);

  const host = document.createElement('div');
  host.className = 'fnl-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'fnl-title';
  title.innerHTML = '<span class="fnl-badge">Fennel Script</span>';
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'fnl-sub';
  sub.textContent = [
    requires.length && `${requires.length} require${requires.length !== 1 ? 's' : ''}`,
    functions.length && `${functions.length} function${functions.length !== 1 ? 's' : ''}`,
    locals.length && `${locals.length} local${locals.length !== 1 ? 's' : ''}`,
    vars.length && `${vars.length} var${vars.length !== 1 ? 's' : ''}`,
    macros.length && `${macros.length} macro${macros.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ') || 'Fennel source';
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'fnl-cards';
  for (const { value, label } of [
    { value: requires.length, label: 'Requires' },
    { value: functions.length, label: 'Functions' },
    { value: locals.length, label: 'Locals' },
    { value: vars.length, label: 'Vars' },
    { value: macros.length, label: 'Macros' },
  ]) {
    const card = document.createElement('div');
    card.className = 'fnl-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (requires.length) {
    const ul = makeList(makeSection(host, `Requires (${requires.length})`));
    for (const r of requires) {
      const as = r.as ? ` <span class="fnl-as">as ${esc(r.as)}</span>` : '';
      row(ul, `${tag('fnl-tag-req', 'require')} <span class="fnl-name">${esc(r.module || '?')}</span>${as}`);
    }
  }
  if (macroImports.length) {
    const ul = makeList(makeSection(host, `Macro Imports (${macroImports.length})`));
    for (const m of macroImports) row(ul, `${tag('fnl-tag-macro', 'import-macros')} ${esc(m)}`);
  }
  if (functions.length) {
    const ul = makeList(makeSection(host, `Functions (${functions.length})`));
    for (const f of functions) {
      const cls = f.kind === 'lambda' ? 'fnl-tag-lambda' : 'fnl-tag-fn';
      const lbl = f.kind === 'lambda' ? 'λ' : 'fn';
      const doc = f.doc ? `<span class="fnl-doc-str">${esc(f.doc)}</span>` : '';
      row(ul, `${tag(cls, lbl)} <span class="fnl-name">${esc(f.name)}</span> ${paramsHtml(f)}${doc}`);
    }
  }
  if (macros.length) {
    const ul = makeList(makeSection(host, `Macros (${macros.length})`));
    for (const m of macros) {
      const sig = m.kind === 'macros' ? '' : ` ${paramsHtml(m)}`;
      row(ul, `${tag('fnl-tag-macro', m.kind)} <span class="fnl-name">${esc(m.name)}</span>${sig}`);
    }
  }
  if (locals.length) {
    const ul = makeList(makeSection(host, `Local Bindings (${locals.length})`));
    for (const name of locals) row(ul, `${tag('fnl-tag', 'local')} <span class="fnl-name">${esc(name)}</span>`);
  }
  if (vars.length) {
    const ul = makeList(makeSection(host, `Var Declarations (${vars.length})`));
    for (const name of vars) row(ul, `${tag('fnl-tag-var', 'var')} <span class="fnl-name">${esc(name)}</span>`);
  }
  if (globals.length) {
    const ul = makeList(makeSection(host, `Global Bindings (${globals.length})`));
    for (const name of globals) row(ul, `${tag('fnl-tag-global', 'global')} <span class="fnl-name">${esc(name)}</span>`);
  }

  const loopTotal = loops.each + loops.for + loops.while;
  if (loopTotal > 0) {
    const ul = makeList(makeSection(host, 'Loop Constructs'));
    for (const [k, v] of [['each', loops.each], ['for', loops.for], ['while', loops.while]]) {
      if (v > 0) row(ul, `${tag('fnl-tag', k)} ×${v}`);
    }
  }

  return { parentNode: host };
}
