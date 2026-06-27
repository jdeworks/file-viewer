const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.agda-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.agda-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0ea5e9;color:#fff;vertical-align:middle;margin-right:8px;}
.agda-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.agda-mod{font-family:ui-monospace,monospace;font-size:15px;color:#0369a1;font-weight:700;}
.agda-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.agda-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.agda-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:104px;}
.agda-card strong{display:block;font-size:1.2rem;font-weight:700;}
.agda-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.agda-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.agda-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.agda-list{margin:0;padding:0;list-style:none;}
.agda-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.agda-list li:last-child{border-bottom:none;}
.agda-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;}
.agda-tag-import{background:#dcfce7;color:#166534;}
.agda-tag-data{background:#fef9c3;color:#854d0e;}
.agda-tag-record{background:#ede9fe;color:#7c3aed;}
.agda-tag-func{background:#dbeafe;color:#1d4ed8;}
.agda-tag-postulate{background:#ffe4e6;color:#9f1239;}
.agda-tag-cons{background:#e0f2fe;color:#0369a1;}
.agda-tag-field{background:#e0f2fe;color:#0369a1;}
.agda-name{font-weight:600;}
.agda-type{color:#0e7490;}
.agda-sig{padding-left:6px;}
.agda-sub-list{margin:0;padding:2px 0 6px 22px;list-style:none;width:100%;}
.agda-sub-list li{border:none;padding:2px 0;font-size:12px;}
.agda-pre{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:14px;overflow:auto;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;margin-top:16px;white-space:pre-wrap;word-break:break-word;}
.agda-kw{color:#1d4ed8;font-weight:700;}
.agda-str{color:#b91c1c;}
.agda-num{color:#059669;}
.agda-comment{color:#888;font-style:italic;}
`;

const AGDA_KWS = [
  'module', 'where', 'import', 'open', 'using', 'hiding', 'renaming',
  'data', 'record', 'field', 'constructor', 'postulate',
  'with', 'rewrite', 'infix', 'infixl', 'infixr',
  'let', 'in', 'if', 'then', 'else', 'do',
  'forall', 'Set', 'Prop', 'Level',
  'abstract', 'private', 'instance', 'macro',
  'mutual', 'codata', 'coinductive',
  'variable', 'pattern', 'syntax',
];

const RESERVED = new Set([
  'module', 'where', 'import', 'open', 'data', 'record', 'field', 'constructor',
  'postulate', 'infix', 'infixl', 'infixr', 'mutual', 'abstract', 'private',
  'instance', 'macro', 'variable', 'pattern', 'syntax', 'using', 'hiding', 'renaming',
]);

// Strip line + block comments (incl. {-# pragmas #-}) while preserving line structure & indentation.
// Returns [{ indent, trimmed }] — pure, used by the parser only (the highlighter reads raw text).
function cleanLines(raw) {
  const rawLines = String(raw || '').split(/\r?\n/);
  const out = [];
  let inBlock = false;
  for (const line of rawLines) {
    let cleaned = '', i = 0;
    while (i < line.length) {
      if (inBlock) {
        const end = line.indexOf('-}', i);
        if (end >= 0) { inBlock = false; i = end + 2; } else i = line.length;
      } else {
        const bs = line.indexOf('{-', i);
        const lc = line.indexOf('--', i);
        if (lc >= 0 && (bs < 0 || lc < bs)) { cleaned += line.slice(i, lc); i = line.length; }
        else if (bs >= 0) {
          cleaned += line.slice(i, bs);
          const end = line.indexOf('-}', bs + 2);
          if (end >= 0) i = end + 2; else { inBlock = true; i = line.length; }
        } else { cleaned += line.slice(i); i = line.length; }
      }
    }
    const indent = cleaned.length - cleaned.trimStart().length;
    out.push({ indent, trimmed: cleaned.trim() });
  }
  return out;
}

// Split a `names... : type` declaration. Multiple shared names (`a b : T`) → one entry each.
function splitDecl(s) {
  const idx = s.indexOf(':');
  if (idx < 0) return null;
  const names = s.slice(0, idx).trim().split(/\s+/).filter(Boolean);
  const type = s.slice(idx + 1).trim();
  if (!names.length || !type) return null;
  return names.map((name) => ({ name, type }));
}

// Parse Agda source into structured facts. Exported (pure, DOM-free) for unit testing.
export function analyzeAgda(text) {
  const lines = cleanLines(text);
  let moduleName = '';
  const imports = [];
  const datatypes = [];
  const records = [];
  const functions = [];
  const postulates = [];
  const seenFn = new Set();

  for (let idx = 0; idx < lines.length; idx++) {
    const { indent, trimmed } = lines[idx];
    if (!trimmed) continue;

    let m;
    // module Name [params] where
    if ((m = trimmed.match(/^module\s+(\S+)/)) && /\bwhere\b/.test(trimmed)) {
      if (!moduleName) moduleName = m[1];
      continue;
    }
    // open import X / import X / open X
    if ((m = trimmed.match(/^(?:open\s+import|import|open)\s+(\S+)/))) {
      if (!imports.includes(m[1])) imports.push(m[1]);
      continue;
    }
    // data Name : Set where  → collect indented constructors
    if ((m = trimmed.match(/^data\s+([^\s:({]+)/))) {
      const constructors = [];
      let j = idx + 1;
      for (; j < lines.length; j++) {
        const ln = lines[j];
        if (!ln.trimmed) continue;
        if (ln.indent <= indent) break;
        const decl = splitDecl(ln.trimmed);
        if (decl) for (const d of decl) constructors.push(d);
      }
      datatypes.push({ name: m[1], constructors });
      idx = j - 1;
      continue;
    }
    // record Name : Set where  → constructor + fields
    if ((m = trimmed.match(/^record\s+([^\s:({]+)/))) {
      const fields = [];
      let constructor = null, inField = false, j = idx + 1;
      for (; j < lines.length; j++) {
        const ln = lines[j];
        if (!ln.trimmed) continue;
        if (ln.indent <= indent) break;
        let cm;
        if ((cm = ln.trimmed.match(/^constructor\s+(\S+)/))) { constructor = cm[1]; inField = false; continue; }
        if (/^field\b/.test(ln.trimmed)) {
          inField = true;
          const rest = ln.trimmed.replace(/^field\s*/, '');
          const decl = rest && splitDecl(rest);
          if (decl) for (const d of decl) fields.push(d);
          continue;
        }
        if (inField) { const decl = splitDecl(ln.trimmed); if (decl) for (const d of decl) fields.push(d); }
      }
      records.push({ name: m[1], fields, constructor });
      idx = j - 1;
      continue;
    }
    // postulate  → collect indented `name : type` axioms
    if (/^postulate\b/.test(trimmed)) {
      let j = idx + 1;
      for (; j < lines.length; j++) {
        const ln = lines[j];
        if (!ln.trimmed) continue;
        if (ln.indent <= indent) break;
        const decl = splitDecl(ln.trimmed);
        if (decl) for (const d of decl) postulates.push(d);
      }
      idx = j - 1;
      continue;
    }
    // Top-level function / operator type signature: `name : Type` (single name token, not a clause).
    const ci = trimmed.indexOf(':');
    if (ci > 0) {
      const lhs = trimmed.slice(0, ci).trim();
      const type = trimmed.slice(ci + 1).trim();
      if (type && /^\S+$/.test(lhs) && !RESERVED.has(lhs) && !lhs.includes('=') && !seenFn.has(lhs)) {
        seenFn.add(lhs);
        functions.push({ name: lhs, type });
      }
    }
  }

  return { module: moduleName, imports, datatypes, records, functions, postulates };
}

// ---- Syntax highlighting (display only) ----
function highlightAgdaLine(line) {
  if (!line) return '';
  let out = esc(line);
  out = out.replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;)/g, '<span class="agda-str">$1</span>');
  out = out.replace(/\b(\d+)\b/g, '<span class="agda-num">$1</span>');
  out = out.replace(/(\{-#[^#]*#-\})/g, '<span class="agda-comment">$1</span>');
  for (const kw of [...AGDA_KWS].sort((a, b) => b.length - a.length)) {
    if (/[^\w]/.test(kw)) continue;
    out = out.replace(new RegExp(`(?<![\\w])(${kw})(?![\\w])`, 'g'), '<span class="agda-kw">$1</span>');
  }
  return out;
}
function highlightAgda(text) {
  const lines = String(text || '').split(/\r?\n/);
  const result = [];
  let inBlock = false;
  for (const line of lines) {
    if (inBlock) {
      const end = line.indexOf('-}');
      if (end >= 0) { result.push(`<span class="agda-comment">${esc(line.slice(0, end + 2))}</span>` + highlightAgdaLine(line.slice(end + 2))); inBlock = false; }
      else result.push(`<span class="agda-comment">${esc(line)}</span>`);
      continue;
    }
    const bs = line.indexOf('{-');
    if (bs >= 0 && !line.slice(bs).startsWith('{-#')) {
      const be = line.indexOf('-}', bs + 2);
      if (be >= 0) result.push(highlightAgdaLine(line.slice(0, bs)) + `<span class="agda-comment">${esc(line.slice(bs, be + 2))}</span>` + highlightAgdaLine(line.slice(be + 2)));
      else { result.push(highlightAgdaLine(line.slice(0, bs)) + `<span class="agda-comment">${esc(line.slice(bs))}</span>`); inBlock = true; }
      continue;
    }
    const lc = line.indexOf('--');
    if (lc >= 0) { result.push(highlightAgdaLine(line.slice(0, lc)) + `<span class="agda-comment">${esc(line.slice(lc))}</span>`); continue; }
    result.push(highlightAgdaLine(line));
  }
  return result.join('\n');
}

// ---- DOM helpers ----
function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'agda-section';
  const hd = document.createElement('div');
  hd.className = 'agda-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'agda-list'; sec.appendChild(ul); return ul; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
function tag(cls, t) { return `<span class="agda-tag ${cls}">${esc(t)}</span>`; }
function sig(type) { return `<span class="agda-sig">: <span class="agda-type">${esc(type)}</span></span>`; }
function subList(items) {
  return `<ul class="agda-sub-list">${items.map((d) =>
    `<li><span class="agda-name">${esc(d.name)}</span> ${sig(d.type)}</li>`).join('')}</ul>`;
}

export function render(intake) {
  const text = intake.text || '';
  const facts = analyzeAgda(text);
  const { module: moduleName, imports, datatypes, records, functions, postulates } = facts;

  const host = document.createElement('div');
  host.className = 'agda-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'agda-title';
  title.innerHTML = `<span class="agda-badge">Agda</span>` +
    (moduleName ? `<span class="agda-mod">${esc(moduleName)}</span>` : 'Source File');
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'agda-sub';
  sub.textContent = [
    imports.length && `${imports.length} import${imports.length !== 1 ? 's' : ''}`,
    datatypes.length && `${datatypes.length} data type${datatypes.length !== 1 ? 's' : ''}`,
    records.length && `${records.length} record${records.length !== 1 ? 's' : ''}`,
    functions.length && `${functions.length} signature${functions.length !== 1 ? 's' : ''}`,
    postulates.length && `${postulates.length} postulate${postulates.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const summary = document.createElement('div');
  summary.className = 'agda-summary';
  for (const { value, label } of [
    { value: datatypes.length, label: 'Data types' },
    { value: records.length, label: 'Records' },
    { value: functions.length, label: 'Signatures' },
    { value: imports.length, label: 'Imports' },
    { value: postulates.length, label: 'Postulates' },
  ]) {
    const card = document.createElement('div');
    card.className = 'agda-card';
    const strong = document.createElement('strong'); strong.textContent = value;
    const span = document.createElement('span'); span.textContent = label;
    card.appendChild(strong); card.appendChild(span); summary.appendChild(card);
  }
  host.appendChild(summary);

  if (imports.length) {
    const ul = makeList(makeSection(host, `Imports (${imports.length})`));
    for (const imp of imports) row(ul, `${tag('agda-tag-import', 'import')} <span class="agda-name">${esc(imp)}</span>`);
  }

  if (datatypes.length) {
    const sec = makeSection(host, `Data Types (${datatypes.length})`);
    const ul = makeList(sec);
    for (const d of datatypes) {
      let html = `${tag('agda-tag-data', 'data')} <span class="agda-name">${esc(d.name)}</span>`;
      if (d.constructors.length) html += subList(d.constructors);
      row(ul, html);
    }
  }

  if (records.length) {
    const sec = makeSection(host, `Records (${records.length})`);
    const ul = makeList(sec);
    for (const r of records) {
      let html = `${tag('agda-tag-record', 'record')} <span class="agda-name">${esc(r.name)}</span>`;
      if (r.constructor) html += ` ${tag('agda-tag-cons', 'constructor')} <span class="agda-name">${esc(r.constructor)}</span>`;
      if (r.fields.length) html += subList(r.fields);
      row(ul, html);
    }
  }

  if (functions.length) {
    const ul = makeList(makeSection(host, `Signatures (${functions.length})`));
    for (const f of functions) row(ul, `${tag('agda-tag-func', 'sig')} <span class="agda-name">${esc(f.name)}</span> ${sig(f.type)}`);
  }

  if (postulates.length) {
    const ul = makeList(makeSection(host, `Postulates (${postulates.length})`));
    for (const p of postulates) row(ul, `${tag('agda-tag-postulate', 'postulate')} <span class="agda-name">${esc(p.name)}</span> ${sig(p.type)}`);
  }

  const pre = document.createElement('pre');
  pre.className = 'agda-pre';
  pre.innerHTML = highlightAgda(text);
  host.appendChild(pre);

  return { parentNode: host };
}
