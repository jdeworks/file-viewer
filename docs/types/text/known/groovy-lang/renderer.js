import { chip, ensureKnownUiStyle, esc, sourceButton, sourcePreview, wireSourceLinks } from '../../../../core/known-ui.js';

const CSS = `
.gr-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.gr-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#4298b8;color:#fff;vertical-align:middle;margin-right:8px;}
.gr-badge-sub{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#e0f2f7;color:#0d6e8a;vertical-align:middle;margin-left:6px;}
.gr-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.gr-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.gr-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.gr-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.gr-card strong{display:block;font-size:1.2rem;font-weight:700;}
.gr-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.gr-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.gr-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.gr-list{margin:0;padding:0;list-style:none;}
.gr-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.gr-list li:last-child{border-bottom:none;}
.gr-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#e0f2f7;color:#0d6e8a;font-weight:700;}
.gr-tag-class{background:#e0f2f7;color:#0d6e8a;}
.gr-tag-trait{background:#fef3c7;color:#92400e;}
.gr-tag-interface{background:#dcfce7;color:#166534;}
.gr-tag-enum{background:#fce7f3;color:#9d174d;}
.gr-tag-private{background:#f1f5f9;color:#64748b;}
.gr-tag-public{background:#dcfce7;color:#166534;}
.gr-tag-protected{background:#fef3c7;color:#92400e;}
.gr-tag-static{background:#ede9fe;color:#7f52ff;}
.gr-ann{color:#c026d3;font-family:ui-monospace,monospace;font-size:12px;}
.gr-pkg{font-family:ui-monospace,monospace;font-size:12px;color:#0d6e8a;font-weight:600;}
.gr-sig{font-family:ui-monospace,monospace;white-space:normal;overflow-wrap:anywhere;}
.gr-doc-comment{font-family:system-ui,sans-serif;color:var(--fg-2,#5a6678);font-size:12px;flex-basis:100%;}
.gr-source-keyword{color:#0d6e8a;font-weight:700;}
.gr-source-type{color:#7c3aed;font-weight:600;}
.gr-source-string{color:#b45309;}
.gr-source-comment{color:var(--fg-2,#6e7681);font-style:italic;}
`;

function analyzeGroovy(text) {
  const lines = text.split(/\r?\n/);
  let pkg = null;
  const imports = [];
  const types = [];
  const methods = [];
  const annotations = [];
  let closureCount = 0;
  let currentDocs = [];
  let currentAnnotations = [];
  let currentType = null;
  let currentTypeDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (/^\/\*\*/.test(trimmed)) {
      const block = collectGroovydoc(lines, i);
      currentDocs = block.docs;
      i = block.end;
      continue;
    }
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
    if (currentType && trimmed && currentTypeDepth <= 0) currentType = null;

    // Package
    const pkgM = trimmed.match(/^package\s+([\w.]+)/);
    if (pkgM && !pkg) { pkg = { name: pkgM[1], line: i + 1 }; continue; }

    // Imports
    const impM = trimmed.match(/^import\s+(static\s+)?([\w.*]+)/);
    if (impM) { imports.push({ name: impM[2], static: Boolean(impM[1]), line: i + 1 }); continue; }

    // Annotations
    const annM = trimmed.match(/^@(\w+)(?:\((.*)\))?/);
    if (annM) {
      const ann = { name: annM[1], args: annM[2] || '', line: i + 1 };
      annotations.push(ann);
      currentAnnotations.push(ann);
      continue;
    }

    // Types: class, trait, interface, enum
    const typeM = trimmed.match(/^(?:(?:public|private|protected|abstract|final|static)\s+)*?(class|trait|interface|enum)\s+(\w+)/);
    if (typeM) {
      currentType = { kind: typeM[1], name: typeM[2], line: i + 1, docs: currentDocs.join(' '), annotations: currentAnnotations };
      currentTypeDepth = braceDelta(line);
      types.push(currentType);
      currentDocs = [];
      currentAnnotations = [];
      continue;
    }

    // Methods/defs: def name( or access def name(
    // `def name(`  OR  `[mods] returnType name(`  (Java-style typed methods). The method name is
    // captured directly by the match: group 2 for the `def` form, group 4 for the typed form.
    const methM = trimmed.match(/^(?:(public|private|protected|static|final|abstract|synchronized)\s+)*(?:def\s+(\w+)\s*\(|(\w+)\s+(\w+)\s*\()/);
    if (methM && !typeM) {
      const mods = [];
      // Collect modifiers from match
      const modRe = /^(public|private|protected|static|final|abstract|synchronized)\s+/g;
      let rest = trimmed;
      let mod;
      while ((mod = modRe.exec(rest)) !== null) {
        mods.push(mod[1]);
        rest = rest.slice(mod[0].length);
        modRe.lastIndex = 0;
      }
      const methodName = methM[2] || methM[4];
      const looksLikeTopLevelCall = !currentType && methM[4] && !mods.length;
      if (methodName && !looksLikeTopLevelCall && !['if', 'while', 'for', 'switch', 'catch', 'return'].includes(methodName)) {
        methods.push({
          name: methodName,
          mods,
          ret: methM[2] ? 'def' : methM[3],
          params: parseParams(trimmed),
          signature: trimmed.replace(/\s*\{\s*$/, ''),
          line: i + 1,
          owner: currentType?.name || null,
          docs: currentDocs.join(' '),
          annotations: currentAnnotations,
          bodyLines: methodLength(lines, i),
        });
        currentDocs = [];
        currentAnnotations = [];
      }
    }

    // Closures: { -> or { args ->
    const closureMatches = trimmed.match(/\{[^}]*->/g);
    if (closureMatches) closureCount += closureMatches.length;
    if (currentType) currentTypeDepth += braceDelta(line);
  }

  return { pkg, imports, types, methods, annotations: uniqueAnnotations(annotations), closureCount };
}

function groupImports(imports) {
  const groups = {};
  for (const imp of imports) {
    const parts = imp.name.split('.');
    const prefix = parts.length >= 2 ? parts.slice(0, 2).join('.') : parts[0];
    if (!groups[prefix]) groups[prefix] = [];
    groups[prefix].push(imp);
  }
  return groups;
}

function collectGroovydoc(lines, start) {
  const docs = [];
  for (let i = start; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.endsWith('*/')) return { docs, end: i };
    const cleaned = line.replace(/^\/\*\*?/, '').replace(/^\*\s?/, '').trim();
    if (cleaned && !cleaned.startsWith('@')) docs.push(cleaned);
  }
  return { docs, end: start };
}

function braceDelta(line) {
  const cleaned = line.replace(/'([^'\\]|\\.)*'/g, "''").replace(/"([^"\\]|\\.)*"/g, '""');
  return (cleaned.match(/\{/g) || []).length - (cleaned.match(/\}/g) || []).length;
}

