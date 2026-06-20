const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.re-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.re-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#dd4b39;color:#fff;vertical-align:middle;margin-right:8px;}
.re-badge-sub{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#fdf0ee;color:#a03020;vertical-align:middle;margin-left:6px;}
.re-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.re-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.re-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.re-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.re-card strong{display:block;font-size:1.2rem;font-weight:700;}
.re-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.re-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.re-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.re-list{margin:0;padding:0;list-style:none;}
.re-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;}
.re-list li:last-child{border-bottom:none;}
.re-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#fdf0ee;color:#a03020;font-weight:700;}
.re-tag-fn{background:#e8f4fb;color:#1a3a5c;}
.re-tag-ext{background:#dcfce7;color:#166534;}
.re-tag-jsx{background:#fdf6ec;color:#7c5c2e;}
.re-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.re-kw{color:#dd4b39;font-weight:600;}
.re-str{color:#0a6640;}
.re-comment{color:#6e7781;font-style:italic;}
.re-num{color:#b45309;}
.re-dec{color:#c026d3;}
`;

const RE_KEYWORDS = new Set([
  'let', 'type', 'module', 'open', 'include', 'external', 'and', 'or', 'not',
  'if', 'else', 'switch', 'when', 'true', 'false', 'exception', 'raise',
  'try', 'with', 'as', 'rec', 'mutable', 'pub', 'fun',
  'for', 'while', 'in', 'of', 'lazy', 'assert',
]);

function analyzeReason(text) {
  const lines = text.split(/\r?\n/);
  const opens = [];
  const types = [];
  const lets = [];
  const externals = [];
  const modules = [];
  const decorators = [];
  let isJsx = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;

    // Open statements
    const openM = trimmed.match(/^open\s+([\w.]+)/);
    if (openM) opens.push(openM[1]);

    // Type definitions
    const typeM = trimmed.match(/^type\s+(\w+)/);
    if (typeM) types.push(typeM[1]);

    // Let bindings — in Reason syntax: let name = (args) => ...
    const letM = trimmed.match(/^let\s+(?:rec\s+)?(\w+)/);
    if (letM) {
      // Reason uses (args) => body pattern for functions
      const isFn = /=\s*\([^)]*\)\s*=>/.test(trimmed) || /=\s*\(\)\s*=>/.test(trimmed) || /=\s*\w+\s*=>/.test(trimmed);
      lets.push({ name: letM[1], fn: isFn });
    }

    // External declarations
    const extM = trimmed.match(/^external\s+(\w+)/);
    if (extM) externals.push(extM[1]);

    // Module definitions
    const modM = trimmed.match(/^module\s+(\w+)/);
    if (modM && !trimmed.startsWith('module type')) modules.push(modM[1]);

    // Decorators [@decorator]
    const decM = trimmed.match(/\[@(\w+)/);
    if (decM) decorators.push(decM[1]);

    // JSX / React detection
    if (/\bReact\./.test(trimmed) || /<\w+/.test(trimmed) || /\bReasonReact\./.test(trimmed)) isJsx = true;
  }

  return { opens, types, lets, externals, modules, decorators: [...new Set(decorators)], isJsx };
}

function highlightReason(text) {
  const lines = text.split(/\r?\n/);
  const result = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) {
      result.push('<span class="re-comment">' + esc(line) + '</span>');
      continue;
    }

    let out = '';
    let i = 0;
    while (i < line.length) {
      // Line comment //
      if (line[i] === '/' && line[i + 1] === '/') {
        out += '<span class="re-comment">' + esc(line.slice(i)) + '</span>';
        break;
      }
      // Block comment (* *)
      if (line[i] === '(' && line[i + 1] === '*') {
        let j = i + 2;
        while (j < line.length && !(line[j] === '*' && line[j + 1] === ')')) j++;
        j += 2;
        out += '<span class="re-comment">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Block comment /* */
      if (line[i] === '/' && line[i + 1] === '*') {
        let j = i + 2;
        while (j < line.length && !(line[j] === '*' && line[j + 1] === '/')) j++;
        j += 2;
        out += '<span class="re-comment">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Decorator [@
      if (line[i] === '[' && line[i + 1] === '@') {
        let j = i;
        while (j < line.length && line[j] !== ']') j++;
        j++;
        out += '<span class="re-dec">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Strings
      if (line[i] === '"') {
        let j = i + 1;
        while (j < line.length && line[j] !== '"') {
          if (line[j] === '\\') j++;
          j++;
        }
        j++;
        out += '<span class="re-str">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Numbers
      if (/[0-9]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[0-9._xXbBLl]/.test(line[j])) j++;
        out += '<span class="re-num">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Keywords
      if (/[A-Za-z_]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[\w]/.test(line[j])) j++;
        const word = line.slice(i, j);
        if (RE_KEYWORDS.has(word)) {
          out += '<span class="re-kw">' + esc(word) + '</span>';
        } else {
          out += esc(word);
        }
        i = j;
        continue;
      }
      out += esc(line[i]);
      i++;
    }
    result.push(out);
  }
  return result.join('\n');
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 're-section';
  const hd = document.createElement('div');
  hd.className = 're-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 're-list';
  sec.appendChild(ul);
  return ul;
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').toLowerCase();
  const isInterface = name.endsWith('.rei');
  const { opens, types, lets, externals, modules, decorators, isJsx } = analyzeReason(text);
  const fnLets = lets.filter((l) => l.fn);
  const valLets = lets.filter((l) => !l.fn);

  const host = document.createElement('div');
  host.className = 're-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 're-title';
  const badge = isInterface ? 'Reason Interface' : 'Reason Module';
  const ext = isInterface ? '.rei' : '.re';
  let titleHtml = `<span class="re-badge">${esc(badge)}</span><span class="re-badge-sub">${esc(ext)}</span>`;
  if (isJsx) titleHtml += '<span class="re-tag re-tag-jsx" style="margin-left:8px;font-size:10px;padding:2px 7px;border-radius:8px;">JSX / React</span>';
  title.innerHTML = titleHtml;
  host.appendChild(title);

  // Sub
  const subEl = document.createElement('div');
  subEl.className = 're-sub';
  const parts = [
    `${opens.length} open${opens.length !== 1 ? 's' : ''}`,
    `${types.length} type${types.length !== 1 ? 's' : ''}`,
    `${lets.length} let binding${lets.length !== 1 ? 's' : ''}`,
  ];
  if (externals.length > 0) parts.push(`${externals.length} external${externals.length !== 1 ? 's' : ''}`);
  if (modules.length > 0) parts.push(`${modules.length} module${modules.length !== 1 ? 's' : ''}`);
  subEl.textContent = parts.join(' · ');
  host.appendChild(subEl);

  // Cards
  const cards = document.createElement('div');
  cards.className = 're-cards';
  const cardItems = [
    { value: opens.length, label: 'Opens' },
    { value: types.length, label: 'Types' },
    { value: fnLets.length, label: 'Functions' },
    { value: valLets.length, label: 'Values' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 're-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Opens
  if (opens.length > 0) {
    const sec = makeSection(host, `Opens (${opens.length})`);
    const ul = makeList(sec);
    for (const o of opens) {
      const li = document.createElement('li');
      li.textContent = o;
      ul.appendChild(li);
    }
  }

  // Types
  if (types.length > 0) {
    const sec = makeSection(host, `Types (${types.length})`);
    const ul = makeList(sec);
    for (const t of types) {
      const li = document.createElement('li');
      li.textContent = t;
      ul.appendChild(li);
    }
  }

  // Let bindings
  if (lets.length > 0) {
    const MAX = 10;
    const sec = makeSection(host, `Let Bindings (${lets.length}${fnLets.length ? `, ${fnLets.length} function${fnLets.length !== 1 ? 's' : ''}` : ''})`);
    const ul = makeList(sec);
    for (const { name: lname, fn } of lets.slice(0, MAX)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = fn ? 're-tag re-tag-fn' : 're-tag';
      tag.textContent = fn ? 'fn' : 'val';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + lname));
      ul.appendChild(li);
    }
    if (lets.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${lets.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Externals
  if (externals.length > 0) {
    const sec = makeSection(host, `Externals (${externals.length})`);
    const ul = makeList(sec);
    for (const e of externals) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 're-tag re-tag-ext';
      tag.textContent = 'external';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + e));
      ul.appendChild(li);
    }
  }

  // Modules
  if (modules.length > 0) {
    const sec = makeSection(host, `Modules (${modules.length})`);
    const ul = makeList(sec);
    for (const m of modules) {
      const li = document.createElement('li');
      li.textContent = m;
      ul.appendChild(li);
    }
  }

  // Decorators
  if (decorators.length > 0) {
    const sec = makeSection(host, `Decorators (${decorators.length})`);
    const ul = makeList(sec);
    for (const d of decorators) {
      const li = document.createElement('li');
      li.textContent = '[@' + d + ']';
      ul.appendChild(li);
    }
  }

  // Source
  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 're-pre';
  pre.innerHTML = highlightReason(text);
  srcSec.appendChild(pre);

  return { parentNode: host };
}
