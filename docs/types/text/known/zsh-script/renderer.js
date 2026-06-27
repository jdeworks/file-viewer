const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.zsh-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.zsh-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1d4ed8;color:#fff;vertical-align:middle;margin-right:8px;}
.zsh-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.zsh-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.zsh-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.zsh-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:100px;}
.zsh-card strong{display:block;font-size:1.2rem;font-weight:700;}
.zsh-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.zsh-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.zsh-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.zsh-list{margin:0;padding:0;list-style:none;}
.zsh-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.zsh-list li:last-child{border-bottom:none;}
.zsh-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;background:#dbeafe;color:#1e40af;}
.zsh-tag-fn{background:#ede9fe;color:#6d28d9;}
.zsh-tag-posix{background:#e0e7ff;color:#4338ca;}
.zsh-tag-alias{background:#dcfce7;color:#166534;}
.zsh-tag-opt-on{background:#dcfce7;color:#166534;}
.zsh-tag-opt-off{background:#fee2e2;color:#991b1b;}
.zsh-tag-export{background:#fff7ed;color:#9a3412;}
.zsh-tag-local{background:#f1f5f9;color:#334155;}
.zsh-tag-global{background:#fef9c3;color:#854d0e;}
.zsh-tag-typeset{background:#fae8ff;color:#86198f;}
.zsh-tag-autoload{background:#d1fae5;color:#065f46;}
.zsh-tag-bindkey{background:#fce7f3;color:#9d174d;}
.zsh-tag-compdef{background:#e0f2fe;color:#0369a1;}
.zsh-tag-zstyle{background:#fef3c7;color:#92400e;}
.zsh-tag-zle{background:#fff7ed;color:#9a3412;}
.zsh-name{font-weight:600;}
.zsh-pos{color:#0e7490;}
.zsh-loc{color:#7c3aed;}
.zsh-val{color:#9333ea;}
.zsh-key{color:#9d174d;}
.zsh-muted{color:var(--fg-2,#888);}
`;

// --- pure analysis (DOM-free, exported for unit testing) ---------------------

// Strip `#` comments while respecting quotes: single quotes are literal, double
// quotes allow backslash escapes, and `#` only starts a comment at a word boundary.
function stripComments(text) {
  const s = String(text || '');
  let out = '', q = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i], prev = s[i - 1];
    if (q === "'") { out += c; if (c === "'") q = null; continue; }
    if (c === '\\') { out += c + (s[i + 1] || ''); i++; continue; }
    if (q === '"') { out += c; if (c === '"') q = null; continue; }
    if (c === "'" || c === '"') { q = c; out += c; continue; }
    if (c === '#' && (i === 0 || /\s/.test(prev))) { while (i < s.length && s[i] !== '\n') i++; out += '\n'; continue; }
    out += c;
  }
  return out;
}

// Structural brace delta for a line: ignore braces inside quotes and `${...}`
// parameter expansions so a function body's `${2:-x}` / `${#v}` don't miscount.
function braceDelta(line) {
  let s = line.replace(/'[^']*'/g, '').replace(/"[^"]*"/g, '');
  let prev;
  do { prev = s; s = s.replace(/\$\{[^{}]*\}/g, ''); } while (s !== prev);
  s = s.replace(/\$\([^()]*\)/g, '');
  let d = 0;
  for (const ch of s) { if (ch === '{') d++; else if (ch === '}') d--; }
  return d;
}

const NOT_FN = new Set(['if', 'while', 'for', 'until', 'case', 'select', 'function', 'else', 'elif', 'then', 'do', 'fi', 'done', 'esac']);

// Detect a function header: `function name { `, `function name () {`, or `name() {`.
function matchFnHeader(t) {
  let m = t.match(/^function\s+([A-Za-z_][\w:.+\/-]*)\s*(?:\(\s*\))?\s*\{?\s*$/) ||
          t.match(/^function\s+([A-Za-z_][\w:.+\/-]*)\s*(?:\(\s*\))?\s*\{/);
  if (m) return { name: m[1], form: 'function' };
  m = t.match(/^([A-Za-z_][\w:.+\/-]*)\s*\(\s*\)\s*\{?\s*$/) ||
      t.match(/^([A-Za-z_][\w:.+\/-]*)\s*\(\s*\)\s*\{/);
  if (m && !NOT_FN.has(m[1])) return { name: m[1], form: 'posix' };
  return null;
}

const normPos = (g) => (g === '@' ? '$@' : g === '*' ? '$*' : g === '#' ? '$#' : '$' + g);

// Capture positional-parameter references ($1..$9, ${2:-x}, $@, $*, $#).
function collectPositionals(set, line) {
  let m;
  const re1 = /\$(\d|[@*#])(?![\w])/g;
  while ((m = re1.exec(line))) set.add(normPos(m[1]));
  const re2 = /\$\{(\d+)(?=[:}\[])/g;          // ${1}, ${2:-default}, ${1[…]}
  while ((m = re2.exec(line))) set.add('$' + m[1]);
}

// Capture `local`/`typeset`/`declare` names declared inside a function body.
function collectLocals(fn, t) {
  const m = t.match(/^(?:local|typeset|declare)\b\s+(.*)$/);
  if (!m) return;
  for (const part of m[1].split(/\s+/)) {
    if (!part || part.startsWith('-')) continue;
    const name = part.split('=')[0];
    if (/^[A-Za-z_]\w*$/.test(name)) { if (!fn.locals.includes(name)) fn.locals.push(name); }
    else break;
  }
}

const unquote = (s) => s.replace(/^(['"])([\s\S]*)\1$/, '$2');

const posSort = (a, b) => {
  const na = /^\$\d+$/.test(a), nb = /^\$\d+$/.test(b);
  if (na && nb) return parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10);
  if (na !== nb) return na ? -1 : 1;
  return a.localeCompare(b);
};

// Parse a top-level (brace-depth 0) statement into the result accumulator.
function parseTopLevel(t, R) {
  let m;
  if ((m = t.match(/^alias\s+(?:-[A-Za-z]+\s+)*([A-Za-z_][\w.-]*)=(.+)$/))) {
    R.aliases.push({ name: m[1], value: unquote(m[2].trim()) }); return;
  }
  if ((m = t.match(/^(setopt|unsetopt)\s+(.+)$/i))) {
    const enabled = m[1].toLowerCase() === 'setopt';
    for (const o of m[2].split(/\s+/).filter(Boolean)) if (!/^-/.test(o)) R.options.push({ name: o, enabled });
    return;
  }
  if ((m = t.match(/^export\s+(?:-[A-Za-z]+\s+)*([A-Za-z_]\w*)(?:=(.*))?$/))) {
    R.exports.push({ name: m[1], value: m[2] != null ? unquote(m[2].trim()) : '' }); return;
  }
  if ((m = t.match(/^autoload\b\s*(?:-[A-Za-z]+\s+)*(.+)$/))) {
    for (const a of m[1].trim().split(/\s+/).filter(Boolean)) if (!/^-/.test(a)) R.autoloads.push(a);
    return;
  }
  if ((m = t.match(/^compdef\s+(.+)$/))) { R.compdefs.push(m[1].trim()); return; }
  if ((m = t.match(/^bindkey\s+(.+)$/))) { R.bindkeys.push(parseBindkey(m[1].trim())); return; }
  if ((m = t.match(/^zstyle\s+'?:?([^'"\s]+)/))) { R.zstyles.push(m[1]); return; }
  if ((m = t.match(/^zle\s+-N\s+(\S+)/))) { R.zleWidgets.push(m[1]); return; }
  if ((m = t.match(/^(?:source|\.)\s+(\S+)/))) { R.sources.push(m[1]); return; }
  parseAssignment(t, R);
}

function parseBindkey(s) {
  const m = s.match(/^(?:-[A-Za-z]+\s+)*(['"]?)([^'"]+)\1\s+(\S+)/);
  return m ? { key: m[2], widget: m[3] } : { key: s, widget: '' };
}

// Variable / array assignments, including scope-prefixed (`local`/`typeset`).
function parseAssignment(t, R) {
  let scope = 'global', rest = t, flagArray = false;
  const m = t.match(/^(local|typeset|declare)\b\s*((?:-[A-Za-z]+\s+)*)(.*)$/);
  if (m) {
    scope = m[1] === 'local' ? 'local' : 'typeset';
    const flags = m[2] || '';
    if (/-\w*g/.test(flags)) scope = 'global';
    if (/-\w*[aA]/.test(flags)) flagArray = true;
    rest = m[3];
  }
  const arr = rest.match(/^([A-Za-z_]\w*)=\s*\(/);
  if (arr) { R.arrays.push(arr[1]); R.variables.push({ name: arr[1], scope, value: '( … )', array: true }); return; }
  const asn = rest.match(/^([A-Za-z_]\w*)=(.*)$/);
  if (asn) { R.variables.push({ name: asn[1], scope, value: unquote(asn[2].trim()), array: flagArray }); return; }
  if (m) {
    for (const part of rest.split(/\s+/).filter(Boolean)) {
      const name = part.split('=')[0];
      if (!/^[A-Za-z_]\w*$/.test(name)) continue;
      if (flagArray) R.arrays.push(name);
      R.variables.push({ name, scope, array: flagArray });
    }
  }
}

// Parse a whole zsh script into structured facts. Pure (no DOM).
export function analyzeZsh(text) {
  const R = {
    functions: [], aliases: [], options: [], exports: [], variables: [],
    sources: [], autoloads: [], bindkeys: [], compdefs: [], zstyles: [],
    zleWidgets: [], arrays: [],
  };
  const lines = stripComments(text).split(/\r?\n/);
  let depth = 0, cur = null;

  for (const raw of lines) {
    const t = raw.trim();
    if (depth <= 0) {
      depth = 0;
      if (t) {
        const hdr = matchFnHeader(t);
        if (hdr) {
          cur = { name: hdr.name, form: hdr.form, positionals: new Set(), locals: [] };
          R.functions.push(cur);
          depth += braceDelta(raw);
          if (depth <= 0) cur = null;   // header with no opening brace yet stays simple
          continue;
        }
        parseTopLevel(t, R);
      }
      depth += braceDelta(raw);
      if (depth <= 0) { depth = 0; cur = null; }
      continue;
    }
    // inside a function body
    if (cur && t) { collectLocals(cur, t); collectPositionals(cur.positionals, raw); }
    depth += braceDelta(raw);
    if (depth <= 0) { depth = 0; cur = null; }
  }

  R.functions = R.functions.map((f) => ({
    name: f.name, form: f.form,
    positionals: [...f.positionals].sort(posSort),
    locals: f.locals,
  }));
  return R;
}

// --- rendering ----------------------------------------------------------------

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'zsh-section';
  const hd = document.createElement('div');
  hd.className = 'zsh-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'zsh-list'; sec.appendChild(ul); return ul; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
const tag = (cls, t) => `<span class="zsh-tag ${cls}">${esc(t)}</span>`;

export function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').split('/').pop();
  const f = analyzeZsh(text);

  const any = f.functions.length || f.aliases.length || f.options.length || f.exports.length ||
    f.variables.length || f.autoloads.length || f.sources.length || f.bindkeys.length ||
    f.compdefs.length || f.zstyles.length || f.zleWidgets.length;
  if (!any && !/^#!.*\b(zsh|sh)\b/m.test(text)) return null;

  const host = document.createElement('div');
  host.className = 'zsh-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'zsh-title';
  title.innerHTML = `<span class="zsh-badge">Zsh Script</span>${esc(name)}`;
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'zsh-sub';
  sub.textContent = [
    f.functions.length && `${f.functions.length} function${f.functions.length !== 1 ? 's' : ''}`,
    f.aliases.length && `${f.aliases.length} alias${f.aliases.length !== 1 ? 'es' : ''}`,
    f.options.length && `${f.options.length} option${f.options.length !== 1 ? 's' : ''}`,
    f.exports.length && `${f.exports.length} export${f.exports.length !== 1 ? 's' : ''}`,
    f.autoloads.length && `${f.autoloads.length} autoload${f.autoloads.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'zsh-cards';
  for (const { value, label } of [
    { value: f.functions.length, label: 'Functions' },
    { value: f.aliases.length, label: 'Aliases' },
    { value: f.options.length, label: 'Options' },
    { value: f.exports.length, label: 'Exports' },
    { value: f.variables.length, label: 'Variables' },
  ]) {
    const card = document.createElement('div');
    card.className = 'zsh-card';
    const strong = document.createElement('strong'); strong.textContent = value;
    const span = document.createElement('span'); span.textContent = label;
    card.appendChild(strong); card.appendChild(span); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (f.functions.length) {
    const ul = makeList(makeSection(host, `Functions (${f.functions.length})`));
    for (const fn of f.functions) {
      let html = tag(fn.form === 'posix' ? 'zsh-tag-posix' : 'zsh-tag-fn', fn.form === 'posix' ? 'name()' : 'function')
        + ` <span class="zsh-name">${esc(fn.name)}</span>`;
      if (fn.positionals.length) html += `(<span class="zsh-pos">${esc(fn.positionals.join(' '))}</span>)`;
      else html += `(<span class="zsh-muted">no positional params</span>)`;
      if (fn.locals.length) html += ` <span class="zsh-loc">local ${esc(fn.locals.join(', '))}</span>`;
      row(ul, html);
    }
  }

  if (f.aliases.length) {
    const ul = makeList(makeSection(host, `Aliases (${f.aliases.length})`));
    for (const a of f.aliases) {
      row(ul, tag('zsh-tag-alias', 'alias') + ` <span class="zsh-name">${esc(a.name)}</span>`
        + (a.value ? ` = <span class="zsh-val">${esc(a.value)}</span>` : ''));
    }
  }

  if (f.options.length) {
    const ul = makeList(makeSection(host, `Options (${f.options.length})`));
    for (const o of f.options) {
      row(ul, tag(o.enabled ? 'zsh-tag-opt-on' : 'zsh-tag-opt-off', o.enabled ? 'setopt' : 'unsetopt')
        + ` <span class="zsh-name">${esc(o.name)}</span>`);
    }
  }

  if (f.exports.length) {
    const ul = makeList(makeSection(host, `Exports (${f.exports.length})`));
    for (const e of f.exports) {
      row(ul, tag('zsh-tag-export', 'export') + ` <span class="zsh-name">${esc(e.name)}</span>`
        + (e.value ? ` = <span class="zsh-val">${esc(e.value)}</span>` : ''));
    }
  }

  if (f.variables.length) {
    const ul = makeList(makeSection(host, `Variables (${f.variables.length})`));
    for (const v of f.variables) {
      let html = tag('zsh-tag-' + (v.scope === 'global' ? 'global' : v.scope), v.scope);
      if (v.array) html += ' ' + tag('zsh-tag-typeset', 'array');
      html += ` <span class="zsh-name">${esc(v.name)}</span>`;
      if (v.value) html += ` = <span class="zsh-val">${esc(v.value)}</span>`;
      row(ul, html);
    }
  }

  if (f.sources.length) {
    const ul = makeList(makeSection(host, `Source Inclusions (${f.sources.length})`));
    for (const s of f.sources) row(ul, `<span class="zsh-val">${esc(s)}</span>`);
  }

  if (f.autoloads.length) {
    const ul = makeList(makeSection(host, `Autoloads (${f.autoloads.length})`));
    for (const a of f.autoloads) row(ul, tag('zsh-tag-autoload', 'autoload') + ` <span class="zsh-name">${esc(a)}</span>`);
  }

  if (f.bindkeys.length) {
    const ul = makeList(makeSection(host, `Key Bindings (${f.bindkeys.length})`));
    for (const b of f.bindkeys) {
      row(ul, tag('zsh-tag-bindkey', 'bindkey') + ` <span class="zsh-key">${esc(b.key)}</span>`
        + (b.widget ? ` → <span class="zsh-name">${esc(b.widget)}</span>` : ''));
    }
  }

  if (f.zleWidgets.length) {
    const ul = makeList(makeSection(host, `ZLE Widgets (${f.zleWidgets.length})`));
    for (const w of f.zleWidgets) row(ul, tag('zsh-tag-zle', 'zle -N') + ` <span class="zsh-name">${esc(w)}</span>`);
  }

  if (f.compdefs.length) {
    const ul = makeList(makeSection(host, `Completion Definitions (${f.compdefs.length})`));
    for (const c of f.compdefs) row(ul, tag('zsh-tag-compdef', 'compdef') + ` ${esc(c)}`);
  }

  if (f.zstyles.length) {
    const ul = makeList(makeSection(host, `Zstyle Settings (${f.zstyles.length})`));
    for (const z of f.zstyles) row(ul, tag('zsh-tag-zstyle', 'zstyle') + ` <span class="zsh-name">:${esc(z)}</span>`);
  }

  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'zsh-pre';
  pre.style.cssText = 'margin:0;padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;';
  pre.textContent = text;
  srcSec.appendChild(pre);

  return { parentNode: host };
}
