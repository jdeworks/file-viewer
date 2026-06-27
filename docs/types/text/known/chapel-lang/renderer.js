const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.chpl-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.chpl-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#16a34a;color:#fff;vertical-align:middle;margin-right:8px;}
.chpl-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.chpl-mod{font-family:ui-monospace,monospace;font-size:15px;color:#15803d;font-weight:700;}
.chpl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.chpl-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.chpl-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:90px;}
.chpl-card strong{display:block;font-size:1.2rem;font-weight:700;}
.chpl-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.chpl-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.chpl-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.chpl-list{margin:0;padding:0;list-style:none;}
.chpl-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.chpl-list li:last-child{border-bottom:none;}
.chpl-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;}
.chpl-tag-use{background:#dcfce7;color:#166534;}
.chpl-tag-import{background:#cffafe;color:#0e7490;}
.chpl-tag-proc{background:#ede9fe;color:#7c3aed;}
.chpl-tag-iter{background:#fae8ff;color:#a21caf;}
.chpl-tag-record{background:#fef9c3;color:#854d0e;}
.chpl-tag-class{background:#ffe4e6;color:#9f1239;}
.chpl-tag-field{background:#e0f2fe;color:#0369a1;}
.chpl-tag-config{background:#dbeafe;color:#1d4ed8;}
.chpl-tag-par{background:#f3e8ff;color:#7e22ce;}
.chpl-name{font-weight:600;}
.chpl-type{color:#0e7490;}
.chpl-intent{color:#9f1239;font-style:italic;}
.chpl-ret{color:#1d4ed8;}
.chpl-val{color:#9333ea;}
.chpl-parent{color:var(--fg-2,#777);}
.chpl-field-row{padding-left:30px !important;}
`;

// Strip Chapel comments (line `//` and block `/* */`) so structural scans don't trip on prose.
function stripComments(src) {
  return String(src || '').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, '');
}

// Split `s` on `sep` at bracket depth 0 (so commas/colons inside (), [], {} stay grouped).
function splitTop(s, sep) {
  const out = [];
  let depth = 0, buf = '';
  for (const ch of s) {
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth = Math.max(0, depth - 1);
    if (ch === sep && depth === 0) { out.push(buf); buf = ''; } else buf += ch;
  }
  out.push(buf);
  return out;
}

// "in arr: [] int = expr" -> { name, type, intent }. Type may be empty (generic/inferred).
function parseParams(raw) {
  if (!raw.trim()) return [];
  return splitTop(raw, ',').map((g) => g.trim()).filter(Boolean).map((g) => {
    const decl = splitTop(g, '=')[0].trim();              // drop default value
    const colon = splitTop(decl, ':');
    const head = colon[0].trim();
    const type = colon.length > 1 ? colon.slice(1).join(':').trim() : '';
    const hm = head.match(/^(?:(const\s+ref|const\s+in|const|ref|in|out|inout|param|type)\s+)?([\w$]+)$/);
    return { name: hm ? hm[2] : head, type, intent: hm && hm[1] ? hm[1].replace(/\s+/g, ' ') : '' };
  });
}

// Pull every `proc`/`iter` SIGNATURE (typed params + return type) out of comment-stripped source.
// Paren-aware so a param list spread over multiple lines still collapses into one callable.
function extractCallables(src, keyword) {
  const out = [];
  const re = new RegExp(`(?<![\\w.])${keyword}\\b`, 'g');
  let m;
  while ((m = re.exec(src))) {
    let i = re.lastIndex;
    while (i < src.length && /\s/.test(src[i])) i++;
    let name = '';
    if (src[i] === '"') {                                  // operator overload e.g. proc "+"(...)
      let j = i + 1; while (j < src.length && src[j] !== '"') j++; name = src.slice(i, j + 1); i = j + 1;
    } else {
      const start = i; while (i < src.length && /[\w.$]/.test(src[i])) i++; name = src.slice(start, i);
    }
    if (!name) continue;
    while (i < src.length && /\s/.test(src[i])) i++;
    let params = [];
    if (src[i] === '(') {                                  // capture matching () paren-aware
      let depth = 0, j = i;
      for (; j < src.length; j++) { const c = src[j]; if (c === '(') depth++; else if (c === ')') { depth--; if (depth === 0) { j++; break; } } }
      params = parseParams(src.slice(i + 1, j - 1));
      i = j;
    }
    let returns = '';
    const rm = src.slice(i).match(/^\s*(?:(?:const\s+ref|const|ref|param|type)\s+)?:\s*([^{\n;]+?)\s*(?=\bwhere\b|\bthrows\b|\blifetime\b|\{|;|\n|$)/);
    if (rm) returns = rm[1].trim();
    out.push({ name, params, returns });
  }
  return out;
}

// First module/use path token from a comma segment (drops `only`/`except`/`as` clauses).
function modToken(seg) { const t = seg.trim().match(/^[\w.]+/); return t ? t[0] : seg.trim(); }

// Parse Chapel source into structured facts. Exported (pure, DOM-free) for unit testing.
export function analyzeChapel(text) {
  const src = stripComments(text);
  const lines = src.split(/\r?\n/);

  const modules = [], uses = [], imports = [], configs = [], records = [];
  for (const raw of lines) {
    const t = raw.trim();
    if (!t) continue;
    let m;
    if ((m = t.match(/\bmodule\s+(\w+)/)) && !modules.includes(m[1])) modules.push(m[1]);
    if ((m = t.match(/^public\s+use\s+(.+?);?\s*$/)) || (m = t.match(/^use\s+(.+?);?\s*$/))) {
      for (const seg of splitTop(m[1], ',')) { const n = modToken(seg); if (n) uses.push(n); }
    }
    if ((m = t.match(/^public\s+import\s+(.+?);?\s*$/)) || (m = t.match(/^import\s+(.+?);?\s*$/))) {
      for (const seg of splitTop(m[1], ',')) { const n = modToken(seg); if (n) imports.push(n); }
    }
    if ((m = t.match(/^config\s+(const|var|param)\s+(\w+)\s*(?::\s*([^=;]+?))?\s*(?:=\s*([^;]+?))?\s*;?\s*$/))) {
      configs.push({ kind: m[1], name: m[2], type: (m[3] || '').trim(), value: (m[4] || '').trim() });
    }
  }

  // Records & classes with their declared fields — brace-tracked so we only read direct members
  // (fields living at the body's own depth), never locals inside a method.
  let depth = 0;
  const stack = [];
  for (const raw of lines) {
    const t = raw.trim();
    const lineDepth = depth;
    let isHeader = false;
    const hm = t.match(/^(?:extern\s+)?(record|class)\s+(\w+)\s*(?::\s*([\w., ]+?))?\s*\{/);
    if (hm) {
      const rec = { kind: hm[1], name: hm[2], parent: (hm[3] || '').trim().replace(/\s+/g, ' '), fields: [], bodyDepth: lineDepth + 1 };
      records.push(rec); stack.push(rec); isHeader = true;
    }
    const top = stack[stack.length - 1];
    if (top && !isHeader && lineDepth === top.bodyDepth) {
      const fm = t.match(/^(var|const|param)\s+(\w+)\s*:\s*([^=;{]+?)\s*(?:=\s*[^;]+)?\s*;?\s*$/);
      if (fm) top.fields.push({ keyword: fm[1], name: fm[2], type: fm[3].trim() });
    }
    for (const ch of raw) { if (ch === '{') depth++; else if (ch === '}') depth = Math.max(0, depth - 1); }
    while (stack.length && depth < stack[stack.length - 1].bodyDepth) stack.pop();
  }

  const procs = extractCallables(src, 'proc');
  const iters = extractCallables(src, 'iter');

  const count = (kw) => (src.match(new RegExp(`(?<![\\w.])${kw}\\b`, 'g')) || []).length;
  const parallelConstructs = {
    forall: count('forall'), coforall: count('coforall'),
    begin: count('begin'), cobegin: count('cobegin'),
    sync: count('sync'), atomic: count('atomic'), on: count('on'),
  };
  parallelConstructs.total = Object.values(parallelConstructs).reduce((a, b) => a + b, 0);

  return { modules, uses, imports, procs, iters, records, configs, parallelConstructs };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'chpl-section';
  const hd = document.createElement('div');
  hd.className = 'chpl-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'chpl-list'; sec.appendChild(ul); return ul; }
function tag(cls, t) { return `<span class="chpl-tag ${cls}">${esc(t)}</span>`; }
function row(ul, html, cls) { const li = document.createElement('li'); if (cls) li.className = cls; li.innerHTML = html; ul.appendChild(li); }
function paramsHtml(params) {
  return params.map((p) => {
    const intent = p.intent ? `<span class="chpl-intent">${esc(p.intent)}</span> ` : '';
    const type = p.type ? `: <span class="chpl-type">${esc(p.type)}</span>` : '';
    return `${intent}<span class="chpl-name">${esc(p.name)}</span>${type}`;
  }).join(', ');
}
function callableRow(ul, c, tagCls, tagText) {
  const ret = c.returns ? ` : <span class="chpl-ret">${esc(c.returns)}</span>` : '';
  row(ul, `${tag(tagCls, tagText)} <span class="chpl-name">${esc(c.name)}</span>(${paramsHtml(c.params)})${ret}`);
}

export async function render(intake) {
  const text = intake.text || '';
  const preview = text.slice(0, 4000);
  if (!/\bproc\b/.test(preview) && !/\bmodule\b/.test(preview) && !/\bconfig\b/.test(preview) && !/\bforall\b/.test(preview)) return null;

  const { modules, uses, imports, procs, iters, records, configs, parallelConstructs } = analyzeChapel(text);

  const host = document.createElement('div');
  host.className = 'chpl-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'chpl-title';
  const badge = document.createElement('span');
  badge.className = 'chpl-badge';
  badge.textContent = 'Chapel';
  title.appendChild(badge);
  if (modules[0]) { const n = document.createElement('span'); n.className = 'chpl-mod'; n.textContent = modules[0]; title.appendChild(n); }
  else title.appendChild(document.createTextNode('Source File'));
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'chpl-sub';
  sub.textContent = [
    modules.length && `${modules.length} module${modules.length !== 1 ? 's' : ''}`,
    procs.length && `${procs.length} proc${procs.length !== 1 ? 's' : ''}`,
    iters.length && `${iters.length} iterator${iters.length !== 1 ? 's' : ''}`,
    records.length && `${records.length} type${records.length !== 1 ? 's' : ''}`,
    parallelConstructs.total && `${parallelConstructs.total} parallel construct${parallelConstructs.total !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'chpl-cards';
  for (const { value, label } of [
    { value: uses.length + imports.length, label: 'Uses' },
    { value: procs.length, label: 'Procs' },
    { value: iters.length, label: 'Iterators' },
    { value: records.length, label: 'Types' },
    { value: configs.length, label: 'Configs' },
    { value: parallelConstructs.total, label: 'Parallel' },
  ]) {
    const card = document.createElement('div');
    card.className = 'chpl-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (uses.length || imports.length) {
    const ul = makeList(makeSection(host, `Uses & Imports (${uses.length + imports.length})`));
    for (const u of uses) row(ul, `${tag('chpl-tag-use', 'use')} <span class="chpl-name">${esc(u)}</span>`);
    for (const im of imports) row(ul, `${tag('chpl-tag-import', 'import')} <span class="chpl-name">${esc(im)}</span>`);
  }

  if (configs.length) {
    const ul = makeList(makeSection(host, `Config Declarations (${configs.length})`));
    for (const c of configs) {
      const type = c.type ? ` : <span class="chpl-type">${esc(c.type)}</span>` : '';
      const val = c.value ? ` = <span class="chpl-val">${esc(c.value)}</span>` : '';
      row(ul, `${tag('chpl-tag-config', 'config ' + c.kind)} <span class="chpl-name">${esc(c.name)}</span>${type}${val}`);
    }
  }

  if (records.length) {
    const ul = makeList(makeSection(host, `Records & Classes (${records.length})`));
    for (const r of records) {
      const parent = r.parent ? ` <span class="chpl-parent">: ${esc(r.parent)}</span>` : '';
      row(ul, `${tag(r.kind === 'class' ? 'chpl-tag-class' : 'chpl-tag-record', r.kind)} <span class="chpl-name">${esc(r.name)}</span>${parent}`);
      for (const f of r.fields) {
        row(ul, `${tag('chpl-tag-field', f.keyword)} <span class="chpl-name">${esc(f.name)}</span> : <span class="chpl-type">${esc(f.type)}</span>`, 'chpl-field-row');
      }
    }
  }

  if (procs.length) {
    const ul = makeList(makeSection(host, `Procedures (${procs.length})`));
    for (const p of procs) callableRow(ul, p, 'chpl-tag-proc', 'proc');
  }

  if (iters.length) {
    const ul = makeList(makeSection(host, `Iterators (${iters.length})`));
    for (const it of iters) callableRow(ul, it, 'chpl-tag-iter', 'iter');
  }

  if (parallelConstructs.total) {
    const ul = makeList(makeSection(host, 'Parallel Constructs'));
    for (const [name, n] of Object.entries(parallelConstructs)) {
      if (name === 'total' || !n) continue;
      row(ul, `${tag('chpl-tag-par', name)} <span class="chpl-val">${n}</span> occurrence${n !== 1 ? 's' : ''}`);
    }
  }

  return { parentNode: host };
}
