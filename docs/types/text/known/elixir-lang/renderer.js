const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ex-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.ex-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#6e4fa2;color:#fff;vertical-align:middle;margin-right:8px;}
.ex-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ex-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ex-module{font-size:14px;font-weight:600;color:var(--fg-2,#555);margin:0 0 14px;font-family:ui-monospace,monospace;}
.ex-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.ex-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.ex-card strong{display:block;font-size:1.2rem;font-weight:700;}
.ex-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.ex-section{margin:16px 0;}
.ex-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.ex-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.ex-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.ex-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.ex-table tr:last-child td{border-bottom:none;}
.ex-moduledoc{background:var(--bg-2,#f6f8fa);border-left:3px solid #6e4fa2;padding:8px 12px;font-size:13px;color:var(--fg-2,#555);margin-bottom:16px;border-radius:0 6px 6px 0;}
.ex-pre{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:14px;overflow:auto;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;margin-top:16px;white-space:pre-wrap;word-break:break-word;}
.ex-kw{color:#6e4fa2;font-weight:700;}
.ex-atom{color:#0f766e;}
.ex-str{color:#b91c1c;}
.ex-num{color:#059669;}
.ex-comment{color:#888;font-style:italic;}
.ex-module-ref{color:#1d4ed8;}
`;

const ELIXIR_KWS = [
  'defmodule', 'def', 'defp', 'defmacro', 'defmacrop', 'defprotocol', 'defimpl',
  'defstruct', 'do', 'end', 'if', 'unless', 'case', 'cond', 'with', 'receive',
  'try', 'catch', 'rescue', 'after', 'for', 'fn', 'true', 'false', 'nil',
  'when', 'and', 'or', 'not', 'in', 'use', 'alias', 'import', 'require',
  'raise', 'throw', 'else',
];

function parseElixir(text) {
  const lines = (text || '').split(/\r?\n/);
  let moduleName = null;
  const pubFns = [];
  let privFnCount = 0;
  const uses = [];
  const aliases = [];
  const imports = [];
  let moduledoc = null;

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('#')) continue;

    // defmodule
    const modMatch = t.match(/^defmodule\s+([\w.]+)\s+do/);
    if (modMatch && !moduleName) moduleName = modMatch[1];

    // @moduledoc
    const moddocMatch = t.match(/^@moduledoc\s+"([^"]{0,200})"/);
    if (moddocMatch && !moduledoc) moduledoc = moddocMatch[1];

    // def / defp
    const defMatch = t.match(/^def\s+(\w+)\s*[\(,]/);
    if (defMatch) {
      if (!pubFns.includes(defMatch[1])) pubFns.push(defMatch[1]);
    }
    const defpMatch = t.match(/^defp\s+\w+/);
    if (defpMatch) privFnCount++;

    // use
    const useMatch = t.match(/^use\s+([\w.]+)/);
    if (useMatch && !uses.includes(useMatch[1])) uses.push(useMatch[1]);

    // alias
    const aliasMatch = t.match(/^alias\s+([\w.]+)/);
    if (aliasMatch && !aliases.includes(aliasMatch[1])) aliases.push(aliasMatch[1]);

    // import
    const importMatch = t.match(/^import\s+([\w.]+)/);
    if (importMatch && !imports.includes(importMatch[1])) imports.push(importMatch[1]);
  }

  return { moduleName, pubFns, privFnCount, uses, aliases, imports, moduledoc };
}

function highlightElixirLine(line) {
  if (!line) return '';
  let out = esc(line);

  // Strings
  out = out.replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;)/g, '<span class="ex-str">$1</span>');
  // Numbers
  out = out.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="ex-num">$1</span>');
  // Module references (capitalized names)
  out = out.replace(/\b([A-Z]\w*(?:\.[A-Z]\w*)*)\b/g, '<span class="ex-module-ref">$1</span>');
  // Atoms :foo
  out = out.replace(/(?<![\\w:])(:(?:[a-z_]\w*|[A-Z]\w*))/g, '<span class="ex-atom">$1</span>');

  // Keywords (longest first)
  const sorted = [...ELIXIR_KWS].sort((a, b) => b.length - a.length);
  for (const kw of sorted) {
    const re = new RegExp(`(?<![\\w])(${kw})(?![\\w])`, 'g');
    out = out.replace(re, '<span class="ex-kw">$1</span>');
  }

  return out;
}

function highlightElixir(text) {
  const lines = text.split(/\r?\n/);
  const result = [];

  for (const line of lines) {
    const lcIdx = line.indexOf('#');
    if (lcIdx >= 0) {
      result.push(highlightElixirLine(line.slice(0, lcIdx)) + `<span class="ex-comment">${esc(line.slice(lcIdx))}</span>`);
      continue;
    }
    result.push(highlightElixirLine(line));
  }

  return result.join('\n');
}

export function render(intake) {
  const parsed = parseElixir(intake.text || '');
  const { moduleName, pubFns, privFnCount, uses, aliases, imports, moduledoc } = parsed;

  const host = document.createElement('div');
  host.className = 'ex-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'ex-title';
  title.innerHTML = '<span class="ex-badge">Elixir</span>Source File';
  host.appendChild(title);

  if (moduleName) {
    const modEl = document.createElement('div');
    modEl.className = 'ex-module';
    modEl.textContent = moduleName;
    host.appendChild(modEl);
  }

  const parts = [`${pubFns.length} public fn${pubFns.length !== 1 ? 's' : ''}`, `${privFnCount} private`];
  if (uses.length) parts.push(`${uses.length} use`);
  if (aliases.length) parts.push(`${aliases.length} alias${aliases.length !== 1 ? 'es' : ''}`);

  const sub = document.createElement('div');
  sub.className = 'ex-sub';
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  if (moduledoc) {
    const docEl = document.createElement('div');
    docEl.className = 'ex-moduledoc';
    docEl.textContent = moduledoc.length > 100 ? moduledoc.slice(0, 100) + '…' : moduledoc;
    host.appendChild(docEl);
  }

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'ex-summary';
  const cards = [
    { value: pubFns.length, label: 'Public fns' },
    { value: privFnCount, label: 'Private fns' },
    { value: uses.length, label: 'Use calls' },
    { value: aliases.length, label: 'Aliases' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'ex-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Public functions
  if (pubFns.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'ex-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Public Functions';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'ex-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Function</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const name of pubFns.slice(0, 40)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(name)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // use / alias / import
  const deps = [...uses.map((u) => ({ kind: 'use', name: u })), ...aliases.map((a) => ({ kind: 'alias', name: a })), ...imports.map((i) => ({ kind: 'import', name: i }))];
  if (deps.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'ex-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Dependencies';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'ex-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Kind</th><th>Module</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const dep of deps.slice(0, 30)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(dep.kind)}</td><td>${esc(dep.name)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Syntax-highlighted source
  const pre = document.createElement('pre');
  pre.className = 'ex-pre';
  pre.innerHTML = highlightElixir(intake.text || '');
  host.appendChild(pre);

  return { parentNode: host };
}
