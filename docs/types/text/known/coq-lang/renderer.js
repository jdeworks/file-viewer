const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.coq-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.coq-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#dc2626;color:#fff;vertical-align:middle;margin-right:8px;}
.coq-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.coq-name{font-family:ui-monospace,monospace;font-size:15px;color:#b91c1c;font-weight:700;}
.coq-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.coq-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.coq-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.coq-card strong{display:block;font-size:1.2rem;font-weight:700;}
.coq-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.coq-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.coq-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.coq-list{margin:0;padding:0;list-style:none;}
.coq-list li{padding:6px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.coq-list li:last-child{border-bottom:none;}
.coq-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;}
.coq-tag-req{background:#e0f2fe;color:#0369a1;}
.coq-tag-def{background:#dbeafe;color:#1d4ed8;}
.coq-tag-fix{background:#ede9fe;color:#7c3aed;}
.coq-tag-ind{background:#fef9c3;color:#854d0e;}
.coq-tag-thm{background:#dcfce7;color:#166534;}
.coq-tag-not{background:#ffe4e6;color:#9f1239;}
.coq-tag-mod{background:#f1f5f9;color:#475569;}
.coq-id{font-weight:700;color:#b91c1c;}
.coq-type{color:#0e7490;}
.coq-ret{color:#1d4ed8;}
.coq-stmt{color:var(--fg-2,#555);}
.coq-ctor{display:block;padding-left:16px;font-size:11px;color:var(--fg-2,#555);}
.coq-ctor b{color:#854d0e;}
.coq-status{font-size:10px;padding:1px 6px;border-radius:10px;font-weight:700;margin-left:6px;}
.coq-status-proved{background:#dcfce7;color:#15803d;}
.coq-status-admitted{background:#fef3c7;color:#92400e;}
.coq-status-aborted{background:#fee2e2;color:#b91c1c;}
.coq-status-incomplete{background:#f1f5f9;color:#64748b;}
`;

// Strip Coq comments (* ... *) (they nest) while preserving string literals verbatim.
function stripComments(text) {
  const src = String(text || '');
  let out = '', depth = 0, i = 0;
  while (i < src.length) {
    if (depth === 0 && src[i] === '"') { // copy string literal whole
      out += src[i++];
      while (i < src.length && src[i] !== '"') out += src[i++];
      if (i < src.length) out += src[i++];
      continue;
    }
    if (src[i] === '(' && src[i + 1] === '*') { depth++; i += 2; continue; }
    if (depth > 0 && src[i] === '*' && src[i + 1] === ')') { depth--; i += 2; out += ' '; continue; }
    if (depth > 0) { i++; continue; }
    out += src[i++];
  }
  return out;
}

// Split Coq source into top-level sentences. A '.' terminates a sentence only at paren depth 0
// and when followed by whitespace/EOF (so qualified names like Coq.Arith.Arith stay intact).
function statements(text) {
  const src = stripComments(text);
  const out = [];
  let buf = '', depth = 0, i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '"') { // skip string literal (no separators inside)
      buf += ch; i++;
      while (i < src.length && src[i] !== '"') buf += src[i++];
      if (i < src.length) buf += src[i++];
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth = Math.max(0, depth - 1);
    if (ch === '.' && depth === 0) {
      const next = src[i + 1];
      if (next === undefined || /\s/.test(next)) { out.push(buf); buf = ''; i++; continue; }
    }
    buf += ch; i++;
  }
  if (buf.trim()) out.push(buf);
  return out.map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

// Index of the first depth-0 occurrence of `tok` (e.g. ':='), or -1.
function topLevelIndex(str, tok) {
  let depth = 0;
  for (let i = 0; i <= str.length - tok.length; i++) {
    const c = str[i];
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth = Math.max(0, depth - 1);
    else if (depth === 0 && str.startsWith(tok, i)) return i;
  }
  return -1;
}

// Split on a single-char separator at paren depth 0.
function splitTopLevel(str, sep) {
  const out = []; let buf = '', depth = 0;
  for (const c of str) {
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth = Math.max(0, depth - 1);
    if (c === sep && depth === 0) { out.push(buf); buf = ''; } else buf += c;
  }
  out.push(buf);
  return out;
}

// Extract typed param groups "(x y : nat)" / "{A : Type}" from a signature fragment.
function sigParams(sig) {
  const params = [];
  const re = /([({])([^(){}]*)[)}]/g;
  let m;
  while ((m = re.exec(sig))) {
    const inner = m[2];
    const ci = inner.indexOf(':');
    if (ci === -1) continue;
    const type = inner.slice(ci + 1).trim();
    for (const nm of inner.slice(0, ci).trim().split(/\s+/).filter(Boolean)) {
      params.push({ name: nm, type, implicit: m[1] === '{' });
    }
  }
  return params;
}

const TERMINATORS = /^(Qed|Defined|Admitted|Abort|Save)\b/;
const statusOf = (t) => t === 'Admitted' ? 'admitted' : t === 'Abort' ? 'aborted' : 'proved';

// Parse Coq source into structured facts. Pure (no DOM) so it is unit-testable.
export function analyzeCoq(text) {
  const requires = [], definitions = [], inductives = [], theorems = [], notations = [], modules = [];
  let pending = null; // theorem awaiting its Qed/Defined/Admitted/Abort
  let m;

  for (const st of statements(text)) {
    if (TERMINATORS.test(st)) {
      if (pending) { pending.terminator = st.match(TERMINATORS)[1]; pending.status = statusOf(pending.terminator); pending = null; }
      continue;
    }
    if (/^Proof\b/.test(st)) continue;

    if ((m = st.match(/^(?:From\s+(\S+)\s+)?Require\s+(?:Import\s+|Export\s+)?(.+)$/))) {
      for (const mod of m[2].split(/\s+/)) if (mod && mod !== 'Import' && mod !== 'Export') requires.push(mod);
      continue;
    }
    if ((m = st.match(/^(?:Import|Export)\s+(.+)$/))) {
      for (const mod of m[1].split(/\s+/)) if (mod) requires.push(mod);
      continue;
    }
    if ((m = st.match(/^(Definition|Fixpoint|CoFixpoint|Function|Let)\s+(\w+)([\s\S]*)$/))) {
      const ai = topLevelIndex(m[3], ':=');
      const sig = ai === -1 ? m[3] : m[3].slice(0, ai);
      const ci = topLevelIndex(sig, ':');
      const returns = ci === -1 ? '' : sig.slice(ci + 1).trim();
      const params = sigParams(ci === -1 ? sig : sig.slice(0, ci));
      definitions.push({ name: m[2], kind: m[1], params, returns });
      continue;
    }
    if ((m = st.match(/^(Inductive|CoInductive|Variant)\s+(\w+)([\s\S]*)$/))) {
      const ai = topLevelIndex(m[3], ':=');
      const body = ai === -1 ? '' : m[3].slice(ai + 2);
      const constructors = splitTopLevel(body, '|').map((s) => s.trim()).filter(Boolean).map((seg) => {
        const ci = seg.indexOf(':');
        const name = (ci === -1 ? seg : seg.slice(0, ci)).trim().split(/\s+/)[0];
        return { name, type: ci === -1 ? '' : seg.slice(ci + 1).trim() };
      });
      inductives.push({ name: m[2], constructors });
      continue;
    }
    if ((m = st.match(/^(Theorem|Lemma|Corollary|Proposition|Remark|Fact|Property|Example)\s+(\w+)\s*:\s*([\s\S]*)$/))) {
      pending = { name: m[2], kind: m[1], statement: m[3].trim(), status: 'incomplete', terminator: null };
      theorems.push(pending);
      continue;
    }
    if ((m = st.match(/^(?:Notation|Infix|Reserved\s+Notation)\s+"([^"]*)"/))) { notations.push(m[1]); continue; }
    if ((m = st.match(/^Module\s+(?:Type\s+)?(\w+)/))) { modules.push({ name: m[1], kind: 'Module' }); continue; }
    if ((m = st.match(/^Section\s+(\w+)/))) { modules.push({ name: m[1], kind: 'Section' }); continue; }
  }

  return { requires, definitions, inductives, theorems, notations, modules };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'coq-section';
  const hd = document.createElement('div');
  hd.className = 'coq-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'coq-list'; sec.appendChild(ul); return ul; }
function tag(cls, t) { return `<span class="coq-tag ${cls}">${esc(t)}</span>`; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
function paramsHtml(params) {
  return params.map((p) => {
    const open = p.implicit ? '{' : '(', close = p.implicit ? '}' : ')';
    return `${open}<span class="coq-id">${esc(p.name)}</span> : <span class="coq-type">${esc(p.type)}</span>${close}`;
  }).join(' ');
}

export async function render(intake) {
  const text = intake.text || '';
  const { requires, definitions, inductives, theorems, notations, modules } = analyzeCoq(text);

  const host = document.createElement('div');
  host.className = 'coq-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'coq-title';
  const badge = document.createElement('span');
  badge.className = 'coq-badge';
  badge.textContent = 'Coq';
  title.appendChild(badge);
  const topMod = modules.find((mm) => mm.kind === 'Module');
  if (topMod) { const n = document.createElement('span'); n.className = 'coq-name'; n.textContent = topMod.name; title.appendChild(n); }
  else title.appendChild(document.createTextNode('Coq Source File'));
  host.appendChild(title);

  const proved = theorems.filter((t) => t.status === 'proved').length;
  const sub = document.createElement('div');
  sub.className = 'coq-sub';
  sub.textContent = [
    theorems.length && `${theorems.length} proof item${theorems.length !== 1 ? 's' : ''} (${proved} proved)`,
    definitions.length && `${definitions.length} definition${definitions.length !== 1 ? 's' : ''}`,
    inductives.length && `${inductives.length} inductive${inductives.length !== 1 ? 's' : ''}`,
    requires.length && `${requires.length} import${requires.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'coq-cards';
  for (const { value, label } of [
    { value: theorems.length, label: 'Theorems/Lemmas' },
    { value: definitions.length, label: 'Definitions' },
    { value: inductives.length, label: 'Inductives' },
    { value: requires.length, label: 'Imports' },
    { value: notations.length, label: 'Notations' },
  ]) {
    const card = document.createElement('div');
    card.className = 'coq-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (requires.length) {
    const ul = makeList(makeSection(host, `Imports (${requires.length})`));
    for (const r of requires) row(ul, `${tag('coq-tag-req', 'Require')} <span class="coq-id">${esc(r)}</span>`);
  }

  if (modules.length) {
    const ul = makeList(makeSection(host, `Modules & Sections (${modules.length})`));
    for (const { name, kind } of modules) row(ul, `${tag('coq-tag-mod', kind)} <span class="coq-id">${esc(name)}</span>`);
  }

  if (inductives.length) {
    const ul = makeList(makeSection(host, `Inductive Types (${inductives.length})`));
    for (const { name, constructors } of inductives) {
      const ctors = constructors.map((c) => `<span class="coq-ctor">| <b>${esc(c.name)}</b>${c.type ? ' : ' + esc(c.type) : ''}</span>`).join('');
      row(ul, `${tag('coq-tag-ind', 'Inductive')} <span class="coq-id">${esc(name)}</span>` +
        ` <span class="coq-stmt">(${constructors.length} ctor${constructors.length !== 1 ? 's' : ''})</span>${ctors}`);
    }
  }

  if (definitions.length) {
    const ul = makeList(makeSection(host, `Definitions (${definitions.length})`));
    for (const { name, kind, params, returns } of definitions) {
      const cls = /Fix/.test(kind) ? 'coq-tag-fix' : 'coq-tag-def';
      const ret = returns ? ` : <span class="coq-ret">${esc(returns)}</span>` : '';
      row(ul, `${tag(cls, kind)} <span class="coq-id">${esc(name)}</span> ${paramsHtml(params)}${ret}`);
    }
  }

  if (theorems.length) {
    const ul = makeList(makeSection(host, `Theorems & Lemmas (${theorems.length})`));
    for (const { name, kind, statement, status } of theorems) {
      const sBadge = `<span class="coq-status coq-status-${status}">${esc(status)}</span>`;
      row(ul, `${tag('coq-tag-thm', kind)} <span class="coq-id">${esc(name)}</span>${sBadge}` +
        `<span class="coq-ctor coq-stmt">${esc(statement)}</span>`);
    }
  }

  if (notations.length) {
    const ul = makeList(makeSection(host, `Notations (${notations.length})`));
    for (const n of notations) row(ul, `${tag('coq-tag-not', 'Notation')} <span class="coq-stmt">"${esc(n)}"</span>`);
  }

  return { parentNode: host };
}
