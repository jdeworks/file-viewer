const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.scm-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.scm-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#6a1b9a;color:#fff;vertical-align:middle;margin-right:8px;}
.scm-badge-sub{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#f3e5f5;color:#6a1b9a;vertical-align:middle;margin-left:6px;}
.scm-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.scm-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.scm-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.scm-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.scm-card strong{display:block;font-size:1.2rem;font-weight:700;}
.scm-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.scm-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.scm-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.scm-list{margin:0;padding:0;list-style:none;}
.scm-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.scm-list li:last-child{border-bottom:none;}
.scm-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#f3e5f5;color:#6a1b9a;font-weight:700;}
.scm-tag-fn{background:#e8f5e9;color:#1b5e20;}
.scm-tag-val{background:#e3f2fd;color:#1565c0;}
.scm-tag-import{background:#fff8e1;color:#f57f17;}
.scm-hint{font-size:12px;color:var(--fg-2,#888);padding:8px 14px;}
`;

function analyzeScheme(text) {
  const lines = text.split(/\r?\n/);
  let moduleName = null;
  const imports = [];
  const fnDefines = [];
  const valDefines = [];
  let letDepth = 0;
  let maxLetDepth = 0;
  let currentDepth = 0;

  // Extract module/library name
  const libM = text.match(/\(library\s*\(\s*([\w\s-]+?)\s*\)/);
  if (libM) moduleName = libM[1].trim();
  if (!moduleName) {
    const modM = text.match(/\(module\s+([\w\-]+)/);
    if (modM) moduleName = modM[1];
  }

  // Track let depth by scanning parens
  for (const ch of text) {
    if (ch === '(') currentDepth++;
    else if (ch === ')') currentDepth--;
  }

  // Use regex scan for let bindings
  const letMatches = text.matchAll(/\(\s*(?:let\*?|letrec\*?|named-let)\s+/g);
  let letCount = 0;
  for (const _ of letMatches) letCount++;
  maxLetDepth = letCount; // approximation: count of let-forms

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(';')) continue;

    // Imports
    const importM = trimmed.match(/^\(import\s+(.+)/);
    if (importM) {
      // grab the first module name from the import spec
      const specs = importM[1].match(/\([\w\s-]+\)/g) || importM[1].match(/[\w-]+/g) || [];
      for (const s of specs.slice(0, 5)) imports.push(s.replace(/[()]/g, '').trim());
    }
    const useM = trimmed.match(/^\(use-modules\s+(.+)/);
    if (useM) {
      const specs = useM[1].match(/\([\w\s-]+\)/g) || useM[1].match(/[\w-]+/g) || [];
      for (const s of specs.slice(0, 5)) imports.push(s.replace(/[()]/g, '').trim());
    }

    // Function defines: (define (name args...))
    const fnM = trimmed.match(/^\(define\s+\(\s*([\w\-!?<>=*+/]+)/);
    if (fnM) {
      fnDefines.push(fnM[1]);
      continue;
    }

    // Value defines: (define name expr) — but not (define (
    const valM = trimmed.match(/^\(define\s+([\w\-!?<>=*+/]+)\s+(?!\()/);
    if (valM) {
      valDefines.push(valM[1]);
      continue;
    }

    // Lambda defines: (define name (lambda ...))
    const lambdaValM = trimmed.match(/^\(define\s+([\w\-!?<>=*+/]+)\s+\(lambda/);
    if (lambdaValM && !fnDefines.includes(lambdaValM[1])) {
      fnDefines.push(lambdaValM[1]);
    }
  }

  const isModule = /\(library|\(define-library|\(module/.test(text);

  return { moduleName, imports: [...new Set(imports)], fnDefines, valDefines, letCount: maxLetDepth, isModule };
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

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'scm-list';
  sec.appendChild(ul);
  return ul;
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').split('/').pop();
  const { moduleName, imports, fnDefines, valDefines, letCount, isModule } = analyzeScheme(text);

  const host = document.createElement('div');
  host.className = 'scm-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'scm-title';
  const badge = document.createElement('span');
  badge.className = 'scm-badge';
  badge.textContent = isModule ? 'R7RS Module' : 'Scheme Script';
  title.appendChild(badge);
  const sub1 = document.createElement('span');
  sub1.className = 'scm-badge-sub';
  sub1.textContent = moduleName ? moduleName : name;
  title.appendChild(sub1);
  host.appendChild(title);

  // Sub line
  const sub = document.createElement('div');
  sub.className = 'scm-sub';
  const parts = [];
  if (moduleName) parts.push('module: ' + moduleName);
  if (imports.length) parts.push(`${imports.length} import${imports.length !== 1 ? 's' : ''}`);
  parts.push(`${fnDefines.length} function define${fnDefines.length !== 1 ? 's' : ''}`);
  parts.push(`${valDefines.length} value define${valDefines.length !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'scm-cards';
  const cardItems = [
    { value: fnDefines.length, label: 'Functions' },
    { value: valDefines.length, label: 'Values' },
    { value: imports.length, label: 'Imports' },
    { value: letCount, label: 'let-forms' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'scm-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Imports
  if (imports.length > 0) {
    const sec = makeSection(host, `Imports (${imports.length})`);
    const ul = makeList(sec);
    for (const imp of imports) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'scm-tag scm-tag-import';
      tag.textContent = 'import';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + imp));
      ul.appendChild(li);
    }
  }

  // Function defines
  if (fnDefines.length > 0) {
    const MAX = 20;
    const sec = makeSection(host, `Function Defines (${fnDefines.length})`);
    const ul = makeList(sec);
    for (const fn of fnDefines.slice(0, MAX)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'scm-tag scm-tag-fn';
      tag.textContent = 'fn';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + fn));
      ul.appendChild(li);
    }
    if (fnDefines.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${fnDefines.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Value defines
  if (valDefines.length > 0) {
    const MAX = 15;
    const sec = makeSection(host, `Value Defines (${valDefines.length})`);
    const ul = makeList(sec);
    for (const v of valDefines.slice(0, MAX)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'scm-tag scm-tag-val';
      tag.textContent = 'val';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + v));
      ul.appendChild(li);
    }
    if (valDefines.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${valDefines.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Let depth hint
  if (letCount > 0) {
    const hint = document.createElement('div');
    hint.className = 'scm-hint';
    hint.textContent = `let-binding depth hint: ${letCount} let-form${letCount !== 1 ? 's' : ''} (let, let*, letrec, named-let)`;
    host.appendChild(hint);
  }

  return { parentNode: host };
}
