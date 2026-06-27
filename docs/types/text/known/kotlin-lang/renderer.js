import { chip, ensureKnownUiStyle, esc, sourceButton, sourcePreview, wireSourceLinks } from '../../../../core/known-ui.js';

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
.kt-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.kt-list li:last-child{border-bottom:none;}
.kt-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#ede9fe;color:#7f52ff;font-weight:700;}
.kt-tag-suspend{background:#fef3c7;color:#92400e;}
.kt-tag-ext{background:#dcfce7;color:#166534;}
.kt-sig{font-family:ui-monospace,monospace;white-space:normal;overflow-wrap:anywhere;}
.kt-doc-comment{font-family:system-ui,sans-serif;color:var(--fg-2,#5a6678);font-size:12px;flex-basis:100%;}
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
  const annotations = [];
  let suspendCount = 0;
  let extCount = 0;
  let pendingDocs = [];
  let pendingAnnotations = [];
  let currentType = null;
  let currentTypeDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (/^\/\*\*/.test(trimmed)) {
      const block = collectKdoc(lines, i);
      pendingDocs = block.docs;
      i = block.end;
      continue;
    }
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
    if (currentType && trimmed && currentTypeDepth <= 0) currentType = null;

    // Package
    const pkgM = trimmed.match(/^package\s+([\w.]+)/);
    if (pkgM && !pkg) { pkg = { name: pkgM[1], line: i + 1 }; continue; }

    // Import
    const impM = trimmed.match(/^import\s+([\w.*]+)/);
    if (impM) { imports.push({ name: impM[1], line: i + 1 }); continue; }

    // Annotations
    const annM = trimmed.match(/^@(\w+)(?:\((.*)\))?/);
    if (annM) {
      const ann = { name: annM[1], args: annM[2] || '', line: i + 1 };
      annotations.push(ann);
      pendingAnnotations.push(ann);
      continue;
    }

    // Classes (data class, sealed class, object, interface, class, enum class)
    const classM = trimmed.match(/^((?:(?:data|sealed|enum|abstract|open|inner|value)\s+)?(?:class|object|interface))\s+(\w+)(?:\s*\(([^)]*)\))?/);
    if (classM) {
      currentType = {
        kind: classM[1],
        name: classM[2],
        params: splitParams(classM[3] || ''),
        line: i + 1,
        docs: pendingDocs.join(' '),
        annotations: pendingAnnotations,
      };
      currentTypeDepth = 0;
      classes.push(currentType);
      pendingDocs = [];
      pendingAnnotations = [];
      if (trimmed.endsWith(')') || !trimmed.includes('{')) currentType = null;
    }

    // Functions — top-level fun (may be suspend, extension, inline, etc.)
    const funM = trimmed.match(/^((?:(?:private|public|protected|internal|open|override|abstract|inline|operator|infix|tailrec|external|expect|actual|suspend)\s+)*)fun\s+(?:(.+?)\.)?(\w+)\s*\(([^)]*)\)\s*(?::\s*([\w<>?.]+))?/);
    if (funM) {
      const mods = funM[1].trim().split(/\s+/).filter(Boolean);
      const isSuspend = mods.includes('suspend');
      const name = funM[3];
      // Check for extension function: has a receiver type before the name
      const receiver = (funM[2] || '').trim();
      const isExt = Boolean(receiver);
      functions.push({
        name,
        suspend: isSuspend,
        ext: isExt,
        receiver,
        mods,
        params: splitParams(funM[4] || ''),
        ret: funM[5] || '',
        signature: trimmed.replace(/\s*\{\s*$/, ''),
        owner: currentType?.name || '',
        line: i + 1,
        docs: pendingDocs.join(' '),
        annotations: pendingAnnotations,
        bodyLines: functionLength(lines, i),
      });
      pendingDocs = [];
      pendingAnnotations = [];
      if (isSuspend) suspendCount++;
      if (isExt) extCount++;
    }

    if (currentType) currentTypeDepth += braceDelta(line);
    if (trimmed) pendingDocs = [];
  }

  return { pkg, imports, classes, functions, suspendCount, extCount, annotations: uniqueAnnotations(annotations) };
}

function collectKdoc(lines, start) {
  const docs = [];
  for (let i = start; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.endsWith('*/')) return { docs, end: i };
    const cleaned = line.replace(/^\/\*\*?/, '').replace(/^\*\s?/, '').trim();
    if (cleaned && !cleaned.startsWith('@')) docs.push(cleaned);
  }
  return { docs, end: start };
}

function splitParams(text) {
  return String(text || '').split(',').map((s) => s.trim()).filter(Boolean);
}

function braceDelta(line) {
  const cleaned = line.replace(/"([^"\\]|\\.)*"/g, '""');
  return (cleaned.match(/\{/g) || []).length - (cleaned.match(/\}/g) || []).length;
}

function functionLength(lines, start) {
  if (lines[start].includes('=') && !lines[start].includes('{')) return 0;
  let depth = 0;
  let opened = false;
  let count = 0;
  for (let i = start; i < lines.length; i++) {
    if (lines[i].includes('{')) opened = true;
    if (opened && i > start && lines[i].trim()) count++;
    depth += braceDelta(lines[i]);
    if (opened && depth <= 0) return Math.max(0, count - 1);
  }
  return count;
}

