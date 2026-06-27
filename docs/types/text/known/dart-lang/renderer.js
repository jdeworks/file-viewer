import { chip, ensureKnownUiStyle, esc, sourceButton, sourcePreview, wireSourceLinks } from '../../../../core/known-ui.js';

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
.dart-tag-override{background:#fce7f3;color:#9d174d;}
.dart-sig{font-family:ui-monospace,monospace;white-space:normal;overflow-wrap:anywhere;}
.dart-doc-comment{font-family:system-ui,sans-serif;color:var(--fg-2,#5a6678);font-size:12px;flex-basis:100%;}
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
  const topLevel = [];
  const annotations = [];
  let hasMain = false;
  let asyncCount = 0;
  let streamCount = 0;
  let futureCount = 0;
  let isFlutter = false;
  let pendingDocs = [];
  let pendingAnnotations = [];
  let currentOwner = null;
  let currentOwnerDepth = 0;
  let globalDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('///')) {
      pendingDocs.push(trimmed.replace(/^\/\/\/\s?/, ''));
      continue;
    }
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
    if (currentOwner && trimmed && currentOwnerDepth <= 0) currentOwner = null;

    // Imports
    const impM = trimmed.match(/^import\s+'([^']+)'/);
    const impMD = trimmed.match(/^import\s+"([^"]+)"/);
    const impStr = (impM && impM[1]) || (impMD && impMD[1]);
    if (impStr) {
      const item = { path: impStr, line: i + 1, kind: importKind(impStr), isFlutter: impStr.includes('package:flutter') };
      if (impStr.startsWith('package:')) {
        importsPkg.push(item);
        if (impStr.includes('package:flutter')) isFlutter = true;
      } else {
        importsRelative.push(item);
      }
      continue;
    }

    // Annotations
    const annM = trimmed.match(/^@(\w+)(?:\((.*)\))?/);
    if (annM) {
      const ann = { name: annM[1], args: annM[2] || '', line: i + 1 };
      annotations.push(ann);
      pendingAnnotations.push(ann);
      continue;
    }

    // async functions
    if (/\basync\b/.test(trimmed)) asyncCount++;
    // Stream / Future usage
    if (/\bStream\b/.test(trimmed)) streamCount++;
    if (/\bFuture\b/.test(trimmed)) futureCount++;

    // Classes (class, abstract class, mixin)
    const classM = trimmed.match(/^(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+with\s+([\w, ]+))?(?:\s+implements\s+([\w, ]+))?/);
    if (classM) {
      currentOwner = {
        kind: /^abstract\s/.test(trimmed) ? 'abstract class' : 'class',
        name: classM[1],
        superclass: classM[2] || null,
        mixins: classM[3] ? classM[3].split(',').map((s) => s.trim()) : [],
        implements: classM[4] ? classM[4].split(',').map((s) => s.trim()) : [],
        isAbstract: /^abstract\s/.test(trimmed),
        line: i + 1,
        docs: pendingDocs.join(' '),
        annotations: pendingAnnotations,
        members: [],
      };
      currentOwnerDepth = 0;
      classes.push(currentOwner);
      pendingDocs = [];
      pendingAnnotations = [];
    }

    // Mixin declarations
    const mixinM = trimmed.match(/^mixin\s+(\w+)/);
    if (mixinM && !classM) {
      currentOwner = { kind: 'mixin', name: mixinM[1], superclass: null, mixins: [], implements: [], isMixin: true, line: i + 1, docs: pendingDocs.join(' '), annotations: pendingAnnotations, members: [] };
      currentOwnerDepth = 0;
      classes.push(currentOwner);
      pendingDocs = [];
      pendingAnnotations = [];
    }

    // Enums
    const enumM = trimmed.match(/^enum\s+(\w+)/);
    if (enumM) { enums.push({ name: enumM[1], line: i + 1, docs: pendingDocs.join(' ') }); pendingDocs = []; continue; }

    // Typedefs
    const typedefM = trimmed.match(/^typedef\s+(\w+)\s*=\s*(.+?);?$/);
    if (typedefM) { typedefs.push({ name: typedefM[1], signature: typedefM[2], line: i + 1, docs: pendingDocs.join(' ') }); pendingDocs = []; continue; }

    // Extensions
    const extM = trimmed.match(/^extension\s+(?:(\w+)\s+)?on\s+([\w<>?,\s]+)/);
    if (extM) {
      currentOwner = { kind: 'extension', name: extM[1] || '(unnamed)', on: extM[2].trim(), line: i + 1, docs: pendingDocs.join(' '), annotations: pendingAnnotations, members: [] };
      currentOwnerDepth = 0;
      extensions.push(currentOwner);
      pendingDocs = [];
      pendingAnnotations = [];
    }

    const canParseCallable = currentOwner ? currentOwnerDepth <= 1 : globalDepth === 0;
    const member = canParseCallable ? parseCallable(trimmed, i + 1, currentOwner, pendingDocs, pendingAnnotations) : null;
    if (member) {
      if (member.name === 'main' && !currentOwner) hasMain = true;
      if (currentOwner) currentOwner.members.push(member);
      else topLevel.push(member);
      pendingDocs = [];
      pendingAnnotations = [];
    }

    if (!member && pendingAnnotations.length && trimmed.endsWith(';')) pendingAnnotations = [];
    if (currentOwner) currentOwnerDepth += braceDelta(line);
    globalDepth += braceDelta(line);
    if (trimmed) pendingDocs = [];
  }

  const allImports = [...importsPkg, ...importsRelative];
  const allMembers = [...topLevel, ...classes.flatMap((item) => item.members), ...extensions.flatMap((item) => item.members)];
  return { allImports, importsPkg, importsRelative, classes, enums, typedefs, extensions, topLevel, allMembers, hasMain, asyncCount, streamCount, futureCount, isFlutter, annotations: uniqueAnnotations(annotations) };
}

