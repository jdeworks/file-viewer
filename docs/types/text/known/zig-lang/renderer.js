const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.zig-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.zig-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f7a41d;color:#1a1a1a;vertical-align:middle;margin-right:8px;}
.zig-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.zig-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.zig-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.zig-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.zig-card strong{display:block;font-size:1.2rem;font-weight:700;}
.zig-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.zig-section{margin:16px 0;}
.zig-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.zig-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.zig-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.zig-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.zig-table tr:last-child td{border-bottom:none;}
.zig-pre{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:14px;overflow:auto;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;margin-top:16px;white-space:pre-wrap;word-break:break-word;}
.zig-kw{color:#1d4ed8;font-weight:700;}
.zig-builtin{color:#7c3aed;}
.zig-str{color:#b91c1c;}
.zig-num{color:#059669;}
.zig-comment{color:#888;font-style:italic;}
.zig-type{color:#0f766e;}
`;

const ZIG_KWS = [
  'const', 'var', 'fn', 'pub', 'return', 'if', 'else', 'while', 'for', 'switch',
  'try', 'catch', 'defer', 'errdefer', 'comptime', 'inline', 'extern', 'export',
  'struct', 'union', 'enum', 'error', 'packed', 'test', 'unreachable', 'undefined',
  'null', 'true', 'false', 'void', 'noreturn', 'anytype', 'anyerror', 'async',
  'await', 'suspend', 'resume', 'nosuspend', 'allowzero', 'volatile', 'align',
  'linksection', 'addrspace', 'threadlocal', 'usingnamespace', 'break', 'continue',
];

function parseZig(text) {
  const lines = (text || '').split(/\r?\n/);
  const pubFns = [];
  const structs = [];
  const errorSets = [];
  const imports = [];
  let testCount = 0;

  for (const line of lines) {
    const t = line.trim();
    // Skip comments
    if (t.startsWith('//')) continue;

    // pub fn declarations
    const pubFnMatch = t.match(/^pub\s+fn\s+(\w+)\s*\([^)]*\)\s*([^{]+)?/);
    if (pubFnMatch) {
      const name = pubFnMatch[1];
      const retType = (pubFnMatch[2] || '').replace(/\s*\{?\s*$/, '').trim();
      pubFns.push({ name, retType: retType || 'void' });
    }

    // struct declarations: const Foo = struct {
    const structMatch = t.match(/^(?:pub\s+)?const\s+(\w+)\s*=\s*(?:packed\s+|extern\s+)?struct\s*[({]/);
    if (structMatch) structs.push(structMatch[1]);

    // error sets: const E = error {
    const errorMatch = t.match(/^(?:pub\s+)?const\s+(\w+)\s*=\s*error\s*\{/);
    if (errorMatch) errorSets.push(errorMatch[1]);

    // @import
    const importMatch = t.match(/@import\s*\(\s*"([^"]+)"\s*\)/);
    if (importMatch && !imports.includes(importMatch[1])) imports.push(importMatch[1]);

    // test blocks
    if (/^test\s+"[^"]*"\s*\{/.test(t) || /^test\s+\{/.test(t)) testCount++;
  }

  return { pubFns, structs, errorSets, imports, testCount };
}

function highlightZigLine(line) {
  if (!line) return '';
  let out = esc(line);

  // Strings (after escaping)
  out = out.replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;)/g, '<span class="zig-str">$1</span>');
  // Numbers
  out = out.replace(/\b(0x[\dA-Fa-f_]+|0o[0-7_]+|0b[01_]+|\d[\d_]*(?:\.[\d_]+)?(?:e[+-]?\d+)?)\b/g, '<span class="zig-num">$1</span>');
  // Builtin functions @foo
  out = out.replace(/(@\w+)/g, '<span class="zig-builtin">$1</span>');
  // Primitive types
  out = out.replace(/\b(i8|i16|i32|i64|i128|u8|u16|u32|u64|u128|f16|f32|f64|f128|bool|usize|isize|comptime_int|comptime_float)\b/g, '<span class="zig-type">$1</span>');

  // Keywords (longest first to avoid partial matches)
  const sorted = [...ZIG_KWS].sort((a, b) => b.length - a.length);
  for (const kw of sorted) {
    const re = new RegExp(`(?<![\\w@])(${kw})(?![\\w])`, 'g');
    out = out.replace(re, '<span class="zig-kw">$1</span>');
  }

  return out;
}

function highlightZig(text) {
  const lines = text.split(/\r?\n/);
  const result = [];

  for (const line of lines) {
    // Line comments
    const lcIdx = line.indexOf('//');
    if (lcIdx >= 0) {
      result.push(highlightZigLine(line.slice(0, lcIdx)) + `<span class="zig-comment">${esc(line.slice(lcIdx))}</span>`);
      continue;
    }
    result.push(highlightZigLine(line));
  }

  return result.join('\n');
}

export function render(intake) {
  const parsed = parseZig(intake.text || '');
  const { pubFns, structs, errorSets, imports, testCount } = parsed;

  const host = document.createElement('div');
  host.className = 'zig-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'zig-title';
  title.innerHTML = '<span class="zig-badge">Zig</span>Source File';
  host.appendChild(title);

  const parts = [`${pubFns.length} pub fn`];
  if (structs.length) parts.push(`${structs.length} struct${structs.length !== 1 ? 's' : ''}`);
  if (errorSets.length) parts.push(`${errorSets.length} error set${errorSets.length !== 1 ? 's' : ''}`);
  if (testCount) parts.push(`${testCount} test${testCount !== 1 ? 's' : ''}`);
  if (imports.length) parts.push(`${imports.length} import${imports.length !== 1 ? 's' : ''}`);

  const sub = document.createElement('div');
  sub.className = 'zig-sub';
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'zig-summary';
  const cards = [
    { value: pubFns.length, label: 'Public fns' },
    { value: structs.length, label: 'Structs' },
    { value: errorSets.length, label: 'Error sets' },
    { value: testCount, label: 'Tests' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'zig-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Public functions table
  if (pubFns.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'zig-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Public Functions';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'zig-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Function</th><th>Return type</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const fn of pubFns.slice(0, 40)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(fn.name)}</td><td>${esc(fn.retType)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Structs
  if (structs.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'zig-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Structs';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'zig-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const name of structs.slice(0, 30)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(name)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Error sets
  if (errorSets.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'zig-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Error Sets';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'zig-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const name of errorSets.slice(0, 20)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(name)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Imports
  if (imports.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'zig-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Imports';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'zig-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Module</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const imp of imports.slice(0, 20)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(imp)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Syntax-highlighted source
  const pre = document.createElement('pre');
  pre.className = 'zig-pre';
  pre.innerHTML = highlightZig(intake.text || '');
  host.appendChild(pre);

  return { parentNode: host };
}
