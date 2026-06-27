const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.elv-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.elv-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7c3aed;color:#fff;vertical-align:middle;margin-right:8px;}
.elv-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.elv-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.elv-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.elv-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:100px;}
.elv-card strong{display:block;font-size:1.2rem;font-weight:700;}
.elv-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.elv-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.elv-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.elv-list{margin:0;padding:0;list-style:none;}
.elv-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.elv-list li:last-child{border-bottom:none;}
.elv-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#ede9fe;color:#6d28d9;font-weight:700;}
.elv-tag-use{background:#e0f2fe;color:#0369a1;}
.elv-tag-var{background:#fef3c7;color:#92400e;}
.elv-tag-set{background:#fee2e2;color:#b91c1c;}
.elv-tag-edit{background:#dcfce7;color:#166534;}
.elv-name{font-weight:600;}
.elv-args{color:var(--fg-2,#64748b);}
.elv-arg{color:#0e7490;}
.elv-arg-opt{color:#9333ea;}
.elv-arg-rest{color:#b45309;}
.elv-default{color:var(--fg-2,#94a3b8);}
.elv-pill{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f1f5f9);border:1px solid var(--border,#cbd5e1);font-family:ui-monospace,monospace;margin:2px 2px;}
.elv-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
`;

// Strip Elvish `#` line comments (whole-line and trailing), conservatively leaving a `#` that sits
// inside a double-quoted string on the same line untouched (so URLs / fragments survive).
function stripComments(text) {
  return String(text || '').split(/\r?\n/).map((line) => {
    let inStr = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') inStr = !inStr;
      else if (ch === '#' && !inStr) {
        // A comment starts the line or follows whitespace (not mid-token like a$#).
        if (i === 0 || /\s/.test(line[i - 1])) return line.slice(0, i);
      }
    }
    return line;
  }).join('\n');
}

// Parse a lambda arg list (the text between `{|` and `|`) into typed args.
// `name` → positional, `@rest` → rest, `&opt=default` → option.
function parseArgs(argStr) {
  return String(argStr || '').trim().split(/\s+/).filter(Boolean).map((a) => {
    if (a.startsWith('&')) {
      const eq = a.indexOf('=');
      const name = eq >= 0 ? a.slice(1, eq) : a.slice(1);
      return { name, kind: 'option', default: eq >= 0 ? a.slice(eq + 1) : '' };
    }
    if (a.startsWith('@')) return { name: a.slice(1), kind: 'rest' };
    return { name: a, kind: 'positional' };
  });
}

// Parse into structured facts. Exported (pure, DOM-free) for unit testing.
export function analyzeElvish(text) {
  const src = stripComments(text);
  const uses = [];
  const functions = [];
  const vars = [];
  const sets = [];

  // use modules (incl. github.com/... paths)
  let m;
  const useRe = /^[ \t]*use\s+(\S+)/gm;
  while ((m = useRe.exec(src))) uses.push(m[1]);

  // fn definitions — capture the lambda arg list inside `{| ... |}` (or none for `fn name { }`).
  const fnRe = /\bfn\s+([^\s{]+)\s*\{(?:\|([^|]*)\|)?/g;
  while ((m = fnRe.exec(src))) {
    functions.push({ name: m[1], args: m[2] != null ? parseArgs(m[2]) : [] });
  }

  // var declarations — `var a`, `var x = ...`, `var a b = ...` (multiple names share one `var`).
  const varRe = /^[ \t]*var\s+([^=\r\n]+?)\s*(?==|$)/gm;
  while ((m = varRe.exec(src))) {
    for (const name of m[1].trim().split(/\s+/).filter(Boolean)) {
      vars.push({ name, kind: 'var' });
    }
  }

  // set assignments — `set name = ...`, `set a b = ...`; flag `edit:` (binding/prompt) targets.
  const setRe = /^[ \t]*set\s+([^=\r\n]+?)\s*(?==|$)/gm;
  while ((m = setRe.exec(src))) {
    for (const name of m[1].trim().split(/\s+/).filter(Boolean)) {
      sets.push({ name, edit: name.startsWith('edit:') });
    }
  }

  const editBindings = sets.filter((s) => s.edit).map((s) => s.name);

  // control flow tallies
  const count = (re) => (src.match(re) || []).length;
  const control = {
    if: count(/(^|[\s;{(])if\s/g),
    for: count(/(^|[\s;{(])for\s/g),
    while: count(/(^|[\s;{(])while\s/g),
    try: count(/(^|[\s;{(])try[\s{]/g),
  };

  return { uses, functions, vars, sets, editBindings, control };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'elv-section';
  const hd = document.createElement('div');
  hd.className = 'elv-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'elv-list'; sec.appendChild(ul); return ul; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
function tag(cls, t) { return `<span class="elv-tag ${cls}">${esc(t)}</span>`; }

function argsHtml(args) {
  if (!args.length) return '';
  const inner = args.map((a) => {
    if (a.kind === 'option') {
      const def = a.default ? `<span class="elv-default">=${esc(a.default)}</span>` : '';
      return `<span class="elv-arg-opt">&amp;${esc(a.name)}</span>${def}`;
    }
    if (a.kind === 'rest') return `<span class="elv-arg-rest">@${esc(a.name)}</span>`;
    return `<span class="elv-arg">${esc(a.name)}</span>`;
  }).join(' ');
  return ` <span class="elv-args">{|${inner}|}</span>`;
}

export function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').split('/').pop();
  const { uses, functions, vars, sets, editBindings, control } = analyzeElvish(text);

  const host = document.createElement('div');
  host.className = 'elv-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'elv-title';
  title.innerHTML = `<span class="elv-badge">Elvish Script</span>${esc(name)}`;
  host.appendChild(title);

  const blocks = control.if + control.for + control.while + control.try;
  const sub = document.createElement('div');
  sub.className = 'elv-sub';
  sub.textContent = [
    uses.length && `${uses.length} module${uses.length !== 1 ? 's' : ''}`,
    `${functions.length} fn${functions.length !== 1 ? 's' : ''}`,
    vars.length && `${vars.length} var${vars.length !== 1 ? 's' : ''}`,
    editBindings.length && `${editBindings.length} edit binding${editBindings.length !== 1 ? 's' : ''}`,
    blocks && `${blocks} control block${blocks !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'elv-cards';
  for (const { value, label } of [
    { value: uses.length, label: 'Modules' },
    { value: functions.length, label: 'Functions' },
    { value: vars.length, label: 'Variables' },
    { value: sets.length, label: 'set calls' },
  ]) {
    const card = document.createElement('div');
    card.className = 'elv-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (uses.length) {
    const ul = makeList(makeSection(host, `Modules (${uses.length})`));
    for (const mod of uses) row(ul, `${tag('elv-tag-use', 'use')} <span class="elv-name">${esc(mod)}</span>`);
  }

  if (functions.length) {
    const ul = makeList(makeSection(host, `Functions (${functions.length})`));
    for (const f of functions) row(ul, `${tag('elv-tag', 'fn')} <span class="elv-name">${esc(f.name)}</span>${argsHtml(f.args)}`);
  }

  if (vars.length) {
    const MAX = 12;
    const ul = makeList(makeSection(host, `Variables (${vars.length})`));
    for (const v of vars.slice(0, MAX)) row(ul, `${tag('elv-tag-var', 'var')} <span class="elv-name">${esc(v.name)}</span>`);
    if (vars.length > MAX) row(ul, `<span style="color:var(--fg-2,#888)">… and ${vars.length - MAX} more</span>`);
  }

  if (sets.length) {
    const MAX = 12;
    const ul = makeList(makeSection(host, `Set Assignments (${sets.length})`));
    for (const s of sets.slice(0, MAX)) {
      const t = s.edit ? tag('elv-tag-edit', 'edit:') : tag('elv-tag-set', 'set');
      row(ul, `${t} <span class="elv-name">${esc(s.name)}</span>`);
    }
    if (sets.length > MAX) row(ul, `<span style="color:var(--fg-2,#888)">… and ${sets.length - MAX} more</span>`);
  }

  const ctrl = [
    control.if && `if ×${control.if}`,
    control.for && `for ×${control.for}`,
    control.while && `while ×${control.while}`,
    control.try && `try ×${control.try}`,
  ].filter(Boolean);
  if (ctrl.length) {
    const sec = makeSection(host, 'Control Flow');
    const wrap = document.createElement('div');
    wrap.style.padding = '10px 14px';
    for (const p of ctrl) { const pill = document.createElement('span'); pill.className = 'elv-pill'; pill.textContent = p; wrap.appendChild(pill); }
    sec.appendChild(wrap);
  }

  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'elv-pre';
  pre.textContent = text;
  srcSec.appendChild(pre);

  return { parentNode: host };
}
