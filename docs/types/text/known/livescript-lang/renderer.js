const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ls-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.ls-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a3a5c;color:#7ec8e3;vertical-align:middle;margin-right:8px;}
.ls-badge-sub{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#e8f4fb;color:#1a3a5c;vertical-align:middle;margin-left:6px;}
.ls-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ls-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ls-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.ls-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.ls-card strong{display:block;font-size:1.2rem;font-weight:700;}
.ls-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.ls-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.ls-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.ls-list{margin:0;padding:0;list-style:none;}
.ls-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;}
.ls-list li:last-child{border-bottom:none;}
.ls-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#e8f4fb;color:#1a3a5c;font-weight:700;}
.ls-tag-fat{background:#fef3c7;color:#92400e;}
.ls-tag-back{background:#dcfce7;color:#166534;}
.ls-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.ls-kw{color:#1a3a5c;font-weight:600;}
.ls-str{color:#0a6640;}
.ls-comment{color:#6e7781;font-style:italic;}
.ls-num{color:#b45309;}
.ls-op{color:#7ec8e3;font-weight:600;}
`;

const LS_KEYWORDS = new Set([
  'if', 'else', 'unless', 'then', 'and', 'or', 'not', 'is', 'isnt',
  'true', 'false', 'null', 'undefined', 'yes', 'no', 'on', 'off',
  'new', 'return', 'throw', 'try', 'catch', 'finally', 'class', 'extends',
  'super', 'this', 'of', 'in', 'by', 'when', 'switch', 'for', 'while',
  'until', 'loop', 'do', 'break', 'continue', 'delete', 'typeof', 'instanceof',
  'export', 'import', 'require', 'mixin', 'implements',
  'let', 'const', 'var', 'function',
]);

function analyzeLS(text) {
  const lines = text.split(/\r?\n/);
  const classes = [];
  const mixins = [];
  const functions = [];
  const requires = [];
  let backCallCount = 0;
  let hasPrelude = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;

    // Classes
    const classM = trimmed.match(/^class\s+(\w+)(?:\s+(?:extends|implements)\s+(\w+))?/);
    if (classM) classes.push({ name: classM[1], parent: classM[2] || null });

    // Mixins
    const mixinM = trimmed.match(/^(\w+)\s*=\s*mixin\b/);
    if (mixinM) mixins.push(mixinM[1]);

    // Function definitions with -> and ~> (fat arrow in LS)
    const fnFat = trimmed.match(/^(\w+)\s*[=:]\s*(?:\([^)]*\))?\s*~>/);
    const fnThin = trimmed.match(/^(\w+)\s*[=:]\s*(?:\([^)]*\))?\s*->/);
    const namedFn = trimmed.match(/^function\s+(\w+)/);

    if (fnFat) functions.push({ name: fnFat[1], fat: true });
    else if (fnThin) functions.push({ name: fnThin[1], fat: false });
    else if (namedFn) functions.push({ name: namedFn[1], fat: false });

    // require
    const reqM = trimmed.match(/require\s+['"]([^'"]+)['"]/);
    if (reqM) {
      requires.push(reqM[1]);
      if (/prelude/.test(reqM[1])) hasPrelude = true;
    }
    const reqM2 = trimmed.match(/=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    if (reqM2 && !reqM) {
      requires.push(reqM2[1]);
      if (/prelude/.test(reqM2[1])) hasPrelude = true;
    }

    // backCall <- usage
    backCallCount += (trimmed.match(/<-/g) || []).length;
  }

  return { classes, mixins, functions, requires, backCallCount, hasPrelude };
}

function highlightLS(text) {
  const lines = text.split(/\r?\n/);
  const result = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      result.push('<span class="ls-comment">' + esc(line) + '</span>');
      continue;
    }

    let out = '';
    let i = 0;
    while (i < line.length) {
      if (line[i] === '#') {
        out += '<span class="ls-comment">' + esc(line.slice(i)) + '</span>';
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
        out += '<span class="ls-str">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Numbers
      if (/[0-9]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[0-9._xXbBLl]/.test(line[j])) j++;
        out += '<span class="ls-num">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // backCall <-
      if (line[i] === '<' && line[i + 1] === '-') {
        out += '<span class="ls-op">&lt;-</span>';
        i += 2;
        continue;
      }
      // Fat arrow ~>
      if (line[i] === '~' && line[i + 1] === '>') {
        out += '<span class="ls-op">~&gt;</span>';
        i += 2;
        continue;
      }
      // Thin arrow ->
      if (line[i] === '-' && line[i + 1] === '>') {
        out += '<span class="ls-op">-&gt;</span>';
        i += 2;
        continue;
      }
      // Keywords / identifiers
      if (/[A-Za-z_]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[\w]/.test(line[j])) j++;
        const word = line.slice(i, j);
        if (LS_KEYWORDS.has(word)) {
          out += '<span class="ls-kw">' + esc(word) + '</span>';
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
  sec.className = 'ls-section';
  const hd = document.createElement('div');
  hd.className = 'ls-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'ls-list';
  sec.appendChild(ul);
  return ul;
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const { classes, mixins, functions, requires, backCallCount, hasPrelude } = analyzeLS(text);
  const fatCount = functions.filter((f) => f.fat).length;

  const host = document.createElement('div');
  host.className = 'ls-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'ls-title';
  title.innerHTML = '<span class="ls-badge">LiveScript</span><span class="ls-badge-sub">.ls</span>';
  host.appendChild(title);

  // Sub
  const subEl = document.createElement('div');
  subEl.className = 'ls-sub';
  const parts = [
    `${classes.length} class${classes.length !== 1 ? 'es' : ''}`,
    `${functions.length} function${functions.length !== 1 ? 's' : ''}`,
    `${requires.length} require${requires.length !== 1 ? 's' : ''}`,
  ];
  if (backCallCount > 0) parts.push(`${backCallCount} backCall${backCallCount !== 1 ? 's' : ''}`);
  if (hasPrelude) parts.push('prelude.ls');
  subEl.textContent = parts.join(' · ');
  host.appendChild(subEl);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'ls-cards';
  const cardItems = [
    { value: classes.length, label: 'Classes' },
    { value: functions.length, label: 'Functions' },
    { value: fatCount, label: 'Fat Arrows (~>)' },
    { value: backCallCount, label: 'BackCalls (<-)' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'ls-card';
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

  // Mixins
  if (mixins.length > 0) {
    const sec = makeSection(host, `Mixins (${mixins.length})`);
    const ul = makeList(sec);
    for (const m of mixins) {
      const li = document.createElement('li');
      li.textContent = m;
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
      tag.className = fat ? 'ls-tag ls-tag-fat' : 'ls-tag';
      tag.textContent = fat ? '~>' : '->';
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

  // prelude.ls note
  if (hasPrelude) {
    const note = document.createElement('div');
    note.style.cssText = 'font-size:12px;color:var(--fg-2,#888);margin-bottom:12px;';
    note.textContent = 'Uses prelude.ls (functional utility library)';
    host.appendChild(note);
  }

  // Source
  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'ls-pre';
  pre.innerHTML = highlightLS(text);
  srcSec.appendChild(pre);

  return { parentNode: host };
}
