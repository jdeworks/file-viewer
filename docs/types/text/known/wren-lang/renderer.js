const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.wren-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.wren-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#403075;color:#fff;vertical-align:middle;margin-right:8px;}
.wren-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.wren-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.wren-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.wren-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.wren-card strong{display:block;font-size:1.2rem;font-weight:700;}
.wren-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.wren-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.wren-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.wren-section-hd .wren-is{font-weight:400;color:var(--fg-2,#888);}
.wren-list{margin:0;padding:0;list-style:none;}
.wren-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.wren-list li:last-child{border-bottom:none;}
.wren-empty{color:var(--fg-2,#999);font-style:italic;}
.wren-name{font-weight:600;}
.wren-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#ede9fe;color:#403075;font-weight:700;}
.wren-tag-construct{background:#fce7f3;color:#9d174d;}
.wren-tag-static{background:#d1fae5;color:#065f46;}
.wren-tag-foreign{background:#fef3c7;color:#92400e;}
.wren-tag-getter{background:#dbeafe;color:#1e40af;}
.wren-tag-setter{background:#fae8ff;color:#86198f;}
.wren-tag-operator{background:#ffe4e6;color:#9f1239;}
.wren-tag-method{background:#e0e7ff;color:#3730a3;}
.wren-tag-import{background:#dcfce7;color:#166534;}
.wren-tag-var{background:#f3f4f6;color:#374151;}
`;

const splitParams = (s) => s.split(',').map((p) => p.trim()).filter(Boolean);

// Blank out comments (line + block) and string contents so braces/parens inside them
// don't confuse the brace-depth scanner. Newlines are preserved for line-based parsing.
function clean(text) {
  const s = String(text || '');
  let out = '', i = 0, state = 'code';
  while (i < s.length) {
    const c = s[i], n = s[i + 1];
    if (state === 'code') {
      if (c === '/' && n === '/') { state = 'line'; out += '  '; i += 2; continue; }
      if (c === '/' && n === '*') { state = 'block'; out += '  '; i += 2; continue; }
      if (c === '"') { state = 'str'; out += ' '; i += 1; continue; }
      out += c; i += 1;
    } else if (state === 'line') {
      if (c === '\n') { state = 'code'; out += '\n'; } else out += ' ';
      i += 1;
    } else if (state === 'block') {
      if (c === '*' && n === '/') { state = 'code'; out += '  '; i += 2; }
      else { out += c === '\n' ? '\n' : ' '; i += 1; }
    } else { // str
      if (c === '\\') { out += '  '; i += 2; continue; }
      if (c === '"') { state = 'code'; out += ' '; i += 1; continue; }
      out += c === '\n' ? '\n' : ' '; i += 1;
    }
  }
  return out;
}

const OP_RE = /^(==|!=|<=|>=|<<|>>|\.\.\.|\.\.|<|>|\+|-|\*|\/|%|\^|&|\||~)\s*\(([^)]*)\)/;

// Parse a single class-body line into a member fact, or null if it isn't a declaration.
function parseMember(line) {
  let s = line.trim(), m;
  let isStatic = false, isForeign = false;
  // modifiers may appear in either order: `foreign static`, `static foreign`
  for (let k = 0; k < 2; k++) {
    if (!isStatic && (m = s.match(/^static\b\s*/))) { isStatic = true; s = s.slice(m[0].length); }
    else if (!isForeign && (m = s.match(/^foreign\b\s*/))) { isForeign = true; s = s.slice(m[0].length); }
  }
  const wrap = (o) => ({ ...o, static: isStatic, foreign: isForeign });

  if ((m = s.match(/^construct\s+(\w+)\s*\(([^)]*)\)/)))
    return wrap({ name: m[1], params: splitParams(m[2]), kind: 'constructor' });
  // subscript setter [i]=(v)  /  subscript getter [i]
  if ((m = s.match(/^\[([^\]]*)\]\s*=\s*\(([^)]*)\)/)))
    return wrap({ name: '[' + m[1].trim() + ']=', params: splitParams(m[2]), kind: 'operator' });
  if ((m = s.match(/^\[([^\]]*)\]\s*\{/)))
    return wrap({ name: '[' + m[1].trim() + ']', params: [], kind: 'operator' });
  // infix operator overloads
  if ((m = s.match(OP_RE)))
    return wrap({ name: m[1], params: splitParams(m[2]), kind: 'operator' });
  // prefix operators (`!`, `-`, `~`) defined getter-style with no params
  if ((m = s.match(/^([!~-])\s*\{/)))
    return wrap({ name: m[1], params: [], kind: 'operator' });
  // setter:  name=(value)
  if ((m = s.match(/^([A-Za-z_]\w*)\s*=\s*\(([^)]*)\)/)))
    return wrap({ name: m[1], params: splitParams(m[2]), kind: 'setter' });
  // method:  name(params)   (foreign methods have no body brace)
  if ((m = s.match(/^([A-Za-z_]\w*)\s*\(([^)]*)\)/)))
    return wrap({ name: m[1], params: splitParams(m[2]), kind: 'method' });
  // getter:  name {        (no parens)
  if ((m = s.match(/^([A-Za-z_]\w*)\s*\{/)))
    return wrap({ name: m[1], params: [], kind: 'getter' });
  return null;
}

// Pure, DOM-free structural parse. Exported for unit testing.
export function analyzeWren(text) {
  const lines = clean(text).split(/\r?\n/);
  const rawLines = String(text || '').split(/\r?\n/);
  const imports = [], classes = [], variables = [];
  let depth = 0;
  const stack = []; // active class bodies: { cls, bodyDepth }

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const startDepth = depth;
    const top = stack[stack.length - 1];
    const inBody = top && startDepth === top.bodyDepth;
    const trimmed = line.trim();

    if (inBody) {
      const mem = parseMember(trimmed);
      if (mem) top.cls.methods.push(mem);
    } else if (startDepth === 0 && trimmed) {
      let m;
      // imports parsed from the RAW line: clean() blanks the quoted module path.
      if (/^import\b/.test(trimmed) && (m = (rawLines[idx] || '').trim().match(/^import\s+"([^"]+)"(?:\s+for\s+(.+?))?\s*$/))) {
        imports.push({ module: m[1], names: m[2] ? splitParams(m[2]) : [] });
      } else if ((m = trimmed.match(/^(foreign\s+)?class\s+(\w+)(?:\s+is\s+(\w+))?/))) {
        const cls = { name: m[2], base: m[3] || null, foreign: !!m[1], methods: [] };
        classes.push(cls);
        stack.push({ cls, bodyDepth: startDepth + 1 });
      } else if ((m = trimmed.match(/^var\s+(\w+)\s*=/))) {
        variables.push(m[1]);
      }
    }

    for (const ch of line) {
      if (ch === '{') depth += 1;
      else if (ch === '}') {
        depth = Math.max(0, depth - 1);
        while (stack.length && depth < stack[stack.length - 1].bodyDepth) stack.pop();
      }
    }
  }

  return { imports, classes, variables };
}

function makeSection(host, titleHtml) {
  const sec = document.createElement('div');
  sec.className = 'wren-section';
  const hd = document.createElement('div');
  hd.className = 'wren-section-hd';
  hd.innerHTML = titleHtml;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
const makeList = (sec) => { const ul = document.createElement('ul'); ul.className = 'wren-list'; sec.appendChild(ul); return ul; };
const tag = (cls, t) => `<span class="wren-tag ${cls}">${esc(t)}</span>`;
const row = (ul, html) => { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); };

function memberSig(m) {
  if (m.kind === 'getter') return m.name;
  if (m.kind === 'setter') return `${m.name}=(${m.params.join(', ')})`;
  if (m.kind === 'operator' && !m.params.length) return m.name;
  return `${m.name}(${m.params.join(', ')})`;
}

export async function render(intake) {
  const text = intake.text || '';
  const { imports, classes, variables } = analyzeWren(text);
  if (!classes.length && !imports.length && !variables.length) return null;

  const methodCount = classes.reduce((n, c) => n + c.methods.length, 0);

  const host = document.createElement('div');
  host.className = 'wren-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'wren-title';
  title.innerHTML = '<span class="wren-badge">Wren Script</span>';
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'wren-sub';
  sub.textContent = [
    imports.length && `${imports.length} import${imports.length !== 1 ? 's' : ''}`,
    classes.length && `${classes.length} class${classes.length !== 1 ? 'es' : ''}`,
    methodCount && `${methodCount} member${methodCount !== 1 ? 's' : ''}`,
    variables.length && `${variables.length} var${variables.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ') || 'Wren script';
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'wren-cards';
  for (const { value, label } of [
    { value: imports.length, label: 'Imports' },
    { value: classes.length, label: 'Classes' },
    { value: methodCount, label: 'Members' },
    { value: variables.length, label: 'Vars' },
  ]) {
    const card = document.createElement('div');
    card.className = 'wren-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (imports.length) {
    const ul = makeList(makeSection(host, `Imports (${imports.length})`));
    for (const { module: mod, names } of imports) {
      const forPart = names.length ? ` <span class="wren-is">for ${esc(names.join(', '))}</span>` : '';
      row(ul, `${tag('wren-tag-import', 'import')} <span class="wren-name">${esc(mod)}</span>${forPart}`);
    }
  }

  for (const cls of classes) {
    const base = cls.base ? ` <span class="wren-is">is ${esc(cls.base)}</span>` : '';
    const fk = cls.foreign ? `${tag('wren-tag-foreign', 'foreign')} ` : '';
    const sec = makeSection(host, `${fk}class <span class="wren-name">${esc(cls.name)}</span>${base}`);
    const ul = makeList(sec);
    if (!cls.methods.length) { row(ul, '<span class="wren-empty">no members</span>'); continue; }
    for (const m of cls.methods) {
      const tags = [];
      if (m.static) tags.push(tag('wren-tag-static', 'static'));
      if (m.foreign) tags.push(tag('wren-tag-foreign', 'foreign'));
      tags.push(tag(`wren-tag-${m.kind === 'constructor' ? 'construct' : m.kind}`, m.kind));
      row(ul, `${tags.join(' ')} <span class="wren-name">${esc(memberSig(m))}</span>`);
    }
  }

  if (variables.length) {
    const ul = makeList(makeSection(host, `Top-level Variables (${variables.length})`));
    for (const v of variables) row(ul, `${tag('wren-tag-var', 'var')} <span class="wren-name">${esc(v)}</span>`);
  }

  return { parentNode: host };
}
