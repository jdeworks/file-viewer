const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rb-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.rb-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#cc342d;color:#fff;vertical-align:middle;margin-right:8px;}
.rb-badge-sub{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#fde8e8;color:#cc342d;vertical-align:middle;margin-left:6px;}
.rb-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.rb-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.rb-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.rb-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.rb-card strong{display:block;font-size:1.2rem;font-weight:700;}
.rb-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.rb-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.rb-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.rb-list{margin:0;padding:0;list-style:none;}
.rb-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;}
.rb-list li:last-child{border-bottom:none;}
.rb-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#fde8e8;color:#cc342d;font-weight:700;}
.rb-tag-private{background:#fef3c7;color:#92400e;}
.rb-tag-protected{background:#dcfce7;color:#166534;}
.rb-tag-attr{background:#ede9fe;color:#7f52ff;}
.rb-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.rb-kw{color:#cc342d;font-weight:600;}
.rb-str{color:#0a6640;}
.rb-comment{color:#6e7781;font-style:italic;}
.rb-sym{color:#005cc5;}
.rb-num{color:#b45309;}
`;

const RB_KEYWORDS = new Set([
  'class', 'module', 'def', 'end', 'do', 'begin', 'rescue', 'ensure', 'raise',
  'if', 'else', 'elsif', 'unless', 'then', 'case', 'when', 'while', 'until',
  'for', 'in', 'return', 'yield', 'self', 'super', 'nil', 'true', 'false',
  'and', 'or', 'not', 'require', 'require_relative', 'include', 'extend',
  'prepend', 'attr_accessor', 'attr_reader', 'attr_writer', 'private',
  'protected', 'public', 'lambda', 'proc', 'new', 'freeze', 'frozen',
]);

function analyzeRuby(text) {
  const lines = text.split(/\r?\n/);
  const modules = [];
  const classes = [];
  const methods = { public: [], private: [], protected: [] };
  const requires = [];
  const mixins = [];
  const attrs = [];
  let visibility = 'public';

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('#')) continue;

    // Module
    const modM = trimmed.match(/^module\s+([\w:]+)/);
    if (modM) { modules.push(modM[1]); continue; }

    // Class with optional inheritance
    const classM = trimmed.match(/^class\s+([\w:]+)(?:\s*<\s*([\w:]+))?/);
    if (classM) { classes.push({ name: classM[1], parent: classM[2] || null }); continue; }

    // Def
    const defM = trimmed.match(/^def\s+(self\.)?(\w+[?!]?)/);
    if (defM) {
      methods[visibility].push((defM[1] ? 'self.' : '') + defM[2]);
      continue;
    }

    // Visibility modifiers (bare)
    if (/^private$/.test(trimmed)) { visibility = 'private'; continue; }
    if (/^protected$/.test(trimmed)) { visibility = 'protected'; continue; }
    if (/^public$/.test(trimmed)) { visibility = 'public'; continue; }

    // Require / require_relative
    const reqM = trimmed.match(/^require(?:_relative)?\s+['"]([^'"]+)['"]/);
    if (reqM) { requires.push({ kind: trimmed.startsWith('require_relative') ? 'relative' : 'require', path: reqM[1] }); continue; }

    // Include / extend / prepend
    const mixM = trimmed.match(/^(include|extend|prepend)\s+([\w:]+)/);
    if (mixM) { mixins.push({ kind: mixM[1], name: mixM[2] }); continue; }

    // attr_accessor / attr_reader / attr_writer
    const attrM = trimmed.match(/^(attr_accessor|attr_reader|attr_writer)\s+(.+)/);
    if (attrM) {
      const names = attrM[2].match(/:(\w+)/g) || [];
      for (const n of names) attrs.push({ kind: attrM[1], name: n.slice(1) });
    }
  }

  return { modules, classes, methods, requires, mixins, attrs };
}

function highlightRuby(text) {
  const lines = text.split(/\r?\n/);
  const result = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('#')) {
      result.push('<span class="rb-comment">' + esc(line) + '</span>');
      continue;
    }

    let out = '';
    let i = 0;
    while (i < line.length) {
      // Inline comment
      if (line[i] === '#') {
        out += '<span class="rb-comment">' + esc(line.slice(i)) + '</span>';
        break;
      }
      // String double-quoted
      if (line[i] === '"') {
        let j = i + 1;
        while (j < line.length && line[j] !== '"') { if (line[j] === '\\') j++; j++; }
        j++;
        out += '<span class="rb-str">' + esc(line.slice(i, j)) + '</span>';
        i = j; continue;
      }
      // String single-quoted
      if (line[i] === "'") {
        let j = i + 1;
        while (j < line.length && line[j] !== "'") { if (line[j] === '\\') j++; j++; }
        j++;
        out += '<span class="rb-str">' + esc(line.slice(i, j)) + '</span>';
        i = j; continue;
      }
      // Symbol
      if (line[i] === ':' && i + 1 < line.length && /[A-Za-z_]/.test(line[i + 1])) {
        let j = i + 1;
        while (j < line.length && /[\w?!]/.test(line[j])) j++;
        out += '<span class="rb-sym">' + esc(line.slice(i, j)) + '</span>';
        i = j; continue;
      }
      // Numbers
      if (/[0-9]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[0-9._xXbBoO]/.test(line[j])) j++;
        out += '<span class="rb-num">' + esc(line.slice(i, j)) + '</span>';
        i = j; continue;
      }
      // Identifiers / keywords
      if (/[A-Za-z_]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[\w?!]/.test(line[j])) j++;
        const word = line.slice(i, j);
        if (RB_KEYWORDS.has(word)) {
          out += '<span class="rb-kw">' + esc(word) + '</span>';
        } else {
          out += esc(word);
        }
        i = j; continue;
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
  sec.className = 'rb-section';
  const hd = document.createElement('div');
  hd.className = 'rb-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'rb-list';
  sec.appendChild(ul);
  return ul;
}

export async function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
  const { modules, classes, methods, requires, mixins, attrs } = analyzeRuby(text);

  // Determine badge
  let badgeLabel = 'Ruby Script';
  if (modules.length > 0) badgeLabel = 'Ruby Module';
  else if (classes.length > 0) badgeLabel = 'Ruby Class';

  const host = document.createElement('div');
  host.className = 'rb-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'rb-title';
  title.innerHTML = '<span class="rb-badge">Ruby</span><span class="rb-badge-sub">' + esc(badgeLabel) + '</span>';
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'rb-sub';
  const totalMethods = methods.public.length + methods.private.length + methods.protected.length;
  const parts = [];
  if (modules.length) parts.push(`${modules.length} module${modules.length !== 1 ? 's' : ''}`);
  if (classes.length) parts.push(`${classes.length} class${classes.length !== 1 ? 'es' : ''}`);
  parts.push(`${totalMethods} method${totalMethods !== 1 ? 's' : ''}`);
  parts.push(`${requires.length} require${requires.length !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'rb-cards';
  const cardItems = [
    { value: modules.length || '—', label: 'Modules' },
    { value: classes.length || '—', label: 'Classes' },
    { value: totalMethods, label: 'Methods' },
    { value: requires.length, label: 'Requires' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'rb-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Modules
  if (modules.length > 0) {
    const sec = makeSection(host, `Modules (${modules.length})`);
    const ul = makeList(sec);
    for (const mod of modules) {
      const li = document.createElement('li');
      li.textContent = mod;
      ul.appendChild(li);
    }
  }

  // Classes
  if (classes.length > 0) {
    const sec = makeSection(host, `Classes (${classes.length})`);
    const ul = makeList(sec);
    for (const { name: cname, parent } of classes) {
      const li = document.createElement('li');
      li.textContent = cname + (parent ? ' < ' + parent : '');
      ul.appendChild(li);
    }
  }

  // Methods grouped by visibility
  const visGroups = [
    { key: 'public', label: 'Public Methods', tagClass: '' },
    { key: 'private', label: 'Private Methods', tagClass: 'rb-tag-private' },
    { key: 'protected', label: 'Protected Methods', tagClass: 'rb-tag-protected' },
  ];
  for (const { key, label, tagClass } of visGroups) {
    const list = methods[key];
    if (list.length === 0) continue;
    const sec = makeSection(host, `${label} (${list.length})`);
    const ul = makeList(sec);
    for (const m of list) {
      const li = document.createElement('li');
      if (tagClass) {
        const tag = document.createElement('span');
        tag.className = 'rb-tag ' + tagClass;
        tag.textContent = key;
        li.appendChild(tag);
        li.appendChild(document.createTextNode(' '));
      }
      li.appendChild(document.createTextNode(m));
      ul.appendChild(li);
    }
  }

  // Requires
  if (requires.length > 0) {
    const MAX = 8;
    const sec = makeSection(host, `Requires (${requires.length})`);
    const ul = makeList(sec);
    for (const { kind, path } of requires.slice(0, MAX)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'rb-tag';
      tag.textContent = kind;
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + path));
      ul.appendChild(li);
    }
    if (requires.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${requires.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Mixins
  if (mixins.length > 0) {
    const sec = makeSection(host, `Mixins (${mixins.length})`);
    const ul = makeList(sec);
    for (const { kind, name: mname } of mixins) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'rb-tag rb-tag-attr';
      tag.textContent = kind;
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + mname));
      ul.appendChild(li);
    }
  }

  // Attrs
  if (attrs.length > 0) {
    const sec = makeSection(host, `Attribute Declarations (${attrs.length})`);
    const ul = makeList(sec);
    for (const { kind, name: aname } of attrs) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'rb-tag rb-tag-attr';
      tag.textContent = kind.replace('attr_', '');
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' :' + aname));
      ul.appendChild(li);
    }
  }

  // Source
  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'rb-pre';
  pre.innerHTML = highlightRuby(text);
  srcSec.appendChild(pre);

  return { parentNode: host };
}
