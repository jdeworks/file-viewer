const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.fth-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.fth-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e05c00;color:#fff;vertical-align:middle;margin-right:8px;}
.fth-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.fth-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.fth-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.fth-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.fth-card strong{display:block;font-size:1.2rem;font-weight:700;}
.fth-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.fth-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.fth-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.fth-list{margin:0;padding:0;list-style:none;}
.fth-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.fth-list li:last-child{border-bottom:none;}
.fth-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;background:#e0f2fe;color:#0369a1;}
.fth-tag-word{background:#ede9fe;color:#7c3aed;}
.fth-tag-var{background:#dcfce7;color:#166534;}
.fth-tag-const{background:#dbeafe;color:#1d4ed8;}
.fth-tag-value{background:#fef9c3;color:#854d0e;}
.fth-tag-create{background:#ffe4e6;color:#9f1239;}
.fth-tag-include{background:#f1f5f9;color:#475569;}
.fth-name{font-weight:600;}
.fth-effect{color:#0e7490;}
.fth-val{color:#059669;}
`;

// ── Tokenizer ─────────────────────────────────────────────────────────────────
// Forth is whitespace-delimited. Comments: `\ ...` to end of line, and `( ... )`
// (the `(` must be its own token). Strings: `." ..."`, `S" ..."`, `.( ...)`.
// We keep comments/strings in the stream (typed) so a stack effect can be tied to
// the word it follows. Pure / DOM-free.
function tokenize(text) {
  const src = String(text || '');
  const n = src.length;
  const toks = [];
  const isWs = (c) => c === ' ' || c === '\t' || c === '\r' || c === '\n' || c === '\f';
  let i = 0;
  while (i < n) {
    while (i < n && isWs(src[i])) i++;
    if (i >= n) break;
    const start = i;
    while (i < n && !isWs(src[i])) i++;
    const tk = src.slice(start, i);
    const up = tk.toUpperCase();

    if (tk === '\\') {                        // line comment
      let j = i;
      while (j < n && src[j] !== '\n') j++;
      toks.push({ t: 'comment', v: src.slice(i, j).trim() });
      i = j;
    } else if (tk === '(') {                  // paren / stack-effect comment
      let j = i;
      while (j < n && src[j] !== ')') j++;
      toks.push({ t: 'comment', v: src.slice(i, j).trim() });
      i = j < n ? j + 1 : j;
    } else if (up === '."' || up === 'S"' || up === 'C"' || up === 'ABORT"' || tk === '.(') {
      const close = tk === '.(' ? ')' : '"';  // string literal
      let j = i;
      while (j < n && src[j] !== close) j++;
      toks.push({ t: 'string', v: src.slice(i, j).trim() });
      i = j < n ? j + 1 : j;
    } else {
      toks.push({ t: 'word', v: tk });
    }
  }
  return toks;
}

const nextWord = (toks, k) => { for (let m = k + 1; m < toks.length; m++) if (toks[m].t === 'word') return toks[m].v; return null; };
const prevWord = (toks, k) => { for (let m = k - 1; m >= 0; m--) { if (toks[m].t === 'word') return toks[m].v; if (toks[m].t === 'string') return null; } return null; };

// Parse Forth source into structured facts. Exported (pure, no DOM) for unit testing.
export function analyzeForth(text) {
  const toks = tokenize(text);
  const words = [], variables = [], constants = [], values = [], creates = [], includes = [];

  for (let k = 0; k < toks.length; k++) {
    const tok = toks[k];
    if (tok.t !== 'word') continue;
    const v = tok.v;
    const up = v.toUpperCase();

    if (v === ':') {
      // `: NAME ( effect -- ) body ;` — name is the next word; the effect is the
      // first comment before the terminating `;` (preferring one with `--`).
      let j = k + 1;
      while (j < toks.length && toks[j].t !== 'word') j++;
      if (j >= toks.length) break;
      const name = toks[j].v;
      let effect = '', end = toks.length;
      for (let m = j + 1; m < toks.length; m++) {
        if (toks[m].t === 'word' && toks[m].v === ';') { end = m; break; }
        if (toks[m].t === 'comment') {
          if (toks[m].v.includes('--')) { if (!effect.includes('--')) effect = toks[m].v; }
          else if (!effect) effect = toks[m].v;
        }
      }
      words.push({ name, effect });
      k = end;                                // skip the body so internals don't re-parse
      continue;
    }

    if (up === 'VARIABLE' || up === '2VARIABLE' || up === 'FVARIABLE') {
      const nm = nextWord(toks, k);
      if (nm) variables.push({ name: nm });
    } else if (up === 'CONSTANT' || up === '2CONSTANT' || up === 'FCONSTANT') {
      const nm = nextWord(toks, k);
      if (nm) constants.push({ name: nm, value: prevWord(toks, k) });
    } else if (up === 'VALUE' || up === '2VALUE' || up === 'FVALUE') {
      const nm = nextWord(toks, k);
      if (nm) values.push({ name: nm, value: prevWord(toks, k) });
    } else if (up === 'CREATE') {
      const nm = nextWord(toks, k);
      if (nm) creates.push({ name: nm });
    } else if (up === 'INCLUDE' || up === 'REQUIRE' || up === 'NEEDS') {
      const nm = nextWord(toks, k);
      if (nm) includes.push(nm);
    } else if (up === 'INCLUDED' || up === 'REQUIRED') {
      // preceded by an `S" file"` string literal
      for (let m = k - 1; m >= 0; m--) {
        if (toks[m].t === 'string') { includes.push(toks[m].v); break; }
        if (toks[m].t === 'word') break;
      }
    }
  }

  return { words, variables, constants, values, creates, includes };
}

// ── Rendering ───────────────────────────────────────────────────────────────
function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'fth-section';
  const hd = document.createElement('div');
  hd.className = 'fth-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'fth-list'; sec.appendChild(ul); return ul; }
function tag(cls, t) { return `<span class="fth-tag ${cls}">${esc(t)}</span>`; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }

export function render(intake) {
  const text = intake.text || '';
  const { words, variables, constants, values, creates, includes } = analyzeForth(text);
  if (!words.length && !variables.length && !constants.length && !values.length && !creates.length && !includes.length) return null;

  const host = document.createElement('div');
  host.className = 'fth-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'fth-title';
  const badge = document.createElement('span');
  badge.className = 'fth-badge';
  badge.textContent = 'Forth';
  title.appendChild(badge);
  title.appendChild(document.createTextNode('Source File'));
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'fth-sub';
  sub.textContent = [
    words.length && `${words.length} word${words.length !== 1 ? 's' : ''}`,
    variables.length && `${variables.length} variable${variables.length !== 1 ? 's' : ''}`,
    constants.length && `${constants.length} constant${constants.length !== 1 ? 's' : ''}`,
    values.length && `${values.length} value${values.length !== 1 ? 's' : ''}`,
    creates.length && `${creates.length} create${creates.length !== 1 ? 's' : ''}`,
    includes.length && `${includes.length} include${includes.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'fth-cards';
  for (const { value, label, always } of [
    { value: words.length, label: 'Words', always: true },
    { value: variables.length, label: 'Variables', always: true },
    { value: constants.length, label: 'Constants', always: true },
    { value: values.length, label: 'Values' },
    { value: creates.length, label: 'Creates' },
    { value: includes.length, label: 'Includes' },
  ]) {
    if (!value && !always) continue;
    const card = document.createElement('div');
    card.className = 'fth-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (words.length) {
    const ul = makeList(makeSection(host, `Word Definitions (${words.length})`));
    for (const { name, effect } of words) {
      const eff = effect ? ` <span class="fth-effect">( ${esc(effect)} )</span>` : '';
      row(ul, `${tag('fth-tag-word', ':')} <span class="fth-name">${esc(name)}</span>${eff}`);
    }
  }
  if (variables.length) {
    const ul = makeList(makeSection(host, `Variables (${variables.length})`));
    for (const { name } of variables) row(ul, `${tag('fth-tag-var', 'VARIABLE')} <span class="fth-name">${esc(name)}</span>`);
  }
  if (constants.length) {
    const ul = makeList(makeSection(host, `Constants (${constants.length})`));
    for (const { name, value } of constants) {
      const val = value != null ? ` = <span class="fth-val">${esc(value)}</span>` : '';
      row(ul, `${tag('fth-tag-const', 'CONSTANT')} <span class="fth-name">${esc(name)}</span>${val}`);
    }
  }
  if (values.length) {
    const ul = makeList(makeSection(host, `Values (${values.length})`));
    for (const { name, value } of values) {
      const val = value != null ? ` = <span class="fth-val">${esc(value)}</span>` : '';
      row(ul, `${tag('fth-tag-value', 'VALUE')} <span class="fth-name">${esc(name)}</span>${val}`);
    }
  }
  if (creates.length) {
    const ul = makeList(makeSection(host, `Created Words (${creates.length})`));
    for (const { name } of creates) row(ul, `${tag('fth-tag-create', 'CREATE')} <span class="fth-name">${esc(name)}</span>`);
  }
  if (includes.length) {
    const ul = makeList(makeSection(host, `Included Files (${includes.length})`));
    for (const f of includes) row(ul, `${tag('fth-tag-include', 'include')} <span class="fth-name">${esc(f)}</span>`);
  }

  return { parentNode: host };
}
