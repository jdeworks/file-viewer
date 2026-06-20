const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cl-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.cl-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#9b59b6;color:#fff;vertical-align:middle;margin-right:8px;}
.cl-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.cl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.cl-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.cl-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.cl-card strong{display:block;font-size:1.2rem;font-weight:700;}
.cl-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.cl-section{margin:16px 0;}
.cl-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.cl-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.cl-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.cl-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.cl-table tr:last-child td{border-bottom:none;}
.cl-tag{display:inline-block;padding:1px 6px;border-radius:4px;font-size:11px;background:var(--bg-2,#f0f0f0);margin:1px 2px;font-family:ui-monospace,monospace;}
`;

function parseCL(text) {
  const lines = (text || '').split(/\r?\n/);
  const defuns = [];
  const defclasses = [];
  const defvars = [];
  const packages = [];
  const inPackages = [];
  const requires = [];

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith(';')) continue;

    // (in-package :name) or (in-package "name")
    const inPkgMatch = t.match(/^\(in-package\s+[:"']?([^\s)"']+)/i);
    if (inPkgMatch) {
      const pkg = inPkgMatch[1].replace(/^:/, '');
      if (!inPackages.includes(pkg)) inPackages.push(pkg);
    }

    // (defpackage :name ...)
    const defpkgMatch = t.match(/^\(defpackage\s+[:"']?([^\s)"']+)/i);
    if (defpkgMatch) {
      const pkg = defpkgMatch[1].replace(/^:/, '');
      if (!packages.includes(pkg)) packages.push(pkg);
    }

    // (defun name ...)
    const defunMatch = t.match(/^\(defun\s+([^\s(]+)/i);
    if (defunMatch) defuns.push(defunMatch[1]);

    // (defclass name ...)
    const defclassMatch = t.match(/^\(defclass\s+([^\s(]+)/i);
    if (defclassMatch) defclasses.push(defclassMatch[1]);

    // (defvar *name* ...) | (defparameter *name* ...) | (defconstant +name+ ...)
    const defvarMatch = t.match(/^\((?:defvar|defparameter|defconstant)\s+([^\s(]+)/i);
    if (defvarMatch) defvars.push(defvarMatch[1]);

    // (require :name) or (require "name")
    const requireMatch = t.match(/^\(require\s+[:"']?([^\s)"']+)/i);
    if (requireMatch) {
      const pkg = requireMatch[1].replace(/^:/, '');
      if (!requires.includes(pkg)) requires.push(pkg);
    }

    // (:use-package :name) or (use-package :name)
    const useMatch = t.match(/^\(?use-package\s+[:"']?([^\s)"']+)/i);
    if (useMatch) {
      const pkg = useMatch[1].replace(/^:/, '');
      if (!requires.includes(pkg)) requires.push(pkg);
    }
  }

  return { defuns, defclasses, defvars, packages, inPackages, requires };
}

export function render(intake) {
  const parsed = parseCL(intake.text || '');
  const { defuns, defclasses, defvars, packages, inPackages, requires } = parsed;

  const host = document.createElement('div');
  host.className = 'cl-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'cl-title';
  const pkgDisplay = inPackages[0] || packages[0] || '';
  title.innerHTML = `<span class="cl-badge">Common Lisp</span>${esc(pkgDisplay || 'Source File')}`;
  host.appendChild(title);

  const parts = [`${defuns.length} defun`];
  if (defclasses.length) parts.push(`${defclasses.length} defclass`);
  if (defvars.length) parts.push(`${defvars.length} defvar/defparameter`);

  const sub = document.createElement('div');
  sub.className = 'cl-sub';
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'cl-summary';
  const cards = [
    { value: defuns.length, label: 'Functions' },
    { value: defclasses.length, label: 'Classes' },
    { value: defvars.length, label: 'Variables' },
    { value: requires.length, label: 'Dependencies' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'cl-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Package
  if (inPackages.length > 0 || packages.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'cl-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Packages';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'cl-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th><th>Role</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const pkg of [...new Set([...inPackages, ...packages])].slice(0, 20)) {
      const role = inPackages.includes(pkg) ? 'in-package' : 'defpackage';
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(pkg)}</td><td>${esc(role)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Functions
  if (defuns.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'cl-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Functions (defun)';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'cl-table';
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

  // Classes
  if (defclasses.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'cl-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Classes (defclass)';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'cl-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const name of defclasses.slice(0, 30)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(name)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Variables
  if (defvars.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'cl-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Variables & Constants';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'cl-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const name of defvars.slice(0, 30)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(name)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Dependencies
  if (requires.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'cl-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Dependencies';
    sec.appendChild(h3);
    const wrap = document.createElement('div');
    for (const pkg of requires.slice(0, 30)) {
      const tag = document.createElement('span');
      tag.className = 'cl-tag';
      tag.textContent = pkg;
      wrap.appendChild(tag);
    }
    sec.appendChild(wrap);
    host.appendChild(sec);
  }

  return { parentNode: host };
}
