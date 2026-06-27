const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.nut-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.nut-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e67e22;color:#fff;vertical-align:middle;margin-right:8px;}
.nut-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.nut-name{font-family:ui-monospace,monospace;font-size:14px;color:#b9531a;font-weight:700;}
.nut-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.nut-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.nut-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.nut-card strong{display:block;font-size:1.2rem;font-weight:700;}
.nut-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.nut-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.nut-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.nut-list{margin:0;padding:0;list-style:none;}
.nut-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;}
.nut-list li:last-child{border-bottom:none;}
.nut-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#e0f2fe;color:#0369a1;font-weight:700;margin-right:4px;}
.nut-tag-class{background:#fff7ed;color:#c2410c;}
.nut-tag-func{background:#dbeafe;color:#1d4ed8;}
.nut-tag-enum{background:#fef9c3;color:#854d0e;}
.nut-tag-const{background:#ede9fe;color:#7c3aed;}
.nut-tag-ctor{background:#dcfce7;color:#15803d;}
.nut-decl-name{font-weight:600;}
.nut-base{color:#9f1239;font-style:italic;}
.nut-param{color:#0e7490;}
.nut-default{color:#5a6678;}
.nut-methods{margin:4px 0 0 0;padding:0;list-style:none;}
.nut-methods li{padding:3px 0 3px 16px;border:none;color:var(--fg,#24292f);}
.nut-members{color:#5a6678;font-size:11px;margin-top:3px;padding-left:16px;}
.nut-chip{display:inline-block;padding:1px 6px;border-radius:4px;font-size:11px;background:var(--bg-2,#f0f0f0);margin:1px 2px;font-family:ui-monospace,monospace;}
`;

// Strip line/block comments and string/char literal contents so braces/parens inside them
// never skew brace-depth or declaration matching. Preserves structural punctuation & newlines.
function clean(input) {
  const src = String(input || '');
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
    if (c === '@' && d === '"') { // verbatim string @"...""..."
      i += 2;
      while (i < n) { if (src[i] === '"' && src[i + 1] === '"') { i += 2; continue; } if (src[i] === '"') { i++; break; } i++; }
      out += '""'; continue;
    }
    if (c === '"') { i++; while (i < n && src[i] !== '"') { if (src[i] === '\\') i++; i++; } i++; out += '""'; continue; }
    if (c === "'") { i++; while (i < n && src[i] !== "'") { if (src[i] === '\\') i++; i++; } i++; out += "''"; continue; }
    out += c; i++;
  }
  return out;
}

// From an index pointing at '(', return the inner content of the balanced paren group + end index.
function readBalanced(str, open) {
  let depth = 0;
  for (let i = open; i < str.length; i++) {
    const c = str[i];
    if (c === '(') depth++;
    else if (c === ')') { depth--; if (depth === 0) return { content: str.slice(open + 1, i), end: i }; }
  }
  return { content: str.slice(open + 1), end: str.length };
}

// Match the brace that closes the one at `open`.
function matchBrace(str, open) {
  let depth = 0;
  for (let i = open; i < str.length; i++) {
    if (str[i] === '{') depth++;
    else if (str[i] === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

// Split a param list (comma at depth 0) into {name, default?} entries; "..." = varargs.
function parseParams(str) {
  const s = String(str || '').trim();
  if (!s) return [];
  const parts = [];
  let buf = '', depth = 0;
  for (const ch of s) {
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    if (ch === ',' && depth === 0) { parts.push(buf); buf = ''; } else buf += ch;
  }
  if (buf.trim()) parts.push(buf);
  return parts.map((p) => {
    const t = p.trim();
    if (t === '...') return { name: '...' };
    const eq = t.indexOf('=');
    if (eq >= 0) return { name: t.slice(0, eq).trim(), default: t.slice(eq + 1).trim() };
    return { name: t };
  }).filter((p) => p.name);
}

// Methods + member slots declared directly in a class body (depth-0 relative to the body).
function parseClassBody(body) {
  const methods = [], members = [];
  let depth = 0, i = 0;
  const n = body.length;
  while (i < n) {
    const ch = body[i];
    if (ch === '{') { depth++; i++; continue; }
    if (ch === '}') { depth--; i++; continue; }
    if (depth === 0 && /[A-Za-z_]/.test(ch)) {
      const rest = body.slice(i);
      let mm;
      if ((mm = /^constructor\s*\(/.exec(rest))) {
        const { content, end } = readBalanced(body, i + mm[0].length - 1);
        methods.push({ name: 'constructor', params: parseParams(content), ctor: true });
        i = end + 1; continue;
      }
      if ((mm = /^(?:static\s+)?function\s+([A-Za-z_]\w*)\s*\(/.exec(rest))) {
        const { content, end } = readBalanced(body, i + mm[0].length - 1);
        methods.push({ name: mm[1], params: parseParams(content) });
        i = end + 1; continue;
      }
      if ((mm = /^(?:static\s+)?([A-Za-z_]\w*)\s*=\s*function\s*\(/.exec(rest))) {
        const { content, end } = readBalanced(body, i + mm[0].length - 1);
        methods.push({ name: mm[1], params: parseParams(content) });
        i = end + 1; continue;
      }
      if ((mm = /^(?:static\s+)?([A-Za-z_]\w*)\s*=\s*[^;]*;/.exec(rest))) {
        members.push(mm[1]); i += mm[0].length; continue;
      }
      const idm = /^\w+/.exec(rest);
      i += idm ? idm[0].length : 1; continue;
    }
    i++;
  }
  return { methods, members };
}

function findClasses(src) {
  const classes = [];
  const re = /\bclass\s+(?:::)?([\w.]+)\s*(?:extends\s+([\w.]+)\s*)?\{/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const open = m.index + m[0].length - 1;
    const close = matchBrace(src, open);
    const end = close < 0 ? src.length : close;
    const { methods, members } = parseClassBody(src.slice(open + 1, end));
    classes.push({ name: m[1], base: m[2] || null, methods, members, start: m.index, end });
  }
  return classes;
}

// Blank out class bodies (incl. braces) so their methods aren't re-read as free functions.
function maskClasses(src, classes) {
  const arr = src.split('');
  for (const c of classes) for (let i = c.start; i <= c.end && i < arr.length; i++) arr[i] = ' ';
  return arr.join('');
}

function topFunctions(masked) {
  const fns = [], seen = new Set();
  const add = (name, params) => { if (!seen.has(name)) { seen.add(name); fns.push({ name, params }); } };
  let m;
  const re1 = /\bfunction\s+((?:::)?[\w.]+)\s*\(/g;
  while ((m = re1.exec(masked)) !== null) {
    const { content, end } = readBalanced(masked, m.index + m[0].length - 1);
    add(m[1], parseParams(content)); re1.lastIndex = end + 1;
  }
  const re2 = /(?:^|[^.\w])((?:::)?[\w.]+)\s*<-\s*function\s*\(/g;
  while ((m = re2.exec(masked)) !== null) {
    const { content, end } = readBalanced(masked, masked.indexOf('(', m.index + m[0].length - 1));
    add(m[1], parseParams(content)); re2.lastIndex = end + 1;
  }
  return fns;
}

function topEnums(masked) {
  const enums = [];
  let m;
  const re = /\benum\s+([\w]+)\s*\{([^}]*)\}/g;
  while ((m = re.exec(masked)) !== null) {
    const members = m[2].split(',').map((x) => (x.match(/[A-Za-z_]\w*/) || [])[0]).filter(Boolean);
    enums.push({ name: m[1], members });
  }
  return enums;
}

// Parse into structured facts. Exported (pure, no DOM) for unit testing.
export function analyzeSquirrel(text) {
  const src = clean(text);
  const classes = findClasses(src);
  const masked = maskClasses(src, classes);
  const functions = topFunctions(masked);
  const enums = topEnums(masked);

  const constants = [];
  let m;
  const cre = /\bconst\s+([\w]+)\s*=\s*([^;]+);/g;
  while ((m = cre.exec(masked)) !== null) constants.push({ name: m[1], value: m[2].trim() });

  const locals = [];
  const lre = /\blocal\s+([A-Za-z_]\w*)/g;
  while ((m = lre.exec(masked)) !== null) if (!locals.includes(m[1])) locals.push(m[1]);

  const globals = [];
  const gre = /(?:^|[^\w:])::([\w]+)\s*<-/g;
  while ((m = gre.exec(masked)) !== null) if (!globals.includes(m[1])) globals.push(m[1]);

  return { classes, functions, enums, constants, locals, globals };
}

// ---- rendering ----
function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'nut-section';
  const hd = document.createElement('div');
  hd.className = 'nut-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'nut-list'; sec.appendChild(ul); return ul; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
function tag(cls, t) { return `<span class="nut-tag ${cls}">${esc(t)}</span>`; }
function paramsHtml(params) {
  return '(' + params.map((p) => {
    if (p.name === '...') return '<span class="nut-param">...</span>';
    const def = p.default ? ` = <span class="nut-default">${esc(p.default)}</span>` : '';
    return `<span class="nut-param">${esc(p.name)}</span>${def}`;
  }).join(', ') + ')';
}

export function render(intake) {
  const text = intake && intake.text || '';
  const { classes, functions, enums, constants, locals, globals } = analyzeSquirrel(text);

  const hasAny = classes.length || functions.length || enums.length || constants.length || locals.length || globals.length;
  if (!hasAny && !/\b(class|function|local)\b|<-/.test(text)) return null;

  const host = document.createElement('div');
  host.className = 'nut-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'nut-title';
  const badge = document.createElement('span');
  badge.className = 'nut-badge';
  badge.textContent = 'Squirrel';
  title.appendChild(badge);
  const nm = document.createElement('span');
  nm.className = 'nut-name';
  nm.textContent = (intake && (intake.name || intake.filename)) || 'Script';
  title.appendChild(nm);
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'nut-sub';
  sub.textContent = [
    classes.length && `${classes.length} class${classes.length !== 1 ? 'es' : ''}`,
    functions.length && `${functions.length} function${functions.length !== 1 ? 's' : ''}`,
    enums.length && `${enums.length} enum${enums.length !== 1 ? 's' : ''}`,
    constants.length && `${constants.length} const${constants.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ') || 'Squirrel script';
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'nut-cards';
  for (const { value, label } of [
    { value: classes.length, label: 'Classes' },
    { value: functions.length, label: 'Functions' },
    { value: enums.length, label: 'Enums' },
    { value: constants.length, label: 'Constants' },
    { value: locals.length, label: 'Locals' },
  ]) {
    const card = document.createElement('div');
    card.className = 'nut-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (classes.length) {
    const ul = makeList(makeSection(host, `Classes (${classes.length})`));
    for (const c of classes) {
      const base = c.base ? ` <span class="nut-base">extends ${esc(c.base)}</span>` : '';
      const li = document.createElement('li');
      li.innerHTML = `${tag('nut-tag-class', 'class')}<span class="nut-decl-name">${esc(c.name)}</span>${base}`;
      if (c.methods.length) {
        const mul = document.createElement('ul');
        mul.className = 'nut-methods';
        for (const mth of c.methods) {
          const mli = document.createElement('li');
          mli.innerHTML = `${tag(mth.ctor ? 'nut-tag-ctor' : 'nut-tag-func', mth.ctor ? 'constructor' : 'function')}<span class="nut-decl-name">${esc(mth.name)}</span>${paramsHtml(mth.params)}`;
          mul.appendChild(mli);
        }
        li.appendChild(mul);
      }
      if (c.members.length) {
        const mem = document.createElement('div');
        mem.className = 'nut-members';
        mem.textContent = 'members: ' + c.members.join(', ');
        li.appendChild(mem);
      }
      ul.appendChild(li);
    }
  }

  if (functions.length) {
    const ul = makeList(makeSection(host, `Functions (${functions.length})`));
    for (const f of functions) {
      row(ul, `${tag('nut-tag-func', 'function')}<span class="nut-decl-name">${esc(f.name)}</span>${paramsHtml(f.params)}`);
    }
  }

  if (enums.length) {
    const ul = makeList(makeSection(host, `Enums (${enums.length})`));
    for (const e of enums) {
      const chips = e.members.map((mb) => `<span class="nut-chip">${esc(mb)}</span>`).join('');
      row(ul, `${tag('nut-tag-enum', 'enum')}<span class="nut-decl-name">${esc(e.name)}</span> ${chips}`);
    }
  }

  if (constants.length) {
    const ul = makeList(makeSection(host, `Constants (${constants.length})`));
    for (const c of constants) {
      row(ul, `${tag('nut-tag-const', 'const')}<span class="nut-decl-name">${esc(c.name)}</span> = <span class="nut-default">${esc(c.value)}</span>`);
    }
  }

  if (globals.length) {
    const sec = makeSection(host, `Global (::) Declarations (${globals.length})`);
    const wrap = document.createElement('div');
    wrap.style.padding = '8px 14px';
    for (const g of globals) {
      const chip = document.createElement('span');
      chip.className = 'nut-chip';
      chip.textContent = '::' + g;
      wrap.appendChild(chip);
    }
    sec.appendChild(wrap);
  }

  return { parentNode: host };
}
