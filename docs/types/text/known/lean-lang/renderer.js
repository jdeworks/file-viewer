const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.lean-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.lean-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7c3aed;color:#fff;vertical-align:middle;margin-right:8px;}
.lean-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.lean-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.lean-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.lean-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.lean-card strong{display:block;font-size:1.2rem;font-weight:700;}
.lean-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.lean-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.lean-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.lean-list{margin:0;padding:0;list-style:none;}
.lean-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.lean-list li:last-child{border-bottom:none;}
.lean-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#e0f2fe;color:#0369a1;font-weight:700;}
.lean-tag-import{background:#e0f2fe;color:#0369a1;}
.lean-tag-open{background:#dcfce7;color:#166534;}
.lean-tag-ns{background:#ede9fe;color:#7c3aed;}
.lean-tag-def{background:#dbeafe;color:#1d4ed8;}
.lean-tag-thm{background:#fef9c3;color:#854d0e;}
.lean-tag-ind{background:#dcfce7;color:#15803d;}
.lean-tag-struct{background:#cffafe;color:#0e7490;}
.lean-tag-class{background:#fae8ff;color:#a21caf;}
.lean-tag-inst{background:#ede9fe;color:#6d28d9;}
.lean-tag-sorry{background:#fee2e2;color:#b91c1c;}
.lean-tag-impl{background:#f1f5f9;color:#64748b;}
.lean-name{font-weight:600;}
.lean-type{color:#0e7490;}
.lean-ret{color:#1d4ed8;}
.lean-stmt{color:#854d0e;font-style:italic;}
.lean-pkg{font-family:ui-monospace,monospace;font-size:13px;color:#7c3aed;font-weight:700;}
`;

// Strip Lean comments: nested `/- -/` blocks and `--` line comments. Unicode-safe (operates on the
// already-decoded UTF-8 string; never splits on bytes).
function stripComments(text) {
  const s = String(text || '');
  let out = '', i = 0, depth = 0;
  while (i < s.length) {
    if (s[i] === '/' && s[i + 1] === '-') { depth++; i += 2; continue; }
    if (depth > 0 && s[i] === '-' && s[i + 1] === '/') { depth--; i += 2; continue; }
    if (depth > 0) { i++; continue; }
    if (s[i] === '-' && s[i + 1] === '-') { while (i < s.length && s[i] !== '\n') i++; continue; }
    out += s[i++];
  }
  return out;
}

const DECL = /^(?:@\[[^\]]*\]\s*)?(?:(?:private|protected|partial|noncomputable|unsafe|scoped|local|mutual)\s+)*(def|theorem|lemma|inductive|structure|class|instance|abbrev|example|axiom|opaque)\b([\s\S]*)$/;

// Group stripped source into declaration blocks. A block begins at a line whose first significant
// token is a declaration keyword and runs until the next such line. Returns {kw, body} pairs.
function declBlocks(src) {
  const lines = src.split('\n');
  const blocks = [];
  let cur = null;
  for (const line of lines) {
    const m = line.match(DECL);
    if (m) {
      if (cur) blocks.push(cur);
      cur = { kw: m[1], body: m[2] };
    } else if (cur) {
      cur.body += '\n' + line;
    }
  }
  if (cur) blocks.push(cur);
  return blocks;
}

// Pull leading binder groups `(a b : T)` `{a : T}` `[Inst]` off the front of a signature string.
function parseBinders(input) {
  const params = [];
  let s = input.replace(/^\s+/, '');
  while (s.length) {
    const open = s[0];
    const close = open === '(' ? ')' : open === '{' ? '}' : open === '[' ? ']' : open === '⦃' ? '⦄' : null;
    if (!close) break;
    let depth = 0, j = 0;
    for (; j < s.length; j++) {
      const c = s[j];
      if (c === '(' || c === '{' || c === '[' || c === '⦃') depth++;
      else if (c === ')' || c === '}' || c === ']' || c === '⦄') { depth--; if (depth === 0) break; }
    }
    const inner = s.slice(1, j).trim();
    const implicit = open !== '(';
    const ci = inner.indexOf(':');
    if (ci >= 0) {
      const type = inner.slice(ci + 1).trim();
      const names = inner.slice(0, ci).trim().split(/\s+/).filter(Boolean);
      if (!names.length) params.push({ name: '', type, implicit });
      else for (const n of names) params.push({ name: n, type, implicit });
    } else {
      params.push({ name: '', type: inner, implicit });
    }
    s = s.slice(j + 1).replace(/^\s+/, '');
  }
  return { params, rest: s };
}

// Signature = block text up to the body: the first of `:=`, a `where`, or a line starting with `|`.
function signatureOf(body) {
  const cands = [];
  const a = body.indexOf(':=');
  if (a >= 0) cands.push(a);
  const w = body.search(/\bwhere\b/);
  if (w >= 0) cands.push(w);
  const bar = body.search(/\n\s*\|/);
  if (bar >= 0) cands.push(bar);
  const end = cands.length ? Math.min(...cands) : body.length;
  return { sig: body.slice(0, end), body: body.slice(end) };
}

function nameOf(s) {
  const m = s.replace(/^\s+/, '').match(/^([^\s(){}\[\]:]+)/);
  return m ? m[1] : '';
}

// Parse Lean 4 source into structured facts. Pure / DOM-free — exported for unit testing.
export function analyzeLean(text) {
  const src = stripComments(text);
  const imports = [], opens = [], namespaces = [];
  const definitions = [], theorems = [], inductives = [], structures = [], classes = [], instances = [];

  for (const line of src.split('\n')) {
    let m;
    if ((m = line.match(/^\s*import\s+([\w.]+)/))) imports.push(m[1]);
    else if ((m = line.match(/^\s*open\s+(.+?)\s*$/))) {
      for (const o of m[1].split(/\s+/).filter(Boolean)) if (/^[\w.]+$/.test(o) && o !== 'in') opens.push(o);
    } else if ((m = line.match(/^\s*namespace\s+([\w.]+)/))) namespaces.push(m[1]);
  }

  for (const { kw, body } of declBlocks(src)) {
    const { sig } = signatureOf(body);

    if (kw === 'def' || kw === 'abbrev' || kw === 'axiom' || kw === 'opaque' || kw === 'example') {
      const name = kw === 'example' ? '<example>' : nameOf(sig);
      const after = kw === 'example' ? sig : sig.replace(/^\s*/, '').slice(name.length);
      const { params, rest } = parseBinders(after);
      let returns = '';
      const r = rest.replace(/^\s+/, '');
      if (r[0] === ':') returns = r.slice(1).trim().replace(/\s+/g, ' ');
      definitions.push({ name, kind: kw, params, returns });
    } else if (kw === 'theorem' || kw === 'lemma') {
      const name = nameOf(sig);
      const after = sig.replace(/^\s*/, '').slice(name.length);
      const { params, rest } = parseBinders(after);
      let statement = '';
      const r = rest.replace(/^\s+/, '');
      if (r[0] === ':') statement = r.slice(1).trim().replace(/\s+/g, ' ');
      const incomplete = /\bsorry\b/.test(body) || /\badmit\b/.test(body);
      theorems.push({ name, params, statement, incomplete });
    } else if (kw === 'inductive') {
      const name = nameOf(sig);
      const ctors = [];
      let cm; const re = /\|\s*([\w'.]+)/g;
      while ((cm = re.exec(body))) ctors.push(cm[1]);
      inductives.push({ name, constructors: ctors });
    } else if (kw === 'structure' || kw === 'class') {
      const name = nameOf(sig);
      const ext = sig.match(/\bextends\s+([\w.]+)/);
      const fields = [];
      const wi = body.search(/\bwhere\b/);
      const after = wi >= 0 ? body.slice(wi + 5) : body;
      for (const ln of after.split('\n')) {
        if (/:=/.test(ln)) continue;
        const fm = ln.match(/^\s*([\w'][\w'\s]*?)\s*:\s*(\S.*?)\s*$/);
        if (!fm) continue;
        const type = fm[2].replace(/\s+/g, ' ').trim();
        for (const n of fm[1].trim().split(/\s+/).filter(Boolean)) fields.push({ name: n, type });
      }
      (kw === 'class' ? classes : structures).push({ name, fields, extends: ext ? ext[1] : '' });
    } else if (kw === 'instance') {
      let s = sig.replace(/^\s*/, '');
      let name = '';
      if (s[0] !== ':') { name = nameOf(s); s = s.slice(name.length).replace(/^\s+/, ''); }
      let type = '';
      if (s[0] === ':') type = s.slice(1).trim().replace(/\s+/g, ' ');
      instances.push({ name, type });
    }
  }
  return { imports, opens, namespaces, definitions, theorems, inductives, structures, classes, instances };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'lean-section';
  const hd = document.createElement('div');
  hd.className = 'lean-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'lean-list'; sec.appendChild(ul); return ul; }
function tag(cls, t) { return `<span class="lean-tag ${cls}">${esc(t)}</span>`; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
function paramsHtml(params) {
  return params.map((p) => {
    const inner = (p.name ? `${esc(p.name)} : ` : '') + `<span class="lean-type">${esc(p.type)}</span>`;
    return p.implicit ? `{${inner}}` : `(${inner})`;
  }).join(' ');
}

export async function render(intake) {
  const text = intake.text || '';
  const facts = analyzeLean(text);
  const { imports, opens, namespaces, definitions, theorems, inductives, structures, classes, instances } = facts;
  const total = imports.length + definitions.length + theorems.length + inductives.length + structures.length + classes.length + instances.length;
  if (!total) return null;

  const host = document.createElement('div');
  host.className = 'lean-doc ln-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'lean-title';
  const badge = document.createElement('span');
  badge.className = 'lean-badge';
  badge.textContent = 'Lean 4';
  title.appendChild(badge);
  if (namespaces.length) { const n = document.createElement('span'); n.className = 'lean-pkg'; n.textContent = namespaces[0]; title.appendChild(n); }
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'lean-sub';
  sub.textContent = [
    imports.length && `${imports.length} import${imports.length !== 1 ? 's' : ''}`,
    definitions.length && `${definitions.length} def${definitions.length !== 1 ? 's' : ''}`,
    theorems.length && `${theorems.length} theorem${theorems.length !== 1 ? 's' : ''}`,
    inductives.length && `${inductives.length} inductive${inductives.length !== 1 ? 's' : ''}`,
    structures.length && `${structures.length} structure${structures.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'lean-cards';
  for (const { value, label } of [
    { value: imports.length, label: 'Imports' },
    { value: definitions.length, label: 'Definitions' },
    { value: theorems.length, label: 'Theorems' },
    { value: inductives.length, label: 'Inductives' },
    { value: structures.length, label: 'Structures' },
  ]) {
    const card = document.createElement('div');
    card.className = 'lean-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (imports.length || opens.length) {
    const ul = makeList(makeSection(host, `Imports & Opens (${imports.length + opens.length})`));
    for (const im of imports) row(ul, `${tag('lean-tag-import', 'import')} ${esc(im)}`);
    for (const op of opens) row(ul, `${tag('lean-tag-open', 'open')} ${esc(op)}`);
  }
  if (namespaces.length) {
    const ul = makeList(makeSection(host, `Namespaces (${namespaces.length})`));
    for (const ns of namespaces) row(ul, `${tag('lean-tag-ns', 'namespace')} <span class="lean-name">${esc(ns)}</span>`);
  }
  if (definitions.length) {
    const ul = makeList(makeSection(host, `Definitions (${definitions.length})`));
    for (const d of definitions) {
      const ps = d.params.length ? ` ${paramsHtml(d.params)}` : '';
      const ret = d.returns ? ` : <span class="lean-ret">${esc(d.returns)}</span>` : '';
      row(ul, `${tag('lean-tag-def', d.kind)} <span class="lean-name">${esc(d.name)}</span>${ps}${ret}`);
    }
  }
  if (theorems.length) {
    const ul = makeList(makeSection(host, `Theorems & Lemmas (${theorems.length})`));
    for (const t of theorems) {
      const ps = t.params.length ? ` ${paramsHtml(t.params)}` : '';
      const stmt = t.statement ? ` : <span class="lean-stmt">${esc(t.statement)}</span>` : '';
      const flag = t.incomplete ? ' ' + tag('lean-tag-sorry', 'sorry') : '';
      row(ul, `${tag('lean-tag-thm', 'theorem')} <span class="lean-name">${esc(t.name)}</span>${ps}${stmt}${flag}`);
    }
  }
  if (inductives.length) {
    const ul = makeList(makeSection(host, `Inductive Types (${inductives.length})`));
    for (const ind of inductives) {
      const cs = ind.constructors.map((c) => `<span class="lean-type">${esc(c)}</span>`).join(' | ');
      row(ul, `${tag('lean-tag-ind', 'inductive')} <span class="lean-name">${esc(ind.name)}</span>${cs ? ' = ' + cs : ''}`);
    }
  }
  if (structures.length) {
    const ul = makeList(makeSection(host, `Structures (${structures.length})`));
    for (const s of structures) {
      const fs = s.fields.map((f) => `${esc(f.name)} : <span class="lean-type">${esc(f.type)}</span>`).join(', ');
      const ext = s.extends ? ` ${tag('lean-tag-impl', 'extends ' + s.extends)}` : '';
      row(ul, `${tag('lean-tag-struct', 'structure')} <span class="lean-name">${esc(s.name)}</span>${ext}${fs ? ' { ' + fs + ' }' : ''}`);
    }
  }
  if (classes.length) {
    const ul = makeList(makeSection(host, `Classes (${classes.length})`));
    for (const c of classes) {
      const fs = c.fields.map((f) => `${esc(f.name)} : <span class="lean-type">${esc(f.type)}</span>`).join(', ');
      row(ul, `${tag('lean-tag-class', 'class')} <span class="lean-name">${esc(c.name)}</span>${fs ? ' { ' + fs + ' }' : ''}`);
    }
  }
  if (instances.length) {
    const ul = makeList(makeSection(host, `Instances (${instances.length})`));
    for (const inst of instances) {
      const nm = inst.name ? ` <span class="lean-name">${esc(inst.name)}</span>` : '';
      row(ul, `${tag('lean-tag-inst', 'instance')}${nm}${inst.type ? ` : <span class="lean-type">${esc(inst.type)}</span>` : ''}`);
    }
  }

  return { parentNode: host };
}
