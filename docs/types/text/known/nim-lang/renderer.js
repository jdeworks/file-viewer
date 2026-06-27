const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.nim-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.nim-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#ffe953;color:#1a1a1a;vertical-align:middle;margin-right:8px;}
.nim-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.nim-mod{font-family:ui-monospace,monospace;font-size:13px;color:#b08800;font-weight:700;}
.nim-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.nim-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.nim-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.nim-card strong{display:block;font-size:1.2rem;font-weight:700;}
.nim-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.nim-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.nim-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.nim-list{margin:0;padding:0;list-style:none;}
.nim-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.nim-list li:last-child{border-bottom:none;}
.nim-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#fef9c3;color:#713f12;font-weight:700;}
.nim-tag-proc{background:#ede9fe;color:#7c3aed;}
.nim-tag-func{background:#dbeafe;color:#1d4ed8;}
.nim-tag-method{background:#fce7f3;color:#9d174d;}
.nim-tag-iterator{background:#dcfce7;color:#14532d;}
.nim-tag-template{background:#fde68a;color:#92400e;}
.nim-tag-macro{background:#ddd6fe;color:#5b21b6;}
.nim-tag-converter{background:#cffafe;color:#155e75;}
.nim-tag-type{background:#fef9c3;color:#854d0e;}
.nim-tag-enum{background:#dcfce7;color:#166534;}
.nim-tag-import{background:#e0f2fe;color:#0369a1;}
.nim-star{font-size:10px;padding:1px 5px;border-radius:4px;background:#fee2e2;color:#b91c1c;font-weight:700;}
.nim-name{font-weight:600;}
.nim-type{color:#0e7490;}
.nim-ret{color:#1d4ed8;}
.nim-val{color:#0a6640;}
.nim-vals{color:#15803d;}
`;

// ---------------------------------------------------------------------------
// Pure, DOM-free parser. Nim is indentation-significant; comments are `#` (to
// end of line) and `#[ ... ]#` (block, nestable). Exported for unit testing.
// ---------------------------------------------------------------------------

const ROUTINE_KW = ['proc', 'func', 'method', 'iterator', 'template', 'macro', 'converter'];

// Strip nestable `#[ ... ]#` block comments, preserving newlines/columns.
function stripBlockComments(text) {
  let out = '', depth = 0, inStr = false, strCh = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (depth > 0) {
      if (c === '#' && n === '[') { depth++; i++; continue; }
      if (c === ']' && n === '#') { depth--; i++; continue; }
      if (c === '\n') out += '\n';
      continue;
    }
    if (inStr) {
      out += c;
      if (c === '\\') { if (n != null) { out += n; i++; } continue; }
      if (c === strCh) inStr = false;
      continue;
    }
    if (c === '#' && n === '[') { depth++; i++; continue; }
    if (c === '"' || c === "'") { inStr = true; strCh = c; out += c; continue; }
    out += c;
  }
  return out;
}

// Strip a trailing `#` line comment, respecting string/char literals.
function stripLineComment(line) {
  let inStr = false, strCh = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inStr) { if (c === '\\') { i++; continue; } if (c === strCh) inStr = false; continue; }
    if (c === '"' || c === "'") { inStr = true; strCh = c; continue; }
    if (c === '#') return line.slice(0, i);
  }
  return line;
}

// Net `(` minus `)` on a line, ignoring parens inside literals.
function parenDelta(s) {
  let d = 0, inStr = false, ch = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) { if (c === '\\') { i++; continue; } if (c === ch) inStr = false; continue; }
    if (c === '"' || c === "'") { inStr = true; ch = c; continue; }
    if (c === '(') d++; else if (c === ')') d--;
  }
  return d;
}

// First balanced `( ... )` group: returns {inner, end} or null.
function extractParens(s) {
  const start = s.indexOf('(');
  if (start < 0) return null;
  let depth = 0;
  for (let k = start; k < s.length; k++) {
    if (s[k] === '(') depth++;
    else if (s[k] === ')') { depth--; if (depth === 0) return { inner: s.slice(start + 1, k), end: k }; }
  }
  return null;
}

// Split on top-level `,`/`;`, respecting (), [], {} nesting.
function splitTop(s) {
  const out = []; let depth = 0, buf = '';
  for (const c of s) {
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth = Math.max(0, depth - 1);
    if (depth === 0 && (c === ',' || c === ';')) { out.push(buf); buf = ''; } else buf += c;
  }
  if (buf.trim()) out.push(buf);
  return out;
}

// Index of the first top-level `:` (skips nested brackets), or -1.
function topColon(s) {
  let depth = 0;
  for (let k = 0; k < s.length; k++) {
    const c = s[k];
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth = Math.max(0, depth - 1);
    else if (c === ':' && depth === 0) return k;
  }
  return -1;
}

// Parse a routine/tuple parameter list. Handles shared types (`a, b: int`),
// `;`/`,` separators and `= default` values. Returns [{name, type}].
function parseParams(inner) {
  if (!inner.trim()) return [];
  const params = []; let pending = [];
  for (const seg of splitTop(inner)) {
    const s = seg.trim();
    if (!s) continue;
    const ci = topColon(s);
    if (ci >= 0) {
      const name = s.slice(0, ci).trim();
      let type = s.slice(ci + 1).trim();
      const eq = type.indexOf('=');
      if (eq >= 0) type = type.slice(0, eq).trim();
      pending.push(name);
      for (const nm of pending) params.push({ name: nm.replace(/\*$/, '').trim(), type });
      pending = [];
    } else { pending.push(s); }
  }
  for (const nm of pending) params.push({ name: nm.replace(/\*$/, '').trim(), type: '' });
  return params;
}

// Object/tuple field lines → [{name, type, exported}] (shared types supported).
function parseFields(children) {
  const fields = [];
  for (const ch of children) {
    const t = ch.text.trim();
    const ci = topColon(t);
    if (ci < 0) continue;
    const namePart = t.slice(0, ci);
    let type = t.slice(ci + 1).trim();
    const eq = type.indexOf('=');
    if (eq >= 0) type = type.slice(0, eq).trim();
    type = type.replace(/\{\.[\s\S]*?\.\}/g, '').trim();
    for (const rawN of namePart.split(',')) {
      const n0 = rawN.trim();
      const exported = /\*$/.test(n0);
      const nm = n0.replace(/\*$/, '').trim();
      if (/^[A-Za-z_]\w*$/.test(nm)) fields.push({ name: nm, type, exported });
    }
  }
  return fields;
}

function splitImports(spec) {
  return spec.split(',').map((s) => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
}

// Parse a `type` region (the inline def plus all deeper-indented lines).
function parseTypeRegion(region, types, enums) {
  if (!region.length) return;
  const base = Math.min(...region.map((r) => r.indent));
  let k = 0;
  while (k < region.length) {
    const def = region[k];
    if (def.indent > base) { k++; continue; }
    const children = [];
    let kk = k + 1;
    while (kk < region.length && region[kk].indent > def.indent) { children.push(region[kk]); kk++; }
    k = kk;
    const dm = def.text.match(/^([A-Za-z_]\w*)\s*(\*)?\s*(?:\[[^\]]*\])?\s*(?:\{\.[^}]*\.\})?\s*=\s*(.*)$/);
    if (!dm) continue;
    const name = dm[1], exported = !!dm[2];
    const rhs = dm[3].trim();

    if (/^enum\b/.test(rhs)) {
      const values = [];
      const pushVals = (s) => { for (const part of s.split(',')) { const v = part.trim().split('=')[0].replace(/\*/g, '').trim(); const vm = v.match(/^[A-Za-z_]\w*/); if (vm) values.push(vm[0]); } };
      const inlineVals = rhs.replace(/^enum\b/, '').trim();
      if (inlineVals) pushVals(inlineVals);
      for (const ch of children) pushVals(ch.text);
      enums.push({ name, values, exported });
      continue;
    }
    if (/^(ref\s+|ptr\s+)?object\b/.test(rhs)) {
      const kind = /^ref/.test(rhs) ? 'ref object' : /^ptr/.test(rhs) ? 'ptr object' : 'object';
      types.push({ name, kind, fields: parseFields(children), exported });
      continue;
    }
    if (/^tuple\b/.test(rhs)) {
      const inner = (rhs.match(/\[([\s\S]*)\]/) || [])[1];
      const fields = inner != null
        ? parseParams(inner).map((p) => ({ name: p.name, type: p.type, exported: false }))
        : parseFields(children);
      types.push({ name, kind: 'tuple', fields, exported });
      continue;
    }
    let kind = 'alias';
    if (/^distinct\b/.test(rhs)) kind = 'distinct';
    else if (/^ref\b/.test(rhs)) kind = 'ref';
    else if (/^ptr\b/.test(rhs)) kind = 'ptr';
    else if (/^concept\b/.test(rhs)) kind = 'concept';
    types.push({ name, kind, fields: [], exported, base: rhs });
  }
}

export function analyzeNim(text) {
  const clean = stripBlockComments(String(text || ''));
  const lines = clean.split(/\r?\n/).map((l) => {
    const noTab = l.replace(/\t/g, '  ');
    const body = stripLineComment(noTab);
    const m = body.match(/^(\s*)(.*)$/);
    return { indent: m[1].length, text: m[2].replace(/\s+$/, '') };
  });

  const imports = [], routines = [], types = [], enums = [], consts = [];
  let i = 0;
  while (i < lines.length) {
    const { indent, text } = lines[i];
    if (!text) { i++; continue; }
    let m;

    if ((m = text.match(/^import\s+(.+)$/))) { imports.push(...splitImports(m[1])); i++; continue; }
    if ((m = text.match(/^from\s+([\w./]+)\s+import\b/))) { imports.push(m[1]); i++; continue; }
    if ((m = text.match(/^include\s+(.+)$/))) { imports.push(...splitImports(m[1])); i++; continue; }

    // Routine: collect a possibly multi-line signature, then skip its body.
    const rkw = ROUTINE_KW.find((k) => new RegExp('^' + k + '\\b').test(text));
    if (rkw) {
      let depth = parenDelta(text), end = i;
      while (depth > 0 && end + 1 < lines.length) { end++; depth += parenDelta(lines[end].text); }
      const sig = lines.slice(i, end + 1).map((l) => l.text).join(' ');
      const hm = sig.match(new RegExp('^' + rkw + '\\s+(`[^`]+`|[A-Za-z_]\\w*)(\\*)?'));
      if (hm) {
        const paren = extractParens(sig);
        const params = paren ? parseParams(paren.inner) : [];
        let after = (paren ? sig.slice(paren.end + 1) : sig.slice(hm[0].length)).replace(/\{\.[\s\S]*?\.\}/g, '');
        const eq = after.indexOf('=');
        if (eq >= 0) after = after.slice(0, eq);
        const rm = after.match(/^\s*:\s*(.+)$/);
        routines.push({ kind: rkw, name: hm[1], params, returns: rm ? rm[1].trim() : '', exported: !!hm[2] });
      }
      i = end + 1;
      while (i < lines.length && (lines[i].text === '' || lines[i].indent > indent)) i++;
      continue;
    }

    // type / const / let / var: gather inline def + deeper-indented block lines.
    if ((m = text.match(/^type\b(.*)$/))) {
      const region = [];
      const inline = m[1].trim();
      if (inline) region.push({ indent, text: inline });
      let j = i + 1;
      while (j < lines.length && (lines[j].text === '' || lines[j].indent > indent)) { if (lines[j].text) region.push(lines[j]); j++; }
      i = j;
      parseTypeRegion(region, types, enums);
      continue;
    }
    if ((m = text.match(/^(const|let|var)\b(.*)$/))) {
      const kind = m[1];
      const entries = [];
      if (m[2].trim()) entries.push(m[2].trim());
      let j = i + 1;
      while (j < lines.length && (lines[j].text === '' || lines[j].indent > indent)) { if (lines[j].text) entries.push(lines[j].text); j++; }
      i = j;
      for (const e of entries) {
        const cm = e.match(/^([A-Za-z_]\w*)\s*(\*)?\s*(?::\s*([^=]+?))?\s*(?:=\s*(.+))?$/);
        if (cm && (cm[3] || cm[4])) consts.push({ kind, name: cm[1], exported: !!cm[2], type: (cm[3] || '').trim(), value: (cm[4] || '').trim() });
      }
      continue;
    }
    i++;
  }
  return { imports, routines, types, enums, consts };
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'nim-section';
  const hd = document.createElement('div');
  hd.className = 'nim-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'nim-list'; sec.appendChild(ul); return ul; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
function tag(cls, t) { return `<span class="nim-tag ${cls}">${esc(t)}</span>`; }
const star = (exp) => (exp ? ' <span class="nim-star">*</span>' : '');

function paramsHtml(params) {
  return params.map((p) => p.type
    ? `${esc(p.name)}: <span class="nim-type">${esc(p.type)}</span>`
    : esc(p.name)).join(', ');
}

export function render(intake) {
  const text = intake.text || '';
  const base = (intake.name || intake.filename || '').split('/').pop().replace(/\.nim$/i, '');
  const { imports, routines, types, enums, consts } = analyzeNim(text);

  const host = document.createElement('div');
  host.className = 'nim-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'nim-title';
  const badge = document.createElement('span');
  badge.className = 'nim-badge';
  badge.textContent = 'Nim';
  title.appendChild(badge);
  if (base) { const n = document.createElement('span'); n.className = 'nim-mod'; n.textContent = base; title.appendChild(n); }
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'nim-sub';
  sub.textContent = [
    imports.length && `${imports.length} import${imports.length !== 1 ? 's' : ''}`,
    routines.length && `${routines.length} routine${routines.length !== 1 ? 's' : ''}`,
    types.length && `${types.length} type${types.length !== 1 ? 's' : ''}`,
    enums.length && `${enums.length} enum${enums.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ') || 'Nim source module';
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'nim-cards';
  for (const { value, label } of [
    { value: imports.length, label: 'Imports' },
    { value: routines.length, label: 'Routines' },
    { value: types.length, label: 'Types' },
    { value: enums.length, label: 'Enums' },
    { value: consts.length, label: 'Consts' },
  ]) {
    const card = document.createElement('div');
    card.className = 'nim-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (imports.length) {
    const ul = makeList(makeSection(host, `Imports (${imports.length})`));
    for (const im of imports) row(ul, `${tag('nim-tag-import', 'import')} <span class="nim-name">${esc(im)}</span>`);
  }

  if (types.length) {
    const ul = makeList(makeSection(host, `Types (${types.length})`));
    for (const t of types) {
      const fields = (t.fields && t.fields.length)
        ? ' { ' + t.fields.map((f) => `${esc(f.name)}: <span class="nim-type">${esc(f.type)}</span>`).join(', ') + ' }'
        : (t.base ? ` = <span class="nim-type">${esc(t.base)}</span>` : '');
      row(ul, `${tag('nim-tag-type', t.kind)} <span class="nim-name">${esc(t.name)}</span>${star(t.exported)}${fields}`);
    }
  }

  if (enums.length) {
    const ul = makeList(makeSection(host, `Enums (${enums.length})`));
    for (const e of enums) {
      const vals = e.values.length ? ` <span class="nim-vals">${esc(e.values.join(' | '))}</span>` : '';
      row(ul, `${tag('nim-tag-enum', 'enum')} <span class="nim-name">${esc(e.name)}</span>${star(e.exported)}${vals}`);
    }
  }

  if (routines.length) {
    const ul = makeList(makeSection(host, `Routines (${routines.length})`));
    for (const r of routines) {
      const ret = r.returns ? `: <span class="nim-ret">${esc(r.returns)}</span>` : '';
      row(ul, `${tag('nim-tag-' + r.kind, r.kind)} <span class="nim-name">${esc(r.name)}</span>${star(r.exported)}(${paramsHtml(r.params)})${ret}`);
    }
  }

  if (consts.length) {
    const ul = makeList(makeSection(host, `Constants & Variables (${consts.length})`));
    for (const c of consts) {
      const ty = c.type ? `: <span class="nim-type">${esc(c.type)}</span>` : '';
      const val = c.value ? ` = <span class="nim-val">${esc(c.value)}</span>` : '';
      row(ul, `${tag('nim-tag', c.kind)} <span class="nim-name">${esc(c.name)}</span>${star(c.exported)}${ty}${val}`);
    }
  }

  return { parentNode: host };
}
