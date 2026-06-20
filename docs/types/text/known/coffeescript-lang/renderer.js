const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.coffee-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.coffee-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2f2625;color:#c0a060;vertical-align:middle;margin-right:8px;}
.coffee-badge-sub{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#fdf6ec;color:#7c5c2e;vertical-align:middle;margin-left:6px;}
.coffee-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.coffee-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.coffee-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.coffee-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.coffee-card strong{display:block;font-size:1.2rem;font-weight:700;}
.coffee-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.coffee-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.coffee-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.coffee-list{margin:0;padding:0;list-style:none;}
.coffee-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;}
.coffee-list li:last-child{border-bottom:none;}
.coffee-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#fdf6ec;color:#7c5c2e;font-weight:700;}
.coffee-tag-fat{background:#fef3c7;color:#92400e;}
.coffee-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.coffee-kw{color:#2f2625;font-weight:600;}
.coffee-str{color:#0a6640;}
.coffee-comment{color:#6e7781;font-style:italic;}
.coffee-num{color:#b45309;}
.coffee-op{color:#c0a060;font-weight:600;}
`;

const COFFEE_KEYWORDS = new Set([
  'if', 'else', 'unless', 'then', 'and', 'or', 'not', 'is', 'isnt',
  'true', 'false', 'null', 'undefined', 'yes', 'no', 'on', 'off',
  'new', 'return', 'throw', 'try', 'catch', 'finally', 'class', 'extends',
  'super', 'this', 'of', 'in', 'by', 'when', 'switch', 'for', 'while',
  'until', 'loop', 'do', 'break', 'continue', 'delete', 'typeof', 'instanceof',
  'export', 'import', 'default', 'module', 'require',
]);

function analyzeCoffee(text) {
  const lines = text.split(/\r?\n/);
  const classes = [];
  const functions = [];
  const requires = [];
  let hasModuleExports = false;
  let atCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;

    // Classes
    const classM = trimmed.match(/^class\s+(\w+)(?:\s+extends\s+(\w+))?/);
    if (classM) classes.push({ name: classM[1], parent: classM[2] || null });

    // Function definitions (arrow functions -> and fat arrows =>)
    const fnFat = trimmed.match(/^(\w+)\s*[=:]\s*(?:\([^)]*\))?\s*=>/);
    const fnThin = trimmed.match(/^(\w+)\s*[=:]\s*(?:\([^)]*\))?\s*->/);
    // Method definitions inside classes
    const methodFat = trimmed.match(/^\s*(\w+)\s*:\s*(?:\([^)]*\))?\s*=>/);
    const methodThin = trimmed.match(/^\s*(\w+)\s*:\s*(?:\([^)]*\))?\s*->/);

    if (fnFat) functions.push({ name: fnFat[1], fat: true });
    else if (fnThin) functions.push({ name: fnThin[1], fat: false });
    else if (methodFat) functions.push({ name: methodFat[1], fat: true });
    else if (methodThin) functions.push({ name: methodThin[1], fat: false });

    // requires
    const reqM = trimmed.match(/(?:^|\b)require\s+['"]([^'"]+)['"]/);
    if (reqM) requires.push(reqM[1]);
    const reqM2 = trimmed.match(/=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    if (reqM2 && !reqM) requires.push(reqM2[1]);

    // module.exports
    if (/module\.exports/.test(trimmed)) hasModuleExports = true;

    // @ (this) usage
    atCount += (trimmed.match(/@\w+/g) || []).length;
  }

  return { classes, functions, requires, hasModuleExports, atCount };
}

function highlightCoffee(text) {
  const lines = text.split(/\r?\n/);
  const result = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      result.push('<span class="coffee-comment">' + esc(line) + '</span>');
      continue;
    }

    let out = '';
    let i = 0;
    while (i < line.length) {
      if (line[i] === '#') {
        out += '<span class="coffee-comment">' + esc(line.slice(i)) + '</span>';
        break;
      }
      // Strings
      if (line[i] === '"' || line[i] === "'") {
        const q = line[i];
        let j = i + 1;
        while (j < line.length && line[j] !== q) {
          if (line[j] === '\\') j++;
          j++;
        }
        j++;
        out += '<span class="coffee-str">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Numbers
      if (/[0-9]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[0-9._xXbBLl]/.test(line[j])) j++;
        out += '<span class="coffee-num">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Arrow operators
      if ((line[i] === '-' && line[i + 1] === '>') || (line[i] === '=' && line[i + 1] === '>')) {
        out += '<span class="coffee-op">' + esc(line.slice(i, i + 2)) + '</span>';
        i += 2;
        continue;
      }
      // Keywords / identifiers
      if (/[A-Za-z_@]/.test(line[i])) {
        let j = i;
        if (line[j] === '@') j++;
        while (j < line.length && /[\w]/.test(line[j])) j++;
        const word = line.slice(i, j);
        const bare = word.startsWith('@') ? word.slice(1) : word;
        if (COFFEE_KEYWORDS.has(bare)) {
          out += '<span class="coffee-kw">' + esc(word) + '</span>';
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
  sec.className = 'coffee-section';
  const hd = document.createElement('div');
  hd.className = 'coffee-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'coffee-list';
  sec.appendChild(ul);
  return ul;
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').toLowerCase();
  const isLiterate = name.endsWith('.litcoffee') || name.endsWith('.coffee.md');
  const { classes, functions, requires, hasModuleExports, atCount } = analyzeCoffee(text);
  const fatCount = functions.filter((f) => f.fat).length;

  const host = document.createElement('div');
  host.className = 'coffee-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'coffee-title';
  const badge = isLiterate ? 'Literate CoffeeScript' : 'CoffeeScript';
  const sub = isLiterate ? (name.endsWith('.coffee.md') ? '.coffee.md' : '.litcoffee') : '.coffee';
  title.innerHTML = `<span class="coffee-badge">${esc(badge)}</span><span class="coffee-badge-sub">${esc(sub)}</span>`;
  host.appendChild(title);

  // Sub
  const subEl = document.createElement('div');
  subEl.className = 'coffee-sub';
  const parts = [
    `${classes.length} class${classes.length !== 1 ? 'es' : ''}`,
    `${functions.length} function${functions.length !== 1 ? 's' : ''}`,
    `${requires.length} require${requires.length !== 1 ? 's' : ''}`,
  ];
  if (atCount > 0) parts.push(`${atCount} @ usage${atCount !== 1 ? 's' : ''}`);
  subEl.textContent = parts.join(' · ');
  host.appendChild(subEl);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'coffee-cards';
  const cardItems = [
    { value: classes.length, label: 'Classes' },
    { value: functions.length, label: 'Functions' },
    { value: fatCount, label: 'Fat Arrows' },
    { value: requires.length, label: 'Requires' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'coffee-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Classes
  if (classes.length > 0) {
    const sec = makeSection(host, `Classes (${classes.length})`);
    const ul = makeList(sec);
    for (const { name: cname, parent } of classes) {
      const li = document.createElement('li');
      li.textContent = parent ? `${cname} extends ${parent}` : cname;
      ul.appendChild(li);
    }
  }

  // Functions
  if (functions.length > 0) {
    const sec = makeSection(host, `Functions (${functions.length})`);
    const ul = makeList(sec);
    for (const { name: fname, fat } of functions) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = fat ? 'coffee-tag coffee-tag-fat' : 'coffee-tag';
      tag.textContent = fat ? '=>' : '->';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + fname));
      ul.appendChild(li);
    }
  }

  // Requires
  if (requires.length > 0) {
    const MAX = 8;
    const sec = makeSection(host, `Requires (${requires.length})`);
    const ul = makeList(sec);
    for (const r of requires.slice(0, MAX)) {
      const li = document.createElement('li');
      li.textContent = r;
      ul.appendChild(li);
    }
    if (requires.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${requires.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // module.exports badge
  if (hasModuleExports) {
    const note = document.createElement('div');
    note.style.cssText = 'font-size:12px;color:var(--fg-2,#888);margin-bottom:12px;';
    note.textContent = 'Exports: module.exports detected';
    host.appendChild(note);
  }

  // Source
  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'coffee-pre';
  pre.innerHTML = highlightCoffee(text);
  srcSec.appendChild(pre);

  return { parentNode: host };
}
