import { chip, ensureKnownUiStyle, esc, issueList, sourceButton, sourcePreview, wireSourceLinks } from '../../../../core/known-ui.js';

const CSS = `
.adoc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.adoc-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e8471e;color:#fff;vertical-align:middle;margin-right:8px}
.adoc-title{font-size:18px;font-weight:700;margin:0 0 4px}
.adoc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.adoc-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}
.adoc-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px}
.adoc-card strong{display:block;font-size:1.2rem;font-weight:700}
.adoc-card span{font-size:.8rem;color:var(--fg-2,#5a6678)}
.adoc-sec{margin:14px 0}
.adoc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
	.adoc-outline{list-style:none;padding:0;margin:0;font-size:13px}
	.adoc-outline li{padding:3px 0;border-bottom:1px solid var(--border,#eaecf0);display:flex;gap:6px;align-items:baseline;flex-wrap:wrap}
.adoc-outline li:last-child{border-bottom:none}
.adoc-level-1{font-weight:700;color:var(--fg,#24292f)}
.adoc-level-2{padding-left:16px;color:var(--fg,#555)}
.adoc-level-3{padding-left:32px;color:var(--fg-2,#666);font-size:12px}
.adoc-level-4{padding-left:48px;color:var(--fg-2,#777);font-size:12px}
.adoc-level-5{padding-left:64px;color:var(--fg-2,#888);font-size:11px}
.adoc-attrs{font-size:12px;background:var(--bg-2,#f6f8fa);border-radius:6px;overflow:hidden;border:1px solid var(--border,#e0e0e0)}
.adoc-attr-row{display:flex;gap:0;border-bottom:1px solid var(--border,#eaecf0)}
.adoc-attr-row:last-child{border-bottom:none}
.adoc-attr-k{background:var(--bg,#f0f2f5);padding:4px 10px;min-width:130px;font-family:ui-monospace,monospace;font-size:11px;color:var(--fg-2,#555)}
	.adoc-attr-v{padding:4px 10px;font-family:ui-monospace,monospace;font-size:11px;word-break:break-all}
	.adoc-list{margin:0;padding:0;list-style:none;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden}
	.adoc-list li{padding:6px 12px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap}
	.adoc-list li:last-child{border-bottom:none}
	.adoc-note{color:var(--fg-2,#5a6678);font-family:system-ui,sans-serif;font-size:12px;flex-basis:100%}
.adoc-heading{color:#0550ae;font-weight:700}
.adoc-attr-line{color:#7c3aed}
.adoc-block-delim{color:#555;font-weight:700}
.adoc-inline-bold{font-weight:700}
.adoc-inline-italic{font-style:italic;color:var(--fg,#24292f)}
.adoc-inline-code{color:#d73a49;background:rgba(175,184,193,.2);padding:0 3px;border-radius:3px;font-family:ui-monospace,monospace}
.adoc-comment{color:var(--fg-2,#6e7681);font-style:italic}
.adoc-trunc{font-size:11px;color:var(--fg-2,#888);padding:4px 12px;font-style:italic}
`;

const MAX_LINES = 100;

