const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.nmu-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.nmu-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7c3aed;color:#fff;vertical-align:middle;margin-right:8px;}
.nmu-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.nmu-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.nmu-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.nmu-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.nmu-card strong{display:block;font-size:1.2rem;font-weight:700;}
.nmu-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.nmu-section{margin:14px 0;}
.nmu-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.nmu-table{width:100%;border-collapse:collapse;font-size:13px;}
.nmu-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.nmu-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;}
.nmu-table tr:last-child td{border-bottom:none;}
.nmu-kv{font-family:ui-monospace,monospace;font-size:12px;}
.nmu-tag{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:600;background:var(--bg-2,#f0f4f8);border:1px solid var(--border,#d1d5db);margin:1px 2px;}
.nmu-redacted{color:var(--fg-2,#888);font-style:italic;}
`;

function getSetValue(text, key) {
  // Match: set key = "value" or set key = value or set key="value"
  const re = new RegExp(`^\\s*set\\s+${key}\\s*=\\s*["']?([^"'\\n#]+?)["']?\\s*(?:#.*)?$`, 'm');
  const m = text.match(re);
  return m ? m[1].trim() : '';
}

function countPattern(text, re) {
  return (text.match(re) || []).length;
}

export function render(intake) {
  const text = intake.text || '';
  const lines = text.split(/\r?\n/);

  const realname = getSetValue(text, 'realname');
  const from = getSetValue(text, 'from');
  const sidebarVisible = getSetValue(text, 'sidebar_visible');
  const sidebarWidth = getSetValue(text, 'sidebar_width');
  const sidebarFormat = getSetValue(text, 'sidebar_format');
  const spoolfile = getSetValue(text, 'spoolfile') || getSetValue(text, 'folder');

  // Count virtual-mailboxes lines
  const mailboxCount = (text.match(/^(?:virtual-mailboxes|mailboxes)\s/mg) || []).length;
  // Count bind lines
  const bindCount = (text.match(/^bind\s/mg) || []).length;
  // Count color lines
  const colorCount = (text.match(/^color\s/mg) || []).length;
  // Sourced files
  const sourcedFiles = [];
  for (const line of lines) {
    const m = line.trim().match(/^source\s+["']?([^"'\s#]+)/);
    if (m) sourcedFiles.push(m[1]);
  }

  const host = document.createElement('div');
  host.className = 'nmu-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'nmu-title';
  title.innerHTML = '<span class="nmu-badge">NeoMutt</span>Mail Client Config';
  host.appendChild(title);

  const parts = [];
  if (realname) parts.push(realname);
  if (from) parts.push(`<${from}>`);
  const sub = document.createElement('div');
  sub.className = 'nmu-sub';
  sub.textContent = parts.join(' ') || 'NeoMutt configuration';
  host.appendChild(sub);

  // Summary cards
  const cards = document.createElement('div');
  cards.className = 'nmu-cards';
  const cardData = [
    { value: bindCount, label: 'Key bindings' },
    { value: colorCount, label: 'Color rules' },
    { value: mailboxCount, label: 'Mailboxes' },
    { value: sourcedFiles.length, label: 'Sourced files' },
  ];
  for (const { value, label } of cardData) {
    const card = document.createElement('div');
    card.className = 'nmu-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Identity section
  {
    const sec = document.createElement('div');
    sec.className = 'nmu-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Identity';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'nmu-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Setting</th><th>Value</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    const idRows = [
      ['realname', realname || '(not set)'],
      ['from', from || '(not set)'],
      ['spoolfile / folder', spoolfile || '(not set)'],
    ];
    for (const [k, v] of idRows) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="nmu-kv">${esc(k)}</td><td class="nmu-kv">${esc(v)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Sidebar section
  {
    const sec = document.createElement('div');
    sec.className = 'nmu-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Sidebar';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'nmu-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Setting</th><th>Value</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    const sidebarRows = [
      ['sidebar_visible', sidebarVisible || '(not set)'],
      ['sidebar_width', sidebarWidth || '(not set)'],
      ['sidebar_format', sidebarFormat || '(not set)'],
    ];
    for (const [k, v] of sidebarRows) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="nmu-kv">${esc(k)}</td><td class="nmu-kv">${esc(v)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Mailboxes / virtual-mailboxes
  if (mailboxCount > 0) {
    const sec = document.createElement('div');
    sec.className = 'nmu-section';
    const h3 = document.createElement('h3');
    h3.textContent = `Mailboxes (${mailboxCount})`;
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'nmu-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th><th>Query / Path</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    let shown = 0;
    for (const line of lines) {
      if (shown >= 20) break;
      const m = line.trim().match(/^(?:virtual-mailboxes|mailboxes)\s+"([^"]+)"\s+"?([^"]+)"?/);
      if (m) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="nmu-kv">${esc(m[1])}</td><td class="nmu-kv">${esc(m[2])}</td>`;
        tbody.appendChild(tr);
        shown++;
      }
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Sourced files
  if (sourcedFiles.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'nmu-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Sourced Config Files';
    sec.appendChild(h3);
    const tagWrap = document.createElement('div');
    for (const f of sourcedFiles.slice(0, 20)) {
      const tag = document.createElement('span');
      tag.className = 'nmu-tag';
      tag.textContent = f;
      tagWrap.appendChild(tag);
    }
    sec.appendChild(tagWrap);
    host.appendChild(sec);
  }

  return { parentNode: host };
}
