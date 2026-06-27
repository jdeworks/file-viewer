const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.nu-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.nu-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#3aa675;color:#fff;vertical-align:middle;margin-right:8px;}
.nu-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.nu-file{font-family:ui-monospace,monospace;font-size:13px;color:#3aa675;font-weight:700;}
.nu-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.nu-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.nu-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.nu-card strong{display:block;font-size:1.2rem;font-weight:700;}
.nu-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.nu-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.nu-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.nu-list{margin:0;padding:0;list-style:none;}
.nu-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.nu-list li:last-child{border-bottom:none;}
.nu-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;}
.nu-tag-export{background:#dcfce7;color:#166534;}
.nu-tag-def{background:#d1fae5;color:#065f46;}
.nu-tag-env{background:#fef9c3;color:#854d0e;}
.nu-tag-use{background:#e0f2fe;color:#0369a1;}
.nu-tag-alias{background:#ede9fe;color:#6d28d9;}
.nu-tag-module{background:#ffe4e6;color:#9f1239;}
.nu-tag-let{background:#dbeafe;color:#1d4ed8;}
.nu-tag-mut{background:#fce7f3;color:#9d174d;}
.nu-tag-const{background:#fef3c7;color:#92400e;}
.nu-name{font-weight:600;}
.nu-type{color:#0e7490;}
.nu-flag{color:#9f1239;}
.nu-short{color:#9333ea;}
.nu-muted{color:var(--fg-2,#888);}
`;

// ---- pure parser (DOM-free, exported for unit tests) -----------------------

// Drop `#` comments while respecting quotes. Newlines are preserved so signatures keep their shape.
function stripComments(text) {
  return String(text || '').split(/\r?\n/).map((line) => {
    let q = null;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
      if (c === '"' || c === "'" || c === '`') { q = c; continue; }
      if (c === '#') return line.slice(0, i);
    }
    return line;
  }).join('\n');
}

// Split a parameter block on top-level commas/newlines (quote/bracket/paren-aware).
function splitParams(s) {
  const parts = [];
  let buf = '', depth = 0, q = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { buf += c; if (c === '\\') buf += s[++i] || ''; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; buf += c; continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    if ((c === ',' || c === '\n') && depth === 0) { if (buf.trim()) parts.push(buf.trim()); buf = ''; continue; }
    buf += c;
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts;
}

// "--target (-t): string = \"x86_64\"" / "name: string" / "...rest: any" -> {name,type,flag,short,optional,default}.
function parseParam(tok) {
  const m = tok.match(/^(\.\.\.)?((?:--?)?[\w][\w-]*)(\?)?\s*(?:\(\s*(-\w)\s*\))?\s*(?::\s*([^=\s]+))?\s*(?:=\s*([\s\S]+))?$/);
  if (!m) return { name: tok, type: '', flag: tok.startsWith('--'), short: '', optional: false, default: '' };
  return {
    name: (m[1] || '') + m[2],
    flag: m[2].startsWith('--'),
    short: m[4] || '',
    type: (m[5] || '').trim(),
    optional: !!m[3],
    default: (m[6] || '').trim(),
  };
}

// Scan from `start` (just past an opening `[`) for the matching `]`, quote/bracket-aware.
function matchBracket(src, start) {
  let depth = 1, q = null;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (c === '[' || c === '(') depth++;
    else if (c === ']' || c === ')') { if (--depth === 0) return i; }
  }
  return src.length;
}

export function analyzeNushell(text) {
  const clean = stripComments(text);
  const commands = [], variables = [], uses = [], aliases = [], modules = [], sources = [];

  // Command definitions with their full (possibly multi-line) parameter signature.
  const defRe = /(?:^|\n)[ \t]*(export\s+)?def(\s+--env)?\s+("(?:[^"\\]|\\.)*"|'[^']*'|`[^`]*`|[^\s\[]+)\s*\[/g;
  let m;
  while ((m = defRe.exec(clean))) {
    const inner = clean.slice(defRe.lastIndex, matchBracket(clean, defRe.lastIndex));
    commands.push({
      name: m[3].replace(/^["'`]|["'`]$/g, ''),
      exported: !!m[1],
      env: !!m[2],
      params: splitParams(inner).map(parseParam),
    });
  }

  // Line-oriented facts: bindings, imports, aliases, modules, sources.
  for (const raw of clean.split(/\r?\n/)) {
    const t = raw.trim();
    if (!t) continue;
    let mm;
    if ((mm = t.match(/^(let|mut|const)\s+(\$?[\w][\w_-]*)/))) { variables.push({ name: mm[2].replace(/^\$/, ''), kind: mm[1] }); continue; }
    if ((mm = t.match(/^use\s+(\S+)(?:\s*\[([^\]]*)\])?/))) {
      uses.push({ module: mm[1], items: (mm[2] || '').split(/\s*,\s*|\s+/).map((s) => s.trim()).filter(Boolean) });
      continue;
    }
    if ((mm = t.match(/^(?:export\s+)?(?:source|source-env)\s+(\S+)/))) { sources.push(mm[1]); continue; }
    if ((mm = t.match(/^(?:export\s+)?alias\s+([\w-]+)\s*(?:=\s*(.+))?/))) { aliases.push({ name: mm[1], target: (mm[2] || '').trim() }); continue; }
    if ((mm = t.match(/^(?:export\s+)?module\s+("?[\w-]+"?)/))) { modules.push(mm[1].replace(/"/g, '')); continue; }
  }

  // Approximate pipeline count: top-level `|` outside strings.
  let pipeCount = 0, q = null;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (c === '|' && clean[i + 1] !== '|' && clean[i - 1] !== '|') pipeCount++;
  }

  return { commands, variables, uses, aliases, modules, sources, pipeCount };
}

// ---- DOM rendering ---------------------------------------------------------

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'nu-section';
  const hd = document.createElement('div');
  hd.className = 'nu-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'nu-list'; sec.appendChild(ul); return ul; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
function tag(cls, t) { return `<span class="nu-tag ${cls}">${esc(t)}</span>`; }

function paramHtml(p) {
  const cls = p.flag ? 'nu-flag' : 'nu-name';
  let s = `<span class="${cls}">${esc(p.name)}</span>`;
  if (p.optional) s += '?';
  if (p.short) s += ` <span class="nu-short">(${esc(p.short)})</span>`;
  if (p.type) s += `: <span class="nu-type">${esc(p.type)}</span>`;
  if (p.default) s += ` <span class="nu-muted">= ${esc(p.default)}</span>`;
  return s;
}
function sigHtml(cmd) {
  const kind = cmd.exported ? tag('nu-tag-export', 'export def') : tag('nu-tag-def', 'def');
  const envTag = cmd.env ? ' ' + tag('nu-tag-env', '--env') : '';
  const params = cmd.params.length ? ` [${cmd.params.map(paramHtml).join(', ')}]` : '';
  return `${kind}${envTag} <span class="nu-name">${esc(cmd.name)}</span>${params}`;
}

export function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').split('/').pop();
  const facts = analyzeNushell(text);
  const { commands, variables, uses, aliases, modules, sources, pipeCount } = facts;
  const exported = commands.filter((c) => c.exported);

  const host = document.createElement('div');
  host.className = 'nu-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'nu-title';
  title.innerHTML = `<span class="nu-badge">Nushell Script</span><span class="nu-file">${esc(name)}</span>`;
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'nu-sub';
  sub.textContent = [
    commands.length && `${commands.length} command${commands.length !== 1 ? 's' : ''}`,
    exported.length && `${exported.length} public`,
    variables.length && `${variables.length} binding${variables.length !== 1 ? 's' : ''}`,
    (uses.length || sources.length) && `${uses.length + sources.length} import${uses.length + sources.length !== 1 ? 's' : ''}`,
    aliases.length && `${aliases.length} alias${aliases.length !== 1 ? 'es' : ''}`,
    pipeCount && `${pipeCount} pipe${pipeCount !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'nu-cards';
  for (const { value, label } of [
    { value: commands.length, label: 'Commands' },
    { value: exported.length, label: 'Exported' },
    { value: variables.length, label: 'Bindings' },
    { value: uses.length + sources.length, label: 'Imports' },
    { value: aliases.length, label: 'Aliases' },
  ]) {
    const card = document.createElement('div');
    card.className = 'nu-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (commands.length) {
    const ul = makeList(makeSection(host, `Commands (${commands.length})`));
    for (const cmd of commands) row(ul, sigHtml(cmd));
  }
  if (variables.length) {
    const ul = makeList(makeSection(host, `Bindings (${variables.length})`));
    for (const v of variables) row(ul, `${tag('nu-tag-' + v.kind, v.kind)} <span class="nu-name">${esc(v.name)}</span>`);
  }
  if (uses.length || sources.length) {
    const ul = makeList(makeSection(host, `Imports (${uses.length + sources.length})`));
    for (const u of uses) {
      const items = u.items.length ? ` <span class="nu-muted">[${esc(u.items.join(', '))}]</span>` : '';
      row(ul, `${tag('nu-tag-use', 'use')} <span class="nu-name">${esc(u.module)}</span>${items}`);
    }
    for (const s of sources) row(ul, `${tag('nu-tag-use', 'source')} <span class="nu-name">${esc(s)}</span>`);
  }
  if (modules.length) {
    const ul = makeList(makeSection(host, `Modules (${modules.length})`));
    for (const md of modules) row(ul, `${tag('nu-tag-module', 'module')} <span class="nu-name">${esc(md)}</span>`);
  }
  if (aliases.length) {
    const ul = makeList(makeSection(host, `Aliases (${aliases.length})`));
    for (const a of aliases) {
      const tgt = a.target ? ` <span class="nu-muted">= ${esc(a.target)}</span>` : '';
      row(ul, `${tag('nu-tag-alias', 'alias')} <span class="nu-name">${esc(a.name)}</span>${tgt}`);
    }
  }

  return { parentNode: host };
}
