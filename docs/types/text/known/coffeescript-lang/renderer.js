const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.coffee-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.coffee-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2f2625;color:#c0a060;vertical-align:middle;margin-right:8px;}
.coffee-badge-sub{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#fdf6ec;color:#7c5c2e;vertical-align:middle;margin-left:6px;}
.coffee-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.coffee-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.coffee-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.coffee-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.coffee-card strong{display:block;font-size:1.2rem;font-weight:700;}
.coffee-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.coffee-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.coffee-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.coffee-list{margin:0;padding:0;list-style:none;}
.coffee-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.coffee-list li:last-child{border-bottom:none;}
.coffee-methods{margin:2px 0 0 0;padding:0;list-style:none;width:100%;}
.coffee-methods li{border-bottom:none;padding:3px 0 3px 16px;font-size:11.5px;}
.coffee-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#fdf6ec;color:#7c5c2e;font-weight:700;}
.coffee-tag-fat{background:#fef3c7;color:#92400e;}
.coffee-tag-cls{background:#ede9fe;color:#7c3aed;}
.coffee-tag-imp{background:#dcfce7;color:#166534;}
.coffee-tag-exp{background:#dbeafe;color:#1d4ed8;}
.coffee-tag-const{background:#e0f2fe;color:#0369a1;}
.coffee-name{font-weight:600;}
.coffee-ext{color:#9f1239;font-style:italic;}
.coffee-param{color:#0e7490;}
.coffee-at{color:#b45309;font-weight:700;}
.coffee-def{color:#6e7781;}
.coffee-src{color:#7c5c2e;}
.coffee-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.coffee-kw{color:#2f2625;font-weight:600;}
.coffee-str{color:#0a6640;}
.coffee-comment{color:#6e7781;font-style:italic;}
.coffee-num{color:#b45309;}
.coffee-op{color:#c0a060;font-weight:600;}
`;

const COFFEE_KEYWORDS = new Set([
  'if', 'else', 'unless', 'then', 'and', 'or', 'not', 'is', 'isnt',
  'true', 'false', 'null', 'undefined', 'yes', 'no', 'on', 'off',
  'new', 'return', 'throw', 'try', 'catch', 'finally', 'class', 'extends',
  'super', 'this', 'of', 'in', 'by', 'when', 'switch', 'for', 'while',
  'until', 'loop', 'do', 'break', 'continue', 'delete', 'typeof', 'instanceof',
  'export', 'import', 'default', 'module', 'require',
]);

// ── pure parse helpers (DOM-free) ──────────────────────────────────────────
const indentOf = (line) => line.match(/^[ \t]*/)[0].replace(/\t/g, '  ').length;

// Strip a trailing/whole-line `#` comment, honoring quoted strings (so `#{…}`
// interpolation and `#` inside strings don't end the line early).
function stripComment(line) {
  let q = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === '#') return line.slice(0, i);
  }
  return line;
}

// Index of the `)` matching the `(` at openIdx (quote/nesting aware), or -1.
function matchParen(s, openIdx) {
  let depth = 0, q = null;
  for (let i = openIdx; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === '(') depth++;
    else if (c === ')') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

// Split on top-level commas (ignoring commas inside (), [], {} or strings).
function splitTopLevel(s) {
  const parts = []; let buf = '', depth = 0, q = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { buf += c; if (c === '\\') { buf += s[++i] || ''; } else if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; buf += c; continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    if (c === ',' && depth === 0) { parts.push(buf); buf = ''; continue; }
    buf += c;
  }
  if (buf.trim()) parts.push(buf);
  return parts;
}

// "(@name, sound, opts = {}, rest...)" → [{name,at,default,splat}]
function parseParams(paren) {
  if (!paren) return [];
  const inner = paren.replace(/^\(/, '').replace(/\)$/, '').trim();
  if (!inner) return [];
  return splitTopLevel(inner).map((raw) => {
    let p = raw.trim();
    const at = p.startsWith('@');
    if (at) p = p.slice(1);
    let def = null;
    const eq = p.indexOf('=');
    if (eq >= 0) { def = p.slice(eq + 1).trim(); p = p.slice(0, eq).trim(); }
    const splat = p.endsWith('...');
    if (splat) p = p.slice(0, -3).trim();
    return { name: p, at, default: def, splat };
  }).filter((x) => x.name);
}

// Given the RHS after `=` / `:`, return {params,bound} if it defines an arrow
// function, else null. Handles `-> …`, `(a,b) -> …`, `(a) => …`.
function arrowSig(rest) {
  const s = rest.trim();
  if (s.startsWith('(')) {
    const close = matchParen(s, 0);
    if (close < 0) return null;
    const after = s.slice(close + 1).trim();
    if (after.startsWith('->') || after.startsWith('=>')) {
      return { params: parseParams(s.slice(0, close + 1)), bound: after.startsWith('=>') };
    }
    return null;
  }
  if (s.startsWith('->') || s.startsWith('=>')) return { params: [], bound: s.startsWith('=>') };
  return null;
}

// Parse CoffeeScript into structured facts. Exported, pure, no DOM — unit-testable.
// Uses indentation to associate methods with their enclosing class.
export function analyzeCoffee(text) {
  const lines = String(text || '').split(/\r?\n/);
  const imports = [], functions = [], classes = [], constants = [], exports = [];
  let hasModuleExports = false, atCount = 0;
  let cur = null; // current open class: {name, extends, methods, indent}

  for (const rawLine of lines) {
    const code = stripComment(rawLine);
    const trimmed = code.trim();
    atCount += (rawLine.match(/@\w+/g) || []).length;
    if (!trimmed) continue;
    const indent = indentOf(code);

    // Dedent closes the current class scope.
    if (cur && indent <= cur.indent) cur = null;

    // class header (can open a new scope at any indent)
    let m;
    if ((m = trimmed.match(/^class\s+(\w+)(?:\s+extends\s+([\w.]+))?/))) {
      cur = { name: m[1], extends: m[2] || null, methods: [], indent };
      classes.push(cur);
      continue;
    }

    const inClassBody = cur && indent > cur.indent;
    if (inClassBody) {
      // `name: (params) ->`  or  `@static: ->`  (method)
      if ((m = trimmed.match(/^(@?[\w$]+)\s*:\s*/))) {
        const sig = arrowSig(trimmed.slice(m[0].length));
        if (sig) { cur.methods.push({ name: m[1], params: sig.params, bound: sig.bound }); continue; }
      }
      // `@static = ->`  (assigned static method)
      if ((m = trimmed.match(/^(@?[\w$]+)\s*=\s*/))) {
        const sig = arrowSig(trimmed.slice(m[0].length));
        if (sig) { cur.methods.push({ name: m[1], params: sig.params, bound: sig.bound, static: true }); }
      }
      continue; // other class-body lines (bodies, field assigns) aren't structure
    }

    // ── top level ──
    if ((m = trimmed.match(/^require\s+['"]([^'"]+)['"]/))) { imports.push({ name: null, source: m[1] }); continue; }
    if ((m = trimmed.match(/^import\s+(.+?)\s+from\s+['"]([^'"]+)['"]/))) { imports.push({ name: m[1].trim(), source: m[2] }); continue; }

    if (/^(?:module\.)?exports\b/.test(trimmed)) {
      hasModuleExports = true;
      const brace = trimmed.match(/\{([^}]*)\}/);
      if (brace) splitTopLevel(brace[1]).forEach((p) => { const n = p.split(':')[0].trim(); if (n) exports.push(n); });
      else {
        const prop = trimmed.match(/^(?:module\.)?exports\.(\w+)/);
        if (prop) exports.push(prop[1]);
        else { const rhs = trimmed.match(/=\s*([\w.$]+)/); if (rhs) exports.push(rhs[1]); }
      }
      continue;
    }

    if ((m = trimmed.match(/^([A-Za-z_$][\w$.]*)\s*=\s*/))) {
      const name = m[1];
      const rest = trimmed.slice(m[0].length);
      const sig = arrowSig(rest);
      if (sig) { functions.push({ name, params: sig.params, bound: sig.bound }); continue; }
      const req = rest.match(/^require\s*\(?\s*['"]([^'"]+)['"]/);
      if (req) { imports.push({ name, source: req[1] }); continue; }
      let kind = 'value';
      if (rest.startsWith('{')) kind = 'object';
      else if (rest.startsWith('[')) kind = 'array';
      else if (/^['"]/.test(rest)) kind = 'string';
      else if (/^-?\d/.test(rest)) kind = 'number';
      else if (/^(?:yes|no|on|off|true|false)\b/.test(rest)) kind = 'boolean';
      constants.push({ name, kind, preview: rest.slice(0, 60).trim() });
    }
  }

  return { imports, functions, classes, constants, exports, hasModuleExports, atCount };
}

// ── source highlighter (cosmetic) ──────────────────────────────────────────
function highlightCoffee(text) {
  const lines = String(text || '').split(/\r?\n/);
  const result = [];
  for (const line of lines) {
    if (line.trim().startsWith('#')) { result.push('<span class="coffee-comment">' + esc(line) + '</span>'); continue; }
    let out = '', i = 0;
    while (i < line.length) {
      if (line[i] === '#') { out += '<span class="coffee-comment">' + esc(line.slice(i)) + '</span>'; break; }
      if (line[i] === '"' || line[i] === "'") {
        const q = line[i]; let j = i + 1;
        while (j < line.length && line[j] !== q) { if (line[j] === '\\') j++; j++; }
        j++;
        out += '<span class="coffee-str">' + esc(line.slice(i, j)) + '</span>'; i = j; continue;
      }
      if (/[0-9]/.test(line[i])) {
        let j = i; while (j < line.length && /[0-9._xXbBLl]/.test(line[j])) j++;
        out += '<span class="coffee-num">' + esc(line.slice(i, j)) + '</span>'; i = j; continue;
      }
      if ((line[i] === '-' && line[i + 1] === '>') || (line[i] === '=' && line[i + 1] === '>')) {
        out += '<span class="coffee-op">' + esc(line.slice(i, i + 2)) + '</span>'; i += 2; continue;
      }
      if (/[A-Za-z_@]/.test(line[i])) {
        let j = i; if (line[j] === '@') j++;
        while (j < line.length && /\w/.test(line[j])) j++;
        const word = line.slice(i, j);
        const bare = word.startsWith('@') ? word.slice(1) : word;
        out += COFFEE_KEYWORDS.has(bare) ? '<span class="coffee-kw">' + esc(word) + '</span>' : esc(word);
        i = j; continue;
      }
      out += esc(line[i]); i++;
    }
    result.push(out);
  }
  return result.join('\n');
}

// ── render helpers ──────────────────────────────────────────────────────────
function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'coffee-section';
  const hd = document.createElement('div');
  hd.className = 'coffee-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'coffee-list'; sec.appendChild(ul); return ul; }
function row(ul, html, cls) { const li = document.createElement('li'); if (cls) li.className = cls; li.innerHTML = html; ul.appendChild(li); return li; }
function tag(cls, t) { return `<span class="coffee-tag ${cls}">${esc(t)}</span>`; }

function paramsHtml(params) {
  if (!params.length) return '<span class="coffee-param">()</span>';
  const inner = params.map((p) => {
    const at = p.at ? '<span class="coffee-at">@</span>' : '';
    const splat = p.splat ? '…' : '';
    const def = p.default != null ? `<span class="coffee-def"> = ${esc(p.default)}</span>` : '';
    return `${at}<span class="coffee-param">${esc(p.name)}${splat}</span>${def}`;
  }).join(', ');
  return `(${inner})`;
}
function fnHtml(name, params, bound) {
  const arrow = bound ? tag('coffee-tag-fat', '=>') : tag('coffee-tag', '->');
  return `${arrow} <span class="coffee-name">${esc(name)}</span>${paramsHtml(params)}`;
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').toLowerCase();
  const isLiterate = name.endsWith('.litcoffee') || name.endsWith('.coffee.md');
  const { imports, functions, classes, constants, exports, hasModuleExports, atCount } = analyzeCoffee(text);
  const methodCount = classes.reduce((n, c) => n + c.methods.length, 0);
  const fatCount = functions.filter((f) => f.bound).length + classes.reduce((n, c) => n + c.methods.filter((m) => m.bound).length, 0);

  const host = document.createElement('div');
  host.className = 'coffee-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'coffee-title';
  const badge = isLiterate ? 'Literate CoffeeScript' : 'CoffeeScript';
  const ext = isLiterate ? (name.endsWith('.coffee.md') ? '.coffee.md' : '.litcoffee') : '.coffee';
  title.innerHTML = `<span class="coffee-badge">${esc(badge)}</span><span class="coffee-badge-sub">${esc(ext)}</span>`;
  host.appendChild(title);

  const subEl = document.createElement('div');
  subEl.className = 'coffee-sub';
  subEl.textContent = [
    classes.length && `${classes.length} class${classes.length !== 1 ? 'es' : ''}`,
    methodCount && `${methodCount} method${methodCount !== 1 ? 's' : ''}`,
    functions.length && `${functions.length} function${functions.length !== 1 ? 's' : ''}`,
    imports.length && `${imports.length} import${imports.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(subEl);

  const cards = document.createElement('div');
  cards.className = 'coffee-cards';
  for (const { value, label } of [
    { value: classes.length, label: 'Classes' },
    { value: functions.length, label: 'Functions' },
    { value: methodCount, label: 'Methods' },
    { value: fatCount, label: 'Bound (=>)' },
    { value: imports.length, label: 'Imports' },
  ]) {
    const card = document.createElement('div');
    card.className = 'coffee-card';
    const strong = document.createElement('strong'); strong.textContent = value;
    const span = document.createElement('span'); span.textContent = label;
    card.appendChild(strong); card.appendChild(span); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (imports.length) {
    const ul = makeList(makeSection(host, `Imports (${imports.length})`));
    for (const im of imports) {
      const as = im.name ? `<span class="coffee-name">${esc(im.name)}</span> = ` : '';
      row(ul, `${tag('coffee-tag-imp', 'require')} ${as}<span class="coffee-src">${esc(im.source)}</span>`);
    }
  }

  if (classes.length) {
    const sec = makeSection(host, `Classes (${classes.length})`);
    const ul = makeList(sec);
    for (const c of classes) {
      const ext = c.extends ? ` <span class="coffee-ext">extends ${esc(c.extends)}</span>` : '';
      const li = row(ul, `${tag('coffee-tag-cls', 'class')} <span class="coffee-name">${esc(c.name)}</span>${ext}`);
      if (c.methods.length) {
        const ml = document.createElement('ul'); ml.className = 'coffee-methods';
        for (const m of c.methods) { const mi = document.createElement('li'); mi.innerHTML = fnHtml(m.name, m.params, m.bound); ml.appendChild(mi); }
        li.appendChild(ml);
      }
    }
  }

  if (functions.length) {
    const ul = makeList(makeSection(host, `Functions (${functions.length})`));
    for (const f of functions) row(ul, fnHtml(f.name, f.params, f.bound));
  }

  if (constants.length) {
    const ul = makeList(makeSection(host, `Constants (${constants.length})`));
    for (const c of constants) row(ul, `${tag('coffee-tag-const', c.kind)} <span class="coffee-name">${esc(c.name)}</span> = <span class="coffee-def">${esc(c.preview)}</span>`);
  }

  if (exports.length || hasModuleExports) {
    const ul = makeList(makeSection(host, `Exports (${exports.length})`));
    if (exports.length) for (const e of exports) row(ul, `${tag('coffee-tag-exp', 'export')} <span class="coffee-name">${esc(e)}</span>`);
    else row(ul, `${tag('coffee-tag-exp', 'export')} <span class="coffee-def">module.exports detected</span>`);
  }

  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'coffee-pre';
  pre.innerHTML = highlightCoffee(text);
  srcSec.appendChild(pre);

  return { parentNode: host };
}