function parseCallable(trimmed, line, owner, docs, annotations) {
  if (!trimmed || /^(class|abstract class|mixin|extension|enum|typedef|import)\b/.test(trimmed)) return null;
  const annNames = annotations.map((ann) => ann.name);
  const isOverride = annNames.includes('override');
  const ownerName = owner?.name && owner.name !== '(unnamed)' ? owner.name : '';
  const ctorRe = ownerName ? new RegExp(`^(?:const\\s+|factory\\s+)?${ownerName}(?:\\.\\w+)?\\s*\\(([^)]*)\\)`) : null;
  const ctorM = ctorRe ? trimmed.match(ctorRe) : null;
  if (ctorM) return makeCallable('constructor', ownerName, '', ctorM[1], '', trimmed, line, owner, docs, annotations);
  const getterM = trimmed.match(/^((?:static\s+)?(?:[\w<>?,]+\s+)?)get\s+(\w+)\b/);
  if (getterM) return makeCallable('getter', getterM[2], (getterM[1] || '').replace(/\bstatic\b/g, '').trim(), '', '', trimmed, line, owner, docs, annotations);
  const methodM = trimmed.match(/^((?:(?:static|external|factory)\s+)*)?(?:(void|[\w<>?,]+)\s+)?(\w+)\s*\(([^)]*)\)\s*(async\*?|sync\*)?/);
  if (!methodM) return null;
  const name = methodM[3];
  if (/^(if|for|while|switch|catch)$/.test(name)) return null;
  const kind = owner ? 'method' : 'function';
  const callable = makeCallable(kind, name, methodM[2] || '', methodM[4], methodM[5] || '', trimmed, line, owner, docs, annotations);
  callable.static = /\bstatic\b/.test(methodM[1] || '');
  callable.override = isOverride;
  return callable;
}

