const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.scm-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.scm-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#6a1b9a;color:#fff;vertical-align:middle;margin-right:8px;}
.scm-pkg{font-family:ui-monospace,monospace;font-size:13px;color:#6a1b9a;font-weight:700;}
.scm-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.scm-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.scm-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.scm-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.scm-card strong{display:block;font-size:1.2rem;font-weight:700;}
.scm-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.scm-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.scm-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.scm-list{margin:0;padding:0;list-style:none;}
.scm-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.scm-list li:last-child{border-bottom:none;}
.scm-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#f3e5f5;color:#6a1b9a;font-weight:700;}
.scm-tag-import{background:#fff8e1;color:#f57f17;}
.scm-tag-export{background:#e8f5e9;color:#1b5e20;}
.scm-tag-rec{background:#e3f2fd;color:#1565c0;}
.scm-tag-fn{background:#e8f5e9;color:#1b5e20;}
.scm-tag-val{background:#e0f2f1;color:#00695c;}
.scm-tag-macro{background:#fce4ec;color:#880e4f;}
.scm-name{font-weight:600;}
.scm-param{color:#0e7490;}
.scm-field{color:#6a1b9a;}
.scm-more{color:var(--fg-2,#888);}
`;

// Paren-aware s-expression reader: turn Scheme source into nested JS arrays (atoms = strings,
// lists = arrays). Strips ; line comments, #| |# (nested) block comments, #; datum comments,
// and "string" literals; treats () [] {} alike. Pure / DOM-free.
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
      } else if (c === '#' && s[i + 1] === ';') {
        i += 2; skipWs(); if (i < n) readNode(); // discard one datum
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
    if (c === '#' && s[i + 1] === '\\') {
      // char literal e.g. #\a #\( #\space — keep the leading char, then trailing word
      let atom = s[i] + s[i + 1]; i += 2;
      if (i < n) { atom += s[i]; i++; }
      while (i < n && /[A-Za-z0-9-]/.test(s[i])) { atom += s[i]; i++; }
      return atom;
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

// Extract parameter names from a formals array. Handles dotted rest (a b . rest) and
// optional/grouped [arg default] forms; flattens nested heads to a name.
function paramNames(arr) {
  const out = [];
  let dot = false;
  for (const el of arr) {
    if (el === '.') { dot = true; continue; }
    let name = Array.isArray(el) ? (typeof el[0] === 'string' ? el[0] : '?') : el;
    if (name == null || name === '') continue;
    out.push(dot ? '. ' + name : name);
    dot = false;
  }
  return out;
}

// Formals may be a list, a bare symbol (full variadic: (lambda args ...)), or absent.
function formalsToParams(formals) {
  if (Array.isArray(formals)) return paramNames(formals);
  if (typeof formals === 'string' && formals) return ['. ' + formals];
  return [];
}

const LAMBDAS = new Set(['lambda', 'λ', 'case-lambda']);
const IMPORT_HEADS = new Set(['import', 'require', 'use', 'use-modules', 'load', 'include']);

function specName(spec) {
  if (typeof spec === 'string') return spec.startsWith('"') ? spec.slice(1, -1) : spec;
  if (Array.isArray(spec) && spec.length) return '(' + spec.map((x) => (typeof x === 'string' ? x : '…')).join(' ') + ')';
  return null;
}

// Parse into structured, DOM-free facts. Exported for unit testing.
export function analyzeScheme(text) {
  const src = String(text || '');
  let moduleName = null;
  const imports = [];
  const exportsArr = [];
  const records = [];
  const functions = [];
  const values = [];
  const macros = [];

  const addImports = (form) => {
    for (const spec of form.slice(1)) { const nm = specName(spec); if (nm) imports.push(nm); }
  };

  const handle = (form) => {
    if (!Array.isArray(form) || form.length === 0) return;
    const head = form[0];
    if (typeof head !== 'string') return;

    // Containers: recurse into their bodies (module name captured from the first such form).
    if (head === 'define-library' || head === 'library' || head === 'module') {
      const id = form[1];
      if (!moduleName) {
        if (Array.isArray(id)) moduleName = id.filter((x) => typeof x === 'string').join(' ');
        else if (typeof id === 'string') moduleName = id;
      }
      for (const sub of form.slice(2)) handle(sub);
      return;
    }
    if (head === 'begin') { for (const sub of form.slice(1)) handle(sub); return; }

    if (IMPORT_HEADS.has(head)) { addImports(form); return; }
    if (head === 'export' || head === 'provide') {
      for (const spec of form.slice(1)) { const nm = specName(spec); if (nm) exportsArr.push(nm); }
      return;
    }

    if (head === 'define-record-type') {
      // (define-record-type type (constructor field...) predicate (field accessor [mod])...)
      const id = form[1];
      let name = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : null;
      if (typeof name === 'string') name = name.replace(/^<|>$/g, '');
      const fields = form.slice(4)
        .map((spec) => (Array.isArray(spec) ? spec[0] : spec))
        .filter((f) => typeof f === 'string');
      if (name) records.push({ name, fields });
      return;
    }

    if (head === 'define-syntax-rule') {
      const sig = form[1];
      if (Array.isArray(sig) && typeof sig[0] === 'string') macros.push({ name: sig[0], params: paramNames(sig.slice(1)) });
      return;
    }
    if (head === 'define-syntax' || head === 'define-syntaxes' || head === 'let-syntax' || head === 'letrec-syntax') {
      const id = form[1];
      const name = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : null;
      if (typeof name === 'string') macros.push({ name, params: Array.isArray(id) ? paramNames(id.slice(1)) : [] });
      return;
    }

    if (head === 'define') {
      const id = form[1];
      if (Array.isArray(id)) {
        // (define (name args...) ...) — possibly curried ((name a) b)
        let h = id, depth = 0;
        while (Array.isArray(h[0])) { h = h[0]; depth++; }
        const name = typeof h[0] === 'string' ? h[0] : null;
        if (name) functions.push({ name, params: paramNames(id.slice(1)), curried: depth > 0 });
        return;
      }
      if (typeof id === 'string') {
        const rhs = form[2];
        if (Array.isArray(rhs) && typeof rhs[0] === 'string' && LAMBDAS.has(rhs[0])) {
          functions.push({ name: id, params: formalsToParams(rhs[1]) });
        } else {
          values.push({ name: id });
        }
      }
      return;
    }
  };

  for (const form of readForms(src)) handle(form);

  const dedupe = (a) => [...new Set(a)];
  return {
    moduleName,
    isModule: /\(\s*(?:define-library|library|module)\b/.test(src),
    imports: dedupe(imports),
    exports: dedupe(exportsArr),
    records,
    functions,
    values,
    macros,
  };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'scm-section';
  const hd = document.createElement('div');
  hd.className = 'scm-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'scm-list'; sec.appendChild(ul); return ul; }
function tag(cls, t) { return `<span class="scm-tag ${cls}">${esc(t)}</span>`; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
function paramsHtml(params) {
  if (!params.length) return '<span class="scm-param">()</span>';
  return '<span class="scm-param">(' + params.map(esc).join(' ') + ')</span>';
}
function capped(ul, items, max, render) {
  for (const it of items.slice(0, max)) render(it);
  if (items.length > max) row(ul, `<span class="scm-more">… and ${items.length - max} more</span>`);
}

export async function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').split('/').pop();

  const facts = analyzeScheme(text);
  const { moduleName, isModule, imports, exports, records, functions, values, macros } = facts;

  // Clearly-not-Scheme guard.
  const looksScheme = /\(\s*(?:define|define-library|define-record-type|define-syntax|import|require|lambda)\b/.test(text.slice(0, 4000));
  if (!looksScheme) return null;

  const host = document.createElement('div');
  host.className = 'scm-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'scm-title';
  const badge = document.createElement('span');
  badge.className = 'scm-badge';
  badge.textContent = isModule ? 'Scheme Library' : 'Scheme Script';
  title.appendChild(badge);
  const nm = document.createElement('span');
  nm.className = 'scm-pkg';
  nm.textContent = moduleName || name;
  title.appendChild(nm);
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'scm-sub';
  const plural = (k, w) => k && `${k} ${w}${k !== 1 ? 's' : ''}`;
  sub.textContent = [
    plural(functions.length, 'function'),
    plural(macros.length, 'macro'),
    plural(records.length, 'record'),
    plural(values.length, 'value'),
    plural(imports.length, 'import'),
    plural(exports.length, 'export'),
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'scm-cards';
  for (const { value, label } of [
    { value: functions.length, label: 'Functions' },
    { value: macros.length, label: 'Macros' },
    { value: records.length, label: 'Records' },
    { value: values.length, label: 'Values' },
    { value: imports.length, label: 'Imports' },
  ]) {
    const card = document.createElement('div');
    card.className = 'scm-card';
    const st = document.createElement('strong'); st.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(st); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (functions.length) {
    const ul = makeList(makeSection(host, `Functions (${functions.length})`));
    capped(ul, functions, 30, (f) => {
      const cur = f.curried ? tag('scm-tag', 'curried') + ' ' : '';
      row(ul, `${cur}${tag('scm-tag-fn', 'fn')} <span class="scm-name">${esc(f.name)}</span> ${paramsHtml(f.params)}`);
    });
  }
  if (macros.length) {
    const ul = makeList(makeSection(host, `Macros (${macros.length})`));
    for (const m of macros) {
      const p = m.params.length ? ' ' + paramsHtml(m.params) : '';
      row(ul, `${tag('scm-tag-macro', 'macro')} <span class="scm-name">${esc(m.name)}</span>${p}`);
    }
  }
  if (records.length) {
    const ul = makeList(makeSection(host, `Records (${records.length})`));
    for (const r of records) {
      const fields = r.fields.length
        ? ` <span class="scm-field">(${r.fields.map(esc).join(' ')})</span>`
        : '';
      row(ul, `${tag('scm-tag-rec', 'record')} <span class="scm-name">${esc(r.name)}</span>${fields}`);
    }
  }
  if (values.length) {
    const ul = makeList(makeSection(host, `Values (${values.length})`));
    capped(ul, values, 20, (v) => row(ul, `${tag('scm-tag-val', 'val')} <span class="scm-name">${esc(v.name)}</span>`));
  }
  if (imports.length) {
    const ul = makeList(makeSection(host, `Imports (${imports.length})`));
    capped(ul, imports, 20, (im) => row(ul, `${tag('scm-tag-import', 'import')} ${esc(im)}`));
  }
  if (exports.length) {
    const ul = makeList(makeSection(host, `Exports (${exports.length})`));
    capped(ul, exports, 30, (ex) => row(ul, `${tag('scm-tag-export', 'export')} ${esc(ex)}`));
  }

  return { parentNode: host };
}
