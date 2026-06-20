const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.red-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.red-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e74c3c;color:#fff;vertical-align:middle;margin-right:8px;}
.red-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.red-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.red-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.red-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.red-card strong{display:block;font-size:1.2rem;font-weight:700;}
.red-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.red-section{margin:16px 0;}
.red-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.red-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.red-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.red-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.red-table tr:last-child td{border-bottom:none;}
.red-tag{display:inline-block;padding:1px 6px;border-radius:4px;font-size:11px;background:var(--bg-2,#f0f0f0);margin:1px 2px;font-family:ui-monospace,monospace;}
.red-meta{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px;}
.red-meta dt{font-weight:600;color:var(--fg-2,#666);font-size:11px;text-transform:uppercase;}
.red-meta dd{margin:0 0 6px;font-family:ui-monospace,monospace;}
`;

function parseRed(text) {
  const lines = (text || '').split(/\r?\n/);
  let scriptTitle = null;
  let scriptAuthor = null;
  let scriptVersion = null;
  const functions = [];
  const contexts = [];

  // Extract Red [ ... ] header block (may span multiple lines)
  const fullText = text || '';
  const headerMatch = fullText.match(/Red\s*\[([\s\S]*?)\]/);
  if (headerMatch) {
    const header = headerMatch[1];
    const titleMatch = header.match(/Title:\s*"([^"]+)"/i);
    if (titleMatch) scriptTitle = titleMatch[1];
    const authorMatch = header.match(/Author:\s*"([^"]+)"/i);
    if (authorMatch) scriptAuthor = authorMatch[1];
    const versionMatch = header.match(/Version:\s*([^\s\]]+)/i);
    if (versionMatch) scriptVersion = versionMatch[1];
  }

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith(';')) continue;

    // name: func [ ... or name: function [ ...
    const funcMatch = t.match(/^(\S+):\s*(?:func|function)\s*\[/i);
    if (funcMatch && funcMatch[1] !== 'Red') functions.push(funcMatch[1]);

    // name: context [ ... or name: object [ ...
    const ctxMatch = t.match(/^(\S+):\s*(?:context|object)\s*\[/i);
    if (ctxMatch) {
      if (!contexts.includes(ctxMatch[1])) contexts.push(ctxMatch[1]);
    }
  }

  return { scriptTitle, scriptAuthor, scriptVersion, functions, contexts };
}

export function render(intake) {
  const parsed = parseRed(intake.text || '');
  const { scriptTitle, scriptAuthor, scriptVersion, functions, contexts } = parsed;

  const host = document.createElement('div');
  host.className = 'red-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'red-title';
  title.innerHTML = `<span class="red-badge">Red</span>${esc(scriptTitle || 'Script')}`;
  host.appendChild(title);

  const parts = [`${functions.length} function${functions.length !== 1 ? 's' : ''}`];
  if (contexts.length) parts.push(`${contexts.length} context${contexts.length !== 1 ? 's' : ''}`);

  const sub = document.createElement('div');
  sub.className = 'red-sub';
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'red-summary';
  const cards = [
    { value: functions.length, label: 'Functions' },
    { value: contexts.length, label: 'Contexts' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'red-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Script metadata
  if (scriptTitle || scriptAuthor || scriptVersion) {
    const sec = document.createElement('div');
    sec.className = 'red-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Script Header';
    sec.appendChild(h3);
    const dl = document.createElement('dl');
    dl.className = 'red-meta';
    if (scriptTitle) {
      const dt = document.createElement('dt');
      dt.textContent = 'Title';
      const dd = document.createElement('dd');
      dd.textContent = scriptTitle;
      dl.appendChild(dt);
      dl.appendChild(dd);
    }
    if (scriptAuthor) {
      const dt = document.createElement('dt');
      dt.textContent = 'Author';
      const dd = document.createElement('dd');
      dd.textContent = scriptAuthor;
      dl.appendChild(dt);
      dl.appendChild(dd);
    }
    if (scriptVersion) {
      const dt = document.createElement('dt');
      dt.textContent = 'Version';
      const dd = document.createElement('dd');
      dd.textContent = scriptVersion;
      dl.appendChild(dt);
      dl.appendChild(dd);
    }
    sec.appendChild(dl);
    host.appendChild(sec);
  }

  // Functions
  if (functions.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'red-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Functions';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'red-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const name of functions.slice(0, 40)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(name)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Contexts/Objects
  if (contexts.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'red-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Context / Object Blocks';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'red-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const name of contexts.slice(0, 20)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(name)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  return { parentNode: host };
}
