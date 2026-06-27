const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ex-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.ex-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#6e4fa2;color:#fff;vertical-align:middle;margin-right:8px;}
.ex-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ex-mod{font-family:ui-monospace,monospace;font-size:14px;color:#6e4fa2;font-weight:700;}
.ex-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ex-moduledoc{background:var(--bg-2,#f6f8fa);border-left:3px solid #6e4fa2;padding:8px 12px;font-size:13px;color:var(--fg-2,#555);margin-bottom:16px;border-radius:0 6px 6px 0;}
.ex-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.ex-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.ex-card strong{display:block;font-size:1.2rem;font-weight:700;}
.ex-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.ex-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.ex-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.ex-list{margin:0;padding:0;list-style:none;}
.ex-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.ex-list li:last-child{border-bottom:none;}
.ex-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;background:#e0f2fe;color:#0369a1;}
.ex-tag-def{background:#dbeafe;color:#1d4ed8;}
.ex-tag-defp{background:#fce7f3;color:#9d174d;}
.ex-tag-macro{background:#ede9fe;color:#7c3aed;}
.ex-tag-guard{background:#fef9c3;color:#854d0e;}
.ex-tag-use{background:#dcfce7;color:#166534;}
.ex-tag-spec{background:#cffafe;color:#0e7490;}
.ex-tag-struct{background:#ffedd5;color:#9a3412;}
.ex-tag-cb{background:#ffe4e6;color:#9f1239;}
.ex-name{font-weight:600;}
.ex-arity{color:#6e4fa2;font-weight:700;}
.ex-param{color:#0e7490;}
.ex-ret{color:#1d4ed8;}
.ex-mod-ref{color:#6e4fa2;}
`;

// --- pure parser helpers (DOM-free) ---------------------------------------

// Walk a string starting at its first '(' and return the balanced content + remainder.
function balancedParen(s) {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(') depth++;
    else if (c === ')') { depth--; if (depth === 0) return { content: s.slice(1, i), after: s.slice(i + 1) }; }
  }
  return { content: s.slice(1), after: '' };
}

// Split on top-level commas (paren/bracket/brace-aware) — keeps tuples/lists/maps intact.
function splitTopLevel(s) {
  const out = [];
  let buf = '', depth = 0;
  for (const c of s) {
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    if (c === ',' && depth === 0) { out.push(buf.trim()); buf = ''; } else buf += c;
  }
  if (buf.trim()) out.push(buf.trim());
  return out.filter(Boolean);
}

// From the text after a def/defp/defmacro name: pull params (paren-aware), arity, and guard.
function extractSig(rest) {
  rest = rest.trim();
  let params = [], guard = false;
  if (rest.startsWith('(')) {
    const { content, after } = balancedParen(rest);
    params = splitTopLevel(content);
    rest = after.trim();
  }
  if (/^when\b/.test(rest)) guard = true;
  return { params, arity: params.length, guard };
}

// defstruct fields: `[:a, :b]`, `a: 1, b: 2`, or mixed → ['a','b',…]
function parseStructFields(s) {
  s = s.trim().replace(/^\[/, '').replace(/\]$/, '');
  return splitTopLevel(s).map((f) => {
    let mm;
    if ((mm = f.match(/^:?([\w?!]+):/))) return mm[1];   // key: value
    if ((mm = f.match(/^:([\w?!]+)$/))) return mm[1];     // :atom
    return f.trim();
  }).filter(Boolean);
}

// Parse Elixir source into structured facts. Exported (pure, no DOM) for unit testing.
export function analyzeElixir(text) {
  const lines = String(text || '').split(/\r?\n/);
  const modules = [];
  const functions = [];
  const macros = [];
  const directives = [];
  const structs = [];
  const typespecs = [];
  const callbacks = [];
  const behaviours = [];
  let moduledoc = null;
  let currentModule = null;

  // dedup multiple clauses of the same head; merge guard flag across clauses.
  const fnSeen = new Map();
  const pushFn = (list, fn) => {
    const key = `${fn.private ? 'p' : ''}${fn.name}/${fn.arity}`;
    const prev = fnSeen.get(key);
    if (prev) { prev.guard = prev.guard || fn.guard; return; }
    fnSeen.set(key, fn);
    list.push(fn);
  };

  for (const raw of lines) {
    const t = raw.trim();
    if (!t || t.startsWith('#')) continue;
    let m;

    if ((m = t.match(/^defmodule\s+([\w.]+)\s+do\b/))) {
      modules.push({ name: m[1] });
      currentModule = m[1];
      continue;
    }
    if (!moduledoc && (m = t.match(/^@moduledoc\s+"([^"]{0,300})"/))) { moduledoc = m[1]; continue; }
    if ((m = t.match(/^@behaviou?r\s+([\w.]+)/))) { behaviours.push(m[1]); continue; }
    if ((m = t.match(/^@callback\s+([\w?!]+)\s*\(([^)]*)\)\s*::\s*(.+)$/))) {
      callbacks.push({ name: m[1], params: splitTopLevel(m[2]), returns: m[3].trim() });
      continue;
    }
    if ((m = t.match(/^@callback\s+([\w?!]+)/))) { callbacks.push({ name: m[1], params: [], returns: '' }); continue; }
    if ((m = t.match(/^@spec\s+([\w?!]+)\s*\(([^)]*)\)\s*::\s*(.+)$/))) {
      typespecs.push({ kind: 'spec', name: m[1], params: splitTopLevel(m[2]), returns: m[3].trim() });
      continue;
    }
    if ((m = t.match(/^@type\s+([\w?!]+)(?:\([^)]*\))?\s*::\s*(.+)$/))) {
      typespecs.push({ kind: 'type', name: m[1], params: [], returns: m[2].trim() });
      continue;
    }
    if ((m = t.match(/^(use|import|alias|require)\s+([\w.]+)/))) {
      directives.push({ kind: m[1], target: m[2] });
      continue;
    }
    if ((m = t.match(/^defstruct\s+(.+)$/))) {
      structs.push({ module: currentModule, fields: parseStructFields(m[1]) });
      continue;
    }
    if ((m = t.match(/^(defmacrop?)\s+([\w?!]+)(.*)$/))) {
      const { params, arity, guard } = extractSig(m[3]);
      pushFn(macros, { name: m[2], params, arity, guard, private: m[1] === 'defmacrop', module: currentModule });
      continue;
    }
    if ((m = t.match(/^(defp?)\s+([\w?!]+)(.*)$/))) {
      const { params, arity, guard } = extractSig(m[3]);
      pushFn(functions, { name: m[2], params, arity, guard, private: m[1] === 'defp', module: currentModule });
      continue;
    }
  }

  return { modules, functions, macros, directives, structs, typespecs, callbacks, behaviours, moduledoc };
}

// --- DOM rendering ---------------------------------------------------------

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'ex-section';
  const hd = document.createElement('div');
  hd.className = 'ex-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'ex-list'; sec.appendChild(ul); return ul; }
function tag(cls, t) { return `<span class="ex-tag ${cls}">${esc(t)}</span>`; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
function paramsHtml(params) { return params.map((p) => `<span class="ex-param">${esc(p)}</span>`).join(', '); }

function fnRow(ul, fn, isMacro) {
  const kindTag = isMacro
    ? tag('ex-tag-macro', fn.private ? 'defmacrop' : 'defmacro')
    : tag(fn.private ? 'ex-tag-defp' : 'ex-tag-def', fn.private ? 'defp' : 'def');
  const guard = fn.guard ? ' ' + tag('ex-tag-guard', 'when') : '';
  row(ul, `${kindTag}${guard} <span class="ex-name">${esc(fn.name)}</span>(${paramsHtml(fn.params)})`
    + ` <span class="ex-arity">/${fn.arity}</span>`);
}

export function render(intake) {
  const text = intake.text || '';
  const facts = analyzeElixir(text);
  const { modules, functions, macros, directives, structs, typespecs, callbacks, behaviours, moduledoc } = facts;

  if (!modules.length && !functions.length && !directives.length && !macros.length) return null;

  const host = document.createElement('div');
  host.className = 'ex-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'ex-title';
  title.innerHTML = '<span class="ex-badge">Elixir</span>'
    + (modules.length ? `<span class="ex-mod">${esc(modules[0].name)}</span>` : 'Source File');
  host.appendChild(title);

  const pub = functions.filter((f) => !f.private).length;
  const priv = functions.filter((f) => f.private).length;
  const sub = document.createElement('div');
  sub.className = 'ex-sub';
  sub.textContent = [
    modules.length > 1 && `${modules.length} modules`,
    `${pub} public fn${pub !== 1 ? 's' : ''}`,
    priv && `${priv} private`,
    macros.length && `${macros.length} macro${macros.length !== 1 ? 's' : ''}`,
    typespecs.length && `${typespecs.length} typespec${typespecs.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  if (moduledoc) {
    const docEl = document.createElement('div');
    docEl.className = 'ex-moduledoc';
    docEl.textContent = moduledoc.length > 200 ? moduledoc.slice(0, 200) + '…' : moduledoc;
    host.appendChild(docEl);
  }

  const cards = document.createElement('div');
  cards.className = 'ex-cards';
  for (const { value, label } of [
    { value: pub, label: 'Public fns' },
    { value: priv, label: 'Private fns' },
    { value: macros.length, label: 'Macros' },
    { value: directives.length, label: 'Directives' },
    { value: typespecs.length, label: 'Typespecs' },
  ]) {
    const card = document.createElement('div');
    card.className = 'ex-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (modules.length > 1) {
    const ul = makeList(makeSection(host, `Modules (${modules.length})`));
    for (const mod of modules) row(ul, `${tag('ex-tag', 'defmodule')} <span class="ex-mod-ref">${esc(mod.name)}</span>`);
  }
  if (behaviours.length || directives.length) {
    const ul = makeList(makeSection(host, `Directives (${behaviours.length + directives.length})`));
    for (const b of behaviours) row(ul, `${tag('ex-tag-use', '@behaviour')} <span class="ex-mod-ref">${esc(b)}</span>`);
    for (const d of directives) row(ul, `${tag('ex-tag-use', d.kind)} <span class="ex-mod-ref">${esc(d.target)}</span>`);
  }
  if (structs.length) {
    const ul = makeList(makeSection(host, `Structs (${structs.length})`));
    for (const st of structs) row(ul, `${tag('ex-tag-struct', 'defstruct')} ${st.fields.map((f) => `<span class="ex-param">:${esc(f)}</span>`).join(', ')}`);
  }
  if (typespecs.length) {
    const ul = makeList(makeSection(host, `Typespecs (${typespecs.length})`));
    for (const ts of typespecs) {
      row(ul, `${tag('ex-tag-spec', '@' + ts.kind)} <span class="ex-name">${esc(ts.name)}</span>`
        + (ts.kind === 'spec' ? `(${paramsHtml(ts.params)})` : '')
        + ` :: <span class="ex-ret">${esc(ts.returns)}</span>`);
    }
  }
  if (callbacks.length) {
    const ul = makeList(makeSection(host, `Callbacks (${callbacks.length})`));
    for (const cb of callbacks) {
      row(ul, `${tag('ex-tag-cb', '@callback')} <span class="ex-name">${esc(cb.name)}</span>(${paramsHtml(cb.params)})`
        + (cb.returns ? ` :: <span class="ex-ret">${esc(cb.returns)}</span>` : ''));
    }
  }
  if (functions.length) {
    const ul = makeList(makeSection(host, `Functions (${functions.length})`));
    for (const fn of functions) fnRow(ul, fn, false);
  }
  if (macros.length) {
    const ul = makeList(makeSection(host, `Macros (${macros.length})`));
    for (const mc of macros) fnRow(ul, mc, true);
  }

  return { parentNode: host };
}
