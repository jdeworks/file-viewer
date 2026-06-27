const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.wlang-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.wlang-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#d10;color:#fff;vertical-align:middle;margin-right:8px;}
.wlang-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.wlang-ctx{font-family:ui-monospace,monospace;font-size:14px;color:#b91c1c;font-weight:700;}
.wlang-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.wlang-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.wlang-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:104px;}
.wlang-card strong{display:block;font-size:1.2rem;font-weight:700;}
.wlang-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.wlang-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.wlang-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.wlang-list{margin:0;padding:0;list-style:none;}
.wlang-list li{padding:6px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;}
.wlang-list li:last-child{border-bottom:none;}
.wlang-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#fee2e2;color:#b91c1c;font-weight:700;margin-right:6px;}
.wlang-tag-pub{background:#dcfce7;color:#166534;}
.wlang-tag-priv{background:#e5e7eb;color:#4b5563;}
.wlang-name{font-weight:600;color:#9a3412;}
.wlang-pname{color:#1d4ed8;}
.wlang-type{color:#0e7490;}
.wlang-test{color:#7c3aed;}
.wlang-def{color:#9f1239;font-style:italic;}
.wlang-op{color:var(--fg-2,#888);}
.wlang-usage{color:var(--fg-2,#555);display:block;margin-top:2px;font-family:system-ui,sans-serif;font-size:12px;}
`;

// Replace (* nestable *) comments and "string" contents with spaces (newlines preserved),
// so structural parsing is not confused by punctuation inside them.
function stripCommentsStrings(text) {
  const s = String(text || '');
  let out = '', i = 0, depth = 0, inStr = false;
  while (i < s.length) {
    const c = s[i], c2 = s[i + 1];
    if (inStr) {
      if (c === '\\') { out += '  '; i += 2; continue; }
      if (c === '"') { inStr = false; out += ' '; i++; continue; }
      out += c === '\n' ? '\n' : ' '; i++; continue;
    }
    if (depth > 0) {
      if (c === '(' && c2 === '*') { depth++; out += '  '; i += 2; continue; }
      if (c === '*' && c2 === ')') { depth--; out += '  '; i += 2; continue; }
      out += c === '\n' ? '\n' : ' '; i++; continue;
    }
    if (c === '(' && c2 === '*') { depth++; out += '  '; i += 2; continue; }
    if (c === '"') { inStr = true; out += ' '; i++; continue; }
    out += c; i++;
  }
  return out;
}

// Split into top-level statements: bracket/brace/paren-aware, breaking on newline or ';' at depth 0.
function statements(text) {
  const out = [];
  let buf = '', depth = 0;
  for (const ch of text) {
    if (ch === '[' || ch === '{' || ch === '(') depth++;
    else if (ch === ']' || ch === '}' || ch === ')') depth = Math.max(0, depth - 1);
    if ((ch === '\n' || ch === ';') && depth === 0) { if (buf.trim()) out.push(buf); buf = ''; }
    else buf += ch;
  }
  if (buf.trim()) out.push(buf);
  return out.map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

// Split a string at top-level occurrences of `sep` (bracket/brace/paren-aware).
function splitTop(s, sep) {
  const out = [];
  let buf = '', depth = 0;
  for (const ch of s) {
    if (ch === '[' || ch === '{' || ch === '(') depth++;
    else if (ch === ']' || ch === '}' || ch === ')') depth = Math.max(0, depth - 1);
    if (ch === sep && depth === 0) { out.push(buf); buf = ''; } else buf += ch;
  }
  out.push(buf);
  return out.map((x) => x.trim()).filter(Boolean);
}

// Parse one pattern argument: name + head type + ?test + default. Only tokens containing `_`
// (Blank patterns) are real named parameters; literal args (e.g. OptionsPattern[]) are skipped.
function parseParam(tok) {
  tok = tok.trim();
  if (!tok.includes('_')) return null;
  const um = tok.match(/^([A-Za-z$][\w$]*)?(_+)/);
  if (!um) return null;
  const name = um[1] || '';
  const sequence = um[2].length > 1;
  let rest = tok.slice(um[0].length);
  let type = '', test = '', def = null, optional = false;
  const hm = rest.match(/^([A-Za-z$][\w$`]*)/);
  if (hm) { type = hm[1]; rest = rest.slice(hm[0].length); }
  const tm = rest.match(/^\?\s*([A-Za-z$][\w$]*)/);
  if (tm) { test = tm[1]; rest = rest.slice(tm[0].length); }
  if (rest.startsWith('.')) { optional = true; rest = rest.slice(1); }
  const dm = rest.match(/^:\s*(.+)$/);
  if (dm) { def = dm[1].trim(); optional = true; }
  return { name, type, test, default: def, optional, sequence };
}

// Extract the balanced `head[ ... ]` argument string of a statement; null if not a head[...] form.
function headArgs(st) {
  const hm = st.match(/^([A-Za-z$][\w$]*)\s*\[/);
  if (!hm) return null;
  const start = st.indexOf('[');
  let depth = 0, end = -1;
  for (let i = start; i < st.length; i++) {
    const c = st[i];
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) return null;
  return { name: hm[1], args: st.slice(start + 1, end), after: st.slice(end + 1).trim() };
}

// Pure, DOM-free structural analysis. Exported for unit testing.
export function analyzeWolfram(text) {
  const raw = String(text || '');
  let packageContext = null;
  const needs = [], functions = [], usages = [], options = [], attributes = [];

  // usage messages, package context, imports: capture from raw text — their names live inside
  // string literals, which the comment/string stripper below blanks out.
  for (const m of raw.matchAll(/([A-Za-z$][\w$]*)\s*::\s*usage\s*=\s*"((?:[^"\\]|\\.)*)"/g)) {
    usages.push({ name: m[1], text: m[2].replace(/\\(.)/g, '$1') });
  }
  const bp = raw.match(/BeginPackage\[([^\]]*)\]/);
  if (bp) {
    const ctxs = [...bp[1].matchAll(/"([^"]+)"/g)].map((c) => c[1]);
    if (ctxs.length) { packageContext = ctxs[0]; needs.push(...ctxs.slice(1)); }
  }
  for (const m of raw.matchAll(/\b(?:Needs|Get)\[\s*"([^"]+)"/g)) needs.push(m[1]);
  for (const m of raw.matchAll(/^\s*<<\s*([\w`./]+)/gm)) needs.push(m[1]);

  const stripped = stripCommentsStrings(raw);
  let moduleCount = 0;
  for (const _ of stripped.matchAll(/\b(?:Module|Block|With)\[/g)) moduleCount++;

  for (const st of statements(stripped)) {
    let m;
    if ((m = st.match(/^SetAttributes\[\s*([A-Za-z$][\w$]*)\s*,\s*(.+)\]$/))) {
      const items = m[2].replace(/[{}]/g, '').split(',').map((x) => x.trim()).filter(Boolean);
      attributes.push({ symbol: m[1], items });
      continue;
    }
    if ((m = st.match(/^Options\[\s*([A-Za-z$][\w$]*)\s*\]\s*=\s*(.+)$/))) {
      const names = [];
      for (const o of m[2].matchAll(/([A-Za-z$][\w$]*)\s*(?:->|:>|→)/g)) names.push(o[1]);
      options.push({ symbol: m[1], names });
      continue;
    }
    if (/^(?:Begin|End|EndPackage)\b/.test(st) || /::/.test(st)) continue;

    // function / value definition:  head[patterns] := body   or   head[patterns] = body
    const ha = headArgs(st);
    if (ha) {
      const op = ha.after.match(/^(:=|=)/);
      if (op && ha.args.includes('_')) {
        const params = splitTop(ha.args, ',').map(parseParam).filter(Boolean);
        functions.push({ name: ha.name, params, delayed: op[1] === ':=' });
      }
    }
  }

  const exported = new Set(usages.map((u) => u.name));
  for (const f of functions) f.exported = exported.has(f.name);
  return { packageContext, needs, functions, usages, options, attributes, moduleCount,
    symbols: [...exported] };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'wlang-section';
  const hd = document.createElement('div');
  hd.className = 'wlang-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'wlang-list'; sec.appendChild(ul); return ul; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }

function paramHtml(p) {
  const dots = p.sequence ? '__' : '_';
  let h = `<span class="wlang-pname">${esc(p.name)}</span><span class="wlang-op">${dots}</span>`;
  if (p.type) h += `<span class="wlang-type">${esc(p.type)}</span>`;
  if (p.test) h += `<span class="wlang-test">?${esc(p.test)}</span>`;
  if (p.default != null) h += `<span class="wlang-op">:</span><span class="wlang-def">${esc(p.default)}</span>`;
  else if (p.optional) h += `<span class="wlang-def">.</span>`;
  return h;
}

export function render(intake) {
  const text = intake && intake.text || '';
  const facts = analyzeWolfram(text);
  const { packageContext, needs, functions, usages, options, attributes, moduleCount } = facts;

  if (!packageContext && !functions.length && !usages.length && !/:=/.test(text) && !/\(\*/.test(text)) return null;

  const host = document.createElement('div');
  host.className = 'wlang-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'wlang-title';
  const badge = document.createElement('span');
  badge.className = 'wlang-badge';
  badge.textContent = 'Wolfram Language';
  title.appendChild(badge);
  const ctx = document.createElement('span');
  if (packageContext) { ctx.className = 'wlang-ctx'; ctx.textContent = packageContext; }
  else ctx.textContent = 'Script';
  title.appendChild(ctx);
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'wlang-sub';
  sub.textContent = [
    functions.length && `${functions.length} definition${functions.length !== 1 ? 's' : ''}`,
    usages.length && `${usages.length} usage message${usages.length !== 1 ? 's' : ''}`,
    needs.length && `${needs.length} import${needs.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const summary = document.createElement('div');
  summary.className = 'wlang-summary';
  for (const { value, label } of [
    { value: functions.length, label: 'Definitions' },
    { value: usages.length, label: 'Usage msgs' },
    { value: needs.length, label: 'Imports' },
    { value: options.length, label: 'Options' },
    { value: moduleCount, label: 'Module/Block' },
  ]) {
    const card = document.createElement('div');
    card.className = 'wlang-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); summary.appendChild(card);
  }
  host.appendChild(summary);

  if (packageContext || needs.length) {
    const ul = makeList(makeSection(host, 'Package & Imports'));
    if (packageContext) row(ul, `${tag('wlang-tag-pub', 'context')}<span class="wlang-ctx">${esc(packageContext)}</span>`);
    for (const n of needs) row(ul, `${tag('', 'needs')}<span class="wlang-ctx">${esc(n)}</span>`);
  }

  if (functions.length) {
    const ul = makeList(makeSection(host, `Definitions (${functions.length})`));
    for (const f of functions) {
      const kind = f.exported ? tag('wlang-tag-pub', 'public') : tag('wlang-tag-priv', 'private');
      const params = f.params.map(paramHtml).join('<span class="wlang-op">, </span>');
      const op = f.delayed ? ':=' : '=';
      row(ul, `${kind}<span class="wlang-name">${esc(f.name)}</span><span class="wlang-op">[</span>${params}<span class="wlang-op">] ${op}</span>`);
    }
  }

  if (usages.length) {
    const ul = makeList(makeSection(host, `Usage Messages (${usages.length})`));
    for (const u of usages) {
      row(ul, `<span class="wlang-name">${esc(u.name)}</span><span class="wlang-op">::usage</span><span class="wlang-usage">${esc(u.text)}</span>`);
    }
  }

  if (options.length || attributes.length) {
    const ul = makeList(makeSection(host, 'Options & Attributes'));
    for (const o of options) row(ul, `${tag('', 'Options')}<span class="wlang-name">${esc(o.symbol)}</span> <span class="wlang-type">${esc(o.names.join(', '))}</span>`);
    for (const a of attributes) row(ul, `${tag('', 'Attributes')}<span class="wlang-name">${esc(a.symbol)}</span> <span class="wlang-test">${esc(a.items.join(', '))}</span>`);
  }

  return { parentNode: host };
}

function tag(cls, t) { return `<span class="wlang-tag ${cls}">${esc(t)}</span>`; }
