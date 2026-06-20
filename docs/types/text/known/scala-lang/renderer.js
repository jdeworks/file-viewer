const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sc-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.sc-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#dc322f;color:#fff;vertical-align:middle;margin-right:8px;}
.sc-badge-script{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#fee2e2;color:#991b1b;vertical-align:middle;margin-left:6px;}
.sc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.sc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.sc-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.sc-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.sc-card strong{display:block;font-size:1.2rem;font-weight:700;}
.sc-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.sc-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.sc-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.sc-list{margin:0;padding:0;list-style:none;}
.sc-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;}
.sc-list li:last-child{border-bottom:none;}
.sc-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#fee2e2;color:#991b1b;font-weight:700;}
.sc-tag-impl{background:#fef3c7;color:#92400e;}
.sc-tag-ext{background:#dcfce7;color:#166534;}
.sc-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.sc-kw{color:#dc322f;font-weight:600;}
.sc-str{color:#0a6640;}
.sc-comment{color:#6e7781;font-style:italic;}
.sc-num{color:#b45309;}
.sc-type{color:#0369a1;font-weight:600;}
.sc-pkg{font-family:ui-monospace,monospace;font-size:12px;color:#dc322f;font-weight:600;}
`;

const SCALA_KEYWORDS = new Set([
  'package', 'import', 'object', 'class', 'case', 'trait', 'def', 'val', 'var',
  'type', 'sealed', 'abstract', 'final', 'override', 'private', 'public', 'protected',
  'implicit', 'given', 'using', 'extension', 'if', 'else', 'match', 'for', 'yield',
  'while', 'do', 'try', 'catch', 'finally', 'throw', 'return', 'new', 'this', 'super',
  'null', 'true', 'false', 'Unit', 'Any', 'AnyRef', 'Nothing', 'Nil', 'with', 'extends',
]);

function analyzeScala(text) {
  const lines = text.split(/\r?\n/);
  let pkg = null;
  const imports = [];
  const types = []; // classes, objects, traits, case classes
  const defs = [];
  let implicitCount = 0;
  let givenCount = 0;
  let extCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

    // Package
    const pkgM = trimmed.match(/^package\s+([\w.]+)/);
    if (pkgM && !pkg) { pkg = pkgM[1]; continue; }

    // Imports
    const impM = trimmed.match(/^import\s+([\w.*{}=>, ]+)/);
    if (impM) { imports.push(impM[1].trim()); continue; }

    // Types: object, class, case class, trait, sealed trait, abstract class
    const typeM = trimmed.match(/^(?:(?:sealed|abstract|final|open|case|case\s+object)\s+)?(?:class|object|trait|enum)\s+(\w+)/);
    if (typeM) {
      const kindM = trimmed.match(/^((?:(?:sealed|abstract|final|open|case)\s+)?(?:class|object|trait|enum))/);
      types.push({ kind: kindM ? kindM[1] : 'class', name: typeM[1] });
    }

    // Defs
    const defM = trimmed.match(/^(?:(?:private|protected|override|abstract|final|implicit|inline|inline override|transparent)\s+)*def\s+(\w+)/);
    if (defM) {
      defs.push(defM[1]);
    }

    // implicits/givens/extensions
    if (/^implicit\s/.test(trimmed)) implicitCount++;
    if (/^given\s/.test(trimmed)) givenCount++;
    if (/^extension\s*\(/.test(trimmed)) extCount++;
  }

  return { pkg, imports, types, defs, implicitCount, givenCount, extCount };
}

function highlightScala(text) {
  const lines = text.split(/\r?\n/);
  const result = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Full-line comments
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) {
      result.push('<span class="sc-comment">' + esc(line) + '</span>');
      continue;
    }

    let out = '';
    let i = 0;
    while (i < line.length) {
      // Inline comment
      if (line[i] === '/' && line[i + 1] === '/') {
        out += '<span class="sc-comment">' + esc(line.slice(i)) + '</span>';
        break;
      }
      if (line[i] === '/' && line[i + 1] === '*') {
        let j = i + 2;
        while (j < line.length && !(line[j] === '*' && line[j + 1] === '/')) j++;
        j += 2;
        out += '<span class="sc-comment">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // String literals
      if (line[i] === '"') {
        // Triple-quoted strings
        if (line.slice(i, i + 3) === '"""') {
          let j = i + 3;
          while (j < line.length && line.slice(j, j + 3) !== '"""') j++;
          j += 3;
          out += '<span class="sc-str">' + esc(line.slice(i, j)) + '</span>';
          i = j;
          continue;
        }
        let j = i + 1;
        while (j < line.length && line[j] !== '"') {
          if (line[j] === '\\') j++;
          j++;
        }
        j++;
        out += '<span class="sc-str">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Char literals
      if (line[i] === "'") {
        let j = i + 1;
        if (line[j] === '\\') j++;
        j += 2;
        out += '<span class="sc-str">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Numbers
      if (/[0-9]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[0-9._xXbBLlFfuU]/.test(line[j])) j++;
        out += '<span class="sc-num">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Identifiers / keywords
      if (/[A-Za-z_]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[\w]/.test(line[j])) j++;
        const word = line.slice(i, j);
        if (SCALA_KEYWORDS.has(word)) {
          out += '<span class="sc-kw">' + esc(word) + '</span>';
        } else if (/^[A-Z]/.test(word)) {
          out += '<span class="sc-type">' + esc(word) + '</span>';
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
  sec.className = 'sc-section';
  const hd = document.createElement('div');
  hd.className = 'sc-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'sc-list';
  sec.appendChild(ul);
  return ul;
}

export function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').toLowerCase();
  const isScript = name.endsWith('.sc');
  const { pkg, imports, types, defs, implicitCount, givenCount, extCount } = analyzeScala(text);

  const host = document.createElement('div');
  host.className = 'sc-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'sc-title';
  title.innerHTML = '<span class="sc-badge">Scala</span>' + (isScript ? '<span class="sc-badge-script">Script (.sc)</span>' : '<span class="sc-badge-script">Source (.scala)</span>');
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'sc-sub';
  const parts = [];
  if (pkg) parts.push('package ' + pkg);
  parts.push(`${imports.length} import${imports.length !== 1 ? 's' : ''}`);
  parts.push(`${types.length} type${types.length !== 1 ? 's' : ''}`);
  parts.push(`${defs.length} def${defs.length !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'sc-cards';
  const cardItems = [
    { value: pkg || '—', label: 'Package' },
    { value: imports.length, label: 'Imports' },
    { value: types.length, label: 'Types' },
    { value: defs.length, label: 'Defs' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'sc-card';
    const strong = document.createElement('strong');
    if (label === 'Package' && pkg) strong.className = 'sc-pkg';
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
    const MAX = 5;
    const sec = makeSection(host, `Imports (${imports.length})`);
    const ul = makeList(sec);
    for (const imp of imports.slice(0, MAX)) {
      const li = document.createElement('li');
      li.textContent = imp;
      ul.appendChild(li);
    }
    if (imports.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${imports.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Types
  if (types.length > 0) {
    const sec = makeSection(host, `Types (${types.length})`);
    const ul = makeList(sec);
    for (const { kind, name: tname } of types) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'sc-tag';
      tag.textContent = kind;
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + tname));
      ul.appendChild(li);
    }
  }

  // Defs
  if (defs.length > 0) {
    const extras = [];
    if (implicitCount + givenCount > 0) extras.push(`${implicitCount + givenCount} implicit/given`);
    if (extCount > 0) extras.push(`${extCount} extension`);
    const sec = makeSection(host, `Defs (${defs.length}${extras.length ? ', ' + extras.join(', ') : ''})`);
    const ul = makeList(sec);
    for (const d of defs) {
      const li = document.createElement('li');
      li.textContent = d;
      ul.appendChild(li);
    }
  }

  // Source
  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'sc-pre';
  pre.innerHTML = highlightScala(text);
  srcSec.appendChild(pre);

  return { parentNode: host };
}
