const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.chpl-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.chpl-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#16a34a;color:#fff;vertical-align:middle;margin-right:8px;}
.chpl-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.chpl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.chpl-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.chpl-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.chpl-card strong{display:block;font-size:1.2rem;font-weight:700;}
.chpl-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.chpl-section{margin:16px 0;}
.chpl-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.chpl-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.chpl-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.chpl-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.chpl-table tr:last-child td{border-bottom:none;}
.chpl-pre{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:14px;overflow:auto;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;margin-top:16px;white-space:pre-wrap;word-break:break-word;}
.chpl-kw{color:#1d4ed8;font-weight:700;}
.chpl-parallel{color:#7c3aed;font-weight:600;}
.chpl-str{color:#b91c1c;}
.chpl-num{color:#059669;}
.chpl-comment{color:#888;font-style:italic;}
`;

const CHAPEL_KWS = [
  'module', 'proc', 'iter', 'class', 'record', 'union', 'enum',
  'var', 'const', 'param', 'type', 'config',
  'if', 'else', 'while', 'do', 'for', 'select', 'when', 'otherwise',
  'return', 'yield', 'break', 'continue',
  'new', 'delete', 'owned', 'shared', 'borrowed', 'unmanaged',
  'sync', 'single', 'atomic', 'serial',
  'begin', 'cobegin', 'coforall', 'forall', 'on', 'local',
  'use', 'import', 'require',
  'inline', 'export', 'extern', 'override', 'throws', 'try', 'catch', 'throw',
  'nil', 'true', 'false',
  'int', 'uint', 'real', 'imag', 'complex', 'bool', 'string', 'bytes',
  'domain', 'range', 'locale', 'nothing', 'void',
];

const PARALLEL_KWS = ['coforall', 'forall', 'cobegin', 'on', 'begin', 'sync', 'atomic'];

function parseChapel(text) {
  const lines = (text || '').split(/\r?\n/);
  const procs = [];
  const configVars = [];
  const modules = [];
  let coforallCount = 0;
  let forallCount = 0;

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('//') || t.startsWith('/*')) continue;

    const modMatch = t.match(/^module\s+(\w+)/);
    if (modMatch && !modules.includes(modMatch[1])) modules.push(modMatch[1]);

    const procMatch = t.match(/^(?:inline\s+|override\s+|private\s+|public\s+)?(?:export\s+)?proc\s+(\S+)\s*[\(<]/);
    if (procMatch) procs.push(procMatch[1]);

    const iterMatch = t.match(/^(?:inline\s+)?iter\s+(\S+)\s*[\(<]/);
    if (iterMatch) procs.push(`${iterMatch[1]} (iter)`);

    const configMatch = t.match(/^config\s+(?:const|var|param)\s+(\w+)/);
    if (configMatch) {
      const valueMatch = t.match(/=\s*(.+?)\s*;?\s*$/);
      configVars.push({ name: configMatch[1], value: valueMatch ? valueMatch[1] : '' });
    }

    if (/\bcoforall\b/.test(t)) coforallCount++;
    if (/\bforall\b/.test(t)) forallCount++;
  }

  return { procs, configVars, modules, coforallCount, forallCount };
}

function highlightChapelLine(line) {
  if (!line) return '';
  let out = esc(line);
  // Strings
  out = out.replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;)/g, '<span class="chpl-str">$1</span>');
  // Numbers
  out = out.replace(/\b(\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b/g, '<span class="chpl-num">$1</span>');
  // Parallel keywords (highlight first, more specific)
  for (const kw of PARALLEL_KWS) {
    const re = new RegExp(`(?<![\\w])(${kw})(?![\\w])`, 'g');
    out = out.replace(re, `<span class="chpl-parallel">$1</span>`);
  }
  // Regular keywords (longest first)
  const sorted = CHAPEL_KWS.filter((k) => !PARALLEL_KWS.includes(k)).sort((a, b) => b.length - a.length);
  for (const kw of sorted) {
    const re = new RegExp(`(?<![\\w])(${kw})(?![\\w])`, 'g');
    out = out.replace(re, '<span class="chpl-kw">$1</span>');
  }
  return out;
}

function highlightChapel(text) {
  const lines = text.split(/\r?\n/);
  const result = [];
  let inBlockComment = false;

  for (const line of lines) {
    if (inBlockComment) {
      const endIdx = line.indexOf('*/');
      if (endIdx >= 0) {
        result.push(`<span class="chpl-comment">${esc(line.slice(0, endIdx + 2))}</span>` + highlightChapelLine(line.slice(endIdx + 2)));
        inBlockComment = false;
      } else {
        result.push(`<span class="chpl-comment">${esc(line)}</span>`);
      }
      continue;
    }

    const blockStart = line.indexOf('/*');
    if (blockStart >= 0) {
      const blockEnd = line.indexOf('*/', blockStart + 2);
      if (blockEnd >= 0) {
        result.push(highlightChapelLine(line.slice(0, blockStart)) + `<span class="chpl-comment">${esc(line.slice(blockStart, blockEnd + 2))}</span>` + highlightChapelLine(line.slice(blockEnd + 2)));
      } else {
        result.push(highlightChapelLine(line.slice(0, blockStart)) + `<span class="chpl-comment">${esc(line.slice(blockStart))}</span>`);
        inBlockComment = true;
      }
      continue;
    }

    const lcIdx = line.indexOf('//');
    if (lcIdx >= 0) {
      result.push(highlightChapelLine(line.slice(0, lcIdx)) + `<span class="chpl-comment">${esc(line.slice(lcIdx))}</span>`);
      continue;
    }
    result.push(highlightChapelLine(line));
  }
  return result.join('\n');
}

export function render(intake) {
  const { procs, configVars, modules, coforallCount, forallCount } = parseChapel(intake.text || '');

  const host = document.createElement('div');
  host.className = 'chpl-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const moduleName = modules[0] || '';
  const title = document.createElement('div');
  title.className = 'chpl-title';
  title.innerHTML = `<span class="chpl-badge">Chapel</span>${moduleName ? esc(moduleName) : 'Source File'}`;
  host.appendChild(title);

  const parallelTotal = coforallCount + forallCount;
  const parts = [];
  if (modules.length) parts.push(`module ${modules[0]}`);
  parts.push(`${procs.length} proc${procs.length !== 1 ? 's' : ''}`);
  if (configVars.length) parts.push(`${configVars.length} config var${configVars.length !== 1 ? 's' : ''}`);
  if (parallelTotal) parts.push(`${parallelTotal} parallel construct${parallelTotal !== 1 ? 's' : ''}`);

  const sub = document.createElement('div');
  sub.className = 'chpl-sub';
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'chpl-summary';
  const cards = [
    { value: procs.length, label: 'Procs' },
    { value: configVars.length, label: 'Config vars' },
    { value: coforallCount, label: 'coforall' },
    { value: forallCount, label: 'forall' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'chpl-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Procs table
  if (procs.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'chpl-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Procedures';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'chpl-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const name of procs.slice(0, 40)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(name)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Config vars table
  if (configVars.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'chpl-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Config Variables';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'chpl-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th><th>Default</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const { name, value } of configVars.slice(0, 30)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(name)}</td><td>${esc(value) || '<span style="color:var(--fg-2,#aaa)">—</span>'}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Syntax-highlighted source
  const pre = document.createElement('pre');
  pre.className = 'chpl-pre';
  pre.innerHTML = highlightChapel(intake.text || '');
  host.appendChild(pre);

  return { parentNode: host };
}
