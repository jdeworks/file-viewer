const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.fctr-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.fctr-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#d97706;color:#fff;vertical-align:middle;margin-right:8px;}
.fctr-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.fctr-vocab{font-family:ui-monospace,monospace;font-size:13px;color:#b45309;font-weight:700;}
.fctr-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.fctr-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.fctr-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.fctr-card strong{display:block;font-size:1.2rem;font-weight:700;}
.fctr-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.fctr-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.fctr-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.fctr-list{margin:0;padding:0;list-style:none;}
.fctr-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.fctr-list li:last-child{border-bottom:none;}
.fctr-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;}
.fctr-tag-using{background:#dcfce7;color:#166534;}
.fctr-tag-word{background:#ffedd5;color:#9a3412;}
.fctr-tag-generic{background:#ede9fe;color:#7c3aed;}
.fctr-tag-tuple{background:#dbeafe;color:#1d4ed8;}
.fctr-tag-const{background:#fef9c3;color:#854d0e;}
.fctr-tag-symbol{background:#cffafe;color:#0e7490;}
.fctr-name{font-weight:600;}
.fctr-effect{color:#7c3aed;}
.fctr-effect b{font-weight:700;}
.fctr-arrow{color:#9f1239;font-weight:700;}
.fctr-parent{color:#0e7490;}
.fctr-slot{color:#1d4ed8;}
.fctr-val{color:#854d0e;}
`;

// Whitespace-delimited tokenizer. Handles `!` line comments (only when standalone, i.e. at start
// or preceded by whitespace) and double-quoted strings (so spaces/`;`/`!` inside strings don't
// fracture token boundaries). Stack-effect parens `( -- )` are themselves whitespace-delimited in
// Factor, so they survive as their own `(` / `)` tokens.
function tokenize(text) {
  const src = String(text || '');
  const n = src.length;
  const toks = [];
  let i = 0;
  while (i < n) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\r' || c === '\n') { i++; continue; }
    if (c === '!' && (i === 0 || /\s/.test(src[i - 1]))) { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '"') {
      let j = i + 1, str = '"';
      while (j < n && src[j] !== '"') {
        if (src[j] === '\\') { str += src[j] + (src[j + 1] || ''); j += 2; continue; }
        str += src[j]; j++;
      }
      str += '"'; toks.push(str); i = j + 1; continue;
    }
    let j = i, t = '';
    while (j < n && !/\s/.test(src[j])) { t += src[j]; j++; }
    toks.push(t); i = j;
  }
  return toks;
}

// Collect tokens from index `i` up to (but excluding) the next `;`; returns [tokens, indexAfterSemi].
function untilSemi(toks, i) {
  const out = [];
  while (i < toks.length && toks[i] !== ';') { out.push(toks[i]); i++; }
  return [out, i + 1];
}

// Parse Factor source into structured facts. Exported (pure, DOM-free) for unit testing.
export function analyzeFactor(text) {
  const toks = tokenize(text);
  const using = [], words = [], generics = [], tuples = [], constants = [], symbols = [];
  let inVocab = null;
  const n = toks.length;
  let i = 0;
  while (i < n) {
    const t = toks[i];
    if (t === 'USING:') { const [items, ni] = untilSemi(toks, i + 1); using.push(...items); i = ni; continue; }
    if (t === 'IN:') { if (!inVocab && toks[i + 1]) inVocab = toks[i + 1]; i += 2; continue; }
    // Word definitions: `:`/`::` name ( stack -- effect ) body ;  — the parenthesised stack effect
    // is Factor's type signature.
    if (t === ':' || t === '::') {
      const name = toks[i + 1] || '';
      i += 2;
      let effect = null;
      if (toks[i] === '(') {
        i++;
        const parts = [];
        while (i < n && toks[i] !== ')') { parts.push(toks[i]); i++; }
        i++; // past ')'
        effect = parts.join(' ');
      }
      while (i < n && toks[i] !== ';') i++; // skip body
      i++;
      if (name) words.push({ name, effect: effect == null ? null : effect.trim() });
      continue;
    }
    if (t === 'GENERIC:' || t === 'HOOK:') { if (toks[i + 1]) generics.push(toks[i + 1]); i += 2; continue; }
    if (t === 'TUPLE:') {
      const name = toks[i + 1] || '';
      i += 2;
      let parent = null;
      if (toks[i] === '<') { parent = toks[i + 1] || null; i += 2; }
      const slots = [];
      while (i < n && toks[i] !== ';') {
        if (toks[i] === '{') { // { slot-name initial: val } long-form slot spec
          i++;
          if (i < n && toks[i] !== '}') slots.push(toks[i]);
          while (i < n && toks[i] !== '}') i++;
          i++;
          continue;
        }
        slots.push(toks[i]); i++;
      }
      i++;
      if (name) tuples.push({ name, parent, slots });
      continue;
    }
    if (t === 'CONSTANT:') { if (toks[i + 1]) constants.push({ name: toks[i + 1], value: toks[i + 2] ?? null }); i += 3; continue; }
    if (t === 'SYMBOL:') { if (toks[i + 1]) symbols.push(toks[i + 1]); i += 2; continue; }
    if (t === 'SYMBOLS:') { const [items, ni] = untilSemi(toks, i + 1); symbols.push(...items); i = ni; continue; }
    i++;
  }
  return { using, inVocab, words, generics, tuples, constants, symbols };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'fctr-section';
  const hd = document.createElement('div');
  hd.className = 'fctr-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'fctr-list'; sec.appendChild(ul); return ul; }
function tag(cls, t) { return `<span class="fctr-tag ${cls}">${esc(t)}</span>`; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }

// Render a stack effect string "a b -- c" with the `--` highlighted as the in/out divider.
function effectHtml(effect) {
  if (effect == null) return '';
  const parts = effect.split(/\s+--\s+|--/);
  if (parts.length === 2) {
    return ` <span class="fctr-effect">( <b>${esc(parts[0].trim())}</b> <span class="fctr-arrow">--</span> <b>${esc(parts[1].trim())}</b> )</span>`;
  }
  return ` <span class="fctr-effect">( ${esc(effect)} )</span>`;
}

export function render(intake) {
  const text = intake.text || '';
  const { using, inVocab, words, generics, tuples, constants, symbols } = analyzeFactor(text);

  const host = document.createElement('div');
  host.className = 'fctr-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'fctr-title';
  const badge = document.createElement('span');
  badge.className = 'fctr-badge';
  badge.textContent = 'Factor';
  title.appendChild(badge);
  const vn = document.createElement('span');
  vn.className = 'fctr-vocab';
  vn.textContent = inVocab ? `IN: ${inVocab}` : 'Source File';
  title.appendChild(vn);
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'fctr-sub';
  sub.textContent = [
    using.length && `${using.length} import${using.length !== 1 ? 's' : ''}`,
    words.length && `${words.length} word${words.length !== 1 ? 's' : ''}`,
    tuples.length && `${tuples.length} tuple${tuples.length !== 1 ? 's' : ''}`,
    (symbols.length + constants.length) && `${symbols.length + constants.length} symbol${(symbols.length + constants.length) !== 1 ? 's' : ''}/const`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'fctr-cards';
  for (const { value, label } of [
    { value: using.length, label: 'Imports' },
    { value: words.length, label: 'Words' },
    { value: generics.length, label: 'Generics' },
    { value: tuples.length, label: 'Tuples' },
    { value: constants.length, label: 'Constants' },
    { value: symbols.length, label: 'Symbols' },
  ]) {
    const card = document.createElement('div');
    card.className = 'fctr-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (using.length) {
    const ul = makeList(makeSection(host, `USING: Imports (${using.length})`));
    for (const v of using) row(ul, `${tag('fctr-tag-using', 'using')} ${esc(v)}`);
  }
  if (words.length) {
    const ul = makeList(makeSection(host, `Word Definitions (${words.length})`));
    for (const w of words) {
      row(ul, `${tag('fctr-tag-word', ':')} <span class="fctr-name">${esc(w.name)}</span>${effectHtml(w.effect)}`);
    }
  }
  if (generics.length) {
    const ul = makeList(makeSection(host, `Generic Words (${generics.length})`));
    for (const g of generics) row(ul, `${tag('fctr-tag-generic', 'GENERIC:')} <span class="fctr-name">${esc(g)}</span>`);
  }
  if (tuples.length) {
    const ul = makeList(makeSection(host, `Tuples (${tuples.length})`));
    for (const tp of tuples) {
      const parent = tp.parent ? ` <span class="fctr-parent">&lt; ${esc(tp.parent)}</span>` : '';
      const slots = tp.slots.length
        ? ` { ${tp.slots.map((s) => `<span class="fctr-slot">${esc(s)}</span>`).join(' ')} }`
        : '';
      row(ul, `${tag('fctr-tag-tuple', 'TUPLE:')} <span class="fctr-name">${esc(tp.name)}</span>${parent}${slots}`);
    }
  }
  if (constants.length) {
    const ul = makeList(makeSection(host, `Constants (${constants.length})`));
    for (const c of constants) {
      const val = c.value != null ? ` = <span class="fctr-val">${esc(c.value)}</span>` : '';
      row(ul, `${tag('fctr-tag-const', 'CONSTANT:')} <span class="fctr-name">${esc(c.name)}</span>${val}`);
    }
  }
  if (symbols.length) {
    const ul = makeList(makeSection(host, `Symbols (${symbols.length})`));
    for (const s of symbols) row(ul, `${tag('fctr-tag-symbol', 'SYMBOL:')} <span class="fctr-name">${esc(s)}</span>`);
  }

  return { parentNode: host };
}
