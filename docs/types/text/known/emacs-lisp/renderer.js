const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.el-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.el-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7f5af0;color:#fff;vertical-align:middle;margin-right:8px;}
.el-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.el-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.el-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.el-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.el-card strong{display:block;font-size:1.2rem;font-weight:700;}
.el-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.el-section{margin:16px 0;}
.el-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.el-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.el-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.el-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.el-table tr:last-child td{border-bottom:none;}
.el-tag{display:inline-block;padding:1px 6px;border-radius:4px;font-size:11px;background:var(--bg-2,#f0f0f0);margin:1px 2px;font-family:ui-monospace,monospace;}
.el-provides{display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;background:#e8f5e9;color:#2e7d32;border:1px solid #c8e6c9;font-family:ui-monospace,monospace;}
`;

function parseEL(text) {
  const lines = (text || '').split(/\r?\n/);
  const defuns = [];
  const defcustoms = [];
  const defvars = [];
  const requires = [];
  const usePackages = [];
  let provides = null;

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith(';')) continue;

    // (defun name ...)
    const defunMatch = t.match(/^\(defun\s+([^\s(]+)/i);
    if (defunMatch) defuns.push(defunMatch[1]);

    // (defcustom name ...)
    const defcustomMatch = t.match(/^\(defcustom\s+([^\s(]+)/i);
    if (defcustomMatch) defcustoms.push(defcustomMatch[1]);

    // (defvar name ...)
    const defvarMatch = t.match(/^\(defvar\s+([^\s(]+)/i);
    if (defvarMatch) defvars.push(defvarMatch[1]);

    // (require 'name) or (require "name")
    const requireMatch = t.match(/^\(require\s+'([^\s)]+)/i) || t.match(/^\(require\s+"([^\s"]+)"/i);
    if (requireMatch) {
      const pkg = requireMatch[1];
      if (!requires.includes(pkg)) requires.push(pkg);
    }

    // (use-package name ...)
    const upMatch = t.match(/^\(use-package\s+([^\s(]+)/i);
    if (upMatch) {
      const pkg = upMatch[1];
      if (!usePackages.includes(pkg)) usePackages.push(pkg);
    }

    // (provide 'name)
    const provideMatch = t.match(/^\(provide\s+'([^\s)]+)/i);
    if (provideMatch && !provides) provides = provideMatch[1];
  }

  return { defuns, defcustoms, defvars, requires, usePackages, provides };
}

export function render(intake) {
  const parsed = parseEL(intake.text || '');
  const { defuns, defcustoms, defvars, requires, usePackages, provides } = parsed;

  const host = document.createElement('div');
  host.className = 'el-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'el-title';
  title.innerHTML = `<span class="el-badge">Emacs Lisp</span>${esc(provides ? provides : 'Source File')}`;
  host.appendChild(title);

  const parts = [`${defuns.length} defun`];
  if (defcustoms.length) parts.push(`${defcustoms.length} defcustom`);
  if (defvars.length) parts.push(`${defvars.length} defvar`);
  if (usePackages.length) parts.push(`${usePackages.length} use-package`);

  const sub = document.createElement('div');
  sub.className = 'el-sub';
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'el-summary';
  const cards = [
    { value: defuns.length, label: 'Functions' },
    { value: defcustoms.length + defvars.length, label: 'Variables' },
    { value: requires.length, label: 'Requires' },
    { value: usePackages.length, label: 'use-package' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'el-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Provides
  if (provides) {
    const sec = document.createElement('div');
    sec.className = 'el-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Provides';
    sec.appendChild(h3);
    const tag = document.createElement('span');
    tag.className = 'el-provides';
    tag.textContent = provides;
    sec.appendChild(tag);
    host.appendChild(sec);
  }

  // Required packages
  if (requires.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'el-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Required Packages';
    sec.appendChild(h3);
    const wrap = document.createElement('div');
    for (const pkg of requires.slice(0, 30)) {
      const tag = document.createElement('span');
      tag.className = 'el-tag';
      tag.textContent = pkg;
      wrap.appendChild(tag);
    }
    sec.appendChild(wrap);
    host.appendChild(sec);
  }

  // use-package declarations
  if (usePackages.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'el-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'use-package Declarations';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'el-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Package</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const pkg of usePackages.slice(0, 10)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(pkg)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Functions
  if (defuns.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'el-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Functions (defun)';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'el-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const name of defuns.slice(0, 40)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(name)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Customizable variables
  if (defcustoms.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'el-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Customizable Options (defcustom)';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'el-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const name of defcustoms.slice(0, 30)) {
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