function parseParams(signature) {
  const m = signature.match(/\(([^)]*)\)/);
  if (!m) return [];
  return m[1].split(',').map((p) => p.trim()).filter(Boolean);
}

function methodLength(lines, start) {
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

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'gr-section';
  const hd = document.createElement('div');
  hd.className = 'gr-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'gr-list';
  sec.appendChild(ul);
  return ul;
}

function tag(cls, text) {
  const span = document.createElement('span');
  span.className = 'gr-tag ' + (cls || '');
  span.textContent = text;
  span.title = tagHint(text);
  return span;
}

function tagHint(text) {
  const hints = {
    class: 'Groovy class; may contain fields, constructors, methods, and dynamic members.',
    interface: 'Contract of methods that implementing classes must provide.',
    trait: 'Reusable behavior mixed into classes.',
    enum: 'Closed set of named constants.',
    static: 'Member belongs to the class rather than an instance.',
    private: 'Visible only inside the declaring type.',
    protected: 'Visible to subclasses and package peers.',
    public: 'Public API member.',
  };
  return hints[text] || '';
}

function annotationHint(name) {
  const hints = {
    CompileStatic: 'Compile with static type checking and static dispatch where possible.',
    ToString: 'Generates a toString() implementation from selected properties/fields.',
    Immutable: 'Generates immutable value-object behavior.',
    TypeChecked: 'Enables static type checking while keeping Groovy dispatch.',
  };
  return hints[name] || 'Groovy annotation';
}

function addDocs(li, docs) {
  if (!docs) return;
  const doc = document.createElement('span');
  doc.className = 'gr-doc-comment';
  doc.textContent = docs;
  li.appendChild(doc);
}

