import { chip, ensureKnownUiStyle, esc, issueList, sourceButton, sourcePreview, wireSourceLinks } from '../../../../core/known-ui.js';

const CSS = `
.tex-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.tex-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#059669;color:#fff;vertical-align:middle;margin-right:8px;}
.tex-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.tex-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.tex-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.tex-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.tex-card strong{display:block;font-size:1.2rem;font-weight:700;}
.tex-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.tex-section{margin:16px 0;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.tex-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.tex-list{margin:0;padding:0;list-style:none;}
.tex-list li{padding:6px 14px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:7px;align-items:baseline;flex-wrap:wrap;}
.tex-list li:last-child{border-bottom:none;}
.tex-meta{margin:0 0 14px;}
.tex-meta-row{margin:4px 0;font-size:13px;}
.tex-meta-label{font-size:11px;text-transform:uppercase;color:var(--fg-2,#888);margin-right:6px;}
.tex-note{color:var(--fg-2,#5a6678);font-family:system-ui,sans-serif;font-size:12px;flex-basis:100%;}
.tex-cmd{color:#059669;font-weight:600;}
.tex-arg{color:#0a6640;}
.tex-comment{color:#6e7781;font-style:italic;}
`;

const OUTLINE_LEVEL = {
  part: 0,
  chapter: 1,
  section: 2,
  subsection: 3,
  subsubsection: 4,
  paragraph: 5,
  subparagraph: 6,
};

function parseTex(text) {
  const lines = (text || '').split(/\r?\n/);
  let docClass = null;
  let author = null;
  let docTitle = null;
  const packages = [];
  const outline = [];
  const labels = [];
  const refs = [];
  const cites = [];
  const includes = [];
  const bibitems = [];
  const bibliographies = [];
  const issues = [];

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const t = stripTexComment(lines[i]).trim();
    if (!t) continue;

    const dcMatch = t.match(/\\documentclass(?:\[([^\]]*)\])?\{([^}]+)\}/);
    if (dcMatch && !docClass) docClass = { name: dcMatch[2], options: dcMatch[1] || '', line: lineNo };

    for (const pkgMatch of t.matchAll(/\\usepackage(?:\[([^\]]*)\])?\{([^}]+)\}/g)) {
      for (const pkg of pkgMatch[2].split(',').map((s) => s.trim()).filter(Boolean)) {
        packages.push({ name: pkg, options: pkgMatch[1] || '', line: lineNo });
      }
    }

    for (const sec of t.matchAll(/\\(part|chapter|section|subsection|subsubsection|paragraph|subparagraph)\*?\{([^}]+)\}/g)) {
      outline.push({ kind: sec[1], level: OUTLINE_LEVEL[sec[1]] ?? 9, title: cleanTex(sec[2]), line: lineNo });
    }

    for (const label of t.matchAll(/\\label\{([^}]+)\}/g)) labels.push({ key: label[1].trim(), line: lineNo });
    for (const ref of t.matchAll(/\\(ref|pageref|autoref|eqref)\{([^}]+)\}/g)) refs.push({ kind: ref[1], key: ref[2].trim(), line: lineNo });
    for (const cite of t.matchAll(/\\(?:cite|citep|citet|parencite|textcite)(?:\[[^\]]*]){0,2}\{([^}]+)\}/g)) {
      for (const key of cite[1].split(',').map((s) => s.trim()).filter(Boolean)) cites.push({ key, line: lineNo });
    }
    for (const inc of t.matchAll(/\\(input|include|includegraphics)(?:\[[^\]]*])?\{([^}]+)\}/g)) {
      includes.push({ kind: inc[1], target: inc[2].trim(), line: lineNo });
    }
    for (const bib of t.matchAll(/\\bibitem(?:\[[^\]]*])?\{([^}]+)\}/g)) bibitems.push({ key: bib[1].trim(), line: lineNo });
    for (const bib of t.matchAll(/\\(?:bibliography|addbibresource)(?:\[[^\]]*])?\{([^}]+)\}/g)) {
      for (const target of bib[1].split(',').map((s) => s.trim()).filter(Boolean)) bibliographies.push({ target, line: lineNo });
    }

    const authorMatch = t.match(/\\author\{([^}]+)\}/);
    if (authorMatch && !author) author = { value: cleanTex(authorMatch[1]), line: lineNo };
    const titleMatch = t.match(/\\title\{([^}]+)\}/);
    if (titleMatch && !docTitle) docTitle = { value: cleanTex(titleMatch[1]), line: lineNo };
  }

  const labelLines = new Map();
  for (const label of labels) {
    if (labelLines.has(label.key)) {
      issues.push({ severity: 'warning', label: 'duplicate label', line: label.line, message: `Label "${label.key}" was already defined at line ${labelLines.get(label.key)}.` });
    } else {
      labelLines.set(label.key, label.line);
    }
  }
  for (const ref of refs) {
    if (!labelLines.has(ref.key)) issues.push({ severity: 'warning', label: 'unresolved ref', line: ref.line, message: `${ref.kind} target "${ref.key}" has no matching \\label in this file.` });
  }
  const bibKeys = new Set(bibitems.map((item) => item.key));
  if (cites.length && !bibitems.length && !bibliographies.length) {
    issues.push({ severity: 'info', label: 'citation source', message: 'Citations are present but no \\bibitem, \\bibliography, or \\addbibresource was found in this file.' });
  } else if (bibitems.length) {
    for (const cite of cites) {
      if (!bibKeys.has(cite.key)) issues.push({ severity: 'warning', label: 'unresolved cite', line: cite.line, message: `Citation "${cite.key}" has no matching \\bibitem in this file.` });
    }
  }

  return { docClass, packages, outline, author, docTitle, labels, refs, cites, includes, bibitems, bibliographies, issues };
}

