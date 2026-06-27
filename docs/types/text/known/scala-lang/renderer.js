const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sc-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.sc-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#dc322f;color:#fff;vertical-align:middle;margin-right:8px;}
.sc-pkg{font-family:ui-monospace,monospace;font-size:13px;color:#dc322f;font-weight:700;vertical-align:middle;}
.sc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.sc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.sc-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.sc-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.sc-card strong{display:block;font-size:1.2rem;font-weight:700;}
.sc-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.sc-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.sc-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.sc-list{margin:0;padding:0;list-style:none;}
.sc-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.sc-list li:last-child{border-bottom:none;}
.sc-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#fee2e2;color:#991b1b;font-weight:700;}
.sc-tag-class{background:#e0f2fe;color:#0369a1;}
.sc-tag-case{background:#dcfce7;color:#166534;}
.sc-tag-trait{background:#ede9fe;color:#7c3aed;}
.sc-tag-object{background:#fef9c3;color:#854d0e;}
.sc-tag-enum{background:#ffe4e6;color:#9f1239;}
.sc-tag-def{background:#dbeafe;color:#1d4ed8;}
.sc-tag-val{background:#f1f5f9;color:#475569;}
.sc-tag-var{background:#fef3c7;color:#92400e;}
.sc-tag-impl{background:#fae8ff;color:#86198f;}
.sc-name{font-weight:600;}
.sc-tp{color:#7c3aed;}
.sc-type{color:#0e7490;}
.sc-ret{color:#1d4ed8;}
.sc-ext{color:#166534;}
`;

// ---- pure parser (DOM-free, exported for unit tests) ----

// Strip block + line comments, then merge physical lines whose () / [] / {} are unbalanced into one
// logical line so multi-line declarations (params spread over lines) collapse into a single string.
function logicalLines(text) {
  const src = String(text || '').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, '');
  const out = [];
  let buf = '', depth = 0;
  for (const line of src.split(/\r?\n/)) {
    buf = buf ? buf + ' ' + line.trim() : line;
    for (const ch of line) {
      if (ch === '(' || ch === '[') depth++;
      else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    }
    if (depth === 0) { if (buf.trim()) out.push(buf.trim()); buf = ''; }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

// Read a balanced (open..close) group assuming str[0] === open. Returns {inner, end}.
function balanced(str, open, close) {
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === open) depth++;
    else if (str[i] === close) { depth--; if (depth === 0) return { inner: str.slice(1, i), end: i + 1 }; }
  }
  return { inner: str.slice(1), end: str.length };
}

// Index of a top-level (depth-0) standalone `=` (the body assignment), skipping ==, =>, <=, >=, !=.
function topLevelEq(str) {
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === '=' && depth === 0) {
      const prev = str[i - 1], next = str[i + 1];
      if (next === '=' || next === '>' || prev === '=' || prev === '<' || prev === '>' || prev === '!') continue;
      return i;
    }
  }
  return -1;
}

// Split by top-level commas (paren/bracket/brace aware).
function splitTop(str) {
  const parts = [];
  let depth = 0, buf = '';
  for (const ch of str) {
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    if (ch === ',' && depth === 0) { parts.push(buf); buf = ''; } else buf += ch;
  }
  if (buf.trim()) parts.push(buf);
  return parts.map((s) => s.trim()).filter(Boolean);
}

// Parse one param-list body ("x: Int, y: String = d"), pushing each param into `out`.
function parseParamList(inner, out) {
  let s = inner.trim();
  let implicitGroup = false;
  const gm = s.match(/^(implicit|using)\s+/);
  if (gm) { implicitGroup = true; s = s.slice(gm[0].length); }
  for (let part of splitTop(s)) {
    let implicitP = implicitGroup;
    while (/^(?:val|var|final|override|private|protected|implicit|lazy|@[\w.]+)\b\s*/.test(part)) {
      if (/^implicit\b/.test(part)) implicitP = true;
      part = part.replace(/^(?:val|var|final|override|private|protected|implicit|lazy|@[\w.]+)\b\s*/, '');
    }
    const ci = part.indexOf(':');
    if (ci < 0) { out.push({ name: part.trim(), type: '', implicit: implicitP }); continue; }
    const name = part.slice(0, ci).trim();
    let type = part.slice(ci + 1).trim();
    const eq = topLevelEq(type);
    let def;
    if (eq >= 0) { def = type.slice(eq + 1).trim(); type = type.slice(0, eq).trim(); }
    out.push({ name, type, implicit: implicitP, ...(def ? { default: def } : {}) });
  }
}

function parseDef(line) {
  const m = line.match(/\bdef\s+([^\s(\[:=]+)/);
  if (!m) return null;
  let rest = line.slice(m.index + m[0].length).trimStart();
  let typeParams = '';
  if (rest[0] === '[') { const g = balanced(rest, '[', ']'); typeParams = g.inner.trim(); rest = rest.slice(g.end).trimStart(); }
  const params = [];
  while (rest[0] === '(') { const g = balanced(rest, '(', ')'); parseParamList(g.inner, params); rest = rest.slice(g.end).trimStart(); }
  let returns = '';
  if (rest[0] === ':') {
    rest = rest.slice(1).trimStart();
    const eq = topLevelEq(rest);
    returns = (eq >= 0 ? rest.slice(0, eq) : rest).replace(/\s*=\s*$/, '').trim();
  }
  return { name: m[1], typeParams, params, returns };
}

function parseType(line) {
  const m = line.match(/^((?:(?:sealed|abstract|final|open|implicit|case)\s+)*)(class|trait|object|enum)\s+([\w$]+)/);
  if (!m) return null;
  const kind = /\bcase\b/.test(m[1]) ? 'case ' + m[2] : m[2];
  let rest = line.slice(m.index + m[0].length).trimStart();
  let typeParams = '';
  if (rest[0] === '[') { const g = balanced(rest, '[', ']'); typeParams = g.inner.trim(); rest = rest.slice(g.end).trimStart(); }
  rest = rest.replace(/^(?:private|protected)\s*(?:\[[\w]+\])?\s*/, '');
  const params = [];
  while (rest[0] === '(') { const g = balanced(rest, '(', ')'); parseParamList(g.inner, params); rest = rest.slice(g.end).trimStart(); }
  let ext = [];
  const em = rest.match(/\bextends\s+([\s\S]+)$/);
  if (em) {
    ext = em[1].replace(/\{[\s\S]*$/, '').split(/\s+with\s+/).map((s) => s.trim()).filter(Boolean);
  } else {
    const wm = rest.match(/\bwith\s+([\s\S]+)$/);
    if (wm) ext = wm[1].replace(/\{[\s\S]*$/, '').split(/\s+with\s+/).map((s) => s.trim()).filter(Boolean);
  }
  return { kind, name: m[3], typeParams, params, extends: ext };
}

function parseVal(line) {
  const m = line.match(/^(?:(?:private|protected|override|final|lazy|implicit|sealed)\s+)*(val|var)\s+([\w$]+)\s*(?::\s*([\s\S]+?))?\s*(?:=|$)/);
  if (!m) return null;
  return { name: m[2], mutable: m[1] === 'var', type: (m[3] || '').trim() };
}

export function analyzeScala(text) {
  let packageName = null;
  const imports = [], types = [], defs = [], vals = [], typeAliases = [], givens = [];
  let depth = 0;
  for (const line of logicalLines(text)) {
    const declDepth = depth;
    for (const ch of line) { if (ch === '{') depth++; else if (ch === '}') depth = Math.max(0, depth - 1); }

    let m;
    if ((m = line.match(/^package\s+([\w.]+)/))) { if (!packageName) packageName = m[1]; continue; }
    if ((m = line.match(/^import\s+(.+)$/))) { imports.push(m[1].trim()); continue; }
    if ((m = line.match(/^type\s+([\w$]+)\s*(?:\[[^\]]*\])?\s*=\s*(.+)$/))) { typeAliases.push({ name: m[1], rhs: m[2].trim() }); continue; }
    if ((m = line.match(/^given\s+(?:([\w$]+)\s*)?(?::\s*)?(.+?)(?:=|$)/))) { givens.push({ name: m[1] || '', type: m[2].trim() }); continue; }
    const t = parseType(line);
    if (t) { types.push(t); continue; }
    if (declDepth <= 1) {
      if (/^(?:(?:private|protected|override|final|abstract|sealed|implicit|inline|transparent|open)\s+)*def\b/.test(line)) {
        const d = parseDef(line); if (d) { defs.push(d); continue; }
      }
      const v = parseVal(line); if (v) { vals.push(v); continue; }
    }
  }
  return { packageName, imports, types, defs, vals, typeAliases, givens };
}

// ---- DOM render ----

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'sc-section';
  const hd = document.createElement('div');
  hd.className = 'sc-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'sc-list'; sec.appendChild(ul); return ul; }
function tag(cls, t) { return `<span class="sc-tag ${cls}">${esc(t)}</span>`; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
function tpHtml(tp) { return tp ? `<span class="sc-tp">[${esc(tp)}]</span>` : ''; }
function paramsHtml(params) {
  if (!params.length) return '';
  const inner = params.map((p) => {
    const im = p.implicit ? '<span class="sc-tag sc-tag-impl">implicit</span> ' : '';
    const ty = p.type ? `: <span class="sc-type">${esc(p.type)}</span>` : '';
    const df = p.default ? ` = ${esc(p.default)}` : '';
    return `${im}${esc(p.name)}${ty}${df}`;
  }).join(', ');
  return `(${inner})`;
}

export function render(intake) {
  const text = intake.text || '';
  const preview = text.slice(0, 4000);
  if (!/\b(?:def|val|var|object|trait|class|enum|package|import|given)\b/.test(preview)) return null;

  const { packageName, imports, types, defs, vals, typeAliases, givens } = analyzeScala(text);
  if (!types.length && !defs.length && !vals.length && !imports.length && !packageName) return null;

  const host = document.createElement('div');
  host.className = 'sc-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'sc-title';
  const badge = document.createElement('span');
  badge.className = 'sc-badge';
  badge.textContent = 'Scala';
  title.appendChild(badge);
  if (packageName) { const n = document.createElement('span'); n.className = 'sc-pkg'; n.textContent = packageName; title.appendChild(n); }
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'sc-sub';
  sub.textContent = [
    imports.length && `${imports.length} import${imports.length !== 1 ? 's' : ''}`,
    types.length && `${types.length} type${types.length !== 1 ? 's' : ''}`,
    defs.length && `${defs.length} def${defs.length !== 1 ? 's' : ''}`,
    vals.length && `${vals.length} val/var`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'sc-cards';
  for (const { value, label } of [
    { value: imports.length, label: 'Imports' },
    { value: types.length, label: 'Types' },
    { value: defs.length, label: 'Defs' },
    { value: vals.length, label: 'Vals/Vars' },
  ]) {
    const card = document.createElement('div');
    card.className = 'sc-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (types.length) {
    const ul = makeList(makeSection(host, `Types (${types.length})`));
    for (const t of types) {
      const cls = 'sc-tag-' + (t.kind.startsWith('case') ? 'case' : t.kind);
      const ext = t.extends && t.extends.length ? ` <span class="sc-ext">extends ${esc(t.extends.join(' with '))}</span>` : '';
      row(ul, `${tag(cls, t.kind)} <span class="sc-name">${esc(t.name)}</span>${tpHtml(t.typeParams)}${paramsHtml(t.params)}${ext}`);
    }
  }
  if (defs.length) {
    const ul = makeList(makeSection(host, `Methods / defs (${defs.length})`));
    for (const d of defs) {
      const ret = d.returns ? `: <span class="sc-ret">${esc(d.returns)}</span>` : '';
      row(ul, `${tag('sc-tag-def', 'def')} <span class="sc-name">${esc(d.name)}</span>${tpHtml(d.typeParams)}${paramsHtml(d.params)}${ret}`);
    }
  }
  if (typeAliases.length) {
    const ul = makeList(makeSection(host, `Type aliases (${typeAliases.length})`));
    for (const a of typeAliases) row(ul, `${tag('sc-tag-class', 'type')} <span class="sc-name">${esc(a.name)}</span> = <span class="sc-type">${esc(a.rhs)}</span>`);
  }
  if (vals.length) {
    const ul = makeList(makeSection(host, `Vals / Vars (${vals.length})`));
    for (const v of vals) {
      const ty = v.type ? `: <span class="sc-type">${esc(v.type)}</span>` : '';
      row(ul, `${tag(v.mutable ? 'sc-tag-var' : 'sc-tag-val', v.mutable ? 'var' : 'val')} <span class="sc-name">${esc(v.name)}</span>${ty}`);
    }
  }
  if (givens.length) {
    const ul = makeList(makeSection(host, `Givens (${givens.length})`));
    for (const g of givens) row(ul, `${tag('sc-tag-impl', 'given')} ${g.name ? `<span class="sc-name">${esc(g.name)}</span>: ` : ''}<span class="sc-type">${esc(g.type)}</span>`);
  }
  if (imports.length) {
    const MAX = 12;
    const ul = makeList(makeSection(host, `Imports (${imports.length})`));
    for (const imp of imports.slice(0, MAX)) row(ul, esc(imp));
    if (imports.length > MAX) row(ul, `<span style="color:var(--fg-2,#888)">… and ${imports.length - MAX} more</span>`);
  }

  return { parentNode: host };
}