function highlightGroovyLine(line) {
  if (/^\s*(\/\/|\/\*|\*)/.test(line)) return `<span class="gr-source-comment">${esc(line)}</span>`;
  let out = esc(line);
  out = out.replace(/(&#39;[^&]*?&#39;|&quot;[^&]*?&quot;)/g, '<span class="gr-source-string">$1</span>');
  out = out.replace(/\b(package|import|class|interface|trait|enum|def|static|private|public|protected|return|if|throw|new|implements)\b/g, '<span class="gr-source-keyword">$1</span>');
  out = out.replace(/\b(String|List|Number|Logger|Level|Math|Double|Integer|int|double)\b/g, '<span class="gr-source-type">$1</span>');
  return out;
}

export async function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
  const isScript = name.endsWith('.gsh');
  const hasClass = /\bclass\b/.test(text);

  const { pkg, imports, types, methods, annotations, closureCount } = analyzeGroovy(text);

  const badgeLabel = isScript ? 'Groovy Script' : (hasClass ? 'Groovy Class' : 'Groovy');

  const host = document.createElement('div');
  host.className = 'gr-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);
  ensureKnownUiStyle(host);

  // Title
  const title = document.createElement('div');
  title.className = 'gr-title';
  const badge = document.createElement('span');
  badge.className = 'gr-badge';
  badge.textContent = badgeLabel;
  title.appendChild(badge);
  if (pkg) {
    const pkgSpan = document.createElement('span');
    pkgSpan.className = 'gr-pkg';
    pkgSpan.appendChild(sourceButton(pkg.name, pkg.line, 'Open package declaration in source'));
    title.appendChild(pkgSpan);
  }
  host.appendChild(title);

  // Subtitle
  const sub = document.createElement('div');
  sub.className = 'gr-sub';
  const parts = [];
  parts.push(`${imports.length} import${imports.length !== 1 ? 's' : ''}`);
  parts.push(`${types.length} type${types.length !== 1 ? 's' : ''}`);
  parts.push(`${methods.length} method${methods.length !== 1 ? 's' : ''}`);
  if (closureCount > 0) parts.push(`${closureCount} closure${closureCount !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'gr-cards';
  const cardItems = [
    { value: imports.length, label: 'Imports' },
    { value: types.length, label: 'Types' },
    { value: methods.length, label: 'Methods' },
    { value: closureCount, label: 'Closures' },
  ];
  if (annotations.length > 0) cardItems.push({ value: annotations.length, label: 'Annotations' });
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'gr-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Imports (grouped by prefix)
  if (imports.length > 0) {
    const groups = groupImports(imports);
    const groupEntries = Object.entries(groups);
    const sec = makeSection(host, `Imports (${imports.length})`);
    const ul = makeList(sec);
    const MAX = 6;
    let shown = 0;
    for (const [prefix, imps] of groupEntries) {
      if (shown >= MAX) break;
      const li = document.createElement('li');
      li.appendChild(chip(imps.some((imp) => imp.static) ? 'static/import' : 'import', 'info'));
      li.appendChild(sourceButton(imps.length > 1 ? `${prefix}.* (${imps.length})` : imps[0].name, imps[0].line, 'Open import in source'));
      ul.appendChild(li);
      shown++;
    }
    if (imports.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${imports.length - shown} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Types
  if (types.length > 0) {
    const sec = makeSection(host, `Types (${types.length})`);
    const ul = makeList(sec);
    for (const { kind, name: tname, line, docs, annotations: anns } of types) {
      const li = document.createElement('li');
      const cls = kind === 'trait' ? 'gr-tag-trait' : kind === 'interface' ? 'gr-tag-interface' : kind === 'enum' ? 'gr-tag-enum' : 'gr-tag-class';
      li.appendChild(tag(cls, kind));
      for (const ann of anns) li.appendChild(chip('@' + ann.name, 'info', annotationHint(ann.name)));
      li.appendChild(sourceButton(tname, line, 'Open type declaration in source'));
      addDocs(li, docs);
      ul.appendChild(li);
    }
  }

  // Methods
  if (methods.length > 0) {
    const sec = makeSection(host, `Methods (${methods.length})`);
    const ul = makeList(sec);
    for (const method of methods) {
      const li = document.createElement('li');
      for (const mod of method.mods) {
        const cls = mod === 'private' ? 'gr-tag-private' : mod === 'protected' ? 'gr-tag-protected' : mod === 'static' ? 'gr-tag-static' : mod === 'public' ? 'gr-tag-public' : 'gr-tag';
        li.appendChild(tag(cls, mod));
        li.appendChild(document.createTextNode(' '));
      }
      for (const ann of method.annotations) li.appendChild(chip('@' + ann.name, 'info', annotationHint(ann.name)));
      li.appendChild(sourceButton(method.name, method.line, 'Open method in source'));
      li.appendChild(chip(`returns ${method.ret}`, 'info'));
      li.appendChild(chip(`arity ${method.params.length}`, 'muted'));
      if (method.owner) li.appendChild(chip(`in ${method.owner}`, 'muted'));
      li.appendChild(chip(`${method.bodyLines} lines`, method.bodyLines > 25 ? 'warn' : 'muted'));
      const sig = document.createElement('span');
      sig.className = 'gr-sig';
      sig.textContent = method.signature;
      li.appendChild(sig);
      for (const param of method.params) li.appendChild(chip(param, 'muted', 'Parameter from the method signature.'));
      addDocs(li, method.docs);
      ul.appendChild(li);
    }
  }

  // Annotations
  if (annotations.length > 0) {
    const sec = makeSection(host, `Annotations (${annotations.length})`);
    const ul = makeList(sec);
    for (const ann of annotations) {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.className = 'gr-ann';
      span.textContent = '@' + ann.name;
      span.title = annotationHint(ann.name);
      li.appendChild(span);
      if (ann.args) li.appendChild(chip(ann.args, 'muted'));
      li.appendChild(sourceButton(`line ${ann.line}`, ann.line, 'Open annotation in source'));
      ul.appendChild(li);
    }
  }

  host.appendChild(sourcePreview(text, { title: 'Source', collapsed: true, idPrefix: 'groovy-line', highlighter: highlightGroovyLine }));
  wireSourceLinks(host, { idPrefix: 'groovy-line' });

  return { parentNode: host };
}
