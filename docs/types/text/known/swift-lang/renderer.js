const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.swift-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.swift-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f05138;color:#fff;vertical-align:middle;margin-right:8px;}
.swift-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.swift-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.swift-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.swift-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.swift-card strong{display:block;font-size:1.2rem;font-weight:700;}
.swift-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.swift-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.swift-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.swift-list{margin:0;padding:0;list-style:none;}
.swift-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.swift-list li:last-child{border-bottom:none;}
.swift-type-hd{display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;padding:7px 14px;border-bottom:1px solid var(--border,#eaecf0);background:var(--bg,#fff);}
.swift-members{margin:0;padding:0 0 4px 0;list-style:none;background:var(--bg-2,#fbfcfe);}
.swift-members li{padding:3px 14px 3px 28px;font-family:ui-monospace,monospace;font-size:11.5px;border:none;display:block;}
.swift-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#fee2e2;color:#991b1b;font-weight:700;}
.swift-tag-struct{background:#dbeafe;color:#1e40af;}
.swift-tag-class{background:#ede9fe;color:#7c3aed;}
.swift-tag-enum{background:#fef3c7;color:#92400e;}
.swift-tag-actor{background:#dcfce7;color:#166534;}
.swift-tag-protocol{background:#fce7f3;color:#9d174d;}
.swift-tag-extension{background:#f0fdf4;color:#15803d;}
.swift-tag-func{background:#dbeafe;color:#1d4ed8;}
.swift-tag-async{background:#e0f2fe;color:#0369a1;}
.swift-tag-throws{background:#fef3c7;color:#92400e;}
.swift-tag-import{background:#dcfce7;color:#166534;}
.swift-tag-mem{background:#eef2ff;color:#4338ca;}
.swift-name{font-weight:600;}
.swift-type{color:#0e7490;}
.swift-ret{color:#1d4ed8;}
.swift-conf{color:#9d174d;}
.swift-label{color:#9a3412;}
.swift-attr{color:#9333ea;font-weight:600;}
.swift-muted{color:var(--fg-2,#888);}
`;

// ---- pure parsing (DOM-free, exported for unit testing) ----

const MODIFIERS = new Set([
  'public', 'private', 'internal', 'fileprivate', 'open', 'final', 'static',
  'override', 'required', 'convenience', 'mutating', 'nonmutating', 'lazy',
  'weak', 'unowned', 'dynamic', 'optional', 'indirect', 'prefix', 'postfix',
  'infix',
]);

// Remove // and (nestable) /* */ comments and blank out string literals so that
// braces/parens inside them never confuse the structural scan. Newlines are kept.
function stripCommentsAndStrings(src) {
  let out = '', i = 0, block = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i], c2 = src[i + 1];
    if (block > 0) {
      if (c === '/' && c2 === '*') { block++; i += 2; continue; }
      if (c === '*' && c2 === '/') { block--; i += 2; out += '  '; continue; }
      out += c === '\n' ? '\n' : ' '; i++; continue;
    }
    if (c === '/' && c2 === '*') { block++; i += 2; continue; }
    if (c === '/' && c2 === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '"') {
      if (c2 === '"' && src[i + 2] === '"') { // multiline """ ... """
        i += 3;
        while (i < n && !(src[i] === '"' && src[i + 1] === '"' && src[i + 2] === '"')) { if (src[i] === '\n') out += '\n'; i++; }
        i += 3; out += '""'; continue;
      }
      i++;
      while (i < n && src[i] !== '"') { if (src[i] === '\\') i++; i++; }
      i++; out += '""'; continue;
    }
    out += c; i++;
  }
  return out;
}

// Collapse multi-line declarations: a newline only ends a logical line when not
// inside () or []. Keeps a func/init signature whose params span lines as one unit.
function logicalLines(clean) {
  const lines = [];
  let buf = '', d = 0;
  for (const ch of clean) {
    if (ch === '(' || ch === '[') d++;
    else if (ch === ')' || ch === ']') d = Math.max(0, d - 1);
    if (ch === '\n') { if (d > 0) buf += ' '; else { lines.push(buf); buf = ''; } }
    else buf += ch;
  }
  if (buf.trim()) lines.push(buf);
  return lines;
}

// Split on top-level commas, respecting () [] <> nesting (ignoring `->`).
function splitTop(s) {
  const out = [];
  let buf = '', d = 0, prev = '';
  for (const ch of s) {
    if (ch === '(' || ch === '[' || ch === '<') d++;
    else if (ch === ')' || ch === ']' || (ch === '>' && prev !== '-')) d = Math.max(0, d - 1);
    if (ch === ',' && d === 0) { out.push(buf); buf = ''; } else buf += ch;
    prev = ch;
  }
  if (buf.trim()) out.push(buf);
  return out;
}

function matchParen(s, open) {
  let d = 0;
  for (let k = open; k < s.length; k++) {
    if (s[k] === '(') d++;
    else if (s[k] === ')') { d--; if (d === 0) return k; }
  }
  return -1;
}

// Strip leading attributes (@Published, @objc(...)) and access/behaviour modifiers.
function splitModifiers(line) {
  let s = line.trim();
  const attrs = [];
  for (;;) {
    const am = s.match(/^@(\w+)(\([^)]*\))?\s*/);
    if (am) { attrs.push('@' + am[1]); s = s.slice(am[0].length); continue; }
    const wm = s.match(/^(\w+)\s+/);
    if (wm) {
      const w = wm[1];
      if (w === 'class') { // modifier only before func/var/let/subscript; else it's a type
        if (/^class\s+(func|var|let|subscript)\b/.test(s)) { s = s.slice(wm[0].length); continue; }
        break;
      }
      if (MODIFIERS.has(w)) { s = s.slice(wm[0].length); continue; }
    }
    break;
  }
  return { attrs, rest: s };
}

// "extLabel intLabel: [inout] Type [= default]" → {label,name,type,inout,default,variadic}
function parseParams(s) {
  if (!s.trim()) return [];
  return splitTop(s).map((p) => p.trim()).filter(Boolean).map((p) => {
    const ci = p.indexOf(':');
    if (ci < 0) { const w = p.trim(); return { label: w, name: w, type: '', inout: false, default: '', variadic: false }; }
    const left = p.slice(0, ci).trim();
    let right = p.slice(ci + 1).trim().replace(/@\w+(\([^)]*\))?\s*/g, '');
    let isInout = false;
    if (/^inout\b/.test(right)) { isInout = true; right = right.replace(/^inout\s+/, ''); }
    let def = '';
    const eq = right.indexOf('=');
    if (eq >= 0) { def = right.slice(eq + 1).trim(); right = right.slice(0, eq).trim(); }
    const variadic = /\.\.\.$/.test(right);
    const type = right.replace(/\.\.\.$/, '').trim();
    const words = left.split(/\s+/).filter(Boolean);
    const label = words[0] || '';
    const name = words.length >= 2 ? words[1] : label;
    return { label, name, type, inout: isInout, default: def, variadic };
  });
}

function parseFunc(rest) {
  const head = rest.match(/^func\s+([^\s(<]+)\s*(<[^>]*>)?\s*\(/);
  if (!head) return null;
  const start = head[0].length - 1; // index of '('
  const close = matchParen(rest, start);
  const paramStr = close > start ? rest.slice(start + 1, close) : '';
  const tail = close >= 0 ? rest.slice(close + 1) : '';
  const ret = tail.match(/->\s*([^{]+)/);
  return {
    name: head[1],
    generics: head[2] ? head[2].slice(1, -1).trim() : '',
    params: parseParams(paramStr),
    returns: ret ? ret[1].trim() : '',
    async: /\basync\b/.test(tail),
    throws: /\b(rethrows|throws)\b/.test(tail),
  };
}

function parseInit(rest) {
  const head = rest.match(/^init[?!]?\s*(<[^>]*>)?\s*\(/);
  if (!head) return null;
  const start = head[0].length - 1;
  const close = matchParen(rest, start);
  return { params: parseParams(close > start ? rest.slice(start + 1, close) : '') };
}

export function analyzeSwift(text) {
  const clean = stripCommentsAndStrings(String(text || ''));
  const imports = [], types = [], functions = [], properties = [], typealiases = [];
  const propertyWrappers = new Set();
  let asyncCount = 0;
  const stack = [];
  let depth = 0;

  for (const line of logicalLines(clean)) {
    const current = stack.length ? stack[stack.length - 1] : null;
    const direct = current ? depth === current.depthOpen + 1 : depth === 0;
    const { attrs, rest } = splitModifiers(line);
    for (const a of attrs) propertyWrappers.add(a);

    if (direct) {
      let m;
      if ((m = rest.match(/^import\s+([\w.]+)/))) {
        if (!imports.includes(m[1])) imports.push(m[1]);
      } else if ((m = rest.match(/^(struct|class|enum|protocol|extension|actor)\s+([A-Za-z_][\w.]*)\s*(<[^>]*>)?\s*(?::\s*([^{]+))?/))) {
        const inherits = m[4] ? splitTop(m[4].split(/\bwhere\b/)[0]).map((s) => s.trim()).filter(Boolean) : [];
        const obj = {
          kind: m[1], name: m[2], generics: m[3] ? m[3].slice(1, -1).trim() : '',
          inherits, attrs, depthOpen: depth,
          members: { methods: [], properties: [], cases: [], inits: [] },
        };
        types.push(obj);
        stack.push(obj);
      } else if (/^func\b/.test(rest)) {
        const fn = parseFunc(rest);
        if (fn) { if (fn.async) asyncCount++; if (current) current.members.methods.push(fn); else functions.push(fn); }
      } else if (/^init[?!]?\s*(<[^>]*>)?\s*\(/.test(rest)) {
        const ini = parseInit(rest);
        if (ini && current) current.members.inits.push(ini);
      } else if ((m = rest.match(/^case\s+(.+)$/)) && current && current.kind === 'enum') {
        for (const c of splitTop(m[1])) {
          const cm = c.trim().match(/^([A-Za-z_]\w*)\s*(\([^)]*\))?/);
          if (cm) current.members.cases.push({ name: cm[1], associated: cm[2] ? cm[2].slice(1, -1).trim() : '' });
        }
      } else if ((m = rest.match(/^(var|let)\s+([A-Za-z_]\w*)\s*(?::\s*([^={]+))?\s*(=|\{)?/))) {
        const prop = { name: m[2], type: m[3] ? m[3].trim() : '', kind: m[1], computed: m[4] === '{', attrs };
        if (current) current.members.properties.push(prop); else properties.push(prop);
      } else if ((m = rest.match(/^typealias\s+([A-Za-z_]\w*)/))) {
        typealiases.push(m[1]);
      }
    }

    for (const ch of line) {
      if (ch === '{') depth++;
      else if (ch === '}') { depth = Math.max(0, depth - 1); while (stack.length && depth <= stack[stack.length - 1].depthOpen) stack.pop(); }
    }
  }

  return { imports, types, functions, properties, typealiases, propertyWrappers: [...propertyWrappers], asyncCount, isSwiftUI: imports.includes('SwiftUI') };
}

// ---- rendering ----

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'swift-section';
  const hd = document.createElement('div');
  hd.className = 'swift-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function tag(cls, t) { return `<span class="swift-tag ${cls}">${esc(t)}</span>`; }

function paramsHtml(params) {
  return params.map((p) => {
    const lbl = p.label && p.name && p.label !== p.name ? `<span class="swift-label">${esc(p.label)}</span> ` : '';
    const nm = p.name ? `${esc(p.name)}` : '';
    const io = p.inout ? '<span class="swift-attr">inout</span> ' : '';
    const ty = p.type ? `: ${io}<span class="swift-type">${esc(p.type)}${p.variadic ? '…' : ''}</span>` : '';
    return `${lbl}${nm}${ty}`;
  }).join(', ');
}

function funcHtml(f, label) {
  const flags = (f.async ? tag('swift-tag-async', 'async') + ' ' : '') + (f.throws ? tag('swift-tag-throws', 'throws') + ' ' : '');
  const gen = f.generics ? `&lt;${esc(f.generics)}&gt;` : '';
  const ret = f.returns ? ` -&gt; <span class="swift-ret">${esc(f.returns)}</span>` : '';
  return `${tag('swift-tag-func', label || 'func')} ${flags}<span class="swift-name">${esc(f.name)}</span>${gen}(${paramsHtml(f.params)})${ret}`;
}

function memberLines(t) {
  const out = [];
  for (const i of t.members.inits) out.push(`${tag('swift-tag-mem', 'init')} (${paramsHtml(i.params)})`);
  for (const p of t.members.properties) {
    const aw = (p.attrs || []).map((a) => `<span class="swift-attr">${esc(a)}</span> `).join('');
    const ty = p.type ? `: <span class="swift-type">${esc(p.type)}</span>` : '';
    const c = p.computed ? ' <span class="swift-muted">{ computed }</span>' : '';
    out.push(`${aw}<span class="swift-muted">${esc(p.kind)}</span> <span class="swift-name">${esc(p.name)}</span>${ty}${c}`);
  }
  for (const c of t.members.cases) {
    const av = c.associated ? `(<span class="swift-type">${esc(c.associated)}</span>)` : '';
    out.push(`${tag('swift-tag-enum', 'case')} <span class="swift-name">${esc(c.name)}</span>${av}`);
  }
  for (const m of t.members.methods) out.push(funcHtml(m));
  return out;
}

function notSwift(text) {
  const p = text.slice(0, 4000);
  return !/\b(import|func|struct|class|enum|protocol|extension|actor)\b/.test(p);
}

export async function render(intake) {
  const text = intake.text || '';
  if (notSwift(text)) return null;
  const info = analyzeSwift(text);

  const host = document.createElement('div');
  host.className = 'swift-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'swift-title';
  const badge = document.createElement('span');
  badge.className = 'swift-badge';
  badge.textContent = info.isSwiftUI ? 'SwiftUI' : 'Swift';
  title.appendChild(badge);
  title.appendChild(document.createTextNode('Swift source'));
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'swift-sub';
  sub.textContent = [
    info.imports.length && `${info.imports.length} import${info.imports.length !== 1 ? 's' : ''}`,
    info.types.length && `${info.types.length} type${info.types.length !== 1 ? 's' : ''}`,
    info.functions.length && `${info.functions.length} free function${info.functions.length !== 1 ? 's' : ''}`,
    info.asyncCount && `${info.asyncCount} async`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'swift-cards';
  for (const { value, label } of [
    { value: info.imports.length, label: 'Imports' },
    { value: info.types.length, label: 'Types' },
    { value: info.functions.length, label: 'Functions' },
    { value: info.asyncCount, label: 'Async' },
  ]) {
    const card = document.createElement('div');
    card.className = 'swift-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (info.imports.length) {
    const sec = makeSection(host, `Imports (${info.imports.length})`);
    const ul = document.createElement('ul'); ul.className = 'swift-list';
    for (const imp of info.imports) { const li = document.createElement('li'); li.innerHTML = `${tag('swift-tag-import', 'import')} <span class="swift-name">${esc(imp)}</span>`; ul.appendChild(li); }
    sec.appendChild(ul);
  }

  if (info.types.length) {
    const sec = makeSection(host, `Types (${info.types.length})`);
    for (const t of info.types) {
      const hd = document.createElement('div');
      hd.className = 'swift-type-hd';
      const gen = t.generics ? `&lt;${esc(t.generics)}&gt;` : '';
      const conf = t.inherits.length ? ` : <span class="swift-conf">${t.inherits.map(esc).join(', ')}</span>` : '';
      hd.innerHTML = `${tag('swift-tag-' + t.kind, t.kind)} <span class="swift-name">${esc(t.name)}</span>${gen}${conf}`;
      sec.appendChild(hd);
      const lines = memberLines(t);
      if (lines.length) {
        const ul = document.createElement('ul'); ul.className = 'swift-members';
        for (const h of lines) { const li = document.createElement('li'); li.innerHTML = h; ul.appendChild(li); }
        sec.appendChild(ul);
      }
    }
  }

  if (info.functions.length) {
    const sec = makeSection(host, `Functions (${info.functions.length})`);
    const ul = document.createElement('ul'); ul.className = 'swift-list';
    for (const f of info.functions) { const li = document.createElement('li'); li.innerHTML = funcHtml(f); ul.appendChild(li); }
    sec.appendChild(ul);
  }

  if (info.propertyWrappers.length) {
    const sec = makeSection(host, `Attributes / Property Wrappers (${info.propertyWrappers.length})`);
    const ul = document.createElement('ul'); ul.className = 'swift-list';
    for (const pw of info.propertyWrappers) { const li = document.createElement('li'); li.innerHTML = `<span class="swift-attr">${esc(pw)}</span>`; ul.appendChild(li); }
    sec.appendChild(ul);
  }

  return { parentNode: host };
}
