const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ls-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.ls-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a3a5c;color:#7ec8e3;vertical-align:middle;margin-right:8px;}
.ls-badge-sub{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#e8f4fb;color:#1a3a5c;vertical-align:middle;margin-left:6px;}
.ls-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ls-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ls-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.ls-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.ls-card strong{display:block;font-size:1.2rem;font-weight:700;}
.ls-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.ls-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.ls-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.ls-list{margin:0;padding:0;list-style:none;}
.ls-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.ls-list li:last-child{border-bottom:none;}
.ls-list li.ls-method{padding-left:30px;background:var(--bg,#fff);}
.ls-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#e8f4fb;color:#1a3a5c;font-weight:700;}
.ls-tag-thin{background:#dbeafe;color:#1d4ed8;}
.ls-tag-fat{background:#fef3c7;color:#92400e;}
.ls-tag-ctor{background:#ede9fe;color:#7c3aed;}
.ls-tag-req{background:#dcfce7;color:#166534;}
.ls-tag-const{background:#f3e8ff;color:#7e22ce;}
.ls-tag-exp{background:#ffe4e6;color:#be123c;}
.ls-name{font-weight:600;}
.ls-params{color:var(--fg-2,#555);}
.ls-bind{color:#0e7490;}
.ls-val{color:#9333ea;}
.ls-ext{color:#1a3a5c;font-style:italic;}
`;

// "(a, b)" / "(@name, @sound)" / "" -> ['a','b'] / ['@name','@sound'] / [].
function lsParams(raw) {
  if (raw == null) return [];
  return String(raw).split(',').map((p) => p.trim()).filter(Boolean);
}

const indentOf = (line) => (line.match(/^[ \t]*/)[0] || '').length;

// Parse a `require!` block / inline entry like  'prelude-ls': { map, filter }  or  fs: FS  or  fs
function parseRequireEntry(entry, requires) {
  const t = entry.trim().replace(/,\s*$/, '');
  if (!t) return;
  const m = t.match(/^(['"]?)([\w\-./@]+)\1\s*(?::\s*([\s\S]+))?$/);
  if (m) requires.push({ module: m[2], binding: (m[3] || m[2]).trim() });
}

// Parse LiveScript source into structured facts. Pure (no DOM) so it is unit-testable.
// Indentation-significant: top-level defs are read at column 0; class bodies are read at the
// method indent level only (so nested arrows inside method bodies aren't mistaken for methods).
export function analyzeLiveScript(text) {
  const lines = String(text || '').split(/\r?\n/);
  const requires = [], functions = [], classes = [], constants = [];
  let exports = [];

  let cls = null, clsIndent = 0, methodIndent = null;   // active class state
  let inReq = false, reqIndent = 0;                      // active require! block state

  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;               // blanks / comments don't close scopes
    const indent = indentOf(line);

    // --- inside a multi-line require! { ... } block ---
    if (inReq) {
      if (t === '}' || indent <= reqIndent) { inReq = false; if (t === '}') continue; }
      else { parseRequireEntry(t, requires); continue; }
    }

    // --- inside a class body ---
    if (cls) {
      if (indent <= clsIndent) { cls = null; methodIndent = null; }   // dedent ends the class
      else {
        if (methodIndent === null) methodIndent = indent;
        if (indent === methodIndent) {
          let m;
          if ((m = t.match(/^\(([^)]*)\)\s*(->|~>)/))) {
            cls.methods.push({ name: 'constructor', params: lsParams(m[1]), bound: m[2] === '~>' });
          } else if ((m = t.match(/^([\w$]+)\s*:\s*(?:\(([^)]*)\))?\s*(->|~>)/))) {
            cls.methods.push({ name: m[1], params: lsParams(m[2]), bound: m[3] === '~>' });
          } else if ((m = t.match(/^([\w$]+)\s*[:=]\s*(.+)$/))) {
            cls.properties.push({ name: m[1], value: m[2].trim() });
          }
        }
        continue;   // any class-body line stays consumed
      }
    }

    // --- require! (inline or block start) ---
    let m;
    if ((m = t.match(/^require!\s*(.*)$/))) {
      const rest = m[1].trim();
      if (rest.startsWith('{')) {
        const close = rest.indexOf('}');
        if (close >= 0) rest.slice(1, close).split(',').forEach((e) => parseRequireEntry(e, requires));
        else { inReq = true; reqIndent = indent; }
      } else if (rest) {
        parseRequireEntry(rest, requires);
      } else { inReq = true; reqIndent = indent; }
      continue;
    }

    // --- class declaration ---
    if ((m = t.match(/^class\s+([\w.$]+)(?:\s+extends\s+([\w.$]+))?/))) {
      cls = { name: m[1], extends: m[2] || null, methods: [], properties: [] };
      classes.push(cls); clsIndent = indent; methodIndent = null;
      continue;
    }

    if (indent !== 0) continue;   // only column-0 lines are top-level definitions

    // --- module.exports ---
    if ((m = t.match(/^module\.exports\s*=\s*\{([^}]*)\}/))) {
      exports = m[1].split(',').map((s) => s.split(':')[0].trim()).filter(Boolean);
      continue;
    }
    if ((m = t.match(/^module\.exports(?:\.(\w+))?\s*=\s*(.+)$/))) {
      exports.push(m[1] || m[2].trim());
      continue;
    }

    // --- top-level function definition ( name = (params) -> / ~> ) ---
    if ((m = t.match(/^([\w$]+)\s*=\s*(?:\(([^)]*)\))?\s*(->|~>)/))) {
      functions.push({ name: m[1], params: lsParams(m[2]), bound: m[3] === '~>' });
      continue;
    }

    // --- require via assignment ( x = require 'mod' ) ---
    if ((m = t.match(/^([\w$]+)\s*=\s*require!?\s*\(?\s*['"]([^'"]+)['"]/))) {
      requires.push({ module: m[2], binding: m[1] });
      continue;
    }

    // --- plain constant / assignment ---
    if ((m = t.match(/^([\w$]+)\s*=\s*(.+)$/))) {
      constants.push({ name: m[1], value: m[2].trim() });
      continue;
    }
  }

  return { requires, functions, classes, constants, exports };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'ls-section';
  const hd = document.createElement('div');
  hd.className = 'ls-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'ls-list';
  sec.appendChild(ul);
  return ul;
}

function row(ul, html, cls) {
  const li = document.createElement('li');
  if (cls) li.className = cls;
  li.innerHTML = html;
  ul.appendChild(li);
}

const tag = (cls, t) => `<span class="ls-tag ${cls}">${esc(t)}</span>`;
const paramsHtml = (params) => `(<span class="ls-params">${params.map(esc).join(', ')}</span>)`;
const arrowTag = (bound) => (bound ? tag('ls-tag-fat', '~>') : tag('ls-tag-thin', '->'));

export async function render(intake) {
  const text = intake.text || '';
  const { requires, functions, classes, constants, exports } = analyzeLiveScript(text);
  const methodCount = classes.reduce((n, c) => n + c.methods.length, 0);

  const host = document.createElement('div');
  host.className = 'ls-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'ls-title';
  title.innerHTML = '<span class="ls-badge">LiveScript</span><span class="ls-badge-sub">.ls</span>';
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'ls-sub';
  sub.textContent = [
    requires.length && `${requires.length} require${requires.length !== 1 ? 's' : ''}`,
    classes.length && `${classes.length} class${classes.length !== 1 ? 'es' : ''}`,
    functions.length && `${functions.length} function${functions.length !== 1 ? 's' : ''}`,
    constants.length && `${constants.length} constant${constants.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'ls-cards';
  for (const { value, label } of [
    { value: requires.length, label: 'Requires' },
    { value: functions.length, label: 'Functions' },
    { value: classes.length, label: 'Classes' },
    { value: methodCount, label: 'Methods' },
    { value: exports.length, label: 'Exports' },
  ]) {
    const card = document.createElement('div');
    card.className = 'ls-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (requires.length) {
    const ul = makeList(makeSection(host, `Requires (${requires.length})`));
    for (const { module, binding } of requires) {
      const bind = binding && binding !== module ? ` → <span class="ls-bind">${esc(binding)}</span>` : '';
      row(ul, `${tag('ls-tag-req', 'require!')} <span class="ls-name">${esc(module)}</span>${bind}`);
    }
  }

  for (const c of classes) {
    const ext = c.extends ? ` <span class="ls-ext">extends ${esc(c.extends)}</span>` : '';
    const ul = makeList(makeSection(host, `class ${c.name}${c.extends ? ` extends ${c.extends}` : ''}`));
    if (!c.methods.length) row(ul, `<span class="ls-name">${esc(c.name)}</span>${ext}`);
    for (const mth of c.methods) {
      const t = mth.name === 'constructor' ? tag('ls-tag-ctor', 'new') : arrowTag(mth.bound);
      row(ul, `${t} <span class="ls-name">${esc(mth.name)}</span>${paramsHtml(mth.params)}`, 'ls-method');
    }
  }

  if (functions.length) {
    const ul = makeList(makeSection(host, `Functions (${functions.length})`));
    for (const f of functions) {
      row(ul, `${arrowTag(f.bound)} <span class="ls-name">${esc(f.name)}</span>${paramsHtml(f.params)}`);
    }
  }

  if (constants.length) {
    const ul = makeList(makeSection(host, `Constants (${constants.length})`));
    for (const { name, value } of constants) {
      row(ul, `${tag('ls-tag-const', '=')} <span class="ls-name">${esc(name)}</span> = <span class="ls-val">${esc(value)}</span>`);
    }
  }

  if (exports.length) {
    const ul = makeList(makeSection(host, `Exports (${exports.length})`));
    for (const e of exports) row(ul, `${tag('ls-tag-exp', 'export')} <span class="ls-name">${esc(e)}</span>`);
  }

  return { parentNode: host };
}
