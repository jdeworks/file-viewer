const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rkt-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.rkt-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#c0392b;color:#fff;vertical-align:middle;margin-right:8px;}
.rkt-pkg{font-family:ui-monospace,monospace;font-size:13px;color:#c0392b;font-weight:700;}
.rkt-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.rkt-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.rkt-lang-pill{display:inline-block;padding:3px 10px;border-radius:6px;font-family:ui-monospace,monospace;font-size:12px;font-weight:700;background:#fdecea;color:#c0392b;margin:0 0 12px;border:1px solid #f5c6c6;}
.rkt-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.rkt-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.rkt-card strong{display:block;font-size:1.2rem;font-weight:700;}
.rkt-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.rkt-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.rkt-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.rkt-list{margin:0;padding:0;list-style:none;}
.rkt-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.rkt-list li:last-child{border-bottom:none;}
.rkt-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#fdecea;color:#c0392b;font-weight:700;}
.rkt-tag-req{background:#e3f2fd;color:#1565c0;}
.rkt-tag-prov{background:#e8f5e9;color:#1b5e20;}
.rkt-tag-struct{background:#fff8e1;color:#f57f17;}
.rkt-tag-fn{background:#f3e5f5;color:#6a1b9a;}
.rkt-tag-val{background:#e0f2f1;color:#00695c;}
.rkt-tag-macro{background:#fce4ec;color:#880e4f;}
.rkt-tag-ctc{background:#ffe0b2;color:#e65100;}
.rkt-name{font-weight:600;}
.rkt-param{color:#0e7490;}
.rkt-field{color:#6a1b9a;}
.rkt-more{color:var(--fg-2,#888);}
`;

// Paren-aware reader: turn Racket source into nested JS arrays (atoms = strings, lists = arrays).
// Handles ; line comments, #| |# block comments, "string" literals, and []{} as parens. Pure.
function readForms(text) {
  const s = String(text || '');
  const n = s.length;
  let i = 0;
  const isAtomBreak = (c) => /\s/.test(c) || c === '(' || c === ')' || c === '[' || c === ']' || c === '{' || c === '}' || c === ';' || c === '"';
  const skipWs = () => {
    while (i < n) {
      const c = s[i];
      if (c === ';') { while (i < n && s[i] !== '\n') i++; }
      else if (c === '#' && s[i + 1] === '|') {
        i += 2; let depth = 1;
        while (i < n && depth > 0) {
          if (s[i] === '#' && s[i + 1] === '|') { depth++; i += 2; }
          else if (s[i] === '|' && s[i + 1] === '#') { depth--; i += 2; }
          else i++;
        }
      } else if (/\s/.test(c)) i++;
      else break;
    }
  };
  const readList = () => {
    i++; // consume opener
    const arr = [];
    while (i < n) {
      skipWs();
      if (i >= n) break;
      const c = s[i];
      if (c === ')' || c === ']' || c === '}') { i++; break; }
      arr.push(readNode());
    }
    return arr;
  };
  const readNode = () => {
    skipWs();
    const c = s[i];
    if (c === '(' || c === '[' || c === '{') return readList();
    if (c === '"') {
      i++; let str = '';
      while (i < n && s[i] !== '"') {
        if (s[i] === '\\') { str += s[i] + (s[i + 1] || ''); i += 2; } else { str += s[i]; i++; }
      }
      i++;
      return '"' + str + '"';
    }
    let atom = '';
    while (i < n && !isAtomBreak(s[i])) { atom += s[i]; i++; }
    return atom || (i++, s[i - 1]); // never stall
  };
  const forms = [];
  while (i < n) {
    skipWs();
    if (i >= n) break;
    forms.push(readNode());
  }
  return forms;
}

// Extract parameter names from a Racket formals array. Handles dotted rest (. args),
// optional/keyword groups ([arg default], #:kw), and nested curried heads gracefully.
function paramNames(arr) {
  const out = [];
  let dot = false;
  for (const el of arr) {
    if (el === '.') { dot = true; continue; }
    let name;
    if (Array.isArray(el)) name = typeof el[0] === 'string' ? el[0] : '?';
    else name = el;
    if (name == null || name === '') continue;
    out.push(dot ? '. ' + name : name);
    dot = false;
  }
  return out;
}

// Read formals that may be a list, a bare symbol (variadic), or absent.
function formalsToParams(formals) {
  if (Array.isArray(formals)) return paramNames(formals);
  if (typeof formals === 'string' && formals) return ['. ' + formals];
  return [];
}

const LAMBDAS = new Set(['lambda', 'λ', 'case-lambda']);

// Parse into structured, DOM-free facts. Exported for unit testing.
export function analyzeRacket(text) {
  const src = String(text || '');
  const langM = src.match(/^[^\S\n]*#lang\s+([^\s]+)/m);
  const lang = langM ? langM[1].trim() : null;

  const requires = [];
  const provides = [];
  const structs = [];
  const functions = [];
  const values = [];
  const macros = [];

  const specName = (spec) => {
    if (typeof spec === 'string') return spec.startsWith('"') ? spec.slice(1, -1) : spec;
    if (Array.isArray(spec) && spec.length) return '(' + (typeof spec[0] === 'string' ? spec[0] : '…') + ' …)';
    return null;
  };

  for (const form of readForms(src)) {
    if (!Array.isArray(form) || form.length === 0) continue;
    const head = form[0];
    if (typeof head !== 'string') continue;

    if (head === 'require') {
      for (const spec of form.slice(1)) { const nm = specName(spec); if (nm) requires.push(nm); }
      continue;
    }
    if (head === 'provide') {
      for (const spec of form.slice(1)) { const nm = specName(spec); if (nm) provides.push(nm); }
      continue;
    }
    if (head === 'struct' || head === 'define-struct') {
      const id = form[1];
      let name = null;
      if (typeof id === 'string') name = id;
      else if (Array.isArray(id) && typeof id[0] === 'string') name = id[0]; // (struct child parent ...) rare
      const fieldList = Array.isArray(form[2]) ? form[2] : [];
      const fields = fieldList.map((f) => (Array.isArray(f) ? f[0] : f)).filter((f) => typeof f === 'string');
      if (name) structs.push({ name, fields });
      continue;
    }
    if (head === 'define-syntax-rule') {
      const sig = form[1];
      if (Array.isArray(sig) && typeof sig[0] === 'string') macros.push({ name: sig[0], params: paramNames(sig.slice(1)) });
      continue;
    }
    if (head === 'define-syntax' || head === 'define-syntaxes' || head === 'define-simple-macro') {
      const id = form[1];
      const name = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : null;
      if (typeof name === 'string') macros.push({ name, params: Array.isArray(id) ? paramNames(id.slice(1)) : [] });
      continue;
    }
    if (head === 'define' || head === 'define/contract' || head === 'define/public' || head === 'define/private') {
      const contract = head === 'define/contract';
      const id = form[1];
      if (Array.isArray(id)) {
        // (define (name args...) ...) — possibly curried: ((name a) b)
        let head2 = id, depth = 0;
        while (Array.isArray(head2[0])) { head2 = head2[0]; depth++; }
        const name = typeof head2[0] === 'string' ? head2[0] : null;
        if (name) functions.push({ name, params: paramNames(id.slice(1)), contract, curried: depth > 0 });
        continue;
      }
      if (typeof id === 'string') {
        // (define name (lambda (args) ...)) → function ; else a value
        const rhs = contract ? form[3] : form[2];
        if (Array.isArray(rhs) && typeof rhs[0] === 'string' && LAMBDAS.has(rhs[0])) {
          functions.push({ name: id, params: formalsToParams(rhs[1]), contract });
        } else {
          values.push({ name: id, contract });
        }
      }
      continue;
    }
  }

  const dedupe = (a) => [...new Set(a)];
  return {
    lang,
    isTyped: !!lang && /typed[/-]racket/i.test(lang),
    requires: dedupe(requires),
    provides: dedupe(provides),
    structs,
    functions,
    values,
    macros,
  };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'rkt-section';
  const hd = document.createElement('div');
  hd.className = 'rkt-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'rkt-list'; sec.appendChild(ul); return ul; }
function tag(cls, t) { return `<span class="rkt-tag ${cls}">${esc(t)}</span>`; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
function paramsHtml(params) {
  if (!params.length) return '<span class="rkt-param">()</span>';
  return '<span class="rkt-param">(' + params.map(esc).join(' ') + ')</span>';
}
function capped(ul, items, max, render) {
  for (const it of items.slice(0, max)) render(it);
  if (items.length > max) row(ul, `<span class="rkt-more">… and ${items.length - max} more</span>`);
}

export async function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').split('/').pop();

  const facts = analyzeRacket(text);
  const { lang, isTyped, requires, provides, structs, functions, values, macros } = facts;

  // Clearly-not-Racket guard.
  const looksRacket = lang != null || /\(\s*(?:define|require|provide|struct|module)\b/.test(text.slice(0, 4000));
  if (!looksRacket) return null;

  const host = document.createElement('div');
  host.className = 'rkt-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'rkt-title';
  const badge = document.createElement('span');
  badge.className = 'rkt-badge';
  badge.textContent = isTyped ? 'Typed Racket' : 'Racket Module';
  title.appendChild(badge);
  if (name) { const nm = document.createElement('span'); nm.className = 'rkt-pkg'; nm.textContent = name; title.appendChild(nm); }
  host.appendChild(title);

  if (lang) {
    const pill = document.createElement('div');
    pill.className = 'rkt-lang-pill';
    pill.textContent = '#lang ' + lang;
    host.appendChild(pill);
  }

  const sub = document.createElement('div');
  sub.className = 'rkt-sub';
  const plural = (k, w) => k && `${k} ${w}${k !== 1 ? 's' : ''}`;
  sub.textContent = [
    plural(functions.length, 'function'),
    plural(structs.length, 'struct'),
    plural(macros.length, 'macro'),
    plural(requires.length, 'require'),
    plural(provides.length, 'provide'),
    plural(values.length, 'value'),
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'rkt-cards';
  for (const { value, label } of [
    { value: functions.length, label: 'Functions' },
    { value: structs.length, label: 'Structs' },
    { value: macros.length, label: 'Macros' },
    { value: requires.length, label: 'Requires' },
    { value: provides.length, label: 'Provides' },
  ]) {
    const card = document.createElement('div');
    card.className = 'rkt-card';
    const st = document.createElement('strong'); st.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(st); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (requires.length) {
    const ul = makeList(makeSection(host, `Requires (${requires.length})`));
    capped(ul, requires, 20, (r) => row(ul, `${tag('rkt-tag-req', 'require')} ${esc(r)}`));
  }
  if (provides.length) {
    const ul = makeList(makeSection(host, `Provides (${provides.length})`));
    capped(ul, provides, 20, (p) => row(ul, `${tag('rkt-tag-prov', 'provide')} ${esc(p)}`));
  }
  if (structs.length) {
    const ul = makeList(makeSection(host, `Structs (${structs.length})`));
    for (const s of structs) {
      const fields = s.fields.length
        ? ` <span class="rkt-field">(${s.fields.map(esc).join(' ')})</span>`
        : '';
      row(ul, `${tag('rkt-tag-struct', 'struct')} <span class="rkt-name">${esc(s.name)}</span>${fields}`);
    }
  }
  if (functions.length) {
    const ul = makeList(makeSection(host, `Functions (${functions.length})`));
    capped(ul, functions, 30, (f) => {
      const ctc = f.contract ? tag('rkt-tag-ctc', 'contract') + ' ' : '';
      row(ul, `${ctc}${tag('rkt-tag-fn', 'fn')} <span class="rkt-name">${esc(f.name)}</span> ${paramsHtml(f.params)}`);
    });
  }
  if (macros.length) {
    const ul = makeList(makeSection(host, `Macros (${macros.length})`));
    for (const m of macros) {
      const p = m.params.length ? ' ' + paramsHtml(m.params) : '';
      row(ul, `${tag('rkt-tag-macro', 'macro')} <span class="rkt-name">${esc(m.name)}</span>${p}`);
    }
  }
  if (values.length) {
    const ul = makeList(makeSection(host, `Values (${values.length})`));
    capped(ul, values, 20, (v) => row(ul, `${tag('rkt-tag-val', 'val')} <span class="rkt-name">${esc(v.name)}</span>`));
  }

  return { parentNode: host };
}
