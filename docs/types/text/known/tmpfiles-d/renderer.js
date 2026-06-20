const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.tmf-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.tmf-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#8b5cf6;color:#fff;vertical-align:middle;margin-right:8px;}
.tmf-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.tmf-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.tmf-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.tmf-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:100px;}
.tmf-card strong{display:block;font-size:1.2rem;font-weight:700;}
.tmf-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.tmf-section{margin:16px 0;}
.tmf-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.tmf-table{width:100%;border-collapse:collapse;font-size:13px;}
.tmf-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);}
.tmf-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.tmf-table td.tmf-desc{font-family:system-ui,sans-serif;font-size:12px;color:var(--fg-2,#555);}
.tmf-table tr:last-child td{border-bottom:none;}
.tmf-type{display:inline-block;padding:0 6px;border-radius:6px;font-size:11px;font-weight:700;font-family:ui-monospace,monospace;background:var(--bg-2,#e8f0fe);color:#1e40af;}
.tmf-type.dir{background:#d1fae5;color:#065f46;}
.tmf-type.link{background:#fef9c3;color:#713f12;}
.tmf-type.clean{background:#fee2e2;color:#991b1b;}
.tmf-type.perm{background:#ede9fe;color:#5b21b6;}
`;

const TYPE_INFO = {
  f: { label: 'f', name: 'file', cls: '' },
  F: { label: 'F', name: 'file (truncate)', cls: '' },
  d: { label: 'd', name: 'directory', cls: 'dir' },
  D: { label: 'D', name: 'dir + clean', cls: 'clean' },
  e: { label: 'e', name: 'adjust dir', cls: 'dir' },
  v: { label: 'v', name: 'subvolume', cls: 'dir' },
  l: { label: 'l', name: 'symlink', cls: 'link' },
  L: { label: 'L', name: 'symlink (copy)', cls: 'link' },
  c: { label: 'c', name: 'char device', cls: '' },
  b: { label: 'b', name: 'block device', cls: '' },
  p: { label: 'p', name: 'fifo', cls: '' },
  z: { label: 'z', name: 'set perms', cls: 'perm' },
  Z: { label: 'Z', name: 'recursive perms', cls: 'perm' },
  t: { label: 't', name: 'set xattr', cls: 'perm' },
  T: { label: 'T', name: 'recursive xattr', cls: 'perm' },
  a: { label: 'a', name: 'set ACL', cls: 'perm' },
  A: { label: 'A', name: 'recursive ACL', cls: 'perm' },
  h: { label: 'h', name: 'set attr', cls: 'perm' },
  H: { label: 'H', name: 'recursive attr', cls: 'perm' },
  w: { label: 'w', name: 'write', cls: '' },
  W: { label: 'W', name: 'write (truncate)', cls: '' },
  C: { label: 'C', name: 'copy', cls: '' },
  x: { label: 'x', name: 'ignore cleanup', cls: '' },
  X: { label: 'X', name: 'ignore (recursive)', cls: '' },
  r: { label: 'r', name: 'remove file', cls: 'clean' },
  R: { label: 'R', name: 'remove recursive', cls: 'clean' },
  q: { label: 'q', name: 'subvolume quota', cls: '' },
  Q: { label: 'Q', name: 'subvolume quota+', cls: '' },
};

function parseTmpfiles(text) {
  const entries = [];
  for (const rawLine of (text || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    // Format: type path mode user group age argument
    const m = line.match(/^([a-zA-Z+!\-?:^]+)\s+(\S+)(?:\s+(\S+))?(?:\s+(\S+))?(?:\s+(\S+))?(?:\s+(\S+))?(?:\s+(.*))?$/);
    if (!m) continue;
    const [, typeCode, path, mode, user, group, age, arg] = m;
    entries.push({ typeCode: typeCode.replace(/[+!\-?:^]/g, ''), path, mode, user, group, age: age || '-', arg });
  }
  return entries;
}

export function render(intake) {
  const entries = parseTmpfiles(intake.text || '');

  const host = document.createElement('div');
  host.className = 'tmf-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const title = document.createElement('div');
  title.className = 'tmf-title';
  title.innerHTML = '<span class="tmf-badge">tmpfiles.d</span>Temporary Files Configuration';
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'tmf-sub';
  sub.textContent = `${entries.length} entr${entries.length !== 1 ? 'ies' : 'y'}`;
  host.appendChild(sub);

  // Count by type
  const typeCounts = {};
  for (const e of entries) {
    typeCounts[e.typeCode] = (typeCounts[e.typeCode] || 0) + 1;
  }

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'tmf-summary';
  for (const [tc, count] of Object.entries(typeCounts)) {
    const info = TYPE_INFO[tc] || { label: tc, name: tc, cls: '' };
    const card = document.createElement('div');
    card.className = 'tmf-card';
    card.innerHTML = `<strong>${count}</strong><span>${esc(info.name)}</span>`;
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Cleanup rules (D entries with age set)
  const cleanupEntries = entries.filter((e) => e.typeCode === 'D' && e.age && e.age !== '-');
  if (cleanupEntries.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'tmf-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Cleanup Rules';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'tmf-table';
    table.innerHTML = '<thead><tr><th>Type</th><th>Path</th><th>Age</th><th>Mode</th></tr></thead>';
    const tbody = document.createElement('tbody');
    for (const e of cleanupEntries.slice(0, 30)) {
      const info = TYPE_INFO[e.typeCode] || { label: e.typeCode, cls: '' };
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><span class="tmf-type ${info.cls}">${esc(info.label)}</span></td><td>${esc(e.path)}</td><td>${esc(e.age)}</td><td>${esc(e.mode || '-')}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // All entries
  const sec = document.createElement('div');
  sec.className = 'tmf-section';
  const h3 = document.createElement('h3');
  h3.textContent = 'Managed Paths';
  sec.appendChild(h3);
  const table = document.createElement('table');
  table.className = 'tmf-table';
  table.innerHTML = '<thead><tr><th>Type</th><th>Path</th><th>Mode</th><th>Owner</th><th>Age</th></tr></thead>';
  const tbody = document.createElement('tbody');
  for (const e of entries.slice(0, 60)) {
    const info = TYPE_INFO[e.typeCode] || { label: e.typeCode, cls: '' };
    const owner = [e.user, e.group].filter((x) => x && x !== '-').join(':') || '-';
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><span class="tmf-type ${info.cls}">${esc(info.label)}</span> <span class="tmf-desc">${esc(info.name)}</span></td><td>${esc(e.path)}</td><td>${esc(e.mode || '-')}</td><td>${esc(owner)}</td><td>${esc(e.age)}</td>`;
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  sec.appendChild(table);
  host.appendChild(sec);

  return { parentNode: host };
}
