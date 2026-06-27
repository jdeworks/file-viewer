const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cbn-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.cbn-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1d4ed8;color:#fff;vertical-align:middle;margin-right:8px;}
.cbn-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.cbn-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.cbn-pkg{font-family:ui-monospace,monospace;font-size:13px;color:#1d4ed8;font-weight:700;}
.cbn-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.cbn-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.cbn-card strong{display:block;font-size:1.2rem;font-weight:700;}
.cbn-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.cbn-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.cbn-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.cbn-list{margin:0;padding:0;list-style:none;}
.cbn-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.cbn-list li:last-child{border-bottom:none;}
.cbn-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;}
.cbn-tag-import{background:#dcfce7;color:#166534;}
.cbn-tag-fn{background:#dbeafe;color:#1d4ed8;}
.cbn-tag-class{background:#fef9c3;color:#854d0e;}
.cbn-tag-iface{background:#ede9fe;color:#7c3aed;}
.cbn-tag-choice{background:#ffe4e6;color:#9f1239;}
.cbn-tag-impl{background:#e0f2fe;color:#0369a1;}
.cbn-tag-let{background:#f3e8ff;color:#7e22ce;}
.cbn-tag-member{background:#f1f5f9;color:#475569;}
.cbn-name{font-weight:600;}
.cbn-type{color:#0f766e;}
.cbn-ret{color:#1d4ed8;}
.cbn-self{color:#9f1239;font-style:italic;}
.cbn-val{color:#9333ea;}
.cbn-sub2{color:var(--fg-2,#888);padding:2px 14px 6px 28px;font-size:11px;font-family:ui-monospace,monospace;}
`;

// --- pure parsing helpers -------------------------------------------------

// Strip block + line comments so they never confuse declaration matching.
function stripComments(text) {
  return String(text || '').replace(/\/\*[\s\S]*?\*\//g, ' ');
}

// Collapse source into logical lines: a declaration whose parentheses span
// multiple physical lines (multi-line fn signatures) is joined into one.
function logicalLines(src) {
  const out = [];
  let buf = '', paren = 0;
  for (const raw of src.split(/\r?\n/)) {
    const line = raw.replace(/\/\/.*$/, '');
    buf += (buf ? ' ' : '') + line.trim();
    for (const ch of line) {
      if (ch === '(') paren++;
      else if (ch === ')') paren = Math.max(0, paren - 1);
    }
    if (paren === 0) { out.push(buf.trim()); buf = ''; }
  }
  if (buf.trim()) out.push(buf.trim());
  return out.filter(Boolean);
}

// Split on top-level commas (ignoring commas nested in (), [], <>).
function splitTop(s) {
  const out = [];
  let depth = 0, buf = '';
  for (const ch of s) {
    if ('([<'.includes(ch)) depth++;
    else if (')]>'.includes(ch)) depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) { out.push(buf); buf = ''; } else buf += ch;
  }
  if (buf.trim()) out.push(buf);
  return out.map((x) => x.trim()).filter(Boolean);
}

// "name: Type" -> { name, type }; tolerates `addr self: Self*` etc.
function parseParam(p) {
  const m = p.match(/^(\w+)\s*:\s*([\s\S]+)$/);
  return m ? { name: m[1], type: m[2].replace(/\s+/g, ' ').trim() } : { name: p.trim(), type: '' };
}

// Extract the inside of the first balanced group of `open`/`close` after `from`.
function balancedGroup(t, open, close, from = 0) {
  const start = t.indexOf(open, from);
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < t.length; i++) {
    if (t[i] === open) depth++;
    else if (t[i] === close) { depth--; if (depth === 0) return { inner: t.slice(start + 1, i), end: i }; }
  }
  return null;
}

// Parse a Carbon fn declaration into { name, self, params:[{name,type}], returns }.
function parseFn(t) {
  const name = (t.match(/\bfn\s+(\w+)/) || [])[1] || '';
  let self = '';
  // optional [self: Self] / deduced params before the value params
  const br = balancedGroup(t, '[', ']');
  const parenIdx = t.indexOf('(');
  if (br && (parenIdx < 0 || br.end < parenIdx)) {
    const sm = br.inner.match(/\bself\s*:\s*([^,]+)/);
    if (sm) self = sm[1].trim();
  }
  let params = [], returns = '', tail = t;
  if (parenIdx >= 0) {
    const grp = balancedGroup(t, '(', ')', parenIdx);
    if (grp) {
      params = splitTop(grp.inner).map(parseParam);
      tail = t.slice(grp.end + 1);
    }
  }
  const rm = tail.match(/->\s*([^{;]+)/);
  if (rm) returns = rm[1].replace(/\s+/g, ' ').trim();
  return { name, self, params, returns };
}

// Parse into structured facts. Exported (pure, no DOM) for unit testing.
export function analyzeCarbon(text) {
  const src = stripComments(text);

  // package + imports via direct regex (terminated declarations).
  const pkgM = src.match(/\bpackage\s+([\w.]+)(?:\s+library\s+"[^"]*")?(?:\s+(api|impl))?\s*;/);
  const packageName = pkgM ? pkgM[1] : '';
  const packageKind = pkgM ? (pkgM[2] || '') : '';

  const imports = [];
  const impRe = /\bimport\s+([\w.]+)(?:\s+library\s+("[^"]*"))?\s*;/g;
  let im;
  while ((im = impRe.exec(src))) imports.push({ name: im[1], library: im[2] ? im[2].replace(/"/g, '') : '' });

  // choice types via brace regex (bodies have no nested braces).
  const choices = [];
  const chRe = /\bchoice\s+(\w+)\s*\{([^}]*)\}/g;
  let ch;
  while ((ch = chRe.exec(src))) {
    const alts = splitTop(ch[2]).map((a) => (a.match(/^(\w+)/) || [, a])[1]);
    choices.push({ name: ch[1], alternatives: alts });
  }

  // linear scan with a context stack for class/interface membership.
  const functions = [], classes = [], interfaces = [], impls = [], constants = [];
  const stack = []; // { kind: 'class'|'iface'|'fn'|'block', ref }

  for (const t of logicalLines(src)) {
    const top = stack.length ? stack[stack.length - 1] : null;
    const hostType = [...stack].reverse().find((s) => s.kind === 'class' || s.kind === 'iface');
    let pushKind = null;

    let m;
    if (/^(?:(?:private|protected|virtual|abstract|final|default)\s+)*fn\s+\w+/.test(t)) {
      const fn = parseFn(t);
      fn.owner = hostType ? hostType.ref.name : '';
      functions.push(fn);
      if (hostType && hostType.kind === 'class') hostType.ref.methods.push(fn);
      if (hostType && hostType.kind === 'iface') hostType.ref.methods.push(fn);
      if (t.includes('{')) pushKind = 'fn';
    } else if ((m = t.match(/^(?:(?:abstract|base)\s+)*class\s+(\w+)/))) {
      const ref = { name: m[1], members: [], methods: [] };
      classes.push(ref);
      if (t.includes('{')) pushKind = { kind: 'class', ref };
    } else if ((m = t.match(/^interface\s+(\w+)/))) {
      const ref = { name: m[1], methods: [] };
      interfaces.push(ref);
      if (t.includes('{')) pushKind = { kind: 'iface', ref };
    } else if ((m = t.match(/^impl\s+(.+?)\s*\{?\s*$/))) {
      impls.push(m[1].replace(/\s*\{$/, '').trim());
      if (t.includes('{')) pushKind = 'block';
    } else if ((m = t.match(/^(?:(?:private|protected)\s+)*(let|var)\s+(\w+)\s*:\s*([^=;]+?)\s*(?:=\s*([^;]+?))?\s*;?\s*$/))) {
      const entry = { kind: m[1], name: m[2], type: m[3].replace(/\s+/g, ' ').trim(), value: (m[4] || '').trim() };
      if (top && top.kind === 'class') top.ref.members.push(entry);
      else if (!top) constants.push(entry);
      // (let/var inside a fn body or other block = local, ignored)
    }

    // brace bookkeeping
    const opens = (t.match(/\{/g) || []).length;
    const closes = (t.match(/\}/g) || []).length;
    let net = opens - closes;
    if (pushKind) {
      stack.push(typeof pushKind === 'string' ? { kind: pushKind, ref: null } : pushKind);
      net -= 1; // the block we just pushed consumed one opening brace
    }
    for (let i = 0; i < net; i++) stack.push({ kind: 'block', ref: null });
    for (let i = 0; i < -net; i++) stack.pop();
  }

  return { packageName, packageKind, imports, functions, classes, interfaces, impls, constants, choices };
}

// --- DOM rendering --------------------------------------------------------

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'cbn-section';
  const hd = document.createElement('div');
  hd.className = 'cbn-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'cbn-list'; sec.appendChild(ul); return ul; }
function tag(cls, t) { return `<span class="cbn-tag ${cls}">${esc(t)}</span>`; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
function note(sec, html) { const d = document.createElement('div'); d.className = 'cbn-sub2'; d.innerHTML = html; sec.appendChild(d); }

function paramsHtml(params) {
  return params.map((p) => `${esc(p.name)}: <span class="cbn-type">${esc(p.type)}</span>`).join(', ');
}
function fnSigHtml(fn) {
  const self = fn.self ? `<span class="cbn-self">[self: ${esc(fn.self)}]</span>` : '';
  const ret = fn.returns ? ` -&gt; <span class="cbn-ret">${esc(fn.returns)}</span>` : '';
  return `${tag('cbn-tag-fn', 'fn')} <span class="cbn-name">${esc(fn.name)}</span>${self}(${paramsHtml(fn.params)})${ret}`;
}

export async function render(intake) {
  const text = intake.text || '';
  if (!/\bpackage\b/.test(text) && !/\bfn\b/.test(text)) return null;

  const f = analyzeCarbon(text);
  const { packageName, packageKind, imports, functions, classes, interfaces, impls, constants, choices } = f;

  const host = document.createElement('div');
  host.className = 'cbn-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'cbn-title';
  title.innerHTML = `<span class="cbn-badge">Carbon</span><span class="cbn-pkg">${esc(packageName || 'source')}${packageKind ? ' ' + esc(packageKind) : ''}</span>`;
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'cbn-sub';
  sub.textContent = [
    functions.length && `${functions.length} fn`,
    classes.length && `${classes.length} class${classes.length !== 1 ? 'es' : ''}`,
    interfaces.length && `${interfaces.length} interface${interfaces.length !== 1 ? 's' : ''}`,
    choices.length && `${choices.length} choice${choices.length !== 1 ? 's' : ''}`,
    impls.length && `${impls.length} impl${impls.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'cbn-cards';
  for (const { value, label } of [
    { value: functions.length, label: 'Functions' },
    { value: classes.length, label: 'Classes' },
    { value: interfaces.length, label: 'Interfaces' },
    { value: choices.length, label: 'Choices' },
    { value: constants.length, label: 'Constants' },
  ]) {
    const card = document.createElement('div');
    card.className = 'cbn-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (imports.length) {
    const ul = makeList(makeSection(host, `Imports (${imports.length})`));
    for (const i of imports) {
      const lib = i.library ? ` <span class="cbn-val">library "${esc(i.library)}"</span>` : '';
      row(ul, `${tag('cbn-tag-import', 'import')} <span class="cbn-name">${esc(i.name)}</span>${lib}`);
    }
  }
  if (constants.length) {
    const ul = makeList(makeSection(host, `Constants (${constants.length})`));
    for (const c of constants) {
      const val = c.value ? ` = <span class="cbn-val">${esc(c.value)}</span>` : '';
      row(ul, `${tag('cbn-tag-let', c.kind)} <span class="cbn-name">${esc(c.name)}</span>: <span class="cbn-type">${esc(c.type)}</span>${val}`);
    }
  }
  if (interfaces.length) {
    const sec = makeSection(host, `Interfaces (${interfaces.length})`);
    const ul = makeList(sec);
    for (const it of interfaces) {
      row(ul, `${tag('cbn-tag-iface', 'interface')} <span class="cbn-name">${esc(it.name)}</span>`);
      for (const me of it.methods) note(sec, fnSigHtml(me));
    }
  }
  if (classes.length) {
    const sec = makeSection(host, `Classes (${classes.length})`);
    const ul = makeList(sec);
    for (const c of classes) {
      const counts = [c.members.length && `${c.members.length} field${c.members.length !== 1 ? 's' : ''}`,
        c.methods.length && `${c.methods.length} method${c.methods.length !== 1 ? 's' : ''}`].filter(Boolean).join(', ');
      row(ul, `${tag('cbn-tag-class', 'class')} <span class="cbn-name">${esc(c.name)}</span>${counts ? ` <span class="cbn-self">(${counts})</span>` : ''}`);
      for (const mem of c.members) {
        note(sec, `${tag('cbn-tag-member', mem.kind)} <span class="cbn-name">${esc(mem.name)}</span>: <span class="cbn-type">${esc(mem.type)}</span>`);
      }
      for (const me of c.methods) note(sec, fnSigHtml(me));
    }
  }
  if (functions.length) {
    const ul = makeList(makeSection(host, `Functions (${functions.length})`));
    for (const fn of functions) {
      const owner = fn.owner ? `<span class="cbn-self">${esc(fn.owner)}.</span>` : '';
      row(ul, fnSigHtml(fn).replace('<span class="cbn-name">', `${owner}<span class="cbn-name">`));
    }
  }
  if (choices.length) {
    const ul = makeList(makeSection(host, `Choice Types (${choices.length})`));
    for (const c of choices) {
      const alts = c.alternatives.length ? ` { ${c.alternatives.map(esc).join(', ')} }` : '';
      row(ul, `${tag('cbn-tag-choice', 'choice')} <span class="cbn-name">${esc(c.name)}</span><span class="cbn-type">${alts}</span>`);
    }
  }
  if (impls.length) {
    const ul = makeList(makeSection(host, `Impl Blocks (${impls.length})`));
    for (const d of impls) row(ul, `${tag('cbn-tag-impl', 'impl')} <span class="cbn-name">${esc(d)}</span>`);
  }

  return { parentNode: host };
}
