const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.tcl-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.tcl-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1565c0;color:#fff;vertical-align:middle;margin-right:8px;}
.tcl-badge-sub{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#e3f2fd;color:#1565c0;vertical-align:middle;margin-left:6px;}
.tcl-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.tcl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.tcl-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.tcl-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.tcl-card strong{display:block;font-size:1.2rem;font-weight:700;}
.tcl-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.tcl-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.tcl-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.tcl-list{margin:0;padding:0;list-style:none;}
.tcl-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.tcl-list li:last-child{border-bottom:none;}
.tcl-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#e3f2fd;color:#1565c0;font-weight:700;}
.tcl-tag-ns{background:#e8f5e9;color:#1b5e20;}
.tcl-tag-pkg{background:#fff8e1;color:#f57f17;}
.tcl-tag-prov{background:#ede7f6;color:#4527a0;}
.tcl-tag-var{background:#fce4ec;color:#880e4f;}
.tcl-tag-class{background:#e0f2f1;color:#00695c;}
.tcl-tag-method{background:#e1f5fe;color:#0277bd;}
.tcl-name{font-weight:600;}
.tcl-ns-path{color:#1b5e20;}
.tcl-pname{color:#0e7490;}
.tcl-def{color:#9f1239;}
.tcl-args{color:#7c3aed;font-style:italic;}
.tcl-noargs{color:#9aa5b1;font-style:italic;}
.tcl-indent{padding-left:30px;}
`;

// ---- pure parser (DOM-free, exported for tests) --------------------------------------------------

// Split a Tcl script body into commands; each command is an array of words {text,type}. Brace-,
// quote- and comment-aware so a proc/namespace body's inner commands are NOT seen as top-level.
function tokenizeCommands(src) {
  const commands = [];
  let cur = [], i = 0;
  const n = src.length;
  const push = () => { if (cur.length) commands.push(cur); cur = []; };
  while (i < n) {
    const ch = src[i];
    if (ch === '\\' && src[i + 1] === '\n') { i += 2; continue; }   // line continuation
    if (ch === '\n' || ch === ';') { push(); i++; continue; }
    if (ch === ' ' || ch === '\t' || ch === '\r') { i++; continue; }
    if (ch === '#' && cur.length === 0) {                            // comment until EOL
      while (i < n && src[i] !== '\n') { if (src[i] === '\\') i++; i++; }
      continue;
    }
    if (ch === '{') {                                               // brace word (balanced)
      let depth = 0, start = i;
      while (i < n) { const c = src[i]; if (c === '\\') { i += 2; continue; } if (c === '{') depth++; else if (c === '}') { depth--; if (depth === 0) { i++; break; } } i++; }
      cur.push({ text: src.slice(start + 1, i - 1), type: 'brace' });
      continue;
    }
    if (ch === '"') {                                               // quoted word
      let start = i; i++;
      while (i < n) { const c = src[i]; if (c === '\\') { i += 2; continue; } if (c === '"') { i++; break; } i++; }
      cur.push({ text: src.slice(start + 1, i - 1), type: 'quote' });
      continue;
    }
    let start = i;                                                  // bare word ([..] balanced)
    while (i < n) {
      const c = src[i];
      if (c === ' ' || c === '\t' || c === '\r' || c === '\n' || c === ';') break;
      if (c === '\\') { i += 2; continue; }
      if (c === '[') { let d = 0; while (i < n) { if (src[i] === '[') d++; else if (src[i] === ']') { d--; if (d === 0) { i++; break; } } i++; } continue; }
      i++;
    }
    cur.push({ text: src.slice(start, i), type: 'bare' });
  }
  push();
  return commands;
}

// Split a Tcl list (e.g. a proc arg spec) into words, preserving braced sub-lists.
function listWords(s) {
  const out = [], n = s.length;
  let i = 0;
  while (i < n) {
    const c = s[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
    if (c === '{') {
      let d = 0, start = i;
      while (i < n) { const ch = s[i]; if (ch === '\\') { i += 2; continue; } if (ch === '{') d++; else if (ch === '}') { d--; if (d === 0) { i++; break; } } i++; }
      out.push({ text: s.slice(start + 1, i - 1), braced: true });
      continue;
    }
    let start = i;
    while (i < n) { const ch = s[i]; if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') break; if (ch === '\\') { i += 2; continue; } i++; }
    out.push({ text: s.slice(start, i), braced: false });
  }
  return out;
}

// proc arg spec → [{name, default, varargs}].  `{c 1}` ⇒ name c, default 1; `args` ⇒ varargs.
function parseParams(argSpec) {
  return listWords(argSpec).map((w) => {
    if (w.braced) {
      const m = w.text.match(/^(\S+)\s*([\s\S]*)$/);
      const name = m ? m[1] : w.text.trim();
      const def = m && m[2].trim() !== '' ? m[2].trim() : null;
      return { name, default: def, varargs: name === 'args' };
    }
    return { name: w.text, default: null, varargs: w.text === 'args' };
  });
}

const qualify = (prefix, name) => (name.startsWith('::') || !prefix) ? name : prefix + '::' + name;

function registerProc(rawName, argSpec, nsPrefix, ctx) {
  const full = rawName.startsWith('::') || !nsPrefix ? rawName : qualify(nsPrefix, rawName);
  let ns = '', simple = full;
  const idx = full.lastIndexOf('::');
  if (idx > 0) { ns = full.slice(0, idx); simple = full.slice(idx + 2); }
  else if (full.startsWith('::')) simple = full.slice(2);
  if (!ns && nsPrefix) ns = nsPrefix;
  ctx.procs.push({ name: full, simpleName: simple, namespace: ns, params: parseParams(argSpec) });
}

function walk(commands, nsPrefix, ctx) {
  for (const cmd of commands) {
    const head = cmd[0] && cmd[0].text;
    if (!head) continue;
    const body = (idx) => (cmd[idx] && cmd[idx].type === 'brace' ? cmd[idx].text : '');
    if (head === 'package' && cmd[1] && cmd[2]) {
      const entry = { name: cmd[2].text, ver: cmd[3] ? cmd[3].text : '' };
      if (cmd[1].text === 'require') { ctx.packages.require.push(entry); if (entry.name === 'Tk') ctx.isTk = true; }
      else if (cmd[1].text === 'provide') ctx.packages.provide.push(entry);
      continue;
    }
    if (head === 'source' && cmd[1]) { ctx.sources.push(cmd[1].text.replace(/^['"]|['"]$/g, '')); continue; }
    if ((head === 'variable' || head === 'set') && cmd[1] && /^[\w:]+$/.test(cmd[1].text)) {
      ctx.variables.push({ name: cmd[1].text, namespace: nsPrefix, kind: head });
      continue;
    }
    if (head === 'proc' && cmd[1] && cmd[2]) { registerProc(cmd[1].text, cmd[2].text, nsPrefix, ctx); continue; }
    if (head === 'namespace' && cmd[1] && cmd[1].text === 'eval' && cmd[2]) {
      const full = qualify(nsPrefix, cmd[2].text);
      ctx.nsSet.add(full);
      if (body(3)) walk(tokenizeCommands(body(3)), full, ctx);
      continue;
    }
    if (head === 'oo::class' && cmd[1] && cmd[1].text === 'create' && cmd[2]) {
      const cls = { name: qualify(nsPrefix, cmd[2].text), methods: [] };
      for (const c of tokenizeCommands(body(3))) {
        const h = c[0] && c[0].text;
        if (h === 'method' && c[1] && c[2]) cls.methods.push({ name: c[1].text, params: parseParams(c[2].text) });
        else if (h === 'constructor' && c[1]) cls.methods.push({ name: 'constructor', params: parseParams(c[1].text) });
      }
      ctx.classes.push(cls);
      continue;
    }
  }
}

export function analyzeTcl(text) {
  const ctx = {
    packages: { require: [], provide: [] }, procs: [], variables: [],
    sources: [], classes: [], nsSet: new Set(), isTk: false,
  };
  walk(tokenizeCommands(String(text || '')), '', ctx);
  if (/(^|\n)\s*(?:wm|tk_messageBox|toplevel|ttk::)\b/.test(String(text || ''))) ctx.isTk = true;
  // dedupe variables (name+namespace)
  const seen = new Set();
  const variables = ctx.variables.filter((v) => { const k = v.namespace + ' ' + v.name; if (seen.has(k)) return false; seen.add(k); return true; });
  // group namespaces (from `namespace eval` + any namespace-qualified proc/var)
  const allNs = new Set(ctx.nsSet);
  for (const p of ctx.procs) if (p.namespace) allNs.add(p.namespace);
  for (const v of variables) if (v.namespace) allNs.add(v.namespace);
  const namespaces = [...allNs].sort().map((name) => ({
    name,
    procs: ctx.procs.filter((p) => p.namespace === name),
    variables: variables.filter((v) => v.namespace === name),
  }));
  return { packages: ctx.packages, procs: ctx.procs, namespaces, variables, sources: ctx.sources, classes: ctx.classes, isTk: ctx.isTk };
}

// ---- DOM render ----------------------------------------------------------------------------------

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'tcl-section';
  const hd = document.createElement('div');
  hd.className = 'tcl-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'tcl-list'; sec.appendChild(ul); return ul; }
function tag(cls, t) { return `<span class="tcl-tag ${cls}">${esc(t)}</span>`; }
function row(ul, html, cls) { const li = document.createElement('li'); if (cls) li.className = cls; li.innerHTML = html; ul.appendChild(li); }

function paramsHtml(params) {
  if (!params.length) return '<span class="tcl-noargs">(no args)</span>';
  return params.map((p) => {
    if (p.varargs) return `<span class="tcl-args">args…</span>`;
    if (p.default != null) return `<span class="tcl-pname">${esc(p.name)}</span><span class="tcl-def">=${esc(p.default)}</span>`;
    return `<span class="tcl-pname">${esc(p.name)}</span>`;
  }).join(' ');
}
function procRow(ul, p, indent) {
  row(ul, `${tag('', 'proc')} <span class="tcl-name">${esc(indent ? p.simpleName : p.name)}</span> {${paramsHtml(p.params)}}`, indent ? 'tcl-indent' : '');
}

export async function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').split('/').pop();
  if (!/(^|\n)\s*(proc|namespace|package|source|oo::class)\b/.test(text)) return null;

  const { packages, procs, namespaces, variables, sources, classes, isTk } = analyzeTcl(text);
  const globalProcs = procs.filter((p) => !p.namespace);
  const globalVars = variables.filter((v) => !v.namespace);

  const host = document.createElement('div');
  host.className = 'tcl-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'tcl-title';
  const badge = document.createElement('span');
  badge.className = 'tcl-badge';
  badge.textContent = isTk ? 'Tk GUI' : 'Tcl Script';
  title.appendChild(badge);
  if (name) { const s = document.createElement('span'); s.className = 'tcl-badge-sub'; s.textContent = name; title.appendChild(s); }
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'tcl-sub';
  sub.textContent = [
    procs.length && `${procs.length} proc${procs.length !== 1 ? 's' : ''}`,
    namespaces.length && `${namespaces.length} namespace${namespaces.length !== 1 ? 's' : ''}`,
    (packages.require.length + packages.provide.length) && `${packages.require.length + packages.provide.length} package${(packages.require.length + packages.provide.length) !== 1 ? 's' : ''}`,
    classes.length && `${classes.length} class${classes.length !== 1 ? 'es' : ''}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'tcl-cards';
  for (const { value, label } of [
    { value: procs.length, label: 'Procs' },
    { value: namespaces.length, label: 'Namespaces' },
    { value: packages.require.length + packages.provide.length, label: 'Packages' },
    { value: variables.length, label: 'Variables' },
    { value: classes.length, label: 'Classes' },
  ]) {
    const card = document.createElement('div');
    card.className = 'tcl-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (packages.require.length || packages.provide.length) {
    const ul = makeList(makeSection(host, `Packages (${packages.require.length + packages.provide.length})`));
    for (const p of packages.require) row(ul, `${tag('tcl-tag-pkg', 'require')} <span class="tcl-name">${esc(p.name)}</span>${p.ver ? ' ' + esc(p.ver) : ''}`);
    for (const p of packages.provide) row(ul, `${tag('tcl-tag-prov', 'provide')} <span class="tcl-name">${esc(p.name)}</span>${p.ver ? ' ' + esc(p.ver) : ''}`);
  }

  if (namespaces.length) {
    const ul = makeList(makeSection(host, `Namespaces (${namespaces.length})`));
    for (const ns of namespaces) {
      row(ul, `${tag('tcl-tag-ns', 'namespace')} <span class="tcl-ns-path">${esc(ns.name)}</span>`
        + (ns.procs.length ? ` <span class="tcl-noargs">${ns.procs.length} proc${ns.procs.length !== 1 ? 's' : ''}</span>` : ''));
      for (const p of ns.procs) procRow(ul, p, true);
      for (const v of ns.variables) row(ul, `${tag('tcl-tag-var', 'var')} <span class="tcl-name">${esc(v.name)}</span>`, 'tcl-indent');
    }
  }

  if (classes.length) {
    const ul = makeList(makeSection(host, `Classes (${classes.length})`));
    for (const c of classes) {
      row(ul, `${tag('tcl-tag-class', 'class')} <span class="tcl-name">${esc(c.name)}</span>`);
      for (const m of c.methods) row(ul, `${tag('tcl-tag-method', 'method')} <span class="tcl-name">${esc(m.name)}</span> {${paramsHtml(m.params)}}`, 'tcl-indent');
    }
  }

  if (globalProcs.length) {
    const ul = makeList(makeSection(host, `Global Procedures (${globalProcs.length})`));
    for (const p of globalProcs) procRow(ul, p, false);
  }

  if (globalVars.length) {
    const ul = makeList(makeSection(host, `Global Variables (${globalVars.length})`));
    for (const v of globalVars) row(ul, `${tag('tcl-tag-var', v.kind)} <span class="tcl-name">${esc(v.name)}</span>`);
  }

  if (sources.length) {
    const ul = makeList(makeSection(host, `Source Inclusions (${sources.length})`));
    for (const s of sources) row(ul, esc(s));
  }

  return { parentNode: host };
}
