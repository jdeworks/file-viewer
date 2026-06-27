const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.hs-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.hs-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#5c4a8a;color:#fff;vertical-align:middle;margin-right:8px;}
.hs-lhs-badge{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#ede9fe;color:#5c4a8a;vertical-align:middle;margin-left:6px;}
.hs-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.hs-mod{font-family:ui-monospace,monospace;font-size:13px;color:#5c4a8a;font-weight:700;}
.hs-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.hs-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.hs-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.hs-card strong{display:block;font-size:1.2rem;font-weight:700;}
.hs-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.hs-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.hs-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.hs-list{margin:0;padding:0;list-style:none;}
.hs-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.hs-list li:last-child{border-bottom:none;}
.hs-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#ede9fe;color:#5c4a8a;font-weight:700;}
.hs-tag-import{background:#dcfce7;color:#166534;}
.hs-tag-qual{background:#dbeafe;color:#1d4ed8;}
.hs-tag-data{background:#fef9c3;color:#854d0e;}
.hs-tag-newtype{background:#fde68a;color:#92400e;}
.hs-tag-alias{background:#e0f2fe;color:#0369a1;}
.hs-tag-class{background:#ede9fe;color:#7c3aed;}
.hs-tag-inst{background:#fce7f3;color:#9d174d;}
.hs-tag-func{background:#dbeafe;color:#1d4ed8;}
.hs-name{font-weight:600;}
.hs-type{color:#0e7490;}
.hs-ctx{color:#9f1239;font-style:italic;}
.hs-arrow{color:#7c3aed;font-weight:600;}
.hs-ret{color:#1d4ed8;font-weight:600;}
.hs-con{color:#854d0e;font-weight:600;}
.hs-field{color:#0e7490;}
.hs-sub2{color:var(--fg-2,#5a6678);}
`;

// Split a string on a top-level separator (sep ignored inside (), [], {}). Returns trimmed parts.
function splitTop(s, sep) {
  const out = []; let depth = 0, buf = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth = Math.max(0, depth - 1);
    if (depth === 0 && s.startsWith(sep, i)) { out.push(buf); buf = ''; i += sep.length - 1; continue; }
    buf += c;
  }
  out.push(buf);
  return out.map((x) => x.trim());
}

// Strip line comments (`--` to EOL when at start or after whitespace) from one source line.
function stripLineComment(line) { return line.replace(/(^|\s)--.*$/, '$1'); }

// Group source into top-level declaration blocks. A block begins at a column-0 (non-indented) line;
// indented / blank lines fold into the current block (Haskell layout-significant continuations).
function toBlocks(codeText) {
  const lines = codeText.split(/\r?\n/);
  const out = []; let cur = null;
  for (const raw of lines) {
    const line = stripLineComment(raw);
    if (!line.trim()) { if (cur) cur.lines.push(line); continue; }
    if (/^\S/.test(line)) { if (cur) out.push(cur); cur = { lines: [line] }; }
    else if (cur) cur.lines.push(line);
  }
  if (cur) out.push(cur);
  return out.map((b) => ({
    lines: b.lines,
    first: b.lines[0].trim(),
    joined: b.lines.join(' ').replace(/\s+/g, ' ').trim(),
  }));
}

// Parse a type signature body into { context, parts, returns } (parts split on top-level `->`).
function parseSig(sig) {
  const ctxParts = splitTop(sig, '=>');
  let context = null, body = sig;
  if (ctxParts.length > 1) { context = ctxParts.slice(0, -1).join(' => '); body = ctxParts[ctxParts.length - 1]; }
  const parts = splitTop(body, '->').filter(Boolean);
  return { signature: sig.trim(), context, parts, returns: parts.length ? parts[parts.length - 1] : '' };
}

// Parse a data/newtype RHS into constructor records { name, fields:[...] } (split on top-level `|`).
function parseConstructors(rhs) {
  rhs = rhs.replace(/\bderiving\b[\s\S]*$/, '').trim();
  if (!rhs) return [];
  return splitTop(rhs, '|').filter(Boolean).map((c) => {
    c = c.trim();
    const name = (c.match(/^([A-Z][\w']*)/) || [])[1] || c.split(/\s+/)[0] || c;
    const fields = [];
    const rec = c.match(/\{([\s\S]*)\}/);
    if (rec) for (const f of splitTop(rec[1], ',')) { const fm = f.match(/^([\w']+)\s*::/); if (fm) fields.push(fm[1]); }
    return { name, fields };
  });
}

// Extract `name :: Type` method signatures from the indented body lines of a class block.
function parseMethods(blockLines) {
  const methods = [];
  for (const raw of blockLines.slice(1)) {
    const line = stripLineComment(raw).trim();
    const m = line.match(/^((?:[a-z_][\w']*|\([^)]+\))(?:\s*,\s*[a-z_][\w']*)*)\s*::\s*(.+)$/);
    if (!m) continue;
    for (const nm of m[1].split(',').map((x) => x.trim())) {
      if (!methods.find((x) => x.name === nm)) methods.push({ name: nm, ...parseSig(m[2]) });
    }
  }
  return methods;
}

// Pure, DOM-free structural parser. Exported for unit testing.
export function analyzeHaskell(text, isLhs = false) {
  let src = String(text || '').replace(/\{-[\s\S]*?-\}/g, ' ');
  if (isLhs) {
    src = src.split(/\r?\n/).filter((l) => l.startsWith('> ') || l.startsWith('>\t')).map((l) => l.slice(2)).join('\n');
  }

  const result = {
    module: null, exports: [], imports: [], functions: [],
    dataTypes: [], newtypes: [], classes: [], instances: [], typeAliases: [],
  };
  const sigByName = new Map();
  const equationNames = [];

  for (const b of toBlocks(src)) {
    const j = b.joined;
    let m;

    // module declaration + export list
    if ((m = j.match(/^module\s+([\w.]+)/))) {
      result.module = m[1];
      const ex = j.match(/\(([\s\S]*)\)\s*where/);
      if (ex) result.exports = splitTop(ex[1], ',').filter(Boolean);
      continue;
    }

    // import (regular | qualified, with optional alias + import/hiding list)
    if ((m = j.match(/^import\s+(qualified\s+)?([A-Z][\w.]*)/))) {
      const qualified = Boolean(m[1]);
      const alias = (j.match(/\bas\s+([A-Z][\w.]*)/) || [])[1] || null;
      const hiding = /\bhiding\b/.test(j);
      const list = j.match(/\(([\s\S]*)\)/);
      const items = list ? splitTop(list[1], ',').filter(Boolean) : [];
      result.imports.push({ module: m[2], qualified, alias, hiding, items });
      continue;
    }

    // data / newtype / type
    if ((m = j.match(/^(data|newtype|type)\s+([A-Z][\w']*)/))) {
      const kind = m[1], name = m[2];
      const head = j.replace(/^(data|newtype|type)\s+/, '');
      const eq = splitTop(head, '=');
      const params = eq[0].replace(/^[A-Z][\w']*/, '').trim();
      const rhs = eq.length > 1 ? eq.slice(1).join(' = ') : '';
      if (kind === 'type') {
        result.typeAliases.push({ name, params, definition: rhs.trim() });
      } else if (kind === 'newtype') {
        result.newtypes.push({ name, params, constructors: parseConstructors(rhs) });
      } else {
        result.dataTypes.push({ name, params, constructors: parseConstructors(rhs) });
      }
      continue;
    }

    // type class
    if ((m = j.match(/^class\s+(?:(.+?)\s*=>\s*)?([A-Z][\w']*)((?:\s+[\w']+)*)/))) {
      result.classes.push({ name: m[2], context: (m[1] || '').trim() || null, params: (m[3] || '').trim(), methods: parseMethods(b.lines) });
      continue;
    }

    // instance
    if ((m = j.match(/^instance\s+(?:(.+?)\s*=>\s*)?([\s\S]+?)\s+where/)) || (m = j.match(/^instance\s+(?:(.+?)\s*=>\s*)?([\s\S]+)$/))) {
      result.instances.push({ head: m[2].replace(/\s+where$/, '').trim(), context: (m[1] || '').trim() || null });
      continue;
    }

    // top-level type signature: `name :: Type` (name lowercase ident or operator in parens)
    if ((m = b.first.match(/^((?:[a-z_][\w']*|\([^)]+\)))\s*::\s*(.+)$/))) {
      const sigBody = (splitTop(j, '::')[1] || m[2]).trim();
      if (!sigByName.has(m[1])) sigByName.set(m[1], { name: m[1], ...parseSig(sigBody) });
      continue;
    }

    // top-level equation: `name args = ...` or guarded — record name (may be sig-less function)
    if ((m = b.first.match(/^([a-z_][\w']*)\b/)) && /(^|\s)=(\s|$)|^\s*\|/.test(j.replace(/^[a-z_][\w']*/, ''))) {
      equationNames.push(m[1]);
    }
  }

  // Functions: every signature, plus equation-only definitions (no signature) with signature=null.
  for (const f of sigByName.values()) result.functions.push(f);
  const have = new Set(result.functions.map((f) => f.name));
  for (const n of equationNames) {
    if (!have.has(n)) { have.add(n); result.functions.push({ name: n, signature: null, context: null, parts: [], returns: '' }); }
  }

  return result;
}

function makeSection(host, title) {
  const sec = document.createElement('div'); sec.className = 'hs-section';
  const hd = document.createElement('div'); hd.className = 'hs-section-hd'; hd.textContent = title;
  sec.appendChild(hd); host.appendChild(sec);
  const ul = document.createElement('ul'); ul.className = 'hs-list'; sec.appendChild(ul);
  return ul;
}
function tag(cls, t) { return `<span class="hs-tag ${cls}">${esc(t)}</span>`; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }

function sigHtml(f) {
  if (!f.signature) return '';
  const ctx = f.context ? `<span class="hs-ctx">${esc(f.context)}</span> &rArr; ` : '';
  const parts = f.parts.map((p, i) => {
    const cls = i === f.parts.length - 1 ? 'hs-ret' : 'hs-type';
    return `<span class="${cls}">${esc(p)}</span>`;
  });
  return ` :: ${ctx}${parts.join(' <span class="hs-arrow">&rarr;</span> ')}`;
}
function consHtml(constructors) {
  return constructors.map((c) => {
    const fields = c.fields && c.fields.length ? ` { <span class="hs-field">${c.fields.map(esc).join(', ')}</span> }` : '';
    return `<span class="hs-con">${esc(c.name)}</span>${fields}`;
  }).join(' <span class="hs-sub2">|</span> ');
}

export async function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').toLowerCase();
  const isLhs = name.endsWith('.lhs');

  const preview = text.slice(0, 4000);
  if (!/\bmodule\s+[A-Z]/.test(preview) && !/\bimport\s+/.test(preview)
    && !/\bdata\s+[A-Z]/.test(preview) && !/::/.test(preview)) return null;

  const a = analyzeHaskell(text, isLhs);

  const host = document.createElement('div');
  host.className = 'hs-doc';
  const styleEl = document.createElement('style'); styleEl.textContent = CSS; host.appendChild(styleEl);

  const title = document.createElement('div'); title.className = 'hs-title';
  let titleHtml = '<span class="hs-badge">Haskell</span>';
  if (isLhs) titleHtml += '<span class="hs-lhs-badge">Literate Haskell</span>';
  if (a.module) titleHtml += `<span class="hs-mod">${esc(a.module)}</span>`;
  title.innerHTML = titleHtml; host.appendChild(title);

  const sub = document.createElement('div'); sub.className = 'hs-sub';
  sub.textContent = [
    a.imports.length && `${a.imports.length} import${a.imports.length !== 1 ? 's' : ''}`,
    a.dataTypes.length && `${a.dataTypes.length} data`,
    a.classes.length && `${a.classes.length} class${a.classes.length !== 1 ? 'es' : ''}`,
    a.instances.length && `${a.instances.length} instance${a.instances.length !== 1 ? 's' : ''}`,
    a.functions.length && `${a.functions.length} function${a.functions.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div'); cards.className = 'hs-cards';
  for (const { value, label } of [
    { value: a.imports.length, label: 'Imports' },
    { value: a.dataTypes.length + a.newtypes.length, label: 'Data Types' },
    { value: a.typeAliases.length, label: 'Aliases' },
    { value: a.classes.length, label: 'Classes' },
    { value: a.instances.length, label: 'Instances' },
    { value: a.functions.length, label: 'Functions' },
  ]) {
    const card = document.createElement('div'); card.className = 'hs-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (a.exports.length) {
    const ul = makeSection(host, `Exports (${a.exports.length})`);
    for (const e of a.exports) row(ul, `<span class="hs-name">${esc(e)}</span>`);
  }
  if (a.imports.length) {
    const ul = makeSection(host, `Imports (${a.imports.length})`);
    for (const im of a.imports) {
      const t = tag(im.qualified ? 'hs-tag-qual' : 'hs-tag-import', im.qualified ? 'qualified' : 'import');
      const alias = im.alias ? ` <span class="hs-sub2">as</span> <span class="hs-name">${esc(im.alias)}</span>` : '';
      const items = im.items.length ? ` <span class="hs-sub2">(${im.hiding ? 'hiding ' : ''}${esc(im.items.join(', '))})</span>` : '';
      row(ul, `${t} <span class="hs-name">${esc(im.module)}</span>${alias}${items}`);
    }
  }
  if (a.dataTypes.length) {
    const ul = makeSection(host, `Data Types (${a.dataTypes.length})`);
    for (const d of a.dataTypes) {
      row(ul, `${tag('hs-tag-data', 'data')} <span class="hs-name">${esc(d.name)}${d.params ? ' ' + esc(d.params) : ''}</span> = ${consHtml(d.constructors)}`);
    }
  }
  if (a.newtypes.length) {
    const ul = makeSection(host, `Newtypes (${a.newtypes.length})`);
    for (const d of a.newtypes) {
      row(ul, `${tag('hs-tag-newtype', 'newtype')} <span class="hs-name">${esc(d.name)}${d.params ? ' ' + esc(d.params) : ''}</span> = ${consHtml(d.constructors)}`);
    }
  }
  if (a.typeAliases.length) {
    const ul = makeSection(host, `Type Aliases (${a.typeAliases.length})`);
    for (const t of a.typeAliases) {
      row(ul, `${tag('hs-tag-alias', 'type')} <span class="hs-name">${esc(t.name)}${t.params ? ' ' + esc(t.params) : ''}</span> = <span class="hs-type">${esc(t.definition)}</span>`);
    }
  }
  if (a.classes.length) {
    const ul = makeSection(host, `Type Classes (${a.classes.length})`);
    for (const c of a.classes) {
      const ctx = c.context ? `<span class="hs-ctx">${esc(c.context)}</span> &rArr; ` : '';
      row(ul, `${tag('hs-tag-class', 'class')} ${ctx}<span class="hs-name">${esc(c.name)}${c.params ? ' ' + esc(c.params) : ''}</span> <span class="hs-sub2">where</span>`);
      for (const meth of c.methods) {
        row(ul, `<span style="padding-left:18px">&bull; <span class="hs-name">${esc(meth.name)}</span>${sigHtml(meth)}</span>`);
      }
    }
  }
  if (a.instances.length) {
    const ul = makeSection(host, `Instances (${a.instances.length})`);
    for (const ins of a.instances) {
      const ctx = ins.context ? `<span class="hs-ctx">${esc(ins.context)}</span> &rArr; ` : '';
      row(ul, `${tag('hs-tag-inst', 'instance')} ${ctx}<span class="hs-name">${esc(ins.head)}</span>`);
    }
  }
  if (a.functions.length) {
    const ul = makeSection(host, `Functions (${a.functions.length})`);
    for (const f of a.functions) {
      row(ul, `${tag('hs-tag-func', 'fn')} <span class="hs-name">${esc(f.name)}</span>${sigHtml(f)}`);
    }
  }

  return { parentNode: host };
}
