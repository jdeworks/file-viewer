const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sml-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.sml-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1d4ed8;color:#fff;vertical-align:middle;margin-right:8px;}
.sml-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.sml-name{font-family:ui-monospace,monospace;font-size:14px;color:#1d4ed8;font-weight:700;}
.sml-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.sml-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.sml-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:92px;}
.sml-card strong{display:block;font-size:1.2rem;font-weight:700;}
.sml-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.sml-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.sml-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.sml-list{margin:0;padding:0;list-style:none;}
.sml-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.sml-list li:last-child{border-bottom:none;}
.sml-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;}
.sml-tag-fun{background:#dbeafe;color:#1d4ed8;}
.sml-tag-val{background:#dcfce7;color:#15803d;}
.sml-tag-type{background:#fef9c3;color:#854d0e;}
.sml-tag-data{background:#ede9fe;color:#7c3aed;}
.sml-tag-struct{background:#dbeafe;color:#1d4ed8;}
.sml-tag-sig{background:#e0e7ff;color:#4338ca;}
.sml-tag-functor{background:#fce7f3;color:#be185d;}
.sml-tag-open{background:#cffafe;color:#0369a1;}
.sml-tag-exn{background:#ffe4e6;color:#9f1239;}
.sml-id{font-weight:600;}
.sml-ty{color:#0e7490;}
.sml-ret{color:#1d4ed8;}
.sml-var{color:#9333ea;font-style:italic;}
.sml-con{color:#7c3aed;font-weight:600;}
`;

// Strip nestable (* *) comments, preserving newlines for stable offsets.
function stripComments(src) {
  let out = '', depth = 0;
  for (let i = 0; i < src.length; i++) {
    if (src[i] === '(' && src[i + 1] === '*') { depth++; i++; continue; }
    if (depth > 0 && src[i] === '*' && src[i + 1] === ')') { depth--; i++; continue; }
    if (depth === 0) out += src[i];
    else if (src[i] === '\n') out += '\n';
  }
  return out;
}

// Paren/bracket depth immediately BEFORE each character.
function depthArray(s) {
  const d = new Array(s.length);
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    d[i] = depth;
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth = Math.max(0, depth - 1);
  }
  return d;
}

// Index of the binding '=' (not =>, <=, >=, :=) at bracket depth 0, else -1.
function bindingEq(s) {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth = Math.max(0, depth - 1);
    else if (depth === 0 && c === '=') {
      if (s[i + 1] === '>') { i++; continue; }
      if (s[i - 1] === '<' || s[i - 1] === '>' || s[i - 1] === '=' || s[i - 1] === ':') continue;
      return i;
    }
  }
  return -1;
}

// Index of a type-annotation ':' (not :: or :=) at depth 0, else -1.
function typeColon(s) {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth = Math.max(0, depth - 1);
    else if (depth === 0 && c === ':') {
      if (s[i + 1] === ':' || s[i - 1] === ':' || s[i + 1] === '=') { continue; }
      return i;
    }
  }
  return -1;
}

// Split on a separator char at bracket depth 0.
function splitTop(s, sep) {
  const out = []; let buf = '', depth = 0;
  for (const c of s) {
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth = Math.max(0, depth - 1);
    if (depth === 0 && c === sep) { out.push(buf); buf = ''; } else buf += c;
  }
  out.push(buf);
  return out;
}

// Pattern atoms: whitespace-separated, keeping (..)/[..]/{..} groups intact.
function patternAtoms(s) {
  const atoms = []; let buf = '', depth = 0;
  for (const c of s) {
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth = Math.max(0, depth - 1);
    if (depth === 0 && /\s/.test(c)) { if (buf.trim()) atoms.push(buf.trim()); buf = ''; }
    else buf += c;
  }
  if (buf.trim()) atoms.push(buf.trim());
  return atoms;
}

const norm = (s) => s.replace(/\s+/g, ' ').trim();
const count = (s, ch) => splitTop(s, ch).length - 1;

// Separate leading type variables from a type/datatype's name: 'a tree, ('a,'b) map, t.
function splitVarsName(h) {
  h = norm(h);
  let vars = '', m;
  if ((m = h.match(/^\(([^)]*)\)\s*(.*)$/))) { vars = norm(m[1]); h = norm(m[2]); }
  else if ((m = h.match(/^('[\w']+)\s+(.*)$/))) { vars = m[1]; h = norm(m[2]); }
  const name = (h.match(/^([A-Za-z_][\w']*)/) || [])[1] || h;
  return { vars, name };
}

function parseFun(win) {
  const s = win.replace(/^\s*fun\s+/, '');
  const eq = bindingEq(s);
  const header = eq >= 0 ? s.slice(0, eq) : s;
  const tc = typeColon(header);
  const paramsPart = tc >= 0 ? header.slice(0, tc) : header;
  const returns = tc >= 0 ? norm(header.slice(tc + 1)) : '';
  const atoms = patternAtoms(paramsPart);
  const name = atoms.shift() || '';
  return { name, params: atoms, returns, clauses: count(s, '|') + 1 };
}

function parseVal(win) {
  const s = win.replace(/^\s*val\s+(rec\s+)?/, '');
  const eq = bindingEq(s);
  const head = eq >= 0 ? s.slice(0, eq) : s;
  const tc = typeColon(head);
  const namePart = norm(tc >= 0 ? head.slice(0, tc) : head);
  const type = tc >= 0 ? norm(head.slice(tc + 1)) : '';
  const name = (namePart.match(/^(\([^)]*\)|\[[^\]]*\]|[A-Za-z_][\w']*|\S+)/) || [])[1] || namePart;
  return { name, type };
}

function parseType(win) {
  const s = win.replace(/^\s*(eqtype|type)\s+/, '');
  const eq = bindingEq(s);
  const head = eq >= 0 ? s.slice(0, eq) : s;
  const rhs = eq >= 0 ? norm(s.slice(eq + 1)) : '';
  const { vars, name } = splitVarsName(head);
  return { name, vars, rhs, kind: 'type' };
}

function parseDatatype(win) {
  const s = win.replace(/^\s*datatype\s+/, '');
  const eq = bindingEq(s);
  const head = eq >= 0 ? s.slice(0, eq) : s;
  const rhs = eq >= 0 ? s.slice(eq + 1) : '';
  const { vars, name } = splitVarsName(head);
  const constructors = splitTop(rhs, '|').map((c) => {
    c = c.trim();
    const om = c.match(/^([A-Za-z_][\w']*)\s+of\s+([\s\S]+)$/);
    if (om) return { name: om[1], of: norm(om[2]) };
    return { name: (c.match(/^([A-Za-z_][\w']*)/) || [])[1] || '', of: '' };
  }).filter((c) => c.name);
  return { name, vars, constructors, kind: 'datatype' };
}

function parseStructure(win) {
  const m = win.match(/^\s*structure\s+([A-Za-z_][\w']*)\s*(?::>?\s*([A-Za-z_][\w']*))?/);
  return { name: m ? m[1] : '', sig: m && m[2] ? m[2] : '' };
}

function parseFunctor(win) {
  const m = win.match(/^\s*functor\s+([A-Za-z_][\w']*)\s*(\([\s\S]*?\))?/);
  return { name: m ? m[1] : '', param: m && m[2] ? norm(m[2]) : '' };
}

function parseException(win) {
  const s = win.replace(/^\s*exception\s+/, '');
  const m = s.match(/^([A-Za-z_][\w']*)\s*(?:of\s+([\s\S]+))?/);
  return { name: m ? m[1] : '', of: m && m[2] ? norm(splitTop(m[2], '|')[0].split(/\bexception\b|\bval\b|\bfun\b/)[0]) : '' };
}

function parseOpen(win) {
  return win.replace(/^\s*open\s+/, '').trim().split(/\s+/).filter((w) => /^[A-Za-z_][\w'.]*$/.test(w));
}

const KW = /\b(datatype|structure|signature|functor|eqtype|type|val|fun|open|exception)\b/g;

// Pure, DOM-free structural parse of Standard ML source. Exported for unit testing.
export function analyzeSML(text) {
  const clean = stripComments(String(text || ''));
  const code = clean.replace(/"(?:\\.|[^"\\])*"/g, '  ');
  const depth = depthArray(code);

  const funs = [], vals = [], types = [], datatypes = [];
  const structures = [], signatures = [], functors = [], opens = [], exceptions = [];

  const hits = [];
  for (const m of code.matchAll(KW)) { if (depth[m.index] === 0) hits.push({ kw: m[1], at: m.index }); }
  for (let i = 0; i < hits.length; i++) {
    const win = code.slice(hits[i].at, i + 1 < hits.length ? hits[i + 1].at : code.length);
    switch (hits[i].kw) {
      case 'fun': funs.push(parseFun(win)); break;
      case 'val': vals.push(parseVal(win)); break;
      case 'type': case 'eqtype': types.push(parseType(win)); break;
      case 'datatype': datatypes.push(parseDatatype(win)); break;
      case 'structure': structures.push(parseStructure(win)); break;
      case 'signature': signatures.push({ name: (win.match(/^\s*signature\s+([A-Za-z_][\w']*)/) || [])[1] || '' }); break;
      case 'functor': functors.push(parseFunctor(win)); break;
      case 'open': for (const o of parseOpen(win)) opens.push(o); break;
      case 'exception': exceptions.push(parseException(win)); break;
      default: break;
    }
  }
  const uses = [...clean.matchAll(/\buse\s+"([^"]*)"/g)].map((m) => m[1]);
  return { funs, vals, types, datatypes, structures, signatures, functors, opens, exceptions, uses };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'sml-section';
  const hd = document.createElement('div');
  hd.className = 'sml-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'sml-list'; sec.appendChild(ul); return ul; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
function tag(cls, t) { return `<span class="sml-tag ${cls}">${esc(t)}</span>`; }
function varsHtml(v) { return v ? `<span class="sml-var">${esc(v)}</span> ` : ''; }

function paramsHtml(params) {
  return params.map((p) => {
    const tc = typeColon(p.replace(/^\(|\)$/g, ''));
    if (/^\(.*\)$/.test(p) && tc >= 0) {
      const inner = p.slice(1, -1);
      const ci = typeColon(inner);
      return `(<span class="sml-id">${esc(inner.slice(0, ci).trim())}</span>: <span class="sml-ty">${esc(inner.slice(ci + 1).trim())}</span>)`;
    }
    return `<span class="sml-id">${esc(p)}</span>`;
  }).join(' ');
}

export function render(intake) {
  const text = intake && intake.text || '';
  const preview = text.slice(0, 4000);
  if (!/\b(fun|val|datatype|structure|signature|functor|type)\b/.test(preview)) return null;

  const a = analyzeSML(text);
  const total = a.funs.length + a.vals.length + a.types.length + a.datatypes.length
    + a.structures.length + a.signatures.length + a.functors.length;
  if (total === 0 && a.opens.length === 0) return null;

  const host = document.createElement('div');
  host.className = 'sml-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'sml-title';
  const badge = document.createElement('span');
  badge.className = 'sml-badge';
  badge.textContent = 'Standard ML';
  title.appendChild(badge);
  const topName = (a.structures[0] && a.structures[0].name) || (a.signatures[0] && a.signatures[0].name)
    || (a.functors[0] && a.functors[0].name) || '';
  if (topName) { const n = document.createElement('span'); n.className = 'sml-name'; n.textContent = topName; title.appendChild(n); }
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'sml-sub';
  sub.textContent = [
    a.structures.length && `${a.structures.length} structure${a.structures.length !== 1 ? 's' : ''}`,
    a.signatures.length && `${a.signatures.length} signature${a.signatures.length !== 1 ? 's' : ''}`,
    a.functors.length && `${a.functors.length} functor${a.functors.length !== 1 ? 's' : ''}`,
    a.datatypes.length && `${a.datatypes.length} datatype${a.datatypes.length !== 1 ? 's' : ''}`,
    a.funs.length && `${a.funs.length} fun`,
    a.vals.length && `${a.vals.length} val`,
  ].filter(Boolean).join(' · ') || 'Standard ML source';
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'sml-cards';
  for (const { value, label } of [
    { value: a.structures.length, label: 'Structures' },
    { value: a.signatures.length, label: 'Signatures' },
    { value: a.functors.length, label: 'Functors' },
    { value: a.datatypes.length, label: 'Datatypes' },
    { value: a.types.length, label: 'Types' },
    { value: a.funs.length, label: 'Functions' },
    { value: a.vals.length, label: 'Vals' },
  ]) {
    const card = document.createElement('div');
    card.className = 'sml-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (a.structures.length) {
    const ul = makeList(makeSection(host, `Structures (${a.structures.length})`));
    for (const s of a.structures) {
      const asc = s.sig ? ` : <span class="sml-ty">${esc(s.sig)}</span>` : '';
      row(ul, `${tag('sml-tag-struct', 'structure')} <span class="sml-id">${esc(s.name)}</span>${asc}`);
    }
  }
  if (a.signatures.length) {
    const ul = makeList(makeSection(host, `Signatures (${a.signatures.length})`));
    for (const s of a.signatures) row(ul, `${tag('sml-tag-sig', 'signature')} <span class="sml-id">${esc(s.name)}</span>`);
  }
  if (a.functors.length) {
    const ul = makeList(makeSection(host, `Functors (${a.functors.length})`));
    for (const f of a.functors) {
      row(ul, `${tag('sml-tag-functor', 'functor')} <span class="sml-id">${esc(f.name)}</span>${f.param ? ` <span class="sml-ty">${esc(f.param)}</span>` : ''}`);
    }
  }
  if (a.datatypes.length) {
    const ul = makeList(makeSection(host, `Datatypes (${a.datatypes.length})`));
    for (const d of a.datatypes) {
      const cons = d.constructors.map((c) => `<span class="sml-con">${esc(c.name)}</span>${c.of ? ` of <span class="sml-ty">${esc(c.of)}</span>` : ''}`).join(' | ');
      row(ul, `${tag('sml-tag-data', 'datatype')} ${varsHtml(d.vars)}<span class="sml-id">${esc(d.name)}</span> = ${cons}`);
    }
  }
  if (a.types.length) {
    const ul = makeList(makeSection(host, `Types (${a.types.length})`));
    for (const t of a.types) {
      row(ul, `${tag('sml-tag-type', 'type')} ${varsHtml(t.vars)}<span class="sml-id">${esc(t.name)}</span>${t.rhs ? ` = <span class="sml-ty">${esc(t.rhs)}</span>` : ''}`);
    }
  }
  if (a.funs.length) {
    const ul = makeList(makeSection(host, `Functions (${a.funs.length})`));
    for (const f of a.funs) {
      const ret = f.returns ? ` : <span class="sml-ret">${esc(f.returns)}</span>` : '';
      const cl = f.clauses > 1 ? ` <span class="sml-tag sml-tag-fun">${f.clauses} clauses</span>` : '';
      row(ul, `${tag('sml-tag-fun', 'fun')} <span class="sml-id">${esc(f.name)}</span> ${paramsHtml(f.params)}${ret}${cl}`);
    }
  }
  if (a.vals.length) {
    const ul = makeList(makeSection(host, `Vals (${a.vals.length})`));
    for (const v of a.vals) {
      row(ul, `${tag('sml-tag-val', 'val')} <span class="sml-id">${esc(v.name)}</span>${v.type ? ` : <span class="sml-ty">${esc(v.type)}</span>` : ''}`);
    }
  }
  if (a.exceptions.length) {
    const ul = makeList(makeSection(host, `Exceptions (${a.exceptions.length})`));
    for (const e of a.exceptions) row(ul, `${tag('sml-tag-exn', 'exception')} <span class="sml-id">${esc(e.name)}</span>${e.of ? ` of <span class="sml-ty">${esc(e.of)}</span>` : ''}`);
  }
  if (a.opens.length || a.uses.length) {
    const ul = makeList(makeSection(host, `Imports (${a.opens.length + a.uses.length})`));
    for (const o of a.opens) row(ul, `${tag('sml-tag-open', 'open')} <span class="sml-id">${esc(o)}</span>`);
    for (const u of a.uses) row(ul, `${tag('sml-tag-open', 'use')} <span class="sml-id">${esc(u)}</span>`);
  }

  return { parentNode: host };
}