function makeCallable(kind, name, ret, params, modifier, signature, line, owner, docs, annotations) {
  const paramList = splitParams(params);
  return {
    kind,
    name,
    ret: ret || '',
    params: paramList,
    modifier,
    signature: signature.replace(/\s*\{\s*$/, ''),
    line,
    owner: owner?.name || '',
    docs: docs.join(' '),
    annotations,
    async: /\basync/.test(modifier) || /\basync/.test(signature),
    stream: /\bStream\b/.test(ret || signature),
    future: /\bFuture\b/.test(ret || signature),
  };
}

function splitParams(text) {
  return String(text || '').split(',').map((s) => s.trim()).filter(Boolean);
}

function braceDelta(line) {
  const cleaned = line.replace(/"([^"\\]|\\.)*"/g, '""').replace(/'([^'\\]|\\.)*'/g, "''");
  return (cleaned.match(/\{/g) || []).length - (cleaned.match(/\}/g) || []).length;
}

function importKind(path) {
  if (path.startsWith('dart:')) return 'SDK library';
  if (path.startsWith('package:flutter')) return 'Flutter package';
  if (path.startsWith('package:')) return 'Package dependency';
  return 'Relative project file';
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

function highlightDartLine(line) {
    const trimmed = line.trim();

    // Full-line comment
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) {
      return '<span class="dart-comment">' + esc(line) + '</span>';
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
    return out;
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
  const { allImports, importsPkg, importsRelative, classes, enums, typedefs, extensions, topLevel, allMembers, hasMain, asyncCount, streamCount, futureCount, isFlutter, annotations } = analyzeDart(text);

  const host = document.createElement('div');
  host.className = 'dart-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);
  ensureKnownUiStyle(host);

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
  parts.push(`${allMembers.length} callable${allMembers.length !== 1 ? 's' : ''}`);
  if (asyncCount) parts.push(`${asyncCount} async`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'dart-cards';
  const cardItems = [
    { value: allImports.length, label: 'Imports' },
    { value: classes.length, label: 'Classes' },
    { value: allMembers.length, label: 'Callables' },
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
      const isPkg = imp.path.startsWith('package:');
      if (isPkg) {
        const tag = document.createElement('span');
        tag.className = imp.isFlutter ? 'dart-tag dart-tag-flutter' : 'dart-tag dart-tag-pkg';
        tag.textContent = 'pkg';
        tag.title = imp.kind;
        li.appendChild(tag);
      } else {
        li.appendChild(chip(imp.kind, 'muted'));
      }
      li.appendChild(sourceButton(imp.path, imp.line, 'Open import in source'));
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
        tag.title = 'Reusable member bundle mixed into classes.';
        li.appendChild(tag);
      }
      if (cls.isAbstract) {
        const tag = document.createElement('span');
        tag.className = 'dart-tag';
        tag.textContent = 'abstract';
        tag.title = 'Cannot be directly instantiated; usually defines a contract.';
        li.appendChild(tag);
      }
      for (const ann of cls.annotations) li.appendChild(annotationTag(ann));
      li.appendChild(sourceButton(cls.name, cls.line, 'Open class in source'));
      if (cls.superclass) li.appendChild(chip('extends ' + cls.superclass, 'info'));
      for (const mixin of cls.mixins) li.appendChild(chip('with ' + mixin, 'muted'));
      for (const item of cls.implements) li.appendChild(chip('implements ' + item, 'muted'));
      if (cls.members.length) li.appendChild(chip(`${cls.members.length} member${cls.members.length !== 1 ? 's' : ''}`, 'info'));
      addDocs(li, cls.docs);
      ul.appendChild(li);
    }
  }

  // Members / functions
  if (allMembers.length > 0) {
    const sec = makeSection(host, `Methods & Functions (${allMembers.length})`);
    const ul = makeList(sec);
    for (const fn of allMembers) {
      const li = document.createElement('li');
      if (fn.async) li.appendChild(tag('async', 'dart-tag dart-tag-async', 'Asynchronous callable; may return a Future or async stream.'));
      if (fn.override) li.appendChild(tag('override', 'dart-tag dart-tag-override', 'Overrides a member inherited from a superclass or interface.'));
      if (fn.kind === 'getter') li.appendChild(tag('get', 'dart-tag', 'Property-style accessor with no call parentheses.'));
      if (fn.kind === 'constructor') li.appendChild(tag('ctor', 'dart-tag', 'Constructor used to create instances of the enclosing class.'));
      for (const ann of fn.annotations) li.appendChild(annotationTag(ann));
      li.appendChild(sourceButton(fn.name, fn.line, 'Open callable in source'));
      if (fn.owner) li.appendChild(chip('in ' + fn.owner, 'muted'));
      if (fn.ret) li.appendChild(chip('returns ' + fn.ret, fn.future || fn.stream ? 'info' : 'muted'));
      if (fn.params.length) li.appendChild(chip(`arity ${fn.params.length}`, 'muted'));
      for (const param of fn.params) li.appendChild(chip(param, 'muted', 'Parameter from the signature.'));
      const sig = document.createElement('span');
      sig.className = 'dart-sig';
      sig.textContent = fn.signature;
      li.appendChild(sig);
      addDocs(li, fn.docs);
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
      tag.title = 'Closed set of named values.';
      li.appendChild(tag);
      li.appendChild(sourceButton(e.name, e.line, 'Open enum in source'));
      addDocs(li, e.docs);
      ul.appendChild(li);
    }
  }

  // Extensions
  if (extensions.length > 0) {
    const sec = makeSection(host, `Extensions (${extensions.length})`);
    const ul = makeList(sec);
    for (const ext of extensions) {
      const li = document.createElement('li');
      li.appendChild(tag('extension', 'dart-tag', 'Adds members to an existing type without changing that type.'));
      li.appendChild(sourceButton(ext.name, ext.line, 'Open extension in source'));
      li.appendChild(chip('on ' + ext.on, 'info'));
      if (ext.members.length) li.appendChild(chip(`${ext.members.length} member${ext.members.length !== 1 ? 's' : ''}`, 'muted'));
      addDocs(li, ext.docs);
      ul.appendChild(li);
    }
  }

  // Typedefs
  if (typedefs.length > 0) {
    const sec = makeSection(host, `Typedefs (${typedefs.length})`);
    const ul = makeList(sec);
    for (const td of typedefs) {
      const li = document.createElement('li');
      li.appendChild(sourceButton(td.name, td.line, 'Open typedef in source'));
      li.appendChild(chip(td.signature, 'muted', 'Aliased function or type signature.'));
      addDocs(li, td.docs);
      ul.appendChild(li);
    }
  }

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

  host.appendChild(sourcePreview(text, { title: hasMain ? 'Source (has main())' : 'Source', collapsed: true, idPrefix: 'dart-line', highlighter: highlightDartLine }));
  wireSourceLinks(host, { idPrefix: 'dart-line' });

  return { parentNode: host };
}

function tag(label, className, title) {
  const el = document.createElement('span');
  el.className = className;
  el.textContent = label;
  el.title = title;
  return el;
}

function annotationTag(ann) {
  return chip('@' + ann.name, 'info', annotationHint(ann.name));
}

function annotationHint(name) {
  const hints = {
    override: 'Overrides an inherited member; useful for spotting interface implementations.',
    Deprecated: 'Marks an API as obsolete and may include replacement guidance.',
    immutable: 'Flutter/meta annotation indicating instances should not mutate after construction.',
  };
  return hints[name] || 'Dart annotation';
}

function addDocs(li, docs) {
  if (!docs) return;
  const span = document.createElement('span');
  span.className = 'dart-doc-comment';
  span.textContent = docs;
  li.appendChild(span);
}
