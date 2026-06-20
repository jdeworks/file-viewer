const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pug-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.pug-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#a86324;color:#fff;vertical-align:middle;margin-right:8px;}
.pug-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.pug-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.pug-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.pug-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.pug-card strong{display:block;font-size:1.2rem;font-weight:700;}
.pug-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.pug-section{margin:16px 0;}
.pug-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.pug-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.pug-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.pug-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.pug-table tr:last-child td{border-bottom:none;}
.pug-pre{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:14px;overflow:auto;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;margin-top:16px;white-space:pre-wrap;word-break:break-word;}
.pug-kw{color:#1d4ed8;font-weight:700;}
.pug-tag{color:#0f766e;font-weight:600;}
.pug-attr{color:#9d174d;}
.pug-str{color:#b91c1c;}
.pug-interp{color:#7c3aed;}
.pug-comment{color:#888;font-style:italic;}
.pug-js{color:#d97706;}
`;

const PUG_KWS = [
  'doctype', 'each', 'in', 'if', 'else', 'unless', 'while',
  'mixin', 'block', 'extends', 'include', 'append', 'prepend',
  'case', 'when', 'default',
];

function parsePug(text) {
  const lines = (text || '').split(/\r?\n/);
  let extendsPath = null;
  const includes = [];
  const mixins = [];
  const blocks = [];
  const varDecls = [];
  let elementCount = 0;

  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('//')) continue;

    // extends
    const extendsMatch = t.match(/^extends\s+(.+)$/);
    if (extendsMatch) extendsPath = extendsMatch[1].trim();

    // include
    const includeMatch = t.match(/^include\s+(.+)$/);
    if (includeMatch && !includes.includes(includeMatch[1].trim())) includes.push(includeMatch[1].trim());

    // mixin
    const mixinMatch = t.match(/^mixin\s+(\w[\w-]*)(?:\s*\(([^)]*)\))?/);
    if (mixinMatch) mixins.push({ name: mixinMatch[1], args: mixinMatch[2] || '' });

    // block
    const blockMatch = t.match(/^block\s+(\w+)/);
    if (blockMatch && !blocks.includes(blockMatch[1])) blocks.push(blockMatch[1]);

    // JS variable declarations: - const/var/let
    const jsMatch = t.match(/^-\s+(const|var|let)\s+(\w+)/);
    if (jsMatch) varDecls.push({ keyword: jsMatch[1], name: jsMatch[2] });

    // HTML element: starts with a tag name or .class or #id (not a keyword or pipe)
    if (/^[a-z][\w-]*(?:[#.(\s]|$)/.test(t) && !PUG_KWS.some((kw) => t === kw || t.startsWith(kw + ' ') || t.startsWith(kw + '('))) {
      elementCount++;
    } else if (/^[.#]/.test(t)) {
      elementCount++;
    }
  }

  return { extendsPath, includes, mixins, blocks, varDecls, elementCount };
}

function highlightPugLine(line) {
  if (!line) return '';
  const t = line.trim();

  // JS code line (starts with -)
  if (t.startsWith('-')) {
    return `<span class="pug-js">${esc(line)}</span>`;
  }
  // Unbuffered comment
  if (t.startsWith('//')) {
    return `<span class="pug-comment">${esc(line)}</span>`;
  }
  // Literal text line
  if (t.startsWith('| ')) {
    return esc(line);
  }

  let out = esc(line);

  // Interpolation #{...}
  out = out.replace(/#\{([^}]*)\}/g, '<span class="pug-interp">#{$1}</span>');
  // String attributes "..." and '...'
  out = out.replace(/(&quot;[^&]*&quot;)/g, '<span class="pug-str">$1</span>');
  out = out.replace(/(&#x27;[^&]*&#x27;)/g, '<span class="pug-str">$1</span>');
  // Attribute names inside parens
  out = out.replace(/\(([^)]*)\)/g, (match, attrs) => {
    const highlighted = attrs.replace(/(\w[\w-]*)(?=\s*=)/g, '<span class="pug-attr">$1</span>');
    return '(' + highlighted + ')';
  });

  // Keywords
  const sorted = [...PUG_KWS].sort((a, b) => b.length - a.length);
  for (const kw of sorted) {
    const re = new RegExp(`^(\\s*)(${kw})(?=\\s|$)`, 'gm');
    out = out.replace(re, (m, sp, k) => `${sp}<span class="pug-kw">${k}</span>`);
  }

  // HTML tag names at start of line
  out = out.replace(/^(\s*)([a-z][\w-]*)(?=[#.(\s=]|$)/m, (m, sp, tag) => {
    if (PUG_KWS.some((kw) => kw === tag)) return m;
    return `${sp}<span class="pug-tag">${tag}</span>`;
  });

  return out;
}

export function render(intake) {
  const parsed = parsePug(intake.text || '');
  const { extendsPath, includes, mixins, blocks, varDecls, elementCount } = parsed;

  const host = document.createElement('div');
  host.className = 'pug-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'pug-title';
  title.innerHTML = '<span class="pug-badge">Pug</span>Template';
  host.appendChild(title);

  const parts = [];
  if (extendsPath) parts.push(`extends ${extendsPath}`);
  parts.push(`${includes.length} include${includes.length !== 1 ? 's' : ''}`);
  parts.push(`${mixins.length} mixin${mixins.length !== 1 ? 's' : ''}`);
  if (blocks.length) parts.push(`${blocks.length} block${blocks.length !== 1 ? 's' : ''}`);

  const sub = document.createElement('div');
  sub.className = 'pug-sub';
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'pug-summary';
  const cards = [
    { value: elementCount, label: 'Elements (est.)' },
    { value: mixins.length, label: 'Mixins' },
    { value: blocks.length, label: 'Blocks' },
    { value: includes.length, label: 'Includes' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'pug-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Extends
  if (extendsPath) {
    const sec = document.createElement('div');
    sec.className = 'pug-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Extends';
    sec.appendChild(h3);
    const p = document.createElement('p');
    p.style.fontFamily = 'ui-monospace,monospace';
    p.style.fontSize = '13px';
    p.style.margin = '0';
    p.textContent = extendsPath;
    sec.appendChild(p);
    host.appendChild(sec);
  }

  // Includes
  if (includes.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'pug-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Includes';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'pug-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Path</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const inc of includes.slice(0, 20)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(inc)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Mixins
  if (mixins.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'pug-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Mixins';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'pug-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th><th>Args</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const mx of mixins.slice(0, 30)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(mx.name)}</td><td>${esc(mx.args || '—')}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Blocks
  if (blocks.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'pug-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Blocks';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'pug-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Block name</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const b of blocks.slice(0, 20)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(b)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Variable declarations
  if (varDecls.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'pug-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Variables';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'pug-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Keyword</th><th>Name</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const v of varDecls.slice(0, 20)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(v.keyword)}</td><td>${esc(v.name)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Syntax-highlighted source
  const pre = document.createElement('pre');
  pre.className = 'pug-pre';
  const lines = (intake.text || '').split(/\r?\n/);
  pre.innerHTML = lines.map(highlightPugLine).join('\n');
  host.appendChild(pre);

  return { parentNode: host };
}
