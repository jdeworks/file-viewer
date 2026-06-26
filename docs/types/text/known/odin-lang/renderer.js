import { chip, ensureKnownUiStyle, esc, sourceButton, sourcePreview, wireSourceLinks } from '../../../../core/known-ui.js';

const CSS = `
.odin-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.odin-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#3d8bc9;color:#fff;vertical-align:middle;margin-right:8px;}
.odin-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.odin-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.odin-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.odin-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.odin-card strong{display:block;font-size:1.2rem;font-weight:700;}
.odin-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.odin-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.odin-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.odin-list{margin:0;padding:0;list-style:none;}
.odin-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.odin-list li:last-child{border-bottom:none;}
.odin-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#e0f2fe;color:#0369a1;font-weight:700;}
.odin-tag-proc{background:#dcfce7;color:#166534;}
.odin-tag-struct{background:#ede9fe;color:#7c3aed;}
.odin-tag-enum{background:#fef9c3;color:#854d0e;}
.odin-tag-union{background:#ffe4e6;color:#9f1239;}
.odin-tag-cc{background:#f1f5f9;color:#475569;font-style:italic;}
.odin-pkg{font-family:ui-monospace,monospace;font-size:13px;color:#3d8bc9;font-weight:700;}
.odin-sig{font-family:ui-monospace,monospace;white-space:normal;overflow-wrap:anywhere;}
.odin-source-keyword{color:#3d8bc9;font-weight:700;}
.odin-source-type{color:#7c3aed;font-weight:600;}
.odin-source-string{color:#b45309;}
.odin-source-comment{color:var(--fg-2,#6e7681);font-style:italic;}
`;

function analyzeOdin(text) {
  const lines = text.split(/\r?\n/);
  let pkg = null;
  const imports = [];
  const procs = [];
  const structs = [];
  const unions = [];
  const enums = [];
  const whens = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) continue;

    // Package
    const pkgM = trimmed.match(/^package\s+(\w+)/);
    if (pkgM && !pkg) { pkg = { name: pkgM[1], line: i + 1 }; continue; }

    // Import
    const impM = trimmed.match(/^import\s+(?:(\w+)\s+)?"([^"]+)"/);
    if (impM) { imports.push({ alias: impM[1] || null, path: impM[2], line: i + 1 }); continue; }

    // Proc definitions — detect calling convention: proc "c" { or proc(...)
    const procM = trimmed.match(/^(\w+)\s*::\s*proc(?:\s*"([^"]+)")?\s*\(([^)]*)\)\s*(?:->\s*([^{]+))?/);
    if (procM) {
      procs.push({
        name: procM[1],
        cc: procM[2] || null,
        params: splitParams(procM[3] || ''),
        ret: (procM[4] || '').trim(),
        signature: trimmed.replace(/\s*\{\s*$/, ''),
        line: i + 1,
        bodyLines: blockLength(lines, i),
        inWhen: whens.at(-1)?.line === i ? true : false,
      });
      continue;
    }

    // Struct
    const structM = trimmed.match(/^(\w+)\s*::\s*struct/);
    if (structM) { structs.push({ name: structM[1], line: i + 1, fields: countMembers(lines, i) }); continue; }

    // Union
    const unionM = trimmed.match(/^(\w+)\s*::\s*union/);
    if (unionM) { unions.push({ name: unionM[1], line: i + 1, members: countMembers(lines, i) }); continue; }

    // Enum
    const enumM = trimmed.match(/^(\w+)\s*::\s*enum/);
    if (enumM) { enums.push({ name: enumM[1], line: i + 1, members: countMembers(lines, i) }); continue; }

    // when compile-time condition
    const whenM = trimmed.match(/^when\s+(.+?)\s*\{/);
    if (whenM) { whens.push({ condition: whenM[1].trim(), line: i + 1 }); continue; }
  }

  return { pkg, imports, procs, structs, unions, enums, whens };
}