function parseDoc(text) {
  const lines = text.split('\n');
  let docTitle = null;
  const attrs = [];
  const headings = [];
  const anchors = new Map();
  const xrefs = [];
  const includes = [];
  const images = [];
  const admonitions = [];
  const issues = [];
  let wordCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    // Document title: first line starting with `= ` (level 0)
    if (i === 0 && /^= /.test(line)) {
      docTitle = line.replace(/^=\s+/, '').trim();
      addAnchor(anchors, slug(docTitle), lineNo, 'implicit title');
      continue;
    }

    // Attribute: `:key: value`
    const attrM = line.match(/^:([^:]+):\s*(.*)$/);
    if (attrM) {
      attrs.push({ key: attrM[1], value: attrM[2], line: lineNo });
      continue;
    }

    const anchorM = line.match(/^\[\[([^\]]+)]]|^\[#([^\]]+)]/);
    if (anchorM) {
      addAnchor(anchors, anchorM[1] || anchorM[2], lineNo, 'explicit anchor');
      continue;
    }

    // Headings: `== `, `=== `, etc.
    const headM = line.match(/^(={2,6})\s+(.+)$/);
    if (headM) {
      const hText = headM[2].trim();
      headings.push({ level: headM[1].length, text: hText, line: lineNo });
      addAnchor(anchors, slug(hText), lineNo, 'implicit heading');
      continue;
    }

    const includeM = line.match(/^include::([^\[]+)\[/);
    if (includeM) includes.push({ path: includeM[1].trim(), line: lineNo, optional: /\boptional\b/i.test(line) });

    const imageM = line.match(/^image:{1,2}([^\[]+)\[([^\]]*)]/);
    if (imageM) images.push({ path: imageM[1].trim(), attrs: imageM[2], line: lineNo });

    const admonitionM = line.match(/^(NOTE|TIP|IMPORTANT|WARNING|CAUTION):\s*(.*)$/) || line.match(/^\[(NOTE|TIP|IMPORTANT|WARNING|CAUTION)]/);
    if (admonitionM) admonitions.push({ kind: admonitionM[1], text: admonitionM[2] || '', line: lineNo });

    for (const ref of inlineRefs(line, lineNo)) xrefs.push(ref);

    // Word count estimate from regular text lines
    if (line && !/^(==|--|\.\.|-{4}|={4}|\[|\/\/|\*\*\*\*|____|\+\+\+\+)/.test(line)) {
      wordCount += line.split(/\s+/).filter(Boolean).length;
    }
  }

  for (const anchor of [...anchors.values()]) {
    if (anchor.lines.length > 1) issues.push({ severity: 'warning', label: 'duplicate anchor', line: anchor.lines[0], message: `Anchor "${anchor.id}" appears on lines ${anchor.lines.join(', ')}.` });
  }
  for (const ref of xrefs) {
    if (!anchors.has(ref.target)) issues.push({ severity: 'warning', label: 'missing xref', line: ref.line, message: `Cross-reference "${ref.target}" has no matching anchor or heading.` });
  }

  return { docTitle, attrs, headings, anchors: [...anchors.values()].sort((a, b) => a.id.localeCompare(b.id)), xrefs, includes, images, admonitions, issues, wordCount };
}

function addAnchor(map, id, line, kind) {
  if (!id) return;
  const clean = id.replace(/^#/, '').trim();
  if (!clean) return;
  if (!map.has(clean)) map.set(clean, { id: clean, firstLine: line, lines: [], kinds: new Set() });
  const item = map.get(clean);
  item.lines.push(line);
  item.firstLine = Math.min(item.firstLine, line);
  item.kinds.add(kind);
}

function slug(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function inlineRefs(line, lineNo) {
  const out = [];
  for (const m of line.matchAll(/xref:([^\[]+)\[[^\]]*]/g)) out.push({ target: m[1].trim(), line: lineNo, syntax: 'xref' });
  for (const m of line.matchAll(/<<([^,\]>]+)(?:,[^>]*)?>>/g)) out.push({ target: m[1].trim(), line: lineNo, syntax: 'angle xref' });
  return out;
}

function highlightAsciiDoc(line) {
    // Comments
    if (/^\/\//.test(line)) {
      return `<span class="adoc-comment">${esc(line)}</span>`;
    }
    // Block delimiters
    if (/^(-{4}|={4}|\*{4}|_{4}|\+{4}|\.{4}|\/{4}|`{4}|-{2}|\[source|\[listing|\[NOTE|\[TIP|\[WARNING|\[IMPORTANT|\[CAUTION)/.test(line)) {
      return `<span class="adoc-block-delim">${esc(line)}</span>`;
    }
    // Headings
    const headM = line.match(/^(={1,6})\s+(.+)$/);
    if (headM) {
      const level = headM[1].length;
      return `<span class="adoc-heading" style="padding-left:${(level - 1) * 10}px">${esc(line)}</span>`;
    }
    // Attributes
    if (/^:[^:]+:/.test(line)) {
      return `<span class="adoc-attr-line">${esc(line)}</span>`;
    }

    let out = esc(line);
    // Inline code: `code`
    out = out.replace(/`([^`]+)`/g, '<span class="adoc-inline-code">`$1`</span>');
    // Bold: *word* or **word**
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong class="adoc-inline-bold">**$1**</strong>');
    out = out.replace(/\*([^*\s][^*]*[^*\s]|\S)\*/g, '<strong class="adoc-inline-bold">*$1*</strong>');
    // Italic: _word_
    out = out.replace(/_([^_]+)_/g, '<em class="adoc-inline-italic">_$1_</em>');
    return out;
}

export function render(intake) {
  const text = intake.text || '';
  const { docTitle, attrs, headings, anchors, xrefs, includes, images, admonitions, issues, wordCount } = parseDoc(text);
  const allLines = text.split('\n');

  // Find author and toc from attrs
  const authorAttr = attrs.find((a) => a.key === 'author' || a.key === 'Author');
  const author = authorAttr ? authorAttr.value : null;

  const host = document.createElement('div');
  host.className = 'adoc-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);
  ensureKnownUiStyle(host);

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px';
  const badge = document.createElement('span');
  badge.className = 'adoc-badge';
  badge.textContent = 'AsciiDoc';
  const title = document.createElement('span');
  title.className = 'adoc-title';
  title.textContent = docTitle || (intake.name || intake.filename || '').split('/').pop() || 'AsciiDoc Document';
  header.appendChild(badge);
  header.appendChild(title);
  host.appendChild(header);

  const sub = document.createElement('div');
  sub.className = 'adoc-sub';
  const subParts = ['AsciiDoc document'];
  if (author) subParts.push(`by ${author}`);
  sub.textContent = subParts.join(' · ');
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'adoc-summary';
  for (const { value, label } of [
	    { value: headings.length, label: 'Sections' },
	    { value: attrs.length, label: 'Attributes' },
	    { value: xrefs.length, label: 'Xrefs' },
	    { value: includes.length + images.length, label: 'Refs/Media' },
	    { value: `~${wordCount}`, label: 'Words' },
	  ]) {
    const card = document.createElement('div');
    card.className = 'adoc-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Heading outline
  if (headings.length) {
    const sec = document.createElement('div');
    sec.className = 'adoc-sec';
    const h3 = document.createElement('h3');
    h3.textContent = 'Outline';
    sec.appendChild(h3);
    const ul = document.createElement('ul');
    ul.className = 'adoc-outline';
	    for (const { level, text: hText, line } of headings.slice(0, 40)) {
	      const li = document.createElement('li');
	      li.className = `adoc-level-${Math.min(level, 5)}`;
	      li.appendChild(sourceButton(hText, line, `Open heading on line ${line}`));
	      li.appendChild(chip(`level ${level}`, 'muted'));
	      ul.appendChild(li);
	    }
    if (headings.length > 40) {
      const li = document.createElement('li');
      li.style.cssText = 'color:var(--fg-2,#888);font-size:11px;font-style:italic';
      li.textContent = `… and ${headings.length - 40} more sections`;
      ul.appendChild(li);
    }
    sec.appendChild(ul);
    host.appendChild(sec);
  }

  // Attributes
  if (attrs.length) {
    const sec = document.createElement('div');
    sec.className = 'adoc-sec';
    const h3 = document.createElement('h3');
    h3.textContent = 'Attributes';
    sec.appendChild(h3);
    const table = document.createElement('div');
    table.className = 'adoc-attrs';
    for (const { key, value, line } of attrs.slice(0, 20)) {
      const row = document.createElement('div');
      row.className = 'adoc-attr-row';
      const k = document.createElement('div');
      k.className = 'adoc-attr-k';
      k.appendChild(sourceButton(`:${key}:`, line, `Open attribute on line ${line}`));
      const v = document.createElement('div');
      v.className = 'adoc-attr-v';
      v.textContent = value || '(set)';
      row.appendChild(k);
      row.appendChild(v);
      table.appendChild(row);
    }
    if (attrs.length > 20) {
      const row = document.createElement('div');
      row.style.cssText = 'padding:4px 10px;font-size:11px;color:var(--fg-2,#888);font-style:italic';
      row.textContent = `… and ${attrs.length - 20} more attributes`;
      table.appendChild(row);
    }
    sec.appendChild(table);
    host.appendChild(sec);
	  }

  const anchorEl = makeListSection('Anchors', anchors.slice(0, 30), (li, item) => {
    li.appendChild(sourceButton(item.id, item.firstLine, `Open anchor on line ${item.firstLine}`));
    li.appendChild(chip([...item.kinds].join(', '), 'muted'));
    if (item.lines.length > 1) li.appendChild(chip(`${item.lines.length} duplicates`, 'warn'));
  });
  if (anchorEl) host.appendChild(anchorEl);

  const xrefEl = makeListSection('Cross References', xrefs, (li, item) => {
    li.appendChild(sourceButton(item.target, item.line, `Open reference on line ${item.line}`));
    li.appendChild(chip(item.syntax, 'muted'));
    li.appendChild(chip(anchors.some((a) => a.id === item.target) ? 'resolved' : 'missing', anchors.some((a) => a.id === item.target) ? 'ok' : 'warn'));
  });
  if (xrefEl) host.appendChild(xrefEl);

  const includeEl = makeListSection('Includes', includes, (li, item) => {
    li.appendChild(sourceButton(item.path, item.line, `Open include on line ${item.line}`));
    li.appendChild(chip(item.optional ? 'optional include' : 'include dependency', item.optional ? 'warn' : 'info', 'Include target must be available to the AsciiDoc processor.'));
  });
  if (includeEl) host.appendChild(includeEl);

  const imageEl = makeListSection('Images', images, (li, item) => {
    li.appendChild(sourceButton(item.path, item.line, `Open image reference on line ${item.line}`));
    if (item.attrs) li.appendChild(chip(item.attrs, 'muted', 'Image attributes such as alt text, dimensions, or title.'));
  });
  if (imageEl) host.appendChild(imageEl);

  const admonitionEl = makeListSection('Admonitions', admonitions, (li, item) => {
    li.appendChild(sourceButton(item.kind, item.line, `Open admonition on line ${item.line}`));
    li.appendChild(chip(admonitionHint(item.kind), item.kind === 'WARNING' || item.kind === 'CAUTION' ? 'warn' : 'info'));
    if (item.text) {
      const note = document.createElement('div');
      note.className = 'adoc-note';
      note.textContent = item.text;
      li.appendChild(note);
    }
  });
  if (admonitionEl) host.appendChild(admonitionEl);

  const issueEl = issueList(issues, { title: 'Document Diagnostics' });
  if (issueEl) host.appendChild(issueEl);

  host.appendChild(sourcePreview(text, { title: allLines.length > MAX_LINES ? `Source (${allLines.length} lines)` : 'Source', collapsed: true, idPrefix: 'adoc-line', highlighter: highlightAsciiDoc }));
  wireSourceLinks(host, { idPrefix: 'adoc-line' });

	  return { parentNode: host };
	}

function makeListSection(title, items, renderRow) {
  if (!items.length) return null;
  const sec = document.createElement('div');
  sec.className = 'adoc-sec';
  const h3 = document.createElement('h3');
  h3.textContent = `${title} (${items.length})`;
  sec.appendChild(h3);
  const ul = document.createElement('ul');
  ul.className = 'adoc-list';
  for (const item of items) {
    const li = document.createElement('li');
    renderRow(li, item);
    ul.appendChild(li);
  }
  sec.appendChild(ul);
  return sec;
}

function admonitionHint(kind) {
  const hints = {
    NOTE: 'Informational callout.',
    TIP: 'Helpful recommendation.',
    IMPORTANT: 'Important requirement or constraint.',
    WARNING: 'Potentially harmful or surprising condition.',
    CAUTION: 'Risk that deserves careful review.',
  };
  return hints[kind] || 'AsciiDoc admonition.';
}
