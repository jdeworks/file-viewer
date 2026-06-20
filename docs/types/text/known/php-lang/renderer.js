const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.php-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.php-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#4f5b93;color:#fff;vertical-align:middle;margin-right:8px;}
.php-badge-sub{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#e8eaf6;color:#4f5b93;vertical-align:middle;margin-left:6px;}
.php-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.php-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.php-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.php-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.php-card strong{display:block;font-size:1.2rem;font-weight:700;}
.php-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.php-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.php-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.php-list{margin:0;padding:0;list-style:none;}
.php-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.php-list li:last-child{border-bottom:none;}
.php-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#e8eaf6;color:#4f5b93;font-weight:700;}
.php-tag-class{background:#dcfce7;color:#166534;}
.php-tag-interface{background:#fef3c7;color:#92400e;}
.php-tag-trait{background:#fde8e8;color:#cc342d;}
.php-tag-abstract{background:#ede9fe;color:#7f52ff;}
.php-tag-enum{background:#fef9c3;color:#713f12;}
.php-tag-private{background:#fee2e2;color:#b91c1c;}
.php-tag-protected{background:#fef3c7;color:#92400e;}
.php-tag-public{background:#dcfce7;color:#166534;}
.php-tag-static{background:#e0f2fe;color:#075985;}
.php-tag-use{background:#f3e8ff;color:#7e22ce;}
.php-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.php-kw{color:#4f5b93;font-weight:600;}
.php-str{color:#0a6640;}
.php-comment{color:#6e7781;font-style:italic;}
.php-var{color:#005cc5;}
.php-num{color:#b45309;}
.php-tag-inline{color:#c026d3;font-weight:600;}
`;

const PHP_KEYWORDS = new Set([
  'namespace', 'use', 'class', 'interface', 'trait', 'abstract', 'final',
  'extends', 'implements', 'public', 'protected', 'private', 'static', 'readonly',
  'function', 'return', 'if', 'else', 'elseif', 'while', 'for', 'foreach', 'do',
  'switch', 'case', 'default', 'break', 'continue', 'throw', 'try', 'catch',
  'finally', 'new', 'echo', 'print', 'require', 'require_once', 'include',
  'include_once', 'const', 'define', 'enum', 'match', 'fn', 'null', 'true', 'false',
  'array', 'list', 'string', 'int', 'float', 'bool', 'void', 'mixed', 'never',
  'self', 'parent', 'static', 'yield', 'from',
]);

function analyzePhp(text) {
  const lines = text.split(/\r?\n/);
  let namespace = null;
  const uses = [];
  const types = []; // classes, interfaces, traits, enums, abstract classes
  const functions = [];
  const constants = [];
  const includes = [];
  let inBlockComment = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Block comment handling
    if (inBlockComment) {
      if (trimmed.includes('*/')) inBlockComment = false;
      continue;
    }
    if (trimmed.startsWith('/*') || trimmed.startsWith('/**')) {
      inBlockComment = !trimmed.includes('*/');
      continue;
    }
    if (trimmed.startsWith('//') || trimmed.startsWith('#')) continue;

    // Namespace
    const nsM = trimmed.match(/^namespace\s+([\w\\]+)/);
    if (nsM && !namespace) { namespace = nsM[1]; continue; }

    // Use statements
    const useM = trimmed.match(/^use\s+(function\s+|const\s+)?([\w\\]+)(?:\s+as\s+(\w+))?;/);
    if (useM) {
      const kind = useM[1] ? useM[1].trim() : 'class';
      const name = useM[2];
      const alias = useM[3] || null;
      uses.push({ kind, name, alias });
      continue;
    }

    // Class / interface / trait / abstract / enum
    const typeM = trimmed.match(/^(?:(abstract|final)\s+)?(class|interface|trait|enum)\s+(\w+)(?:\s+extends\s+([\w\\,\s]+?))?(?:\s+implements\s+([\w\\,\s]+?))?(?:\s*[{:]|$)/);
    if (typeM) {
      types.push({
        modifier: typeM[1] || null,
        kind: typeM[2],
        name: typeM[3],
        extends: typeM[4] ? typeM[4].trim() : null,
        implements: typeM[5] ? typeM[5].trim() : null,
      });
      continue;
    }

    // Functions (including methods)
    const fnM = trimmed.match(/^(?:(public|protected|private)\s+)?(?:(static)\s+)?(?:(abstract|final)\s+)?function\s+(\w+)\s*\(/);
    if (fnM) {
      functions.push({
        visibility: fnM[1] || 'public',
        isStatic: Boolean(fnM[2]),
        modifier: fnM[3] || null,
        name: fnM[4],
      });
      continue;
    }

    // Constants
    const constM = trimmed.match(/^(?:(?:public|protected|private)\s+)?const\s+(\w+)\s*=/);
    if (constM) { constants.push(constM[1]); continue; }

    // Require / include
    const incM = trimmed.match(/^(require|require_once|include|include_once)\s*[\(]?\s*['"]([^'"]+)['"]/);
    if (incM) { includes.push({ kind: incM[1], path: incM[2] }); continue; }
  }

  // Check for HTML template indicators
  const hasHtml = /<html[\s>]/i.test(text) || /<\/div>/i.test(text) || /<!DOCTYPE/i.test(text);
  const hasEnum = /\benum\s+\w+/.test(text);

  return { namespace, uses, types, functions, constants, includes, hasHtml, hasEnum };
}

function highlightPhp(text) {
  const lines = text.split(/\r?\n/);
  const result = [];
  let inBlockComment = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (inBlockComment) {
      result.push('<span class="php-comment">' + esc(line) + '</span>');
      if (line.includes('*/')) inBlockComment = false;
      continue;
    }

    if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
      result.push('<span class="php-comment">' + esc(line) + '</span>');
      continue;
    }
    if (trimmed.startsWith('/*') || trimmed.startsWith('/**')) {
      result.push('<span class="php-comment">' + esc(line) + '</span>');
      if (!line.includes('*/')) inBlockComment = true;
      continue;
    }

    let out = '';
    let i = 0;
    while (i < line.length) {
      // PHP tags
      if (line.slice(i, i + 5) === '<?php' || line.slice(i, i + 2) === '<?') {
        const end = line.indexOf('?>', i);
        if (end !== -1) {
          out += '<span class="php-tag-inline">' + esc(line.slice(i, end + 2)) + '</span>';
          i = end + 2; continue;
        }
        out += '<span class="php-tag-inline">' + esc(line.slice(i)) + '</span>';
        break;
      }
      // Inline comment
      if (line[i] === '/' && line[i + 1] === '/') {
        out += '<span class="php-comment">' + esc(line.slice(i)) + '</span>';
        break;
      }
      // Variable
      if (line[i] === '$' && i + 1 < line.length && /[A-Za-z_]/.test(line[i + 1])) {
        let j = i + 1;
        while (j < line.length && /\w/.test(line[j])) j++;
        out += '<span class="php-var">' + esc(line.slice(i, j)) + '</span>';
        i = j; continue;
      }
      // String double-quoted
      if (line[i] === '"') {
        let j = i + 1;
        while (j < line.length && line[j] !== '"') { if (line[j] === '\\') j++; j++; }
        j++;
        out += '<span class="php-str">' + esc(line.slice(i, j)) + '</span>';
        i = j; continue;
      }
      // String single-quoted
      if (line[i] === "'") {
        let j = i + 1;
        while (j < line.length && line[j] !== "'") { if (line[j] === '\\') j++; j++; }
        j++;
        out += '<span class="php-str">' + esc(line.slice(i, j)) + '</span>';
        i = j; continue;
      }
      // Numbers
      if (/[0-9]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[0-9._xXbBoO]/.test(line[j])) j++;
        out += '<span class="php-num">' + esc(line.slice(i, j)) + '</span>';
        i = j; continue;
      }
      // Identifiers / keywords
      if (/[A-Za-z_]/.test(line[i])) {
        let j = i;
        while (j < line.length && /\w/.test(line[j])) j++;
        const word = line.slice(i, j);
        if (PHP_KEYWORDS.has(word)) {
          out += '<span class="php-kw">' + esc(word) + '</span>';
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
  sec.className = 'php-section';
  const hd = document.createElement('div');
  hd.className = 'php-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'php-list';
  sec.appendChild(ul);
  return ul;
}

export async function render(intake) {
  const text = intake.text || '';
  const filename = (intake.name || intake.filename || '').split('/').pop().toLowerCase();

  const { namespace, uses, types, functions, constants, includes, hasHtml, hasEnum } = analyzePhp(text);

  // Badge
  let badgeLabel = 'PHP Script';
  if (hasEnum) badgeLabel = 'PHP 8';
  else if (types.some((t) => t.kind === 'class' || t.kind === 'abstract')) badgeLabel = 'PHP Class';
  else if (hasHtml) badgeLabel = 'PHP Template';

  const host = document.createElement('div');
  host.className = 'php-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'php-title';
  title.innerHTML = '<span class="php-badge">PHP</span><span class="php-badge-sub">' + esc(badgeLabel) + '</span>';
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'php-sub';
  const parts = [];
  if (namespace) parts.push('namespace ' + namespace);
  parts.push(`${types.length} type${types.length !== 1 ? 's' : ''}`);
  parts.push(`${functions.length} function${functions.length !== 1 ? 's' : ''}`);
  if (uses.length) parts.push(`${uses.length} use${uses.length !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'php-cards';
  const cardItems = [
    { value: namespace || '—', label: 'Namespace' },
    { value: types.length, label: 'Types' },
    { value: functions.length, label: 'Functions' },
    { value: uses.length, label: 'Uses' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'php-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Types
  if (types.length > 0) {
    const sec = makeSection(host, `Types (${types.length})`);
    const ul = makeList(sec);
    for (const { modifier, kind, name, extends: ext, implements: impl } of types) {
      const li = document.createElement('li');
      if (modifier) {
        const tag = document.createElement('span');
        tag.className = 'php-tag php-tag-abstract';
        tag.textContent = modifier;
        li.appendChild(tag);
        li.appendChild(document.createTextNode(' '));
      }
      const kindTag = document.createElement('span');
      kindTag.className = 'php-tag php-tag-' + (kind === 'class' ? 'class' : kind === 'interface' ? 'interface' : kind === 'trait' ? 'trait' : 'enum');
      kindTag.textContent = kind;
      li.appendChild(kindTag);
      li.appendChild(document.createTextNode(' ' + name));
      if (ext) li.appendChild(document.createTextNode(' extends ' + ext));
      if (impl) li.appendChild(document.createTextNode(' implements ' + impl));
      ul.appendChild(li);
    }
  }

  // Use statements
  if (uses.length > 0) {
    const MAX = 8;
    const sec = makeSection(host, `Use Declarations (${uses.length})`);
    const ul = makeList(sec);
    for (const { kind, name, alias } of uses.slice(0, MAX)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'php-tag php-tag-use';
      tag.textContent = kind;
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + name + (alias ? ' as ' + alias : '')));
      ul.appendChild(li);
    }
    if (uses.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${uses.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Functions
  if (functions.length > 0) {
    const sec = makeSection(host, `Functions (${functions.length})`);
    const ul = makeList(sec);
    for (const { visibility, isStatic, modifier, name } of functions) {
      const li = document.createElement('li');
      const visTag = document.createElement('span');
      visTag.className = 'php-tag php-tag-' + visibility;
      visTag.textContent = visibility;
      li.appendChild(visTag);
      if (isStatic) {
        li.appendChild(document.createTextNode(' '));
        const sTag = document.createElement('span');
        sTag.className = 'php-tag php-tag-static';
        sTag.textContent = 'static';
        li.appendChild(sTag);
      }
      li.appendChild(document.createTextNode(' ' + name + '()'));
      ul.appendChild(li);
    }
  }

  // Constants
  if (constants.length > 0) {
    const sec = makeSection(host, `Constants (${constants.length})`);
    const ul = makeList(sec);
    for (const c of constants) {
      const li = document.createElement('li');
      li.textContent = c;
      ul.appendChild(li);
    }
  }

  // Require / include list
  if (includes.length > 0) {
    const sec = makeSection(host, `Includes (${includes.length})`);
    const ul = makeList(sec);
    for (const { kind, path } of includes) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'php-tag';
      tag.textContent = kind;
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + path));
      ul.appendChild(li);
    }
  }

  // Source
  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'php-pre';
  pre.innerHTML = highlightPhp(text);
  srcSec.appendChild(pre);

  return { parentNode: host };
}
