const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.kt-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.kt-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7f52ff;color:#fff;vertical-align:middle;margin-right:8px;}
.kt-badge-script{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#ede9fe;color:#7f52ff;vertical-align:middle;margin-left:6px;}
.kt-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.kt-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.kt-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.kt-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.kt-card strong{display:block;font-size:1.2rem;font-weight:700;}
.kt-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.kt-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.kt-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.kt-list{margin:0;padding:0;list-style:none;}
.kt-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;}
.kt-list li:last-child{border-bottom:none;}
.kt-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#ede9fe;color:#7f52ff;font-weight:700;}
.kt-tag-suspend{background:#fef3c7;color:#92400e;}
.kt-tag-ext{background:#dcfce7;color:#166534;}
.kt-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.kt-kw{color:#7f52ff;font-weight:600;}
.kt-str{color:#0a6640;}
.kt-comment{color:#6e7781;font-style:italic;}
.kt-num{color:#b45309;}
.kt-ann{color:#c026d3;}
.kt-pkg{font-family:ui-monospace,monospace;font-size:12px;color:#7f52ff;font-weight:600;}
`;

const KT_KEYWORDS = new Set([
  'package', 'import', 'fun', 'val', 'var', 'class', 'object', 'interface', 'data',
  'sealed', 'enum', 'abstract', 'open', 'override', 'private', 'public', 'protected',
  'internal', 'suspend', 'inline', 'return', 'if', 'else', 'when', 'for', 'while',
  'do', 'try', 'catch', 'finally', 'throw', 'is', 'as', 'in', 'out', 'by',
  'companion', 'init', 'constructor', 'this', 'super', 'null', 'true', 'false',
  'Unit', 'Any', 'Nothing',
]);

function analyzeKotlin(text) {
  const lines = text.split(/\r?\n/);
  let pkg = null;
  const imports = [];
  const classes = [];
  const functions = [];
  const annotations = new Set();
  let suspendCount = 0;
  let extCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

    // Package
    const pkgM = trimmed.match(/^package\s+([\w.]+)/);
    if (pkgM && !pkg) { pkg = pkgM[1]; continue; }

    // Import
    const impM = trimmed.match(/^import\s+([\w.*]+)/);
    if (impM) { imports.push(impM[1]); continue; }

    // Annotations
    const annM = trimmed.match(/^@(\w+)/);
    if (annM) annotations.add(annM[1]);

    // Classes (data class, sealed class, object, interface, class, enum class)
    const classM = trimmed.match(/^(?:(?:data|sealed|enum|abstract|open|inner|value)\s+)?(?:class|object|interface)\s+(\w+)/);
    if (classM) {
      const prefix = trimmed.match(/^((?:(?:data|sealed|enum|abstract|open|inner|value)\s+)?(?:class|object|interface))/);
      classes.push({ kind: prefix ? prefix[1] : 'class', name: classM[1] });
    }

    // Functions — top-level fun (may be suspend, extension, inline, etc.)
    const funM = trimmed.match(/^(?:(?:private|public|protected|internal|open|override|abstract|inline|operator|infix|tailrec|external|expect|actual)\s+)*(?:(suspend)\s+)?fun\s+(?:[\w<>?,\s.]+\.)?([\w]+)\s*[(<]/);
    if (funM) {
      const isSuspend = Boolean(funM[1]);
      const name = funM[2];
      // Check for extension function: has a receiver type before the name
      const extM = trimmed.match(/fun\s+[\w<>?,\s.]+\.\s*\w+\s*[(<]/);
      const isExt = Boolean(extM);
      functions.push({ name, suspend: isSuspend, ext: isExt });
      if (isSuspend) suspendCount++;
      if (isExt) extCount++;
    }
  }

  return { pkg, imports, classes, functions, suspendCount, extCount, annotations: [...annotations] };
}

function highlightKotlin(text) {
  const lines = text.split(/\r?\n/);
  const result = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Full-line comments
    if (trimmed.startsWith('//')) {
      result.push('<span class="kt-comment">' + esc(line) + '</span>');
      continue;
    }

    let out = '';
    let i = 0;
    while (i < line.length) {
      // Inline comment //
      if (line[i] === '/' && line[i + 1] === '/') {
        out += '<span class="kt-comment">' + esc(line.slice(i)) + '</span>';
        break;
      }
      // Annotation @
      if (line[i] === '@' && i + 1 < line.length && /[A-Za-z_]/.test(line[i + 1])) {
        let j = i + 1;
        while (j < line.length && /\w/.test(line[j])) j++;
        out += '<span class="kt-ann">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // String literals (simple, double-quoted)
      if (line[i] === '"') {
        // Triple-quoted strings
        if (line.slice(i, i + 3) === '"""') {
          let j = i + 3;
          while (j < line.length && line.slice(j, j + 3) !== '"""') j++;
          j += 3;
          out += '<span class="kt-str">' + esc(line.slice(i, j)) + '</span>';
          i = j;
          continue;
        }
        let j = i + 1;
        while (j < line.length && line[j] !== '"') {
          if (line[j] === '\\') j++;
          j++;
        }
        j++;
        out += '<span class="kt-str">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Char literals
      if (line[i] === "'") {
        let j = i + 1;
        if (line[j] === '\\') j++;
        j += 2;
        out += '<span class="kt-str">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Numbers
      if (/[0-9]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[0-9._xXbBLlFfuU]/.test(line[j])) j++;
        out += '<span class="kt-num">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Identifiers / keywords
      if (/[A-Za-z_]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[\w]/.test(line[j])) j++;
        const word = line.slice(i, j);
        if (KT_KEYWORDS.has(word)) {
          out += '<span class="kt-kw">' + esc(word) + '</span>';
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

function makeSection(host, title, cls = 'kt-section') {
  const sec = document.createElement('div');
  sec.className = cls;
  const hd = document.createElement('div');
  hd.className = 'kt-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'kt-list';
  sec.appendChild(ul);
  return ul;
}

export function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').toLowerCase();
  const isScript = name.endsWith('.kts');
  const { pkg, imports, classes, functions, suspendCount, extCount, annotations } = analyzeKotlin(text);

  const host = document.createElement('div');
  host.className = 'kt-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'kt-title';
  title.innerHTML = '<span class="kt-badge">Kotlin</span>' + (isScript ? '<span class="kt-badge-script">Script (.kts)</span>' : '<span class="kt-badge-script">Source (.kt)</span>');
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'kt-sub';
  const parts = [];
  if (pkg) parts.push('package ' + pkg);
  parts.push(`${imports.length} import${imports.length !== 1 ? 's' : ''}`);
  parts.push(`${classes.length} type${classes.length !== 1 ? 's' : ''}`);
  parts.push(`${functions.length} function${functions.length !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'kt-cards';
  const cardItems = [
    { value: pkg || '—', label: 'Package' },
    { value: imports.length, label: 'Imports' },
    { value: classes.length, label: 'Types' },
    { value: functions.length, label: 'Functions' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'kt-card';
    const strong = document.createElement('strong');
    if (label === 'Package' && pkg) strong.className = 'kt-pkg';
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
    const shown = imports.slice(0, MAX);
    const sec = makeSection(host, `Imports (${imports.length})`);
    const ul = makeList(sec);
    for (const imp of shown) {
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

  // Classes / types
  if (classes.length > 0) {
    const sec = makeSection(host, `Types (${classes.length})`);
    const ul = makeList(sec);
    for (const { kind, name: cname } of classes) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'kt-tag';
      tag.textContent = kind;
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + cname));
      ul.appendChild(li);
    }
  }

  // Functions
  if (functions.length > 0) {
    const sec = makeSection(host, `Functions (${functions.length}${suspendCount ? `, ${suspendCount} suspend` : ''}${extCount ? `, ${extCount} extension` : ''})`);
    const ul = makeList(sec);
    for (const { name: fname, suspend: isSuspend, ext: isExt } of functions) {
      const li = document.createElement('li');
      if (isSuspend) {
        const tag = document.createElement('span');
        tag.className = 'kt-tag kt-tag-suspend';
        tag.textContent = 'suspend';
        li.appendChild(tag);
        li.appendChild(document.createTextNode(' '));
      }
      if (isExt) {
        const tag = document.createElement('span');
        tag.className = 'kt-tag kt-tag-ext';
        tag.textContent = 'ext';
        li.appendChild(tag);
        li.appendChild(document.createTextNode(' '));
      }
      li.appendChild(document.createTextNode(fname));
      ul.appendChild(li);
    }
  }

  // Annotations
  if (annotations.length > 0) {
    const sec = makeSection(host, `Annotations (${annotations.length})`);
    const ul = makeList(sec);
    for (const ann of annotations) {
      const li = document.createElement('li');
      li.textContent = '@' + ann;
      ul.appendChild(li);
    }
  }

  // Source
  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'kt-pre';
  pre.innerHTML = highlightKotlin(text);
  srcSec.appendChild(pre);

  return { parentNode: host };
}
