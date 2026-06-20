const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.res-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.res-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e84040;color:#fff;vertical-align:middle;margin-right:8px;}
.res-badge-sub{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#fff0f0;color:#c02020;vertical-align:middle;margin-left:6px;}
.res-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.res-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.res-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.res-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.res-card strong{display:block;font-size:1.2rem;font-weight:700;}
.res-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.res-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.res-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.res-list{margin:0;padding:0;list-style:none;}
.res-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;}
.res-list li:last-child{border-bottom:none;}
.res-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#fff0f0;color:#c02020;font-weight:700;}
.res-tag-fn{background:#e8f4fb;color:#1a3a5c;}
.res-tag-ext{background:#dcfce7;color:#166534;}
.res-tag-jsx{background:#fdf6ec;color:#7c5c2e;}
.res-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.res-kw{color:#e84040;font-weight:600;}
.res-str{color:#0a6640;}
.res-comment{color:#6e7781;font-style:italic;}
.res-num{color:#b45309;}
.res-dec{color:#c026d3;}
`;

const RES_KEYWORDS = new Set([
  'let', 'type', 'module', 'open', 'include', 'external', 'and', 'or', 'not',
  'if', 'else', 'switch', 'when', 'true', 'false', 'exception', 'raise',
  'try', 'with', 'as', 'rec', 'mutable', 'private', 'pub', 'async', 'await',
  'for', 'while', 'in', 'of', 'fun', 'lazy', 'assert', 'return',
]);

function analyzeRes(text) {
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
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

    // Open statements
    const openM = trimmed.match(/^open\s+([\w.]+)/);
    if (openM) opens.push(openM[1]);

    // Type definitions
    const typeM = trimmed.match(/^type\s+(\w+)/);
    if (typeM) types.push(typeM[1]);

    // Let bindings
    const letM = trimmed.match(/^let\s+(?:rec\s+)?(\w+)/);
    if (letM) {
      const isFn = /=\s*(?:\([^)]*\)|[a-z_]\w*)\s*=>/.test(trimmed) || /=\s*\([^)]*\)\s*=>/.test(trimmed);
      lets.push({ name: letM[1], fn: isFn });
    }

    // External declarations
    const extM = trimmed.match(/^external\s+(\w+)/);
    if (extM) externals.push(extM[1]);

    // Module definitions
    const modM = trimmed.match(/^module\s+(\w+)/);
    if (modM && !trimmed.startsWith('module type')) modules.push(modM[1]);

    // Decorators @
    const decM = trimmed.match(/^@(\w+)/);
    if (decM) decorators.push(decM[1]);

    // JSX detection
    if (/\bReact\./.test(trimmed) || /<\w+/.test(trimmed)) isJsx = true;
  }

  return { opens, types, lets, externals, modules, decorators: [...new Set(decorators)], isJsx };
}

function highlightRes(text) {
  const lines = text.split(/\r?\n/);
  const result = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) {
      result.push('<span class="res-comment">' + esc(line) + '</span>');
      continue;
    }

    let out = '';
    let i = 0;
    while (i < line.length) {
      // Line comment //
      if (line[i] === '/' && line[i + 1] === '/') {
        out += '<span class="res-comment">' + esc(line.slice(i)) + '</span>';
        break;
      }
      // Block comment /* */
      if (line[i] === '/' && line[i + 1] === '*') {
        let j = i + 2;
        while (j < line.length && !(line[j] === '*' && line[j + 1] === '/')) j++;
        j += 2;
        out += '<span class="res-comment">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Decorator @
      if (line[i] === '@' && i + 1 < line.length && /[A-Za-z_]/.test(line[i + 1])) {
        let j = i + 1;
        while (j < line.length && /[\w.]/.test(line[j])) j++;
        out += '<span class="res-dec">' + esc(line.slice(i, j)) + '</span>';
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
        out += '<span class="res-str">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Numbers
      if (/[0-9]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[0-9._xXbBLl]/.test(line[j])) j++;
        out += '<span class="res-num">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Keywords
      if (/[A-Za-z_]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[\w]/.test(line[j])) j++;
        const word = line.slice(i, j);
        if (RES_KEYWORDS.has(word)) {
          out += '<span class="res-kw">' + esc(word) + '</span>';
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
  sec.className = 'res-section';
  const hd = document.createElement('div');
  hd.className = 'res-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'res-list';
  sec.appendChild(ul);
  return ul;
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').toLowerCase();
  const isInterface = name.endsWith('.resi');
  const { opens, types, lets, externals, modules, decorators, isJsx } = analyzeRes(text);
  const fnLets = lets.filter((l) => l.fn);
  const valLets = lets.filter((l) => !l.fn);

  const host = document.createElement('div');
  host.className = 'res-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'res-title';
  const badge = isInterface ? 'ReScript Interface' : 'ReScript Module';
  const ext = isInterface ? '.resi' : '.res';
  let titleHtml = `<span class="res-badge">${esc(badge)}</span><span class="res-badge-sub">${esc(ext)}</span>`;
  if (isJsx) titleHtml += '<span class="res-tag res-tag-jsx" style="margin-left:8px;font-size:10px;padding:2px 7px;border-radius:8px;">JSX / React</span>';
  title.innerHTML = titleHtml;
  host.appendChild(title);

  // Sub
  const subEl = document.createElement('div');
  subEl.className = 'res-sub';
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
  cards.className = 'res-cards';
  const cardItems = [
    { value: opens.length, label: 'Opens' },
    { value: types.length, label: 'Types' },
    { value: fnLets.length, label: 'Functions' },
    { value: valLets.length, label: 'Values' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'res-card';
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
      tag.className = fn ? 'res-tag res-tag-fn' : 'res-tag';
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
      tag.className = 'res-tag res-tag-ext';
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
      li.textContent = '@' + d;
      ul.appendChild(li);
    }
  }

  // Source
  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'res-pre';
  pre.innerHTML = highlightRes(text);
  srcSec.appendChild(pre);

  return { parentNode: host };
}
