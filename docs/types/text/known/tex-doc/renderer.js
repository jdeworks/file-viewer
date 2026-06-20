const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.tex-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.tex-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#059669;color:#fff;vertical-align:middle;margin-right:8px;}
.tex-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.tex-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.tex-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.tex-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.tex-card strong{display:block;font-size:1.2rem;font-weight:700;}
.tex-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.tex-section{margin:16px 0;}
.tex-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.tex-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.tex-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.tex-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.tex-table tr:last-child td{border-bottom:none;}
.tex-meta-row{margin:4px 0;font-size:13px;}
.tex-meta-label{font-size:11px;text-transform:uppercase;color:var(--fg-2,#888);margin-right:6px;}
.tex-section-tag{display:inline-block;padding:1px 7px;border-radius:10px;font-size:11px;font-weight:600;background:#d1fae5;color:#065f46;margin-right:4px;}
.tex-section-tag.chapter{background:#dbeafe;color:#1d4ed8;}
`;

function parseTex(text) {
  const lines = (text || '').split(/\r?\n/);
  let docClass = null;
  const packages = [];
  const sections = []; // { title, kind: 'section'|'chapter' }
  let author = null;
  let docTitle = null;

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('%')) continue; // comment

    // \documentclass[options]{class}
    const dcMatch = t.match(/\\documentclass(?:\[[^\]]*\])?\{([^}]+)\}/);
    if (dcMatch && !docClass) docClass = dcMatch[1];

    // \usepackage[options]{pkg}
    const pkgMatch = t.match(/\\usepackage(?:\[[^\]]*\])?\{([^}]+)\}/);
    if (pkgMatch) {
      // may be comma-separated: {amsmath,amssymb}
      for (const pkg of pkgMatch[1].split(',').map((s) => s.trim()).filter(Boolean)) {
        if (!packages.includes(pkg)) packages.push(pkg);
      }
    }

    // \section{title} or \section*{title}
    const sectionMatch = t.match(/\\section\*?\{([^}]+)\}/);
    if (sectionMatch) sections.push({ title: sectionMatch[1], kind: 'section' });

    // \chapter{title} or \chapter*{title}
    const chapterMatch = t.match(/\\chapter\*?\{([^}]+)\}/);
    if (chapterMatch) sections.push({ title: chapterMatch[1], kind: 'chapter' });

    // \author{...}
    const authorMatch = t.match(/\\author\{([^}]+)\}/);
    if (authorMatch && !author) author = authorMatch[1].replace(/\\[a-zA-Z]+/g, '').trim();

    // \title{...}
    const titleMatch = t.match(/\\title\{([^}]+)\}/);
    if (titleMatch && !docTitle) docTitle = titleMatch[1].replace(/\\[a-zA-Z]+/g, '').trim();
  }

  return { docClass, packages, sections, author, docTitle };
}

export function render(intake) {
  const { docClass, packages, sections, author, docTitle } = parseTex(intake.text || '');

  const host = document.createElement('div');
  host.className = 'tex-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'tex-title';
  title.innerHTML = '<span class="tex-badge">LaTeX</span>' + esc(docTitle || 'TeX Document');
  host.appendChild(title);

  const parts = [];
  if (docClass) parts.push(`class: ${docClass}`);
  if (packages.length) parts.push(`${packages.length} package${packages.length !== 1 ? 's' : ''}`);
  if (sections.length) parts.push(`${sections.length} section${sections.length !== 1 ? 's' : ''}`);

  const sub = document.createElement('div');
  sub.className = 'tex-sub';
  sub.textContent = parts.join(' · ') || 'LaTeX document';
  host.appendChild(sub);

  // Author / title metadata
  if (docTitle || author || docClass) {
    const metaSec = document.createElement('div');
    metaSec.className = 'tex-section';
    if (docTitle) {
      const row = document.createElement('div');
      row.className = 'tex-meta-row';
      row.innerHTML = `<span class="tex-meta-label">Title</span>${esc(docTitle)}`;
      metaSec.appendChild(row);
    }
    if (author) {
      const row = document.createElement('div');
      row.className = 'tex-meta-row';
      row.innerHTML = `<span class="tex-meta-label">Author</span>${esc(author)}`;
      metaSec.appendChild(row);
    }
    if (docClass) {
      const row = document.createElement('div');
      row.className = 'tex-meta-row';
      row.innerHTML = `<span class="tex-meta-label">Document class</span>${esc(docClass)}`;
      metaSec.appendChild(row);
    }
    host.appendChild(metaSec);
  }

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'tex-summary';
  const cards = [
    { value: packages.length, label: 'Packages' },
    { value: sections.filter((s) => s.kind === 'chapter').length, label: 'Chapters' },
    { value: sections.filter((s) => s.kind === 'section').length, label: 'Sections' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'tex-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Packages
  if (packages.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'tex-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Packages';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'tex-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Package</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const pkg of packages.slice(0, 8)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(pkg)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Sections
  if (sections.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'tex-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Document Outline';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'tex-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Title</th><th>Level</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const s of sections.slice(0, 6)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(s.title)}</td><td><span class="tex-section-tag ${esc(s.kind)}">${esc(s.kind)}</span></td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  return { parentNode: host };
}
