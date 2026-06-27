const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.grn-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.grn-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#ff7a59;color:#fff;vertical-align:middle;margin-right:8px;}
.grn-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.grn-mod{font-family:ui-monospace,monospace;font-size:14px;color:#c2410c;font-weight:700;}
.grn-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.grn-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.grn-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.grn-card strong{display:block;font-size:1.2rem;font-weight:700;}
.grn-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.grn-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.grn-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.grn-list{margin:0;padding:0;list-style:none;}
.grn-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.grn-list li:last-child{border-bottom:none;}
.grn-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;}
.grn-tag-import{background:#dcfce7;color:#166534;}
.grn-tag-include{background:#dbeafe;color:#1d4ed8;}
.grn-tag-fn{background:#ffedd5;color:#c2410c;}
.grn-tag-provide{background:#fce7f3;color:#9d174d;}
.grn-tag-record{background:#fef9c3;color:#854d0e;}
.grn-tag-enum{background:#ede9fe;color:#7c3aed;}
.grn-tag-alias{background:#e0f2fe;color:#0369a1;}
.grn-name{font-weight:600;}
.grn-type{color:#0e7490;}
.grn-ret{color:#1d4ed8;}
.grn-from{color:#5a6678;}
.grn-case{color:#7c3aed;}
`;

// --- pure parsing (DOM-free, exported for unit testing) ---

function stripComments(text) {
  return String(text || '').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, '');
}

// index of the matching close bracket for the open bracket at openIdx, or -1.
function matchBracket(text, openIdx, open, close) {
  let depth = 0;
  for (let i = openIdx; i < text.length; i++) {
    const c = text[i];
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) return i; }
  }
  return -1;
}

// split a comma-separated list at top level (respecting (), [], {}, <> nesting).
function splitTop(str) {
  const out = [];
  let buf = '', d = 0;
  for (const c of str) {
    if ('([{<'.includes(c)) d++;
    else if (')]}>'.includes(c)) d = Math.max(0, d - 1);
    if (c === ',' && d === 0) { out.push(buf); buf = ''; } else buf += c;
  }
  if (buf.trim()) out.push(buf);
  return out.map((s) => s.trim()).filter(Boolean);
}

// "name: Type" / "name: Type = default" / "name" → { name, type }
function parseField(raw) {
  let s = raw.trim();
  const eq = s.indexOf('=');
  if (eq >= 0) s = s.slice(0, eq).trim();
  const colon = s.indexOf(':');
  if (colon < 0) return { name: s.trim(), type: '' };
  return { name: s.slice(0, colon).trim(), type: s.slice(colon + 1).trim() };
}

function parseImports(src) {
  const imports = [];
  let m;
  // import Foo from "bar"
  const re1 = /(?:^|\n)\s*import\s+([\w{}\s,*]+?)\s+from\s+"([^"]+)"/g;
  while ((m = re1.exec(src))) {
    for (const n of m[1].replace(/[{}]/g, ' ').split(',').map((s) => s.trim()).filter(Boolean))
      imports.push({ name: n, from: m[2], kind: 'import' });
  }
  // from "bar" import { Foo, Bar }
  const re2 = /(?:^|\n)\s*from\s+"([^"]+)"\s+import\s+\{([^}]*)\}/g;
  while ((m = re2.exec(src))) {
    for (const n of m[2].split(',').map((s) => s.trim()).filter(Boolean))
      imports.push({ name: n, from: m[1], kind: 'import' });
  }
  // modern: from "bar" include Foo
  const re3 = /(?:^|\n)\s*from\s+"([^"]+)"\s+include\s+(\w+)/g;
  while ((m = re3.exec(src))) imports.push({ name: m[2], from: m[1], kind: 'include' });
  // include Foo from "bar"
  const re4 = /(?:^|\n)\s*include\s+(\w+)\s+from\s+"([^"]+)"/g;
  while ((m = re4.exec(src))) imports.push({ name: m[1], from: m[2], kind: 'include' });
  // bare include "bar"
  const re5 = /(?:^|\n)\s*include\s+"([^"]+)"/g;
  while ((m = re5.exec(src))) imports.push({ name: '', from: m[1], kind: 'include' });
  return imports;
}

// parse `[provide|export] <keyword> Name { ... }` bodies (record / enum), brace-aware.
function parseBraced(src, keyword) {
  const out = [];
  const re = new RegExp(`(?:^|\\n)\\s*(provide\\s+|export\\s+)?${keyword}\\s+(\\w+)(?:<[^>]*>)?\\s*\\{`, 'g');
  let m;
  while ((m = re.exec(src))) {
    const open = src.indexOf('{', re.lastIndex - 1);
    const close = matchBracket(src, open, '{', '}');
    if (close < 0) continue;
    out.push({ name: m[2], provided: !!m[1], entries: splitTop(src.slice(open + 1, close)) });
    re.lastIndex = close + 1;
  }
  return out;
}

// let bindings whose value is a lambda: `[provide|export] let [rec] name = (params) [: Ret] => ...`
function parseFunctions(src) {
  const functions = [];
  const re = /(?:^|\n)[ \t]*(provide\s+|export\s+)?let\s+(rec\s+)?(?:mut\s+)?(\w+)\s*=\s*\(/g;
  let m;
  while ((m = re.exec(src))) {
    const open = src.indexOf('(', re.lastIndex - 1);
    const close = matchBracket(src, open, '(', ')');
    if (close < 0) continue;
    const rest = src.slice(close + 1);
    // value qualifies as a function only if `=>` (optionally after `: RetType`) follows the params.
    const arrow = rest.match(/^\s*(?::\s*([^=({]+?)\s*)?=>/);
    if (!arrow) { re.lastIndex = close + 1; continue; }
    const params = splitTop(src.slice(open + 1, close)).map(parseField).map((p) => ({ name: p.name, type: p.type }));
    functions.push({
      name: m[3],
      params,
      returns: (arrow[1] || '').trim(),
      provided: !!m[1],
      rec: !!m[2],
    });
    re.lastIndex = close + 1;
  }
  return functions;
}

function parseAliases(src) {
  const aliases = [];
  const re = /(?:^|\n)\s*(provide\s+|export\s+)?type\s+(\w+)(?:<[^>]*>)?\s*=\s*([^\n{]+)/g;
  let m;
  while ((m = re.exec(src))) aliases.push({ name: m[2], aliasOf: m[3].trim(), provided: !!m[1] });
  return aliases;
}

// Parse Grain source into structured facts. Pure / DOM-free.
export function analyzeGrain(text) {
  const src = stripComments(text);
  const module = (src.match(/(?:^|\n)\s*module\s+(\w+)/) || [])[1] || null;
  const imports = parseImports(src);
  const functions = parseFunctions(src);
  const records = parseBraced(src, 'record').map((r) => ({
    name: r.name, provided: r.provided, fields: r.entries.map(parseField).map((f) => ({ name: f.name, type: f.type })),
  }));
  const enums = parseBraced(src, 'enum').map((e) => ({
    name: e.name, provided: e.provided,
    cases: e.entries.map((c) => c.replace(/\(([\s\S]*)\)\s*$/, '').trim()).filter(Boolean),
  }));
  const aliases = parseAliases(src);
  return { module, imports, functions, records, enums, aliases };
}

// --- rendering ---

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'grn-section';
  const hd = document.createElement('div');
  hd.className = 'grn-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'grn-list'; sec.appendChild(ul); return ul; }
function tag(cls, t) { return `<span class="grn-tag ${cls}">${esc(t)}</span>`; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
function card(cards, value, label) {
  const c = document.createElement('div');
  c.className = 'grn-card';
  const s = document.createElement('strong'); s.textContent = value;
  const sp = document.createElement('span'); sp.textContent = label;
  c.appendChild(s); c.appendChild(sp); cards.appendChild(c);
}
function fieldsHtml(list) {
  return list.map((f) => f.type
    ? `${esc(f.name)}: <span class="grn-type">${esc(f.type)}</span>`
    : esc(f.name)).join(', ');
}

export async function render(intake) {
  const text = intake.text || '';
  const facts = analyzeGrain(text);
  const { module, imports, functions, records, enums, aliases } = facts;
  if (!module && !imports.length && !functions.length && !records.length && !enums.length) return null;

  const host = document.createElement('div');
  host.className = 'grn-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'grn-title';
  const badge = document.createElement('span');
  badge.className = 'grn-badge';
  badge.textContent = 'Grain';
  title.appendChild(badge);
  const mod = document.createElement('span');
  mod.className = 'grn-mod';
  mod.textContent = module || 'Source File';
  title.appendChild(mod);
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'grn-sub';
  sub.textContent = [
    imports.length && `${imports.length} import${imports.length !== 1 ? 's' : ''}`,
    functions.length && `${functions.length} function${functions.length !== 1 ? 's' : ''}`,
    records.length && `${records.length} record${records.length !== 1 ? 's' : ''}`,
    enums.length && `${enums.length} enum${enums.length !== 1 ? 's' : ''}`,
    aliases.length && `${aliases.length} alias${aliases.length !== 1 ? 'es' : ''}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'grn-cards';
  card(cards, imports.length, 'Imports');
  card(cards, functions.length, 'Functions');
  card(cards, records.length, 'Records');
  card(cards, enums.length, 'Enums');
  if (aliases.length) card(cards, aliases.length, 'Aliases');
  host.appendChild(cards);

  if (imports.length) {
    const ul = makeList(makeSection(host, `Imports (${imports.length})`));
    for (const im of imports) {
      const kind = im.kind === 'include' ? tag('grn-tag-include', 'include') : tag('grn-tag-import', 'import');
      const name = im.name ? ` <span class="grn-name">${esc(im.name)}</span>` : '';
      row(ul, `${kind}${name} <span class="grn-from">from "${esc(im.from)}"</span>`);
    }
  }

  if (records.length) {
    const ul = makeList(makeSection(host, `Records (${records.length})`));
    for (const r of records) {
      const prov = r.provided ? tag('grn-tag-provide', 'provide') + ' ' : '';
      row(ul, `${prov}${tag('grn-tag-record', 'record')} <span class="grn-name">${esc(r.name)}</span> { ${fieldsHtml(r.fields)} }`);
    }
  }

  if (enums.length) {
    const ul = makeList(makeSection(host, `Enums (${enums.length})`));
    for (const e of enums) {
      const prov = e.provided ? tag('grn-tag-provide', 'provide') + ' ' : '';
      const cases = e.cases.map((c) => `<span class="grn-case">${esc(c)}</span>`).join(' | ');
      row(ul, `${prov}${tag('grn-tag-enum', 'enum')} <span class="grn-name">${esc(e.name)}</span> { ${cases} }`);
    }
  }

  if (functions.length) {
    const ul = makeList(makeSection(host, `Functions (${functions.length})`));
    for (const f of functions) {
      const prov = f.provided ? tag('grn-tag-provide', 'provide') + ' ' : '';
      const ret = f.returns ? ` -> <span class="grn-ret">${esc(f.returns)}</span>` : '';
      row(ul, `${prov}${tag('grn-tag-fn', 'let')} <span class="grn-name">${esc(f.name)}</span>(${fieldsHtml(f.params)})${ret}`);
    }
  }

  if (aliases.length) {
    const ul = makeList(makeSection(host, `Type Aliases (${aliases.length})`));
    for (const a of aliases) {
      const prov = a.provided ? tag('grn-tag-provide', 'provide') + ' ' : '';
      row(ul, `${prov}${tag('grn-tag-alias', 'type')} <span class="grn-name">${esc(a.name)}</span> = <span class="grn-type">${esc(a.aliasOf)}</span>`);
    }
  }

  return { parentNode: host };
}