function splitParams(text) {
  return String(text || '').split(',').map((s) => s.trim()).filter(Boolean);
}

function blockLength(lines, start) {
  let depth = 0;
  let opened = false;
  let count = 0;
  for (let i = start; i < lines.length; i++) {
    const line = stripStrings(lines[i]);
    if (line.includes('{')) opened = true;
    if (opened && i > start && lines[i].trim()) count++;
    depth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
    if (opened && depth <= 0) return Math.max(0, count - 1);
  }
  return count;
}

function countMembers(lines, start) {
  let count = 0;
  for (let i = start + 1; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/^\}/.test(trimmed)) return count;
    if (trimmed && !trimmed.startsWith('//')) count++;
  }
  return count;
}

function stripStrings(line) {
  return line.replace(/"([^"\\]|\\.)*"/g, '""');
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'odin-section';
  const hd = document.createElement('div');
  hd.className = 'odin-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'odin-list';
  sec.appendChild(ul);
  return ul;
}

function makeTag(cls, text) {
  const span = document.createElement('span');
  span.className = cls;
  span.textContent = text;
  span.title = tagHint(text);
  return span;
}

function tagHint(text) {
  if (/^"/.test(text)) return 'Calling convention for external ABI compatibility.';
  const hints = {
    proc: 'Procedure declaration.',
    struct: 'Aggregate data type with named fields.',
    enum: 'Closed set of named values.',
    union: 'Value that can hold one of several listed types.',
    when: 'Compile-time conditional block.',
  };
  return hints[text] || '';
}

function highlightOdinLine(line) {
  if (/^\s*\/\//.test(line)) return `<span class="odin-source-comment">${esc(line)}</span>`;
  let out = esc(line);
  out = out.replace(/&quot;[^&]*?&quot;/g, '<span class="odin-source-string">$&</span>');
  out = out.replace(/\b(package|import|proc|struct|enum|union|when|else|return|for|if|nil|in)\b/g, '<span class="odin-source-keyword">$1</span>');
  out = out.replace(/\b(f32|i32|int|string|bool|rawptr|Vector2|Vector3|World|Entity)\b/g, '<span class="odin-source-type">$1</span>');
  return out;
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const { pkg, imports, procs, structs, unions, enums, whens } = analyzeOdin(text);

  const host = document.createElement('div');
  host.className = 'odin-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);
  ensureKnownUiStyle(host);

  // Title
  const title = document.createElement('div');
  title.className = 'odin-title';
  const badge = document.createElement('span');
  badge.className = 'odin-badge';
  badge.textContent = 'Odin Package';
  title.appendChild(badge);
  if (pkg) {
    const pkgSpan = document.createElement('span');
    pkgSpan.className = 'odin-pkg';
    pkgSpan.appendChild(sourceButton(pkg.name, pkg.line, 'Open package declaration in source'));
    title.appendChild(pkgSpan);
  }
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'odin-sub';
  const parts = [];
  if (pkg) parts.push('package ' + pkg.name);
  parts.push(`${imports.length} import${imports.length !== 1 ? 's' : ''}`);
  parts.push(`${procs.length} proc${procs.length !== 1 ? 's' : ''}`);
  parts.push(`${structs.length} struct${structs.length !== 1 ? 's' : ''}`);
  if (whens.length > 0) parts.push(`${whens.length} when condition${whens.length !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'odin-cards';
  const cardItems = [
    { value: pkg?.name || '—', label: 'Package' },
    { value: imports.length, label: 'Imports' },
    { value: procs.length, label: 'Procs' },
    { value: structs.length, label: 'Structs' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'odin-card';
    const strong = document.createElement('strong');
    if (label === 'Package' && pkg) strong.className = 'odin-pkg';
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
    const MAX = 6;
    const shown = imports.slice(0, MAX);
    const sec = makeSection(host, `Imports (${imports.length})`);
    const ul = makeList(sec);
    for (const { alias, path, line } of shown) {
      const li = document.createElement('li');
      if (alias) {
        li.appendChild(makeTag('odin-tag', alias));
        li.appendChild(document.createTextNode(' '));
      }
      li.appendChild(sourceButton(path, line, 'Open import in source'));
      ul.appendChild(li);
    }
    if (imports.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${imports.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Procs
  if (procs.length > 0) {
    const sec = makeSection(host, `Procedures (${procs.length})`);
    const ul = makeList(sec);
    for (const proc of procs) {
      const li = document.createElement('li');
      li.appendChild(makeTag('odin-tag odin-tag-proc', 'proc'));
      li.appendChild(sourceButton(proc.name, proc.line, 'Open procedure in source'));
      li.appendChild(chip(`arity ${proc.params.length}`, 'muted'));
      if (proc.ret) li.appendChild(chip(`returns ${proc.ret}`, 'info'));
      li.appendChild(chip(`${proc.bodyLines} lines`, proc.bodyLines > 20 ? 'warn' : 'muted'));
      if (proc.cc) {
        li.appendChild(document.createTextNode(' '));
        li.appendChild(makeTag('odin-tag odin-tag-cc', '"' + proc.cc + '"'));
      }
      const sig = document.createElement('span');
      sig.className = 'odin-sig';
      sig.textContent = proc.signature;
      li.appendChild(sig);
      for (const param of proc.params) li.appendChild(chip(param, 'muted', 'Parameter from the procedure signature.'));
      ul.appendChild(li);
    }
  }

  // Structs
  if (structs.length > 0) {
    const sec = makeSection(host, `Structs (${structs.length})`);
    const ul = makeList(sec);
    for (const item of structs) {
      const li = document.createElement('li');
      li.appendChild(makeTag('odin-tag odin-tag-struct', 'struct'));
      li.appendChild(sourceButton(item.name, item.line, 'Open struct in source'));
      li.appendChild(chip(`${item.fields} field${item.fields !== 1 ? 's' : ''}`, 'info'));
      ul.appendChild(li);
    }
  }

  // Unions
  if (unions.length > 0) {
    const sec = makeSection(host, `Unions (${unions.length})`);
    const ul = makeList(sec);
    for (const item of unions) {
      const li = document.createElement('li');
      li.appendChild(makeTag('odin-tag odin-tag-union', 'union'));
      li.appendChild(sourceButton(item.name, item.line, 'Open union in source'));
      li.appendChild(chip(`${item.members} member${item.members !== 1 ? 's' : ''}`, 'info'));
      ul.appendChild(li);
    }
  }

  // Enums
  if (enums.length > 0) {
    const sec = makeSection(host, `Enums (${enums.length})`);
    const ul = makeList(sec);
    for (const item of enums) {
      const li = document.createElement('li');
      li.appendChild(makeTag('odin-tag odin-tag-enum', 'enum'));
      li.appendChild(sourceButton(item.name, item.line, 'Open enum in source'));
      li.appendChild(chip(`${item.members} value${item.members !== 1 ? 's' : ''}`, 'info'));
      ul.appendChild(li);
    }
  }

  // When conditions
  if (whens.length > 0) {
    const sec = makeSection(host, `Compile-time When (${whens.length})`);
    const ul = makeList(sec);
    for (const item of whens) {
      const li = document.createElement('li');
      li.appendChild(makeTag('odin-tag', 'when'));
      li.appendChild(sourceButton(item.condition, item.line, 'Open compile-time when in source'));
      li.appendChild(chip(`line ${item.line}`, 'muted'));
      ul.appendChild(li);
    }
  }

  host.appendChild(sourcePreview(text, { title: 'Source', collapsed: true, idPrefix: 'odin-line', highlighter: highlightOdinLine }));
  wireSourceLinks(host, { idPrefix: 'odin-line' });

  return { parentNode: host };
}
