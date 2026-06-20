const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.swift-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.swift-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f05138;color:#fff;vertical-align:middle;margin-right:8px;}
.swift-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.swift-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.swift-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.swift-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.swift-card strong{display:block;font-size:1.2rem;font-weight:700;}
.swift-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.swift-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.swift-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.swift-list{margin:0;padding:0;list-style:none;}
.swift-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;}
.swift-list li:last-child{border-bottom:none;}
.swift-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#fee2e2;color:#991b1b;font-weight:700;}
.swift-tag-struct{background:#dbeafe;color:#1e40af;}
.swift-tag-class{background:#ede9fe;color:#7c3aed;}
.swift-tag-enum{background:#fef3c7;color:#92400e;}
.swift-tag-actor{background:#dcfce7;color:#166534;}
.swift-tag-protocol{background:#fce7f3;color:#9d174d;}
.swift-tag-ext{background:#f0fdf4;color:#15803d;}
.swift-tag-async{background:#e0f2fe;color:#0369a1;}
.swift-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.swift-kw{color:#f05138;font-weight:600;}
.swift-str{color:#0a6640;}
.swift-comment{color:#6e7781;font-style:italic;}
.swift-num{color:#b45309;}
.swift-attr{color:#9333ea;}
`;

const SWIFT_KEYWORDS = new Set([
  'import', 'class', 'struct', 'enum', 'protocol', 'extension', 'func',
  'init', 'deinit', 'var', 'let', 'static', 'final', 'public', 'private',
  'internal', 'open', 'fileprivate', 'override', 'required', 'optional',
  'mutating', 'nonmutating', 'lazy', 'weak', 'unowned', 'inout',
  'return', 'if', 'else', 'guard', 'switch', 'case', 'default', 'for',
  'while', 'repeat', 'do', 'try', 'catch', 'throw', 'throws', 'rethrows',
  'async', 'await', 'actor', 'nil', 'true', 'false', 'self', 'Self',
  'super', 'in', 'where', 'as', 'is', 'typealias', 'associatedtype',
  'defer', 'fallthrough', 'continue', 'break',
]);

function analyzeSwift(text) {
  const lines = text.split(/\r?\n/);
  const imports = [];
  const types = [];
  const funcs = [];
  const extensions = [];
  const propertyWrappers = new Set();
  let asyncCount = 0;
  let isSwiftUI = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

    // Imports
    const impM = trimmed.match(/^import\s+(\w+)/);
    if (impM) {
      const mod = impM[1];
      if (!imports.includes(mod)) imports.push(mod);
      if (mod === 'SwiftUI') isSwiftUI = true;
      continue;
    }

    // Property wrappers @State, @Published, etc.
    const wrapM = trimmed.match(/^@([A-Z]\w*)/);
    if (wrapM) propertyWrappers.add('@' + wrapM[1]);

    // Types: class/struct/enum/actor
    const typeM = trimmed.match(/^(?:(?:public|private|internal|open|fileprivate|final|@\w+\s+)*)(class|struct|enum|actor)\s+(\w+)/);
    if (typeM) {
      types.push({ kind: typeM[1], name: typeM[2] });
      continue;
    }

    // Protocol
    const protoM = trimmed.match(/^(?:(?:public|private|internal|open|fileprivate)\s+)*protocol\s+(\w+)/);
    if (protoM) {
      types.push({ kind: 'protocol', name: protoM[1] });
      continue;
    }

    // Extensions
    const extM = trimmed.match(/^(?:(?:public|private|internal|open|fileprivate)\s+)*extension\s+(\w+)/);
    if (extM) {
      extensions.push(extM[1]);
      continue;
    }

    // Functions
    const funcM = trimmed.match(/^(?:(?:public|private|internal|open|fileprivate|static|final|override|mutating|class)\s+)*(?:(async)\s+)?(?:throws\s+)?func\s+(\w+)/);
    if (funcM) {
      const isAsync = Boolean(funcM[1]);
      funcs.push({ name: funcM[2], async: isAsync });
      if (isAsync) asyncCount++;
      continue;
    }

    // init
    const initM = trimmed.match(/^(?:(?:public|private|internal|required|convenience)\s+)*init\s*[(?]/);
    if (initM) {
      funcs.push({ name: 'init', async: false });
      continue;
    }

    // Count async/await usages
    if (/\bawait\b/.test(trimmed)) asyncCount++;
  }

  return { imports, types, funcs, extensions, propertyWrappers: [...propertyWrappers], asyncCount, isSwiftUI };
}

function highlightSwift(text) {
  return text.split(/\r?\n/).map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) {
      return '<span class="swift-comment">' + esc(line) + '</span>';
    }

    const commentIdx = line.indexOf('//');
    let code = line;
    let suffix = '';
    if (commentIdx !== -1) {
      const before = line.slice(0, commentIdx);
      const qCount = (before.match(/"/g) || []).length;
      if (qCount % 2 === 0) {
        code = line.slice(0, commentIdx);
        suffix = '<span class="swift-comment">' + esc(line.slice(commentIdx)) + '</span>';
      }
    }

    let out = '';
    let i = 0;
    while (i < code.length) {
      // Attribute @
      if (code[i] === '@' && i + 1 < code.length && /[A-Za-z_]/.test(code[i + 1])) {
        let j = i + 1;
        while (j < code.length && /[\w]/.test(code[j])) j++;
        out += '<span class="swift-attr">' + esc(code.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // String
      if (code[i] === '"') {
        let j = i + 1;
        while (j < code.length && code[j] !== '"') {
          if (code[j] === '\\') j++;
          j++;
        }
        j++;
        out += '<span class="swift-str">' + esc(code.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Number
      if (/[0-9]/.test(code[i])) {
        let j = i;
        while (j < code.length && /[0-9._xXeEfFuUlL]/.test(code[j])) j++;
        out += '<span class="swift-num">' + esc(code.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Identifier / keyword
      if (/[A-Za-z_]/.test(code[i])) {
        let j = i;
        while (j < code.length && /[\w]/.test(code[j])) j++;
        const word = code.slice(i, j);
        if (SWIFT_KEYWORDS.has(word)) {
          out += '<span class="swift-kw">' + esc(word) + '</span>';
        } else {
          out += esc(word);
        }
        i = j;
        continue;
      }
      out += esc(code[i]);
      i++;
    }
    return out + suffix;
  }).join('\n');
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'swift-section';
  const hd = document.createElement('div');
  hd.className = 'swift-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'swift-list';
  sec.appendChild(ul);
  return ul;
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const info = analyzeSwift(text);
  const badge = info.isSwiftUI ? 'SwiftUI' : 'Swift';

  const host = document.createElement('div');
  host.className = 'swift-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'swift-title';
  const badgeEl = document.createElement('span');
  badgeEl.className = 'swift-badge';
  badgeEl.textContent = badge;
  title.appendChild(badgeEl);
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'swift-sub';
  sub.textContent = [
    `${info.imports.length} import${info.imports.length !== 1 ? 's' : ''}`,
    `${info.types.length} type${info.types.length !== 1 ? 's' : ''}`,
    `${info.funcs.length} function${info.funcs.length !== 1 ? 's' : ''}`,
    `${info.extensions.length} extension${info.extensions.length !== 1 ? 's' : ''}`,
    info.asyncCount > 0 ? `${info.asyncCount} async` : null,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'swift-cards';
  for (const { value, label } of [
    { value: info.imports.length, label: 'Imports' },
    { value: info.types.length, label: 'Types' },
    { value: info.funcs.length, label: 'Functions' },
    { value: info.extensions.length, label: 'Extensions' },
  ]) {
    const card = document.createElement('div');
    card.className = 'swift-card';
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
  if (info.imports.length > 0) {
    const sec = makeSection(host, `Imports (${info.imports.length})`);
    const ul = makeList(sec);
    for (const imp of info.imports) {
      const li = document.createElement('li');
      li.textContent = imp;
      ul.appendChild(li);
    }
  }

  // Types
  if (info.types.length > 0) {
    const sec = makeSection(host, `Types (${info.types.length})`);
    const ul = makeList(sec);
    for (const { kind, name } of info.types) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'swift-tag swift-tag-' + kind;
      tag.textContent = kind;
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  // Functions
  if (info.funcs.length > 0) {
    const MAX = 8;
    const shown = info.funcs.slice(0, MAX);
    const sec = makeSection(host, `Functions (${info.funcs.length}${info.asyncCount ? `, ${info.asyncCount} async` : ''})`);
    const ul = makeList(sec);
    for (const { name, async: isAsync } of shown) {
      const li = document.createElement('li');
      if (isAsync) {
        const tag = document.createElement('span');
        tag.className = 'swift-tag swift-tag-async';
        tag.textContent = 'async';
        li.appendChild(tag);
        li.appendChild(document.createTextNode(' '));
      }
      li.appendChild(document.createTextNode(name));
      ul.appendChild(li);
    }
    if (info.funcs.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${info.funcs.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Extensions
  if (info.extensions.length > 0) {
    const sec = makeSection(host, `Extensions (${info.extensions.length})`);
    const ul = makeList(sec);
    for (const ext of info.extensions) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'swift-tag swift-tag-ext';
      tag.textContent = 'extension';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + ext));
      ul.appendChild(li);
    }
  }

  // Property wrappers
  if (info.propertyWrappers.length > 0) {
    const sec = makeSection(host, `Property Wrappers (${info.propertyWrappers.length})`);
    const ul = makeList(sec);
    for (const pw of info.propertyWrappers) {
      const li = document.createElement('li');
      li.textContent = pw;
      ul.appendChild(li);
    }
  }

  // Source
  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'swift-pre';
  pre.innerHTML = highlightSwift(text);
  srcSec.appendChild(pre);

  return { parentNode: host };
}
