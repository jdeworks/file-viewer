const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.r-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.r-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#276dc3;color:#fff;vertical-align:middle;margin-right:8px;}
.r-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.r-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.r-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.r-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.r-card strong{display:block;font-size:1.2rem;font-weight:700;}
.r-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.r-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.r-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.r-list{margin:0;padding:0;list-style:none;}
.r-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.r-list li:last-child{border-bottom:none;}
.r-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#dbeafe;color:#1d4ed8;font-weight:700;}
.r-tag-lib{background:#dcfce7;color:#166534;}
.r-tag-fn{background:#dbeafe;color:#1d4ed8;}
.r-tag-class{background:#fef9c3;color:#854d0e;}
.r-tag-src{background:#ede9fe;color:#7c3aed;}
.r-tag-kind{background:#e0f2fe;color:#0369a1;}
.r-name{font-weight:600;}
.r-param{color:#0e7490;}
.r-default{color:#9f1239;}
.r-lib{font-family:ui-monospace,monospace;font-size:13px;color:#276dc3;font-weight:700;}
.r-val{color:#5a6678;}
`;

// ── Pure parser (DOM-free, exported for unit testing) ───────────────────────────

// Remove `#`-to-EOL comments while respecting string literals (so a `#` inside a
// string is kept). Strings are preserved intact.
function stripComments(text) {
  let out = '', q = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { out += ch; if (ch === '\\') { out += text[++i] || ''; } else if (ch === q) q = null; continue; }
    if (ch === '#') { while (i < text.length && text[i] !== '\n') i++; out += '\n'; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { q = ch; out += ch; continue; }
    out += ch;
  }
  return out;
}

// Split into top-level statements: boundary at newline or `;` while bracket depth
// is 0 and not inside a string. A multi-line `f <- function(...) { ... }` (body in
// braces) therefore collapses into ONE statement, so its inner assignments are not
// mistaken for top-level ones.
function topStatements(src) {
  const out = [];
  let buf = '', depth = 0, q = null;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (q) { buf += ch; if (ch === '\\') { buf += src[++i] || ''; } else if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { q = ch; buf += ch; continue; }
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth = Math.max(0, depth - 1);
    if ((ch === '\n' || ch === ';') && depth === 0) { if (buf.trim()) out.push(buf); buf = ''; continue; }
    buf += ch;
  }
  if (buf.trim()) out.push(buf);
  return out.map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

// Split a parameter / argument list on top-level commas (bracket- and string-aware).
function splitTopCommas(s) {
  const out = [];
  let buf = '', depth = 0, q = null;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) { buf += ch; if (ch === '\\') { buf += s[++i] || ''; } else if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { q = ch; buf += ch; continue; }
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) { out.push(buf); buf = ''; continue; }
    buf += ch;
  }
  out.push(buf);
  return out.map((x) => x.trim()).filter(Boolean);
}

// Inner text of the bracket group opened at `openIdx`.
function balancedInner(s, openIdx) {
  let depth = 0, q = null;
  for (let i = openIdx; i < s.length; i++) {
    const ch = s[i];
    if (q) { if (ch === '\\') { i++; continue; } if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { q = ch; continue; }
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') { depth--; if (depth === 0) return s.slice(openIdx + 1, i); }
  }
  return s.slice(openIdx + 1);
}

// "name" or "name = default" — default may itself contain nested parens/commas.
function parseParam(p) {
  let depth = 0, q = null;
  for (let i = 0; i < p.length; i++) {
    const ch = p[i];
    if (q) { if (ch === '\\') { i++; continue; } if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { q = ch; continue; }
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    if (ch === '=' && depth === 0) {
      const prev = p[i - 1], next = p[i + 1];
      if (prev === '=' || prev === '!' || prev === '<' || prev === '>' || next === '=') continue;
      return { name: p.slice(0, i).trim(), default: p.slice(i + 1).trim() || null };
    }
  }
  return { name: p.trim(), default: null };
}

const unbacktick = (n) => n.replace(/^`|`$/g, '');

// Short kind label for an assignment's right-hand side.
function valueKind(v) {
  v = v.trim();
  if (/^data\.frame\s*\(/.test(v)) return 'data.frame';
  if (/^(c|list|vector|matrix|array|factor)\s*\(/.test(v)) return v.match(/^(\w+)/)[1] + '()';
  if (/^(read\.[\w.]+|read_[\w]+|fread)\s*\(/.test(v)) return 'data import';
  if (/^(TRUE|FALSE|T|F)\b/.test(v)) return 'logical';
  if (/^["'`]/.test(v)) return 'string';
  if (/^-?\.?\d[\d.eE+-]*L?$/.test(v)) return 'numeric';
  if (/^[\w.]+\s*\(/.test(v)) return 'call';
  return null;
}

export function analyzeR(text) {
  const clean = stripComments(String(text || ''));
  const libraries = [], functions = [], assignments = [], classes = [], sources = [];

  for (const st of topStatements(clean)) {
    let m;

    // library(pkg) / require(pkg)  — pkg may be bare or quoted
    if ((m = st.match(/^(?:library|require)\s*\(\s*["'`]?([\w.]+)/))) {
      if (!libraries.includes(m[1])) libraries.push(m[1]);
      continue;
    }

    // source("path") includes
    if ((m = st.match(/^source\s*\(\s*["'`]?([^"'`)]+)/))) {
      sources.push(m[1].trim());
      continue;
    }

    // function definition: name <- function(params) ...
    if ((m = st.match(/^(`[^`]+`|[\w.]+)\s*(?:<<-|<-|=)\s*function\s*\(/))) {
      const open = st.indexOf('(', st.search(/function\s*\(/));
      const params = splitTopCommas(balancedInner(st, open)).map(parseParam);
      functions.push({ name: unbacktick(m[1]), params });
      continue;
    }

    // S4 / R5 class machinery: setClass / setRefClass / setGeneric / setMethod
    if ((m = st.match(/^(?:[\w.]+\s*(?:<<-|<-|=)\s*)?set(Class|RefClass|Generic|Method)\s*\(\s*["'`]?([\w.]+)/))) {
      classes.push({ kind: 'set' + m[1], name: m[2] });
      continue;
    }

    // top-level left assignment: name <- value  (constant / data)
    if ((m = st.match(/^(`[^`]+`|[\w.]+)\s*(?:<<-|<-|=)\s*([\s\S]+)$/))) {
      const value = m[2].trim();
      assignments.push({ name: unbacktick(m[1]), kind: valueKind(value), value });
      continue;
    }

    // top-level right assignment: value -> name
    if ((m = st.match(/^([\s\S]+?)\s*->>?\s*(`[^`]+`|[\w.]+)\s*$/))) {
      const value = m[1].trim();
      assignments.push({ name: unbacktick(m[2]), kind: valueKind(value), value });
      continue;
    }
  }

  return { libraries, functions, assignments, classes, sources };
}

// ── Rendering ───────────────────────────────────────────────────────────────────

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'r-section';
  const hd = document.createElement('div');
  hd.className = 'r-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'r-list'; sec.appendChild(ul); return ul; }
function tag(cls, t) { return `<span class="r-tag ${cls}">${esc(t)}</span>`; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
function paramsHtml(params) {
  return params.map((p) => {
    const def = p.default != null ? ` = <span class="r-default">${esc(p.default)}</span>` : '';
    return `<span class="r-param">${esc(p.name)}</span>${def}`;
  }).join(', ');
}
const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

export async function render(intake) {
  const text = intake.text || '';
  const preview = text.slice(0, 3000);
  if (!/<-/.test(preview) && !/library\(/.test(preview) && !/function\(/.test(preview)) return null;

  const { libraries, functions, assignments, classes, sources } = analyzeR(text);

  const host = document.createElement('div');
  host.className = 'r-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'r-title';
  const badge = document.createElement('span');
  badge.className = 'r-badge';
  badge.textContent = 'R Script';
  title.appendChild(badge);
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'r-sub';
  sub.textContent = [
    libraries.length && `${libraries.length} librar${libraries.length !== 1 ? 'ies' : 'y'}`,
    functions.length && `${functions.length} function${functions.length !== 1 ? 's' : ''}`,
    assignments.length && `${assignments.length} assignment${assignments.length !== 1 ? 's' : ''}`,
    classes.length && `${classes.length} class def${classes.length !== 1 ? 's' : ''}`,
    sources.length && `${sources.length} source${sources.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'r-cards';
  for (const { value, label } of [
    { value: libraries.length, label: 'Libraries' },
    { value: functions.length, label: 'Functions' },
    { value: assignments.length, label: 'Assignments' },
    { value: classes.length, label: 'Classes' },
    { value: sources.length, label: 'Sources' },
  ]) {
    const card = document.createElement('div');
    card.className = 'r-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (libraries.length) {
    const ul = makeList(makeSection(host, `Libraries (${libraries.length})`));
    for (const lib of libraries) row(ul, `${tag('r-tag-lib', 'library')} <span class="r-lib">${esc(lib)}</span>`);
  }

  if (sources.length) {
    const ul = makeList(makeSection(host, `Sources (${sources.length})`));
    for (const src of sources) row(ul, `${tag('r-tag-src', 'source')} <span class="r-name">${esc(src)}</span>`);
  }

  if (classes.length) {
    const ul = makeList(makeSection(host, `Classes (${classes.length})`));
    for (const c of classes) row(ul, `${tag('r-tag-class', c.kind)} <span class="r-name">${esc(c.name)}</span>`);
  }

  if (functions.length) {
    const ul = makeList(makeSection(host, `Functions (${functions.length})`));
    for (const f of functions) {
      row(ul, `${tag('r-tag-fn', 'fn')} <span class="r-name">${esc(f.name)}</span>(${paramsHtml(f.params)})`);
    }
  }

  if (assignments.length) {
    const ul = makeList(makeSection(host, `Assignments (${assignments.length})`));
    const MAX = 20;
    for (const a of assignments.slice(0, MAX)) {
      const kind = a.kind ? `${tag('r-tag-kind', a.kind)} ` : '';
      row(ul, `${kind}<span class="r-name">${esc(a.name)}</span> <span class="r-val">${esc('= ' + truncate(a.value, 56))}</span>`);
    }
    if (assignments.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${assignments.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  return { parentNode: host };
}
