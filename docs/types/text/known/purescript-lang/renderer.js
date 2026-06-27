const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.purs-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.purs-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1c1c2e;color:#fff;vertical-align:middle;margin-right:8px;}
.purs-modname{font-size:13px;font-weight:400;margin-left:8px;color:var(--fg,#24292f);}
.purs-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.purs-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.purs-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.purs-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.purs-card strong{display:block;font-size:1.2rem;font-weight:700;}
.purs-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.purs-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.purs-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.purs-list{margin:0;padding:0;list-style:none;}
.purs-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.purs-list li:last-child{border-bottom:none;}
.purs-sub-li{padding-left:30px;color:var(--fg-2,#5a6678);}
.purs-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#ede9fe;color:#7c3aed;font-weight:700;}
.purs-tag-import{background:#e0f2fe;color:#0369a1;}
.purs-tag-qual{background:#fef9c3;color:#854d0e;}
.purs-tag-data{background:#dbeafe;color:#1e40af;}
.purs-tag-ctor{background:#eff6ff;color:#1d4ed8;}
.purs-tag-newtype{background:#fef3c7;color:#92400e;}
.purs-tag-type{background:#dcfce7;color:#166534;}
.purs-tag-class{background:#fce7f3;color:#9d174d;}
.purs-tag-method{background:#fdf2f8;color:#be185d;}
.purs-tag-instance{background:#f0fdf4;color:#15803d;}
.purs-tag-func{background:#ede9fe;color:#7c3aed;}
.purs-tag-eq{background:#dcfce7;color:#15803d;}
.purs-name{font-weight:600;}
.purs-sig{color:#0369a1;}
.purs-arrow{color:#9f1239;}
.purs-field{color:#0e7490;}
.purs-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.purs-kw{color:#7c3aed;font-weight:600;}
.purs-str{color:#0a6640;}
.purs-comment{color:#6e7781;font-style:italic;}
.purs-type{color:#0369a1;font-weight:600;}
`;

const PURS_KEYWORDS = new Set([
  'module', 'where', 'import', 'as', 'hiding', 'data', 'type',
  'newtype', 'class', 'instance', 'derive', 'do', 'let', 'in',
  'if', 'then', 'else', 'case', 'of', 'forall', 'foreign', 'infixl',
  'infixr', 'infix', 'ado',
]);

// --- pure parsing helpers (DOM-free) ---------------------------------------

// Strip a trailing line comment that is not inside a string literal.
function stripLineComment(line) {
  let inStr = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' && line[i - 1] !== '\\') inStr = !inStr;
    else if (!inStr && c === '-' && line[i + 1] === '-') return line.slice(0, i);
  }
  return line;
}

// Split into logical (top-level) blocks: a line with no leading whitespace begins a new block;
// indented lines (continuations, record bodies, class method signatures) belong to it.
function logicalBlocks(text) {
  const src = String(text || '').replace(/\{-[\s\S]*?-\}/g, '');
  const blocks = [];
  let cur = null;
  for (const raw of src.split(/\r?\n/)) {
    const line = stripLineComment(raw);
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) {
      if (cur) blocks.push(cur);
      cur = { head: line.trim(), lines: [line.trim()] };
    } else if (cur) {
      cur.lines.push(line.trim());
    } else {
      cur = { head: line.trim(), lines: [line.trim()] };
    }
  }
  if (cur) blocks.push(cur);
  return blocks;
}

// Split `a -> b -> c` on TOP-LEVEL `->` only (respecting (), [], {}). `=>` is left intact.
function splitArrows(sig) {
  const parts = [];
  let buf = '', depth = 0;
  for (let i = 0; i < sig.length; i++) {
    const c = sig[i];
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth = Math.max(0, depth - 1);
    if (depth === 0 && c === '-' && sig[i + 1] === '>') { parts.push(buf.trim()); buf = ''; i++; continue; }
    buf += c;
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts;
}

// Split on a top-level single-char separator (respecting brackets).
function splitTop(str, sep) {
  const out = [];
  let buf = '', depth = 0;
  for (const c of str) {
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth = Math.max(0, depth - 1);
    if (depth === 0 && c === sep) { out.push(buf.trim()); buf = ''; } else buf += c;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

// Parse `{ field :: Type, ... }` (the outermost record) into [{name, type}].
function parseRecordFields(str) {
  const m = str.match(/\{([\s\S]*)\}/);
  if (!m) return [];
  return splitTop(m[1], ',').map((f) => {
    const mm = f.match(/^([\w']+)\s*::\s*([\s\S]+)$/);
    return mm ? { name: mm[1], type: mm[2].trim() } : null;
  }).filter(Boolean);
}

// Parse `data T a = A Int | B` constructors → [{name, args}].
function parseConstructors(rhs) {
  return splitTop(rhs, '|').map((seg) => {
    const mm = seg.match(/^([A-Z][\w']*)\s*([\s\S]*)$/);
    return mm ? { name: mm[1], args: mm[2].trim() } : null;
  }).filter(Boolean);
}

// Parse into structured facts. Exported (pure, no DOM) for unit testing.
export function analyzePureScript(text) {
  let module = null;
  let exports = [];
  const imports = [];
  const functions = [];
  const dataTypes = [];
  const newtypes = [];
  const typeAliases = [];
  const classes = [];
  const instances = [];
  const equationNames = new Set();
  const sigOrder = [];
  const sigMap = new Map();

  for (const block of logicalBlocks(text)) {
    const joined = block.lines.join(' ').replace(/\s+/g, ' ').trim();
    const head = block.head;
    let m;

    // module Foo.Bar (exports) where
    if ((m = joined.match(/^module\s+([\w.]+)\s*(\(([\s\S]*?)\))?\s*where\b/))) {
      module = m[1];
      if (m[3]) exports = splitTop(m[3], ',').map((e) => e.replace(/\s+/g, ' ').trim()).filter(Boolean);
      continue;
    }

    // import X.Y (a, b) as Z   /   import X hiding (a)
    if ((m = head.match(/^import\s+([\w.]+)(.*)$/))) {
      const rest = m[2] || '';
      const aliasM = rest.match(/\bas\s+([\w.]+)/);
      const hiding = /\bhiding\b/.test(rest);
      const listM = rest.match(/\(([\s\S]*)\)/);
      const items = listM ? splitTop(listM[1], ',').filter(Boolean) : [];
      imports.push({ module: m[1], alias: aliasM ? aliasM[1] : null, hiding, items, count: items.length });
      continue;
    }

    // data T a = Ctor ... | Ctor ...
    if ((m = joined.match(/^data\s+([A-Z][\w']*)([^=]*?)(?:=\s*([\s\S]+))?$/))) {
      dataTypes.push({
        name: m[1],
        params: m[2].trim(),
        constructors: m[3] ? parseConstructors(m[3].trim()) : [],
      });
      continue;
    }

    // newtype T = Ctor Inner
    if ((m = joined.match(/^newtype\s+([A-Z][\w']*)([^=]*?)=\s*([A-Z][\w']*)\s*([\s\S]*)$/))) {
      newtypes.push({ name: m[1], params: m[2].trim(), constructor: m[3], wraps: m[4].trim() });
      continue;
    }

    // type R = { x :: Int, ... }  (record) or type Name = Type (alias)
    if ((m = joined.match(/^type\s+([A-Z][\w']*)([^=]*?)=\s*([\s\S]+)$/))) {
      const rhs = m[3].trim();
      typeAliases.push({ name: m[1], params: m[2].trim(), rhs, fields: parseRecordFields(rhs) });
      continue;
    }

    // class (Ctx) <= Name a where method :: ...
    if ((m = head.match(/^class\b[\s\S]*?(?:<=)?\s*\b([A-Z][\w']*)\b([^=<]*?)\bwhere\b/) || head.match(/^class\b.*?\b([A-Z][\w']*)\b([^=<]*?)$/))) {
      // Recover the class name: last capitalized token before `where`/end, skipping constraints.
      const headNoClass = head.replace(/^class\s+/, '');
      const beforeWhere = headNoClass.split(/\bwhere\b/)[0];
      const afterContext = beforeWhere.split(/<=/).pop();
      const nm = afterContext.match(/\b([A-Z][\w']*)\b/);
      const name = nm ? nm[1] : m[1];
      const params = afterContext.replace(/\b[A-Z][\w']*\b/, '').trim();
      const methods = [];
      for (const ln of block.lines.slice(1)) {
        const mm = ln.match(/^([a-z_][\w']*)\s*::\s*([\s\S]+)$/);
        if (mm) methods.push({ name: mm[1], signature: mm[2].trim(), parts: splitArrows(mm[2].trim()) });
      }
      classes.push({ name, params, methods });
      continue;
    }

    // instance name :: Class Type where   /   instance Class Type where
    if ((m = head.match(/^instance\b\s*(?:([\w']+)\s*::\s*)?([\s\S]+?)\s+where\b/))
        || (m = head.match(/^instance\b\s*(?:([\w']+)\s*::\s*)?([\s\S]+?)$/))) {
      const signature = (m[2] || '').replace(/\s+/g, ' ').trim();
      const clsM = signature.replace(/^[\s\S]*=>\s*/, '').match(/\b([A-Z][\w']*)\b/);
      instances.push({ name: m[1] || null, signature, cls: clsM ? clsM[1] : null });
      continue;
    }

    // foreign import data / value
    if (/^foreign\s+import\b/.test(head)) {
      const fm = joined.match(/^foreign\s+import\s+(?:data\s+)?([\w']+)(?:\s*::\s*([\s\S]+))?$/);
      if (fm && fm[2]) {
        sigMap.set(fm[1], fm[2].trim());
        if (!sigOrder.includes(fm[1])) sigOrder.push(fm[1]);
        equationNames.add(fm[1]);
      }
      continue;
    }

    // top-level signature:  name :: Type
    if ((m = head.match(/^([a-z_][\w']*)\s*::\s*([\s\S]+)$/))) {
      const sig = joined.replace(/^[a-z_][\w']*\s*::\s*/, '').trim();
      sigMap.set(m[1], sig);
      if (!sigOrder.includes(m[1])) sigOrder.push(m[1]);
      continue;
    }

    // top-level equation:  name args = ...  (records the name has a definition)
    if ((m = head.match(/^([a-z_][\w']*)\b[^=]*=(?!=)/))) {
      equationNames.add(m[1]);
    }
  }

  for (const name of sigOrder) {
    const signature = sigMap.get(name);
    functions.push({ name, signature, parts: splitArrows(signature), hasEquation: equationNames.has(name) });
  }

  return { module, exports, imports, functions, dataTypes, newtypes, typeAliases, classes, instances };
}

// --- rendering -------------------------------------------------------------

function highlightPureScript(text) {
  return text.split(/\r?\n/).map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('--')) return '<span class="purs-comment">' + esc(line) + '</span>';
    const commentIdx = line.indexOf('--');
    let code = line, suffix = '';
    if (commentIdx !== -1) {
      const before = line.slice(0, commentIdx);
      if ((before.match(/"/g) || []).length % 2 === 0) {
        code = line.slice(0, commentIdx);
        suffix = '<span class="purs-comment">' + esc(line.slice(commentIdx)) + '</span>';
      }
    }
    const escaped = esc(code)
      .replace(/(&quot;[^&]*&quot;)/g, '<span class="purs-str">$1</span>')
      .replace(/\b([A-Z][a-zA-Z0-9_']*)/g, '<span class="purs-type">$1</span>')
      .replace(new RegExp(`\\b(${[...PURS_KEYWORDS].join('|')})\\b`, 'g'), '<span class="purs-kw">$1</span>');
    return escaped + suffix;
  }).join('\n');
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'purs-section';
  const hd = document.createElement('div');
  hd.className = 'purs-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'purs-list'; sec.appendChild(ul); return ul; }
function tag(cls, t) { return `<span class="purs-tag ${cls}">${esc(t)}</span>`; }
function sigHtml(signature) { return esc(signature).replace(/-&gt;/g, '<span class="purs-arrow">→</span>'); }
function row(ul, html, cls) { const li = document.createElement('li'); if (cls) li.className = cls; li.innerHTML = html; ul.appendChild(li); }

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const info = analyzePureScript(text);

  const host = document.createElement('div');
  host.className = 'purs-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'purs-title';
  const badgeEl = document.createElement('span');
  badgeEl.className = 'purs-badge';
  badgeEl.textContent = 'PureScript Module';
  title.appendChild(badgeEl);
  if (info.module) {
    const modEl = document.createElement('span');
    modEl.className = 'purs-modname';
    modEl.textContent = info.module;
    title.appendChild(modEl);
  }
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'purs-sub';
  sub.textContent = [
    info.imports.length && `${info.imports.length} import${info.imports.length !== 1 ? 's' : ''}`,
    info.dataTypes.length && `${info.dataTypes.length} data`,
    info.classes.length && `${info.classes.length} class${info.classes.length !== 1 ? 'es' : ''}`,
    info.functions.length && `${info.functions.length} function${info.functions.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'purs-cards';
  for (const { value, label } of [
    { value: info.imports.length, label: 'Imports' },
    { value: info.dataTypes.length, label: 'Data Types' },
    { value: info.newtypes.length, label: 'Newtypes' },
    { value: info.typeAliases.length, label: 'Type Aliases' },
    { value: info.classes.length, label: 'Classes' },
    { value: info.instances.length, label: 'Instances' },
    { value: info.functions.length, label: 'Functions' },
  ]) {
    const card = document.createElement('div');
    card.className = 'purs-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (info.exports.length) {
    const ul = makeList(makeSection(host, `Exports (${info.exports.length})`));
    for (const e of info.exports) row(ul, `<span class="purs-name">${esc(e)}</span>`);
  }

  if (info.imports.length) {
    const ul = makeList(makeSection(host, `Imports (${info.imports.length})`));
    for (const imp of info.imports) {
      const t = imp.hiding ? tag('purs-tag-qual', 'hiding') : tag('purs-tag-import', 'import');
      const alias = imp.alias ? ` <span class="purs-field">as ${esc(imp.alias)}</span>` : '';
      const items = imp.count ? ` <span class="purs-sig">(${esc(imp.items.join(', '))})</span>` : '';
      row(ul, `${t} <span class="purs-name">${esc(imp.module)}</span>${alias}${items}`);
    }
  }

  if (info.dataTypes.length) {
    const ul = makeList(makeSection(host, `Data Types (${info.dataTypes.length})`));
    for (const d of info.dataTypes) {
      row(ul, `${tag('purs-tag-data', 'data')} <span class="purs-name">${esc(d.name)}${d.params ? ' ' + esc(d.params) : ''}</span>`);
      for (const c of d.constructors) {
        row(ul, `${tag('purs-tag-ctor', 'ctor')} <span class="purs-name">${esc(c.name)}</span>${c.args ? ' <span class="purs-sig">' + esc(c.args) + '</span>' : ''}`, 'purs-sub-li');
      }
    }
  }

  if (info.newtypes.length) {
    const ul = makeList(makeSection(host, `Newtypes (${info.newtypes.length})`));
    for (const n of info.newtypes) {
      row(ul, `${tag('purs-tag-newtype', 'newtype')} <span class="purs-name">${esc(n.name)}</span> = ${esc(n.constructor)}${n.wraps ? ' <span class="purs-sig">' + esc(n.wraps) + '</span>' : ''}`);
    }
  }

  if (info.typeAliases.length) {
    const ul = makeList(makeSection(host, `Type Aliases (${info.typeAliases.length})`));
    for (const t of info.typeAliases) {
      if (t.fields.length) {
        row(ul, `${tag('purs-tag-type', 'type')} <span class="purs-name">${esc(t.name)}</span> <span class="purs-field">{ record }</span>`);
        for (const f of t.fields) row(ul, `<span class="purs-name">${esc(f.name)}</span> :: <span class="purs-sig">${esc(f.type)}</span>`, 'purs-sub-li');
      } else {
        row(ul, `${tag('purs-tag-type', 'type')} <span class="purs-name">${esc(t.name)}</span> = <span class="purs-sig">${esc(t.rhs)}</span>`);
      }
    }
  }

  if (info.classes.length) {
    const ul = makeList(makeSection(host, `Type Classes (${info.classes.length})`));
    for (const c of info.classes) {
      row(ul, `${tag('purs-tag-class', 'class')} <span class="purs-name">${esc(c.name)}${c.params ? ' ' + esc(c.params) : ''}</span>`);
      for (const meth of c.methods) {
        row(ul, `${tag('purs-tag-method', 'method')} <span class="purs-name">${esc(meth.name)}</span> :: <span class="purs-sig">${sigHtml(meth.signature)}</span>`, 'purs-sub-li');
      }
    }
  }

  if (info.instances.length) {
    const ul = makeList(makeSection(host, `Instances (${info.instances.length})`));
    for (const i of info.instances) {
      const nm = i.name ? `<span class="purs-name">${esc(i.name)}</span> :: ` : '';
      row(ul, `${tag('purs-tag-instance', 'instance')} ${nm}<span class="purs-sig">${esc(i.signature)}</span>`);
    }
  }

  if (info.functions.length) {
    const ul = makeList(makeSection(host, `Top-level Functions (${info.functions.length})`));
    for (const fn of info.functions) {
      const def = fn.hasEquation ? ' ' + tag('purs-tag-eq', '=') : '';
      row(ul, `${tag('purs-tag-func', 'fn')} <span class="purs-name">${esc(fn.name)}</span> :: <span class="purs-sig">${sigHtml(fn.signature)}</span>${def}`);
    }
  }

  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'purs-pre';
  pre.innerHTML = highlightPureScript(text);
  srcSec.appendChild(pre);

  return { parentNode: host };
}
