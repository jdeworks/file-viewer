const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.audr-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.audr-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#dc2626;color:#fff;vertical-align:middle;margin-right:8px;}
.audr-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.audr-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.audr-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.audr-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.audr-card strong{display:block;font-size:1.2rem;font-weight:700;}
.audr-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.audr-section{margin:16px 0;}
.audr-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.audr-table{width:100%;border-collapse:collapse;font-size:13px;}
.audr-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.audr-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;}
.audr-table tr:last-child td{border-bottom:none;}
.audr-list{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px;}
.audr-list li{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:3px 10px;font-family:ui-monospace,monospace;font-size:12px;}
.audr-perm{display:inline-block;padding:1px 5px;border-radius:4px;font-size:10px;font-weight:700;background:#fee2e2;color:#dc2626;margin-left:4px;}
`;

function parseAuditRules(text) {
  const lines = (text || '').split(/\r?\n/);
  const controlRules = [];
  const fileWatches = [];
  const syscallRules = [];
  const keys = new Set();

  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;

    if (/^-D\b/.test(t)) {
      controlRules.push({ type: 'delete-all', raw: t });
    } else if (/^-b\s/.test(t)) {
      const m = t.match(/^-b\s+(\S+)/);
      controlRules.push({ type: 'backlog', value: m ? m[1] : '', raw: t });
    } else if (/^-w\s/.test(t)) {
      // File watch: -w /path/to/file -p perms -k keyname
      const pathM = t.match(/-w\s+(\S+)/);
      const permM = t.match(/-p\s+(\S+)/);
      const keyM = t.match(/-k\s+(\S+)/);
      const path = pathM ? pathM[1] : '';
      const perms = permM ? permM[1] : '';
      const key = keyM ? keyM[1] : '';
      fileWatches.push({ path, perms, key, raw: t });
      if (key) keys.add(key);
    } else if (/^(-a|-A)\s+always,exit/.test(t)) {
      const keyM = t.match(/-k\s+(\S+)/);
      const archM = t.match(/-F\s+arch=(\S+)/);
      const syscallM = t.match(/-S\s+(\S+)/);
      const key = keyM ? keyM[1] : '';
      const arch = archM ? archM[1] : '';
      const syscall = syscallM ? syscallM[1] : '';
      syscallRules.push({ key, arch, syscall, raw: t });
      if (key) keys.add(key);
    }
  }

  return { controlRules, fileWatches, syscallRules, keys: [...keys] };
}

export function render(intake) {
  const { controlRules, fileWatches, syscallRules, keys } = parseAuditRules(intake.text || '');
  const totalRules = controlRules.length + fileWatches.length + syscallRules.length;

  const host = document.createElement('div');
  host.className = 'audr-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const title = document.createElement('div');
  title.className = 'audr-title';
  title.innerHTML = '<span class="audr-badge">Audit Rules</span>Linux Audit Configuration';
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'audr-sub';
  sub.textContent = `${totalRules} rule${totalRules !== 1 ? 's' : ''} · ${fileWatches.length} file watch${fileWatches.length !== 1 ? 'es' : ''} · ${syscallRules.length} syscall rule${syscallRules.length !== 1 ? 's' : ''}`;
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'audr-summary';
  for (const { value, label } of [
    { value: controlRules.length, label: 'Control rules' },
    { value: fileWatches.length, label: 'File watches' },
    { value: syscallRules.length, label: 'Syscall rules' },
    { value: keys.length, label: 'Unique keys' },
  ]) {
    const card = document.createElement('div');
    card.className = 'audr-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // File watches
  if (fileWatches.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'audr-section';
    const h3 = document.createElement('h3');
    h3.textContent = `File Watches (${fileWatches.length})`;
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'audr-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Path</th><th>Permissions</th><th>Key</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const fw of fileWatches) {
      const tr = document.createElement('tr');
      const permHtml = fw.perms
        ? fw.perms.split('').map((c) => `<span class="audr-perm">${esc(c)}</span>`).join('')
        : '';
      tr.innerHTML = `<td>${esc(fw.path)}</td><td>${permHtml}</td><td>${esc(fw.key)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Syscall rules
  if (syscallRules.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'audr-section';
    const h3 = document.createElement('h3');
    h3.textContent = `Syscall Rules (${syscallRules.length})`;
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'audr-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Syscall</th><th>Arch</th><th>Key</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const rule of syscallRules) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(rule.syscall)}</td><td>${esc(rule.arch)}</td><td>${esc(rule.key)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Unique keys
  if (keys.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'audr-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Rule Keys';
    sec.appendChild(h3);
    const ul = document.createElement('ul');
    ul.className = 'audr-list';
    for (const key of keys) {
      const li = document.createElement('li');
      li.textContent = key;
      ul.appendChild(li);
    }
    sec.appendChild(ul);
    host.appendChild(sec);
  }

  return { parentNode: host };
}
