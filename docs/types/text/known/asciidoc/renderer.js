const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
.adoc-outline li{padding:3px 0;border-bottom:1px solid var(--border,#eaecf0)}
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
.adoc-pre{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:12px;overflow:auto;font-size:12px;font-family:ui-monospace,monospace;line-height:1.6;margin:0;white-space:pre}
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
  let wordCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Document title: first line starting with `= ` (level 0)
    if (i === 0 && /^= /.test(line)) {
      docTitle = line.replace(/^=\s+/, '').trim();
      continue;
    }

    // Attribute: `:key: value`
    const attrM = line.match(/^:([^:]+):\s*(.*)$/);
    if (attrM) {
      attrs.push({ key: attrM[1], value: attrM[2] });
      continue;
    }

    // Headings: `== `, `=== `, etc.
    const headM = line.match(/^(={2,6})\s+(.+)$/);
    if (headM) {
      headings.push({ level: headM[1].length, text: headM[2].trim() });
      continue;
    }

    // Word count estimate from regular text lines
    if (line && !/^(==|--|\.\.|-{4}|={4}|\[|\/\/|\*\*\*\*|____|\+\+\+\+)/.test(line)) {
      wordCount += line.split(/\s+/).filter(Boolean).length;
    }
  }

  return { docTitle, attrs, headings, wordCount };
}

function highlightAsciiDoc(lines) {
  return lines.map((line) => {
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
  }).join('\n');
}

export function render(intake) {
  const text = intake.text || '';
  const { docTitle, attrs, headings, wordCount } = parseDoc(text);
  const allLines = text.split('\n');
  const truncated = allLines.length > MAX_LINES;
  const displayLines = truncated ? allLines.slice(0, MAX_LINES) : allLines;

  // Find author and toc from attrs
  const authorAttr = attrs.find((a) => a.key === 'author' || a.key === 'Author');
  const author = authorAttr ? authorAttr.value : null;

  const host = document.createElement('div');
  host.className = 'adoc-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

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
    { value: `~${wordCount}`, label: 'Words' },
    { value: allLines.length, label: 'Lines' },
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
    for (const { level, text: hText } of headings.slice(0, 40)) {
      const li = document.createElement('li');
      li.className = `adoc-level-${Math.min(level, 5)}`;
      li.textContent = hText;
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
    for (const { key, value } of attrs.slice(0, 20)) {
      const row = document.createElement('div');
      row.className = 'adoc-attr-row';
      const k = document.createElement('div');
      k.className = 'adoc-attr-k';
      k.textContent = `:${key}:`;
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

  // Source preview
  const codeSec = document.createElement('div');
  codeSec.className = 'adoc-sec';
  const codeH3 = document.createElement('h3');
  codeH3.textContent = truncated ? `Source (first ${MAX_LINES} lines)` : 'Source';
  codeSec.appendChild(codeH3);
  const pre = document.createElement('pre');
  pre.className = 'adoc-pre';
  pre.innerHTML = highlightAsciiDoc(displayLines);
  codeSec.appendChild(pre);
  if (truncated) {
    const trunc = document.createElement('div');
    trunc.className = 'adoc-trunc';
    trunc.textContent = `… truncated — ${allLines.length - MAX_LINES} more lines not shown`;
    codeSec.appendChild(trunc);
  }
  host.appendChild(codeSec);

  return { parentNode: host };
}
