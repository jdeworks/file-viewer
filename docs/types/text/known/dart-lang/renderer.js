const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.dart-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.dart-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0175c2;color:#fff;vertical-align:middle;margin-right:8px;}
.dart-badge-flutter{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#e0f2fe;color:#0175c2;vertical-align:middle;margin-left:6px;}
.dart-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.dart-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.dart-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.dart-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.dart-card strong{display:block;font-size:1.2rem;font-weight:700;}
.dart-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.dart-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.dart-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.dart-list{margin:0;padding:0;list-style:none;}
.dart-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.dart-list li:last-child{border-bottom:none;}
.dart-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#e0f2fe;color:#075985;font-weight:700;}
.dart-tag-async{background:#fef3c7;color:#92400e;}
.dart-tag-pkg{background:#f0fdf4;color:#14532d;}
.dart-tag-flutter{background:#e0f2fe;color:#0175c2;}
.dart-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.dart-kw{color:#0175c2;font-weight:600;}
.dart-str{color:#0a6640;}
.dart-comment{color:#6e7781;font-style:italic;}
.dart-num{color:#b45309;}
.dart-type{color:#9333ea;font-weight:600;}
.dart-ann{color:#c026d3;}
`;

const DART_KEYWORDS = new Set([
  'import', 'export', 'library', 'class', 'extends', 'implements', 'with', 'mixin',
  'abstract', 'enum', 'typedef', 'void', 'final', 'const', 'var', 'late', 'required',
  'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue',
  'return', 'throw', 'try', 'catch', 'finally', 'rethrow', 'async', 'await', 'yield',
  'sync', 'get', 'set', 'operator', 'super', 'this', 'new', 'null', 'true', 'false',
  'static', 'override', 'external', 'factory', 'covariant', 'dynamic', 'part', 'show', 'hide',
  'on', 'in', 'is', 'as',
]);

function analyzeDart(text) {
  const lines = text.split(/\r?\n/);
  const importsPkg = [];
  const importsRelative = [];
  const classes = [];
  const enums = [];
  const typedefs = [];
  const extensions = [];
  let hasMain = false;
  let asyncCount = 0;
  let streamCount = 0;
  let futureCount = 0;
  let isFlutter = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

    // Imports
    const impM = trimmed.match(/^import\s+'([^']+)'/);
    const impMD = trimmed.match(/^import\s+"([^"]+)"/);
    const impStr = (impM && impM[1]) || (impMD && impMD[1]);
    if (impStr) {
      if (impStr.startsWith('package:')) {
        importsPkg.push(impStr);
        if (impStr.includes('package:flutter')) isFlutter = true;
      } else {
        importsRelative.push(impStr);
      }
      continue;
    }

    // void main / main
    if (/^\s*void\s+main\s*[\(<]/.test(line) || /^\s*main\s*\(/.test(line)) hasMain = true;

    // async functions
    if (/\basync\b/.test(trimmed)) asyncCount++;
    // Stream / Future usage
    if (/\bStream\b/.test(trimmed)) streamCount++;
    if (/\bFuture\b/.test(trimmed)) futureCount++;

    // Classes (class, abstract class, mixin)
    const classM = trimmed.match(/^(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+with\s+([\w, ]+))?(?:\s+implements\s+([\w, ]+))?/);
    if (classM) {
      classes.push({
        name: classM[1],
        superclass: classM[2] || null,
        mixins: classM[3] ? classM[3].split(',').map((s) => s.trim()) : [],
        isAbstract: /^abstract\s/.test(trimmed),
      });
      continue;
    }

    // Mixin declarations
    const mixinM = trimmed.match(/^mixin\s+(\w+)/);
    if (mixinM && !classM) {
      classes.push({ name: mixinM[1], superclass: null, mixins: [], isMixin: true });
      continue;
    }

    // Enums
    const enumM = trimmed.match(/^enum\s+(\w+)/);
    if (enumM) { enums.push(enumM[1]); continue; }

    // Typedefs
    const typedefM = trimmed.match(/^typedef\s+(\w+)/);
    if (typedefM) { typedefs.push(typedefM[1]); continue; }

    // Extensions
    const extM = trimmed.match(/^extension\s+(?:(\w+)\s+)?on\s+([\w<>?,\s]+)/);
    if (extM) { extensions.push({ name: extM[1] || '(unnamed)', on: extM[2].trim() }); continue; }
  }

  const allImports = [...importsPkg, ...importsRelative];
  return { allImports, importsPkg, importsRelative, classes, enums, typedefs, extensions, hasMain, asyncCount, streamCount, futureCount, isFlutter };
}

function highlightDart(text) {
  const lines = text.split(/\r?\n/);
  const result = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Full-line comment
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) {
      result.push('<span class="dart-comment">' + esc(line) + '</span>');
      continue;
    }

    let out = '';
    let i = 0;
    while (i < line.length) {
      // Inline comment
      if (line[i] === '/' && line[i + 1] === '/') {
        out += '<span class="dart-comment">' + esc(line.slice(i)) + '</span>';
        break;
      }
      if (line[i] === '/' && line[i + 1] === '*') {
        let j = i + 2;
        while (j < line.length && !(line[j] === '*' && line[j + 1] === '/')) j++;
        j += 2;
        out += '<span class="dart-comment">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Annotations @
      if (line[i] === '@' && i + 1 < line.length && /[A-Za-z_]/.test(line[i + 1])) {
        let j = i + 1;
        while (j < line.length && /\w/.test(line[j])) j++;
        out += '<span class="dart-ann">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // String literals
      if (line[i] === "'" || line[i] === '"') {
        const q = line[i];
        // Triple-quoted
        if (line.slice(i, i + 3) === q + q + q) {
          let j = i + 3;
          while (j < line.length && line.slice(j, j + 3) !== q + q + q) j++;
          j += 3;
          out += '<span class="dart-str">' + esc(line.slice(i, j)) + '</span>';
          i = j;
          continue;
        }
        let j = i + 1;
        while (j < line.length && line[j] !== q) {
          if (line[j] === '\\') j++;
          j++;
        }
        j++;
        out += '<span class="dart-str">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Numbers
      if (/[0-9]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[0-9._xXeEuU]/.test(line[j])) j++;
        out += '<span class="dart-num">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Identifiers / keywords
      if (/[A-Za-z_$]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[\w$]/.test(line[j])) j++;
        const word = line.slice(i, j);
        if (DART_KEYWORDS.has(word)) {
          out += '<span class="dart-kw">' + esc(word) + '</span>';
        } else if (/^[A-Z]/.test(word)) {
          out += '<span class="dart-type">' + esc(word) + '</span>';
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
  sec.className = 'dart-section';
  const hd = document.createElement('div');
  hd.className = 'dart-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'dart-list';
  sec.appendChild(ul);
  return ul;
}

export function render(intake) {
  const text = intake.text || '';
  const { allImports, importsPkg, importsRelative, classes, enums, typedefs, extensions, hasMain, asyncCount, streamCount, futureCount, isFlutter } = analyzeDart(text);

  const host = document.createElement('div');
  host.className = 'dart-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'dart-title';
  title.innerHTML = '<span class="dart-badge">Dart</span>' + (isFlutter ? '<span class="dart-badge-flutter">Flutter</span>' : '');
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'dart-sub';
  const parts = [];
  parts.push(`${allImports.length} import${allImports.length !== 1 ? 's' : ''}`);
  parts.push(`${classes.length} class${classes.length !== 1 ? 'es' : ''}`);
  if (enums.length) parts.push(`${enums.length} enum${enums.length !== 1 ? 's' : ''}`);
  if (asyncCount) parts.push(`${asyncCount} async`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'dart-cards';
  const cardItems = [
    { value: allImports.length, label: 'Imports' },
    { value: classes.length, label: 'Classes' },
    { value: asyncCount, label: 'Async Fns' },
    { value: streamCount + futureCount, label: 'Stream/Future' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'dart-card';
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
  if (allImports.length > 0) {
    const MAX = 8;
    const sec = makeSection(host, `Imports (${allImports.length}${importsPkg.length ? `, ${importsPkg.length} package` : ''})`);
    const ul = makeList(sec);
    for (const imp of allImports.slice(0, MAX)) {
      const li = document.createElement('li');
      const isPkg = imp.startsWith('package:');
      if (isPkg) {
        const tag = document.createElement('span');
        tag.className = imp.includes('package:flutter') ? 'dart-tag dart-tag-flutter' : 'dart-tag dart-tag-pkg';
        tag.textContent = 'pkg';
        li.appendChild(tag);
        li.appendChild(document.createTextNode(' '));
      }
      li.appendChild(document.createTextNode(imp));
      ul.appendChild(li);
    }
    if (allImports.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${allImports.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Classes
  if (classes.length > 0) {
    const sec = makeSection(host, `Classes (${classes.length})`);
    const ul = makeList(sec);
    for (const cls of classes) {
      const li = document.createElement('li');
      if (cls.isMixin) {
        const tag = document.createElement('span');
        tag.className = 'dart-tag';
        tag.textContent = 'mixin';
        li.appendChild(tag);
        li.appendChild(document.createTextNode(' '));
      }
      if (cls.isAbstract) {
        const tag = document.createElement('span');
        tag.className = 'dart-tag';
        tag.textContent = 'abstract';
        li.appendChild(tag);
        li.appendChild(document.createTextNode(' '));
      }
      li.appendChild(document.createTextNode(cls.name));
      if (cls.superclass) {
        const ext = document.createElement('span');
        ext.style.color = 'var(--fg-2,#888)';
        ext.style.fontSize = '11px';
        ext.textContent = ' extends ' + cls.superclass;
        li.appendChild(ext);
      }
      ul.appendChild(li);
    }
  }

  // Enums
  if (enums.length > 0) {
    const sec = makeSection(host, `Enums (${enums.length})`);
    const ul = makeList(sec);
    for (const e of enums) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'dart-tag';
      tag.textContent = 'enum';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + e));
      ul.appendChild(li);
    }
  }

  // Extensions
  if (extensions.length > 0) {
    const sec = makeSection(host, `Extensions (${extensions.length})`);
    const ul = makeList(sec);
    for (const ext of extensions) {
      const li = document.createElement('li');
      li.textContent = `${ext.name} on ${ext.on}`;
      ul.appendChild(li);
    }
  }

  // Typedefs
  if (typedefs.length > 0) {
    const sec = makeSection(host, `Typedefs (${typedefs.length})`);
    const ul = makeList(sec);
    for (const td of typedefs) {
      const li = document.createElement('li');
      li.textContent = td;
      ul.appendChild(li);
    }
  }

  // Source
  const srcSec = makeSection(host, hasMain ? 'Source (has main())' : 'Source');
  const pre = document.createElement('pre');
  pre.className = 'dart-pre';
  pre.innerHTML = highlightDart(text);
  srcSec.appendChild(pre);

  return { parentNode: host };
}