function stripTexComment(line) {
  let out = '';
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '%' && line[i - 1] !== '\\') break;
    out += line[i];
  }
  return out;
}

function cleanTex(text) {
  return String(text || '').replace(/\\[a-zA-Z]+(?:\{\})?/g, '').replace(/\s+/g, ' ').trim();
}

function highlightLine(line) {
  let out = esc(line);
  out = out.replace(/(%.*)$/g, '<span class="tex-comment">$1</span>');
  out = out.replace(/(\\[a-zA-Z]+)/g, '<span class="tex-cmd">$1</span>');
  out = out.replace(/\{([^{}]*)\}/g, '{<span class="tex-arg">$1</span>}');
  return out;
}

function section(title) {
  const sec = document.createElement('div');
  sec.className = 'tex-section';
  const hd = document.createElement('div');
  hd.className = 'tex-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  return sec;
}

function appendList(host, title, items, renderItem) {
  if (!items.length) return;
  const sec = section(title);
  const ul = document.createElement('ul');
  ul.className = 'tex-list';
  for (const item of items) {
    const li = document.createElement('li');
    renderItem(li, item);
    ul.appendChild(li);
  }
  sec.appendChild(ul);
  host.appendChild(sec);
}

export function render(intake) {
  const { docClass, packages, outline, author, docTitle, labels, refs, cites, includes, bibitems, bibliographies, issues } = parseTex(intake.text || '');

  const host = document.createElement('div');
  host.className = 'tex-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);
  ensureKnownUiStyle(host);

  const title = document.createElement('div');
  title.className = 'tex-title';
  const badge = document.createElement('span');
  badge.className = 'tex-badge';
  badge.textContent = 'LaTeX';
  title.appendChild(badge);
  title.appendChild(document.createTextNode(docTitle?.value || 'TeX Document'));
  host.appendChild(title);

  const parts = [];
  if (docClass) parts.push(`class: ${docClass.name}`);
  if (packages.length) parts.push(`${packages.length} package${packages.length !== 1 ? 's' : ''}`);
  if (outline.length) parts.push(`${outline.length} outline item${outline.length !== 1 ? 's' : ''}`);
  if (labels.length) parts.push(`${labels.length} label${labels.length !== 1 ? 's' : ''}`);

  const sub = document.createElement('div');
  sub.className = 'tex-sub';
  sub.textContent = parts.join(' · ') || 'LaTeX document';
  host.appendChild(sub);

  if (docTitle || author || docClass) {
    const metaSec = document.createElement('div');
    metaSec.className = 'tex-meta';
    if (docTitle) appendMeta(metaSec, 'Title', docTitle.value, docTitle.line);
    if (author) appendMeta(metaSec, 'Author', author.value, author.line);
    if (docClass) appendMeta(metaSec, 'Document class', docClass.name, docClass.line);
    host.appendChild(metaSec);
  }

  const summary = document.createElement('div');
  summary.className = 'tex-summary';
  for (const { value, label } of [
    { value: packages.length, label: 'Packages' },
    { value: outline.length, label: 'Outline' },
    { value: labels.length, label: 'Labels' },
    { value: refs.length, label: 'Refs' },
    { value: cites.length, label: 'Cites' },
    { value: includes.length, label: 'Includes' },
  ]) {
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

  appendList(host, 'Document Outline', outline, (li, item) => {
    li.style.paddingLeft = `${14 + item.level * 12}px`;
    li.appendChild(chip(item.kind, item.level <= 2 ? 'ok' : 'info', 'LaTeX sectioning command.'));
    li.appendChild(sourceButton(item.title, item.line, 'Open outline item in source'));
  });

  appendList(host, 'Packages', packages, (li, pkg) => {
    li.appendChild(chip('package', 'info', 'Loaded with \\usepackage.'));
    li.appendChild(sourceButton(pkg.name, pkg.line, 'Open package declaration in source'));
    if (pkg.options) li.appendChild(chip(pkg.options, 'muted', 'Package options.'));
  });

  appendList(host, 'Labels And References', [
    ...labels.map((item) => ({ ...item, type: 'label' })),
    ...refs.map((item) => ({ ...item, type: 'ref' })),
  ], (li, item) => {
    li.appendChild(chip(item.type, item.type === 'label' ? 'ok' : 'warn'));
    li.appendChild(sourceButton(item.key, item.line, 'Open label/reference in source'));
    if (item.kind) li.appendChild(chip(item.kind, 'muted'));
  });

  appendList(host, 'Citations And Bibliography', [
    ...cites.map((item) => ({ ...item, type: 'cite' })),
    ...bibitems.map((item) => ({ ...item, type: 'bibitem' })),
    ...bibliographies.map((item) => ({ key: item.target, line: item.line, type: 'bibliography' })),
  ], (li, item) => {
    li.appendChild(chip(item.type, item.type === 'cite' ? 'warn' : 'ok'));
    li.appendChild(sourceButton(item.key, item.line, 'Open citation or bibliography source'));
  });

  appendList(host, 'Includes And Assets', includes, (li, item) => {
    li.appendChild(chip(item.kind, item.kind === 'includegraphics' ? 'warn' : 'info', 'External file dependency.'));
    li.appendChild(sourceButton(item.target, item.line, 'Open include in source'));
  });

  const issueEl = issueList(issues, { title: 'Reference Review' });
  if (issueEl) host.appendChild(issueEl);

  host.appendChild(sourcePreview(intake.text || '', { title: 'Source', collapsed: true, idPrefix: 'tex-line', highlighter: highlightLine }));
  wireSourceLinks(host, { idPrefix: 'tex-line' });

  return { parentNode: host };
}

function appendMeta(root, label, value, line) {
  const row = document.createElement('div');
  row.className = 'tex-meta-row';
  const labelEl = document.createElement('span');
  labelEl.className = 'tex-meta-label';
  labelEl.textContent = label;
  row.appendChild(labelEl);
  row.appendChild(sourceButton(value, line, `Open ${label.toLowerCase()} in source`));
  root.appendChild(row);
}
