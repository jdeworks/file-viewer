const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.crl-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.cr-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#000;color:#fff;vertical-align:middle;margin-right:8px;}
.cr-badge-sub{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#f0f0f0;color:#333;vertical-align:middle;margin-left:6px;}
.cr-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.cr-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.cr-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.cr-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.cr-card strong{display:block;font-size:1.2rem;font-weight:700;}
.cr-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.cr-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.cr-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.cr-list{margin:0;padding:0;list-style:none;}
.cr-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.cr-list li:last-child{border-bottom:none;}
.cr-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#f0f0f0;color:#333;font-weight:700;}
.cr-tag-class{background:#e0f2f7;color:#0d6e8a;}
.cr-tag-struct{background:#fef3c7;color:#92400e;}
.cr-tag-module{background:#dcfce7;color:#166534;}
.cr-tag-enum{background:#fce7f3;color:#9d174d;}
.cr-tag-abstract{background:#ede9fe;color:#7f52ff;}
.cr-tag-macro{background:#fff7ed;color:#c2410c;}
.cr-tag-def{background:#dbeafe;color:#1d4ed8;}
.cr-tag-self{background:#e0e7ff;color:#3730a3;}
.cr-tag-ivar{background:#f1f5f9;color:#475569;}
.cr-tag-const{background:#fef9c3;color:#854d0e;}
.cr-name{font-weight:600;}
.cr-super{color:#0d6e8a;}
.cr-type{color:#0e7490;}
.cr-ret{color:#1d4ed8;}
.cr-ann{color:#c026d3;font-family:ui-monospace,monospace;font-size:12px;}
.cr-alias{font-family:ui-monospace,monospace;font-size:12px;color:#0d6e8a;}
.cr-members{color:#9d174d;font-family:ui-monospace,monospace;font-size:11px;}
.cr-methods{margin:4px 0 0;padding:0 0 0 14px;list-style:none;flex-basis:100%;}
.cr-methods li{padding:3px 0;border:none;font-size:11.5px;}
`;

// Strip a trailing line comment (but not string interpolation `#{`).
const stripC = (s) => String(s).replace(/\s+#(?!\{).*$/, '');
const parenBalance = (s) => (s.match(/\(/g) || []).length - (s.match(/\)/g) || []).length;

// Split on top-level commas (paren/bracket/brace aware so generic types like
// Hash(String, Int32) stay intact).
function splitTopCommas(s) {
  const out = []; let depth = 0, buf = '';
  for (const ch of s) {
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) { out.push(buf); buf = ''; } else buf += ch;
  }
  if (buf.trim()) out.push(buf);
  return out;
}

// Extract the contents of the first balanced (...) group; return {inner, after}.
function extractParens(s) {
  const i = s.indexOf('(');
  if (i < 0) return { inner: null, after: s };
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === '(') depth++;
    else if (s[j] === ')') { depth--; if (depth === 0) return { inner: s.slice(i + 1, j), after: s.slice(j + 1) }; }
  }
  return { inner: s.slice(i + 1), after: '' };
}

// Crystal params: "[@|*|**|&]name[?!] [: Type] [= default]". `@`-prefixed names are
// instance-var assignment params (e.g. def initialize(@radius : Float64)).
function parseParams(inner) {
  return splitTopCommas(inner || '').map((raw) => {
    let p = raw.trim();
    if (!p) return null;
    p = p.replace(/^&/, '').replace(/^\*\*?/, '');
    const m = p.match(/^(@?[\w]+[?!]?)\s*(?::\s*([^=]+?))?\s*(?:=\s*(.+))?$/);
    if (!m) return { name: p, type: '', ivar: false };
    let name = m[1]; let ivar = false;
    if (name.startsWith('@')) { ivar = true; name = name.slice(1); }
    return { name, type: (m[2] || '').trim(), ivar };
  }).filter(Boolean);
}

// Parse one (possibly multi-line-collapsed) def/macro signature.
function parseDef(sig) {
  sig = stripC(sig).trim();
  const km = sig.match(/^(?:(?:private|protected)\s+)?(abstract\s+)?(def|macro)\s+/);
  if (!km) return null;
  const isAbstract = !!km[1]; const kind = km[2];
  let rest = sig.slice(km[0].length).trim();
  let isSelf = false;
  if (rest.startsWith('self.')) { isSelf = true; rest = rest.slice(5); }
  else if (rest.startsWith('self::')) { isSelf = true; rest = rest.slice(6); }
  const nameM = rest.match(/^([^\s(:]+)/);
  if (!nameM) return null;
  const name = nameM[1];
  rest = rest.slice(name.length);
  const { inner, after } = extractParens(rest);
  const params = inner != null ? parseParams(inner) : [];
  const rt = after.match(/^\s*:\s*(.+?)\s*$/);
  return { kind, name, params, returns: rt ? rt[1].trim() : '', abstract: isAbstract, self: isSelf };
}

function nearestContainer(stack) {
  for (let i = stack.length - 1; i >= 0; i--) {
    const t = stack[i].type;
    if (t === 'class' || t === 'struct' || t === 'module') return stack[i].ref;
  }
  return null;
}
function addIvar(container, name, type) {
  if (!container) return;
  if (!container.ivars.some((v) => v.name === name)) container.ivars.push({ name, type });
}

// Parse into structured facts. Exported (pure, no DOM) for unit testing.
// Tracks block nesting via def/class/...end depth to associate methods with their class.
export function analyzeCrystal(text) {
  const lines = String(text || '').split(/\r?\n/);
  const requires = [], classes = [], enums = [], topMethods = [];
  const constants = [], macros = [], aliases = [];
  const annotations = new Set();
  const stack = []; // frames: {type, ref}

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t || t.startsWith('#')) continue;
    let m;

    if ((m = t.match(/^require\s+"([^"]+)"/))) { requires.push(m[1]); continue; }
    if ((m = t.match(/^alias\s+([\w:]+)\s*=\s*(.+)$/))) { aliases.push({ name: m[1], value: stripC(m[2]).trim() }); continue; }
    if ((m = t.match(/^@\[(\w+)/))) { annotations.add(m[1]); continue; }
    if (/^end\b/.test(t)) { stack.pop(); continue; }

    // class / struct / module / enum / lib / annotation
    if ((m = t.match(/^(abstract\s+)?(class|struct|module|enum|lib|annotation)\s+([\w:]+)(?:\s*<\s*([\w:().]+))?/))) {
      const abstractFlag = !!m[1], kind = m[2], name = m[3], sup = m[4] || null;
      if (kind === 'enum') {
        const obj = { name, members: [] };
        enums.push(obj); stack.push({ type: 'enum', ref: obj });
      } else if (kind === 'lib' || kind === 'annotation') {
        stack.push({ type: kind, ref: null });
      } else {
        const obj = { kind, name, super: sup, abstract: abstractFlag, methods: [], ivars: [] };
        classes.push(obj); stack.push({ type: kind, ref: obj });
      }
      continue;
    }

    // def / macro (collapse multi-line param lists)
    if (/^(?:(?:private|protected)\s+)?(?:abstract\s+)?(?:def|macro)\b/.test(t)) {
      let sig = t;
      while (parenBalance(sig) > 0 && i + 1 < lines.length) { i++; sig += ' ' + lines[i].trim(); }
      const info = parseDef(sig);
      if (info) {
        if (info.kind === 'macro') {
          macros.push({ name: info.name, params: info.params });
        } else {
          const c = nearestContainer(stack);
          const method = { name: info.name, params: info.params, returns: info.returns, abstract: info.abstract, self: info.self };
          if (c) c.methods.push(method); else topMethods.push(method);
          for (const p of info.params) if (p.ivar) addIvar(c, p.name, p.type);
        }
      }
      if (!info || !info.abstract) stack.push({ type: info && info.kind === 'macro' ? 'macro' : 'def', ref: null });
      continue;
    }

    // getter/setter/property declarations → instance vars
    if ((m = t.match(/^(?:(?:private|protected)\s+)?(?:getter|setter|property|class_getter|class_property)\s+(@?\w+)\s*:\s*([^=#]+)/))) {
      addIvar(nearestContainer(stack), m[1].replace(/^@/, ''), m[2].trim()); continue;
    }
    // standalone instance var: @x : Type
    if ((m = t.match(/^(@\w+)\s*:\s*([^=#]+)/))) {
      addIvar(nearestContainer(stack), m[1].slice(1), m[2].trim()); continue;
    }

    // enum members
    if (stack.length && stack[stack.length - 1].type === 'enum') {
      if ((m = t.match(/^([A-Z]\w*)(?:\s*=\s*.+)?$/))) { stack[stack.length - 1].ref.members.push(m[1]); continue; }
    }
    // constants (uppercase-leading name = value), but not inside an enum
    if ((m = t.match(/^([A-Z][A-Za-z0-9_]*)\s*=\s*(.+)$/))) { constants.push({ name: m[1], value: stripC(m[2]).trim() }); continue; }

    // control-flow & do-blocks open a block scope closed by `end`
    if (/^(if|unless|while|until|case|begin|select)\b/.test(t)) { stack.push({ type: 'block', ref: null }); continue; }
    if (/\bdo\b(\s*\|[^|]*\|)?\s*$/.test(t)) { stack.push({ type: 'block', ref: null }); continue; }
  }

  const hasVersion = /Crystal::VERSION/.test(text);
  return { requires, classes, enums, topMethods, constants, macros, aliases, annotations: [...annotations], hasVersion };
}

/* ---------- rendering ---------- */
function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'cr-section';
  const hd = document.createElement('div');
  hd.className = 'cr-section-hd';
  hd.textContent = title;
  sec.appendChild(hd); host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'cr-list'; sec.appendChild(ul); return ul; }
function row(ul, html, cls) { const li = document.createElement('li'); if (cls) li.className = cls; li.innerHTML = html; ul.appendChild(li); return li; }
function tag(cls, t) { return `<span class="cr-tag ${cls}">${esc(t)}</span>`; }
function paramsHtml(params) {
  return (params || []).map((p) => {
    const at = p.ivar ? '@' : '';
    return p.type ? `${at}${esc(p.name)} : <span class="cr-type">${esc(p.type)}</span>` : `${at}${esc(p.name)}`;
  }).join(', ');
}
function methodHtml(m) {
  const self = m.self ? tag('cr-tag-self', 'self') + ' ' : '';
  const abs = m.abstract ? tag('cr-tag-abstract', 'abstract') + ' ' : '';
  const ret = m.returns ? ` : <span class="cr-ret">${esc(m.returns)}</span>` : '';
  return `${abs}${self}${tag('cr-tag-def', 'def')} <span class="cr-name">${esc(m.name)}</span>(${paramsHtml(m.params)})${ret}`;
}

export async function render(intake) {
  const text = intake.text || '';
  const facts = analyzeCrystal(text);
  const { requires, classes, enums, topMethods, constants, macros, aliases, annotations, hasVersion } = facts;

  const host = document.createElement('div');
  host.className = 'crl-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'cr-title';
  const badge = document.createElement('span');
  badge.className = 'cr-badge';
  badge.textContent = 'Crystal';
  title.appendChild(badge);
  if (hasVersion) {
    const sub2 = document.createElement('span');
    sub2.className = 'cr-badge-sub';
    sub2.textContent = 'uses Crystal::VERSION';
    title.appendChild(sub2);
  }
  host.appendChild(title);

  const totalMethods = classes.reduce((n, c) => n + c.methods.length, 0) + topMethods.length;
  const sub = document.createElement('div');
  sub.className = 'cr-sub';
  sub.textContent = [
    requires.length && `${requires.length} require${requires.length !== 1 ? 's' : ''}`,
    classes.length && `${classes.length} type${classes.length !== 1 ? 's' : ''}`,
    totalMethods && `${totalMethods} method${totalMethods !== 1 ? 's' : ''}`,
    enums.length && `${enums.length} enum${enums.length !== 1 ? 's' : ''}`,
    macros.length && `${macros.length} macro${macros.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'cr-cards';
  for (const { value, label } of [
    { value: requires.length, label: 'Requires' },
    { value: classes.length, label: 'Types' },
    { value: totalMethods, label: 'Methods' },
    { value: enums.length, label: 'Enums' },
    { value: constants.length, label: 'Constants' },
    { value: macros.length, label: 'Macros' },
  ]) {
    const card = document.createElement('div');
    card.className = 'cr-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (requires.length) {
    const ul = makeList(makeSection(host, `Requires (${requires.length})`));
    for (const r of requires) row(ul, `<span class="cr-alias">${esc(r)}</span>`);
  }

  if (classes.length) {
    const ul = makeList(makeSection(host, `Types (${classes.length})`));
    for (const c of classes) {
      const cls = c.kind === 'struct' ? 'cr-tag-struct' : c.kind === 'module' ? 'cr-tag-module' : 'cr-tag-class';
      const abs = c.abstract ? tag('cr-tag-abstract', 'abstract') + ' ' : '';
      const sup = c.super ? ` &lt; <span class="cr-super">${esc(c.super)}</span>` : '';
      const li = row(ul, `${abs}${tag(cls, c.kind)} <span class="cr-name">${esc(c.name)}</span>${sup}`);
      if (c.ivars.length) {
        const ivars = c.ivars.map((v) => `${tag('cr-tag-ivar', '@' + v.name)}${v.type ? ` <span class="cr-type">${esc(v.type)}</span>` : ''}`).join(' ');
        const div = document.createElement('div');
        div.style.cssText = 'flex-basis:100%;margin-top:3px;';
        div.innerHTML = ivars;
        li.appendChild(div);
      }
      if (c.methods.length) {
        const mul = document.createElement('ul');
        mul.className = 'cr-methods';
        for (const m of c.methods) { const mli = document.createElement('li'); mli.innerHTML = methodHtml(m); mul.appendChild(mli); }
        li.appendChild(mul);
      }
    }
  }

  if (topMethods.length) {
    const ul = makeList(makeSection(host, `Top-level Methods (${topMethods.length})`));
    for (const m of topMethods) row(ul, methodHtml(m));
  }

  if (enums.length) {
    const ul = makeList(makeSection(host, `Enums (${enums.length})`));
    for (const e of enums) {
      const mem = e.members.length ? `<span class="cr-members">${esc(e.members.join(', '))}</span>` : '';
      row(ul, `${tag('cr-tag-enum', 'enum')} <span class="cr-name">${esc(e.name)}</span> ${mem}`);
    }
  }

  if (constants.length) {
    const ul = makeList(makeSection(host, `Constants (${constants.length})`));
    for (const k of constants) row(ul, `${tag('cr-tag-const', 'const')} <span class="cr-name">${esc(k.name)}</span> = ${esc(k.value)}`);
  }

  if (macros.length) {
    const ul = makeList(makeSection(host, `Macros (${macros.length})`));
    for (const m of macros) row(ul, `${tag('cr-tag-macro', 'macro')} <span class="cr-name">${esc(m.name)}</span>(${paramsHtml(m.params)})`);
  }

  if (aliases.length) {
    const ul = makeList(makeSection(host, `Type Aliases (${aliases.length})`));
    for (const a of aliases) row(ul, `<span class="cr-alias">${esc(a.name)}</span> = ${esc(a.value)}`);
  }

  if (annotations.length) {
    const ul = makeList(makeSection(host, `Annotations (${annotations.length})`));
    for (const a of annotations) row(ul, `<span class="cr-ann">@[${esc(a)}]</span>`);
  }

  return { parentNode: host };
}