function uniqueAnnotations(items) {
  const seen = new Set();
  return items.filter((ann) => {
    const key = ann.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function highlightKotlinLine(line) {
    const trimmed = line.trim();

    // Full-line comments
    if (trimmed.startsWith('//')) {
      return '<span class="kt-comment">' + esc(line) + '</span>';
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
    return out;
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
  ensureKnownUiStyle(host);

  // Title
  const title = document.createElement('div');
  title.className = 'kt-title';
  title.innerHTML = '<span class="kt-badge">Kotlin</span>' + (isScript ? '<span class="kt-badge-script">Script (.kts)</span>' : '<span class="kt-badge-script">Source (.kt)</span>');
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'kt-sub';
  const parts = [];
  if (pkg) parts.push('package ' + pkg.name);
  parts.push(`${imports.length} import${imports.length !== 1 ? 's' : ''}`);
  parts.push(`${classes.length} type${classes.length !== 1 ? 's' : ''}`);
  parts.push(`${functions.length} function${functions.length !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'kt-cards';
  const cardItems = [
    { value: pkg?.name || '—', label: 'Package' },
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
      li.appendChild(sourceButton(imp.name, imp.line, 'Open import in source'));
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
    for (const item of classes) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'kt-tag';
      tag.textContent = item.kind;
      tag.title = typeHint(item.kind);
      li.appendChild(tag);
      for (const ann of item.annotations) li.appendChild(chip('@' + ann.name, 'info', annotationHint(ann.name)));
      li.appendChild(sourceButton(item.name, item.line, 'Open type in source'));
      if (item.params.length) li.appendChild(chip(`${item.params.length} constructor param${item.params.length !== 1 ? 's' : ''}`, 'info'));
      for (const param of item.params) li.appendChild(chip(param, 'muted', 'Primary constructor parameter.'));
      addDocs(li, item.docs);
      ul.appendChild(li);
    }
  }

  // Functions
  if (functions.length > 0) {
    const sec = makeSection(host, `Functions (${functions.length}${suspendCount ? `, ${suspendCount} suspend` : ''}${extCount ? `, ${extCount} extension` : ''})`);
    const ul = makeList(sec);
    for (const fn of functions) {
      const li = document.createElement('li');
      if (fn.suspend) {
        const tag = document.createElement('span');
        tag.className = 'kt-tag kt-tag-suspend';
        tag.textContent = 'suspend';
        tag.title = 'Coroutine function that can suspend without blocking a thread.';
        li.appendChild(tag);
        li.appendChild(document.createTextNode(' '));
      }
      if (fn.ext) {
        const tag = document.createElement('span');
        tag.className = 'kt-tag kt-tag-ext';
        tag.textContent = 'ext';
        tag.title = 'Extension function with an explicit receiver type.';
        li.appendChild(tag);
        li.appendChild(document.createTextNode(' '));
      }
      for (const ann of fn.annotations) li.appendChild(chip('@' + ann.name, 'info', annotationHint(ann.name)));
      li.appendChild(sourceButton(fn.name, fn.line, 'Open function in source'));
      li.appendChild(chip(`arity ${fn.params.length}`, 'muted'));
      if (fn.ret) li.appendChild(chip(`returns ${fn.ret}`, 'info'));
      if (fn.receiver) li.appendChild(chip(`receiver ${fn.receiver}`, 'info'));
      if (fn.owner) li.appendChild(chip(`in ${fn.owner}`, 'muted'));
      li.appendChild(chip(`${fn.bodyLines} lines`, fn.bodyLines > 20 ? 'warn' : 'muted'));
      const sig = document.createElement('span');
      sig.className = 'kt-sig';
      sig.textContent = fn.signature;
      li.appendChild(sig);
      for (const param of fn.params) li.appendChild(chip(param, 'muted', 'Parameter from the function signature.'));
      addDocs(li, fn.docs);
      ul.appendChild(li);
    }
  }

  // Annotations
  if (annotations.length > 0) {
    const sec = makeSection(host, `Annotations (${annotations.length})`);
    const ul = makeList(sec);
    for (const ann of annotations) {
      const li = document.createElement('li');
      li.appendChild(sourceButton('@' + ann.name, ann.line, 'Open annotation in source'));
      li.appendChild(chip(annotationHint(ann.name), 'muted'));
      ul.appendChild(li);
    }
  }

  host.appendChild(sourcePreview(text, { title: 'Source', collapsed: true, idPrefix: 'kt-line', highlighter: highlightKotlinLine }));
  wireSourceLinks(host, { idPrefix: 'kt-line' });

  return { parentNode: host };
}

function addDocs(li, docs) {
  if (!docs) return;
  const span = document.createElement('span');
  span.className = 'kt-doc-comment';
  span.textContent = docs;
  li.appendChild(span);
}

function annotationHint(name) {
  const hints = {
    Serializable: 'Marks a type for Kotlin serialization.',
    Deprecated: 'Marks an API as obsolete and may carry replacement guidance.',
    JvmStatic: 'Exposes a companion/object member as a JVM static member.',
  };
  return hints[name] || 'Kotlin annotation';
}

function typeHint(kind) {
  if (kind.includes('data')) return 'Data class with generated value methods such as equals/copy/toString.';
  if (kind.includes('object')) return 'Singleton object declaration.';
  if (kind.includes('interface')) return 'Contract implemented by classes or objects.';
  return 'Kotlin type declaration.';
}
