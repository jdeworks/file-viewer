const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rkt-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.rkt-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#c0392b;color:#fff;vertical-align:middle;margin-right:8px;}
.rkt-badge-sub{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#fdecea;color:#c0392b;vertical-align:middle;margin-left:6px;}
.rkt-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.rkt-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.rkt-lang-pill{display:inline-block;padding:3px 10px;border-radius:6px;font-family:ui-monospace,monospace;font-size:12px;font-weight:700;background:#fdecea;color:#c0392b;margin:0 0 12px;border:1px solid #f5c6c6;}
.rkt-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.rkt-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
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
`;

function analyzeRacket(text) {
  const lines = text.split(/\r?\n/);
  let langDecl = null;
  const requires = [];
  const provides = [];
  const structs = [];
  const fnDefines = [];
  const valDefines = [];
  let macroCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(';')) continue;

    // #lang declaration
    const langM = trimmed.match(/^#lang\s+(.+)/);
    if (langM && !langDecl) { langDecl = langM[1].trim(); continue; }

    // require
    const reqM = trimmed.match(/^\(require\s+(.+)/);
    if (reqM) {
      const specs = reqM[1].match(/[\w./-]+/g) || [];
      for (const s of specs.slice(0, 3)) {
        if (s && !/^\d/.test(s)) requires.push(s);
      }
      continue;
    }

    // provide
    const provM = trimmed.match(/^\(provide\s+(.+)/);
    if (provM) {
      const specs = provM[1].match(/[\w\-!?<>=*+/]+/g) || [];
      for (const s of specs.slice(0, 10)) provides.push(s);
      continue;
    }

    // struct definitions
    const structM = trimmed.match(/^\((?:define-struct|struct)\s+([\w\-]+)/);
    if (structM) { structs.push(structM[1]); continue; }

    // define-syntax / syntax-rules / syntax-case
    if (/^\(define-syntax\b|\(syntax-rules\b|\(syntax-case\b/.test(trimmed)) {
      macroCount++;
      continue;
    }

    // Function defines: (define (name ...)
    const fnM = trimmed.match(/^\(define\s+\(\s*([\w\-!?<>=*+/]+)/);
    if (fnM) { fnDefines.push(fnM[1]); continue; }

    // Lambda defines: (define name (lambda ...)
    const lambdaM = trimmed.match(/^\(define\s+([\w\-!?<>=*+/]+)\s+\(lambda/);
    if (lambdaM) { fnDefines.push(lambdaM[1]); continue; }

    // Value defines: (define name expr)
    const valM = trimmed.match(/^\(define\s+([\w\-!?<>=*+/]+)\s+/);
    if (valM && !fnDefines.includes(valM[1])) { valDefines.push(valM[1]); continue; }
  }

  const isTyped = langDecl && /typed\/racket|typed-racket/i.test(langDecl);

  return {
    langDecl,
    requires: [...new Set(requires)],
    provides: [...new Set(provides)],
    structs,
    fnDefines,
    valDefines,
    macroCount,
    isTyped,
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

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'rkt-list';
  sec.appendChild(ul);
  return ul;
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').split('/').pop();
  const { langDecl, requires, provides, structs, fnDefines, valDefines, macroCount, isTyped } = analyzeRacket(text);

  const host = document.createElement('div');
  host.className = 'rkt-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'rkt-title';
  const badge = document.createElement('span');
  badge.className = 'rkt-badge';
  badge.textContent = isTyped ? 'Typed Racket' : 'Racket Module';
  title.appendChild(badge);
  const sub1 = document.createElement('span');
  sub1.className = 'rkt-badge-sub';
  sub1.textContent = name;
  title.appendChild(sub1);
  host.appendChild(title);

  // #lang pill
  if (langDecl) {
    const pill = document.createElement('div');
    pill.className = 'rkt-lang-pill';
    pill.textContent = '#lang ' + langDecl;
    host.appendChild(pill);
  }

  // Sub line
  const sub = document.createElement('div');
  sub.className = 'rkt-sub';
  const parts = [];
  if (requires.length) parts.push(`${requires.length} require${requires.length !== 1 ? 's' : ''}`);
  if (provides.length) parts.push(`${provides.length} provide${provides.length !== 1 ? 's' : ''}`);
  if (structs.length) parts.push(`${structs.length} struct${structs.length !== 1 ? 's' : ''}`);
  parts.push(`${fnDefines.length} fn${fnDefines.length !== 1 ? 's' : ''}`);
  parts.push(`${valDefines.length} val${valDefines.length !== 1 ? 's' : ''}`);
  if (macroCount) parts.push(`${macroCount} macro${macroCount !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'rkt-cards';
  const cardItems = [
    { value: fnDefines.length, label: 'Functions' },
    { value: requires.length, label: 'Requires' },
    { value: provides.length, label: 'Provides' },
    { value: structs.length, label: 'Structs' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'rkt-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Requires
  if (requires.length > 0) {
    const MAX = 15;
    const sec = makeSection(host, `Requires (${requires.length})`);
    const ul = makeList(sec);
    for (const r of requires.slice(0, MAX)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'rkt-tag rkt-tag-req';
      tag.textContent = 'require';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + r));
      ul.appendChild(li);
    }
    if (requires.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${requires.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Provides
  if (provides.length > 0) {
    const MAX = 15;
    const sec = makeSection(host, `Provides (${provides.length})`);
    const ul = makeList(sec);
    for (const p of provides.slice(0, MAX)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'rkt-tag rkt-tag-prov';
      tag.textContent = 'provide';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + p));
      ul.appendChild(li);
    }
    if (provides.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${provides.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Structs
  if (structs.length > 0) {
    const sec = makeSection(host, `Structs (${structs.length})`);
    const ul = makeList(sec);
    for (const s of structs) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'rkt-tag rkt-tag-struct';
      tag.textContent = 'struct';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + s));
      ul.appendChild(li);
    }
  }

  // Function defines
  if (fnDefines.length > 0) {
    const MAX = 20;
    const sec = makeSection(host, `Functions (${fnDefines.length}${macroCount ? `, ${macroCount} macro${macroCount !== 1 ? 's' : ''}` : ''})`);
    const ul = makeList(sec);
    for (const fn of fnDefines.slice(0, MAX)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'rkt-tag rkt-tag-fn';
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
    const MAX = 10;
    const sec = makeSection(host, `Values (${valDefines.length})`);
    const ul = makeList(sec);
    for (const v of valDefines.slice(0, MAX)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'rkt-tag rkt-tag-val';
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

  return { parentNode: host };
}
