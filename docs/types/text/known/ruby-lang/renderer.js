const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rb-doc{padding:16px 18px;max-width:920px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.rb-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#cc342d;color:#fff;vertical-align:middle;margin-right:8px;}
.rb-badge-sub{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#fde8e8;color:#cc342d;vertical-align:middle;margin-left:2px;}
.rb-name{font-family:ui-monospace,monospace;font-size:14px;color:#cc342d;font-weight:700;vertical-align:middle;}
.rb-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.rb-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.rb-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.rb-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.rb-card strong{display:block;font-size:1.2rem;font-weight:700;}
.rb-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.rb-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.rb-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.rb-list{margin:0;padding:0;list-style:none;}
.rb-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.rb-list li:last-child{border-bottom:none;}
.rb-cont-hd{padding:7px 14px;background:var(--bg-2,#fbfcfe);border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:13px;}
.rb-cont-hd:last-child{border-bottom:none;}
.rb-cont-name{color:#cc342d;font-weight:700;}
.rb-super{color:#7c3aed;}
.rb-meth{padding:4px 14px 4px 26px;border-bottom:1px solid var(--border,#f1f3f6);font-family:ui-monospace,monospace;font-size:12px;}
.rb-meth:last-child{border-bottom:none;}
.rb-mname{color:#1d4ed8;font-weight:600;}
.rb-param{color:#24292f;}
.rb-default{color:#b45309;}
.rb-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#fde8e8;color:#cc342d;font-weight:700;}
.rb-tag-class{background:#dbeafe;color:#1d4ed8;}
.rb-tag-private{background:#fef3c7;color:#92400e;}
.rb-tag-protected{background:#dcfce7;color:#166534;}
.rb-tag-attr{background:#ede9fe;color:#7f52ff;}
.rb-tag-mix{background:#e0f2fe;color:#0369a1;}
.rb-empty{padding:6px 26px;color:var(--fg-2,#888);font-style:italic;font-size:12px;}
.rb-val{color:#0a6640;}
`;

// Strip a trailing `# comment` while respecting string literals (so `#{}` interpolation survives).
function stripInlineComment(line) {
  let inS = null, out = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inS) { out += c; if (c === '\\') { out += line[i + 1] || ''; i++; continue; } if (c === inS) inS = null; continue; }
    if (c === '"' || c === "'") { inS = c; out += c; continue; }
    if (c === '#') break;
    out += c;
  }
  return out;
}

// Split a parameter string on top-level commas (ignoring commas inside (), [], {}); strips outer parens.
function splitParams(raw) {
  let s = raw.trim();
  if (s.startsWith('(')) {
    let d = 0, end = -1;
    for (let i = 0; i < s.length; i++) { const c = s[i]; if (c === '(') d++; else if (c === ')') { d--; if (d === 0) { end = i; break; } } }
    s = end >= 0 ? s.slice(1, end) : s.slice(1);
  } else {
    s = s.split(';')[0]; // one-liner body guard for paren-less defs
  }
  const parts = []; let buf = '', depth = 0;
  for (const c of s) {
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    if (c === ',' && depth === 0) { parts.push(buf); buf = ''; } else buf += c;
  }
  if (buf.trim()) parts.push(buf);
  return parts.map((p) => p.trim()).filter(Boolean);
}

function classifyParam(p) {
  if (p.startsWith('**')) return { name: p.slice(2).trim(), kind: 'ksplat', default: null };
  if (p.startsWith('*')) return { name: p.slice(1).trim() || '', kind: 'splat', default: null };
  if (p.startsWith('&')) return { name: p.slice(1).trim(), kind: 'block', default: null };
  const kw = p.match(/^([A-Za-z_]\w*[?!]?):\s*(.*)$/);
  if (kw) return { name: kw[1], kind: kw[2] ? 'keyword-default' : 'keyword', default: kw[2] ? kw[2].trim() : null };
  const opt = p.match(/^([A-Za-z_]\w*[?!]?)\s*=\s*(.+)$/);
  if (opt) return { name: opt[1], kind: 'optional', default: opt[2].trim() };
  return { name: (p.match(/^[A-Za-z_]\w*[?!]?/) || [p])[0], kind: 'required', default: null };
}

const OPENER_KW = new Set(['if', 'unless', 'case', 'while', 'until', 'for', 'begin']);
const countEnds = (l) => (l.match(/(?<![.\w])end(?![?!\w])/g) || []).length;

// Pure, DOM-free structural parser. Exported for unit testing.
export function analyzeRuby(text) {
  const classes = [], modules = [], topMethods = [];
  const requires = [], constants = [], mixins = [], attrs = [];
  const stack = []; // frames: {type:'class'|'module'|'sclass'|'def'|'block', obj?}
  let topVis = 'public', multiComment = false;

  const container = () => { for (let k = stack.length - 1; k >= 0; k--) { const t = stack[k].type; if (t === 'class' || t === 'module') return stack[k].obj; } return null; };
  const inSingleton = () => { for (let k = stack.length - 1; k >= 0; k--) { const t = stack[k].type; if (t === 'class' || t === 'module') return false; if (t === 'sclass') return true; } return false; };

  for (const rawLine of text.split(/\r?\n/)) {
    if (/^=begin\b/.test(rawLine)) { multiComment = true; continue; }
    if (/^=end\b/.test(rawLine)) { multiComment = false; continue; }
    if (multiComment) continue;
    const line = stripInlineComment(rawLine).trim();
    if (!line) continue;

    const ends = countEnds(line);
    const selfClosed = ends > 0; // one-liner opener that already closes itself

    // class << self
    if (/^class\s*<<\s*\w/.test(line)) { if (!selfClosed) stack.push({ type: 'sclass' }); continue; }

    // class
    let m = line.match(/^class\s+([\w:]+)(?:\s*<\s*([\w:][\w:.]*))?/);
    if (m) {
      const obj = { name: m[1], superclass: m[2] || null, kind: 'class', vis: 'public', methods: [], mixins: [], attrs: [], constants: [] };
      classes.push(obj);
      if (!selfClosed) stack.push({ type: 'class', obj });
      continue;
    }
    // module
    m = line.match(/^module\s+([\w:]+)/);
    if (m) {
      const obj = { name: m[1], superclass: null, kind: 'module', vis: 'public', methods: [], mixins: [], attrs: [], constants: [] };
      modules.push(obj);
      if (!selfClosed) stack.push({ type: 'module', obj });
      continue;
    }
    // def
    m = line.match(/^def\s+(self\.)?([A-Za-z_][\w]*[?!=]?)\s*(.*)$/);
    if (m) {
      const rest = m[3].trim();
      const endless = /^=/.test(rest); // def foo = expr  (Ruby 3 endless method)
      const scope = (m[1] || (!endless && inSingleton())) ? 'class' : 'instance';
      const c = container();
      const vis = c ? c.vis : topVis;
      const params = endless ? [] : splitParams(rest).map(classifyParam);
      const meth = { name: m[2], scope, visibility: vis, params, arity: params.length };
      (c ? c.methods : topMethods).push(meth);
      if (!selfClosed && !endless) stack.push({ type: 'def' });
      continue;
    }
    // visibility
    if (/^private$/.test(line)) { const c = container(); if (c) c.vis = 'private'; else topVis = 'private'; continue; }
    if (/^protected$/.test(line)) { const c = container(); if (c) c.vis = 'protected'; else topVis = 'protected'; continue; }
    if (/^public$/.test(line)) { const c = container(); if (c) c.vis = 'public'; else topVis = 'public'; continue; }
    // require / require_relative
    m = line.match(/^require(_relative)?\s+['"]([^'"]+)['"]/);
    if (m) { requires.push({ kind: m[1] ? 'require_relative' : 'require', path: m[2] }); continue; }
    // include / extend / prepend
    m = line.match(/^(include|extend|prepend)\s+([\w:][\w:.]*)/);
    if (m) { const mix = { kind: m[1], name: m[2] }; mixins.push(mix); const c = container(); if (c) c.mixins.push(mix); continue; }
    // attr_*
    m = line.match(/^(attr_accessor|attr_reader|attr_writer)\s+(.+)$/);
    if (m) {
      const kind = m[1].replace('attr_', '');
      for (const n of (m[2].match(/:(\w+)/g) || [])) { const a = { kind, name: n.slice(1) }; attrs.push(a); const c = container(); if (c) c.attrs.push(a); }
      continue;
    }
    // constant (UPPER-or-CamelCase = value), excluding ==, <=, etc.
    m = line.match(/^([A-Z]\w*)\s*=(?!=)\s*(.+)$/);
    if (m) { const con = { name: m[1], value: m[2].trim() }; constants.push(con); const c = container(); if (c) c.constants.push(con); continue; }

    // structural-only: adjust block depth
    if (selfClosed) { for (let k = 0; k < ends; k++) stack.pop(); continue; }
    const lead = (line.match(/^(\w+)/) || [])[1];
    if (OPENER_KW.has(lead)) { stack.push({ type: 'block' }); continue; }
    if (/\bdo(\s*\|[^|]*\|)?\s*$/.test(line)) { stack.push({ type: 'block' }); continue; }
  }

  return { classes, modules, methods: topMethods, requires, constants, mixins, attrs };
}

// ---- rendering helpers ----
function paramDisp(p) {
  if (p.kind === 'splat') return '*' + p.name;
  if (p.kind === 'ksplat') return '**' + p.name;
  if (p.kind === 'block') return '&' + p.name;
  if (p.kind === 'keyword') return esc(p.name) + ':';
  if (p.kind === 'keyword-default') return esc(p.name) + ': <span class="rb-default">' + esc(p.default) + '</span>';
  if (p.kind === 'optional') return esc(p.name) + ' = <span class="rb-default">' + esc(p.default) + '</span>';
  return esc(p.name);
}
const sigHtml = (mt) => '<span class="rb-mname">' + esc(mt.name) + '</span>(<span class="rb-param">' + mt.params.map(paramDisp).join(', ') + '</span>)';
function makeSection(host, title) {
  const sec = document.createElement('div'); sec.className = 'rb-section';
  const hd = document.createElement('div'); hd.className = 'rb-section-hd'; hd.textContent = title;
  sec.appendChild(hd); host.appendChild(sec); return sec;
}
function row(sec, cls, html) { const li = document.createElement('div'); li.className = cls; li.innerHTML = html; sec.appendChild(li); return li; }
function visTag(m) {
  let h = m.scope === 'class' ? '<span class="rb-tag rb-tag-class">class</span> ' : '';
  if (m.visibility === 'private') h += '<span class="rb-tag rb-tag-private">private</span> ';
  else if (m.visibility === 'protected') h += '<span class="rb-tag rb-tag-protected">protected</span> ';
  return h;
}

function renderContainers(host, list, label) {
  if (!list.length) return;
  const sec = makeSection(host, `${label} (${list.length})`);
  for (const c of list) {
    const sup = c.superclass ? ` &lt; <span class="rb-super">${esc(c.superclass)}</span>` : '';
    const extras = [];
    for (const mx of c.mixins) extras.push(`<span class="rb-tag rb-tag-mix">${esc(mx.kind)}</span> ${esc(mx.name)}`);
    for (const a of c.attrs) extras.push(`<span class="rb-tag rb-tag-attr">${esc(a.kind)}</span> :${esc(a.name)}`);
    for (const k of c.constants) extras.push(`<span class="rb-tag">const</span> ${esc(k.name)} = <span class="rb-val">${esc(k.value)}</span>`);
    row(sec, 'rb-cont-hd', `<span class="rb-cont-name">${esc(c.name)}</span>${sup}` + (extras.length ? ' &nbsp; ' + extras.join(' &nbsp; ') : ''));
    if (!c.methods.length) { row(sec, 'rb-empty', 'no methods'); continue; }
    for (const m of c.methods) row(sec, 'rb-meth', visTag(m) + sigHtml(m));
  }
}

export async function render(intake) {
  const text = intake.text || '';
  const preview = text.slice(0, 4000);
  if (!/^\s*(class|module|def|require|attr_)/m.test(preview)) return null;

  const data = analyzeRuby(text);
  const { classes, modules, methods, requires, constants, mixins, attrs } = data;
  const totalMethods = methods.length + classes.reduce((n, c) => n + c.methods.length, 0) + modules.reduce((n, c) => n + c.methods.length, 0);
  if (!classes.length && !modules.length && !methods.length && !requires.length) return null;

  let badgeLabel = 'Ruby Script';
  if (classes.length) badgeLabel = classes.length > 1 ? 'Ruby Classes' : 'Ruby Class';
  else if (modules.length) badgeLabel = 'Ruby Module';

  const host = document.createElement('div');
  host.className = 'rb-doc';
  const styleEl = document.createElement('style'); styleEl.textContent = CSS; host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'rb-title';
  const lead = classes[0] || modules[0];
  title.innerHTML = '<span class="rb-badge">Ruby</span><span class="rb-badge-sub">' + esc(badgeLabel) + '</span>'
    + (lead ? ' <span class="rb-name">' + esc(lead.name) + '</span>' : '');
  host.appendChild(title);

  const sub = document.createElement('div'); sub.className = 'rb-sub';
  sub.textContent = [
    classes.length && `${classes.length} class${classes.length !== 1 ? 'es' : ''}`,
    modules.length && `${modules.length} module${modules.length !== 1 ? 's' : ''}`,
    `${totalMethods} method${totalMethods !== 1 ? 's' : ''}`,
    requires.length && `${requires.length} require${requires.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div'); cards.className = 'rb-cards';
  for (const { value, label } of [
    { value: classes.length, label: 'Classes' },
    { value: modules.length, label: 'Modules' },
    { value: totalMethods, label: 'Methods' },
    { value: mixins.length, label: 'Mixins' },
    { value: requires.length, label: 'Requires' },
  ]) {
    const card = document.createElement('div'); card.className = 'rb-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  renderContainers(host, classes, 'Classes');
  renderContainers(host, modules, 'Modules');

  if (methods.length) {
    const sec = makeSection(host, `Top-level Methods (${methods.length})`);
    for (const m of methods) row(sec, 'rb-meth', visTag(m) + sigHtml(m));
  }
  if (mixins.length) {
    const sec = makeSection(host, `Mixins (${mixins.length})`);
    for (const mx of mixins) row(sec, 'rb-list', `<span class="rb-tag rb-tag-mix">${esc(mx.kind)}</span> ${esc(mx.name)}`);
  }
  if (attrs.length) {
    const sec = makeSection(host, `Attributes (${attrs.length})`);
    for (const a of attrs) row(sec, 'rb-list', `<span class="rb-tag rb-tag-attr">${esc(a.kind)}</span> :${esc(a.name)}`);
  }
  if (requires.length) {
    const sec = makeSection(host, `Requires (${requires.length})`);
    for (const r of requires) row(sec, 'rb-list', `<span class="rb-tag">${esc(r.kind)}</span> ${esc(r.path)}`);
  }
  if (constants.length) {
    const sec = makeSection(host, `Constants (${constants.length})`);
    for (const k of constants) row(sec, 'rb-list', `<span class="rb-tag">const</span> ${esc(k.name)} = <span class="rb-val">${esc(k.value)}</span>`);
  }

  return { parentNode: host };
}
