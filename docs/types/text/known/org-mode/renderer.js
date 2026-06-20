const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.org-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.org-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#5c4b8a;color:#fff;vertical-align:middle;margin-right:8px}
.org-title{font-size:18px;font-weight:700;margin:0 0 4px}
.org-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.org-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}
.org-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px}
.org-card strong{display:block;font-size:1.2rem;font-weight:700}
.org-card span{font-size:.8rem;color:var(--fg-2,#5a6678)}
.org-sec{margin:14px 0}
.org-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.org-outline{list-style:none;padding:0;margin:0;font-size:13px}
.org-outline li{padding:3px 0;border-bottom:1px solid var(--border,#eaecf0);display:flex;align-items:center;gap:6px}
.org-outline li:last-child{border-bottom:none}
.org-h1{font-weight:700;color:var(--fg,#24292f)}
.org-h2{padding-left:16px;color:var(--fg,#555)}
.org-h3{padding-left:32px;color:var(--fg-2,#666);font-size:12px}
.org-h4{padding-left:48px;color:var(--fg-2,#777);font-size:12px}
.org-todo{display:inline-block;padding:1px 5px;border-radius:3px;font-size:10px;font-weight:700;background:#fef3c7;color:#92400e;border:1px solid #fcd34d;font-family:ui-monospace,monospace}
.org-done{display:inline-block;padding:1px 5px;border-radius:3px;font-size:10px;font-weight:700;background:#d1fae5;color:#065f46;border:1px solid #6ee7b7;font-family:ui-monospace,monospace}
.org-lang-tags{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0}
.org-lang-tag{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;background:var(--bg-2,#ede9fe);color:#5c4b8a;border:1px solid #c4b5fd;font-family:ui-monospace,monospace}
.org-pre{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:12px;overflow:auto;font-size:12px;font-family:ui-monospace,monospace;line-height:1.6;margin:0;white-space:pre}
.org-trunc{font-size:11px;color:var(--fg-2,#888);padding:4px 12px;font-style:italic}
.org-kw{color:#5c4b8a;font-weight:700}
.org-h-star{color:#9333ea;font-weight:700}
.org-kw-todo{color:#92400e;font-weight:700}
.org-kw-done{color:#065f46;font-weight:700}
.org-timestamp{color:#0550ae}
.org-link{color:#0f6fba}
.org-code{color:#d73a49;background:rgba(175,184,193,.2);padding:0 3px;border-radius:3px;font-family:ui-monospace,monospace}
.org-bold{font-weight:700}
.org-italic{font-style:italic}
.org-src-begin{color:#1a7f37;font-weight:700}
.org-comment{color:var(--fg-2,#6e7681);font-style:italic}
.org-table-line{color:#b45309}
`;

function parseOrg(text) {
  const lines = text.split('\n');
  let title = null;
  let author = null;
  const headings = [];
  let todoCount = 0;
  let doneCount = 0;
  let srcCount = 0;
  let tableCount = 0;
  let linkCount = 0;
  const langCounts = new Map();
  let inSrc = false;

  for (const line of lines) {
    // Property keywords
    const propM = line.match(/^#\+(\w+):\s*(.*)$/i);
    if (propM) {
      const key = propM[1].toUpperCase();
      const val = propM[2].trim();
      if (key === 'TITLE' && !title) title = val;
      if (key === 'AUTHOR' && !author) author = val;
      // Track BEGIN_SRC
      if (key === 'BEGIN_SRC') {
        srcCount++;
        inSrc = true;
        const lang = val.split(/\s+/)[0].toLowerCase() || 'unknown';
        langCounts.set(lang, (langCounts.get(lang) || 0) + 1);
      }
      if (key === 'END_SRC') inSrc = false;
      continue;
    }

    // Headings: lines starting with one or more *
    const headM = line.match(/^(\*+)\s+(?:(TODO|DONE|FIXME|CANCELLED|WAITING|NEXT|STARTED|IN-PROGRESS)\s+)?(.+)$/);
    if (headM) {
      const level = headM[1].length;
      const keyword = headM[2] || null;
      const headText = headM[3].replace(/\s*:[\w@#%:]+:\s*$/, '').trim(); // strip tags
      headings.push({ level, keyword, text: headText });
      if (keyword === 'TODO' || keyword === 'FIXME' || keyword === 'WAITING' || keyword === 'NEXT' || keyword === 'STARTED' || keyword === 'IN-PROGRESS') todoCount++;
      if (keyword === 'DONE' || keyword === 'CANCELLED') doneCount++;
      continue;
    }

    // Tables
    if (/^\s*\|/.test(line) && /\|/.test(line.slice(1))) {
      // Count distinct table starts (first | line after non-table line)
      tableCount++;
      continue;
    }

    // Links
    const linkMatches = line.match(/\[\[/g);
    if (linkMatches) linkCount += linkMatches.length;
  }

  // Deduplicate table count (count only "blocks" not individual rows)
  // Simple approach: tableCount was counting every row, so we just count it raw and trust the user sample

  return { title, author, headings, todoCount, doneCount, srcCount, tableCount, linkCount, langCounts };
}

function highlightOrg(lines) {
  return lines.map((line) => {
    // Property keyword
    if (/^#\+\w+:/i.test(line)) {
      return `<span class="org-kw">${esc(line)}</span>`;
    }
    // Comment
    if (/^#(?!\+)/.test(line)) {
      return `<span class="org-comment">${esc(line)}</span>`;
    }
    // BEGIN/END SRC
    if (/^#\+(?:BEGIN|END)_SRC/i.test(line)) {
      return `<span class="org-src-begin">${esc(line)}</span>`;
    }
    // BEGIN/END blocks
    if (/^#\+(?:BEGIN|END)_/i.test(line)) {
      return `<span class="org-src-begin">${esc(line)}</span>`;
    }
    // Heading
    const headM = line.match(/^(\*+)(\s+(?:TODO|DONE|FIXME|CANCELLED|WAITING|NEXT|STARTED|IN-PROGRESS))?(\s+.+)?$/);
    if (headM && headM[3] !== undefined) {
      const stars = esc(headM[1]);
      const kwRaw = (headM[2] || '').trim();
      const rest = esc((headM[3] || ''));
      let kwSpan = '';
      if (kwRaw) {
        const isTodo = /^(TODO|FIXME|WAITING|NEXT|STARTED|IN-PROGRESS)$/.test(kwRaw);
        kwSpan = ` <span class="${isTodo ? 'org-kw-todo' : 'org-kw-done'}">${esc(kwRaw)}</span>`;
      }
      return `<span class="org-h-star">${stars}</span>${kwSpan}${rest}`;
    }
    // Table row
    if (/^\s*\|/.test(line)) {
      return `<span class="org-table-line">${esc(line)}</span>`;
    }
    // Timestamps
    let out = esc(line);
    out = out.replace(/\[[\d]{4}-[\d]{2}-[\d]{2}[^\]]*\]/g, (m) => `<span class="org-timestamp">${m}</span>`);
    out = out.replace(/&lt;[\d]{4}-[\d]{2}-[\d]{2}[^&]*&gt;/g, (m) => `<span class="org-timestamp">${m}</span>`);
    // Links [[target][desc]]
    out = out.replace(/\[\[[^\]]*\](?:\[[^\]]*\])?\]/g, (m) => `<span class="org-link">${m}</span>`);
    // Inline code =code=
    out = out.replace(/=([^=\n]+)=/g, '<span class="org-code">=$1=</span>');
    // Inline code ~code~
    out = out.replace(/~([^~\n]+)~/g, '<span class="org-code">~$1~</span>');
    // Bold *word*
    out = out.replace(/\*([^*\n]+)\*/g, '<strong class="org-bold">*$1*</strong>');
    // Italic /word/
    out = out.replace(/\/([^/\n]+)\//g, '<em class="org-italic">/$1/</em>');
    return out;
  }).join('\n');
}

export function render(intake) {
  const text = intake.text || '';
  const { title, author, headings, todoCount, doneCount, srcCount, tableCount, linkCount, langCounts } = parseOrg(text);
  const allLines = text.split('\n');
  const MAX_LINES = 80;
  const truncated = allLines.length > MAX_LINES;
  const displayLines = truncated ? allLines.slice(0, MAX_LINES) : allLines;

  const host = document.createElement('div');
  host.className = 'org-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px';
  const badge = document.createElement('span');
  badge.className = 'org-badge';
  badge.textContent = 'Org';
  const titleEl = document.createElement('span');
  titleEl.className = 'org-title';
  titleEl.textContent = title || (intake.name || intake.filename || '').split('/').pop() || 'Org-mode Document';
  header.appendChild(badge);
  header.appendChild(titleEl);
  host.appendChild(header);

  const sub = document.createElement('div');
  sub.className = 'org-sub';
  const subParts = ['Emacs Org-mode document'];
  if (author) subParts.push(`by ${author}`);
  sub.textContent = subParts.join(' · ');
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'org-summary';
  for (const { value, label } of [
    { value: headings.length, label: 'Headings' },
    { value: todoCount, label: 'TODO items' },
    { value: doneCount, label: 'DONE items' },
    { value: srcCount, label: 'Code blocks' },
    { value: linkCount, label: 'Links' },
  ]) {
    const card = document.createElement('div');
    card.className = 'org-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Code block languages
  if (langCounts.size > 0) {
    const sec = document.createElement('div');
    sec.className = 'org-sec';
    const h3 = document.createElement('h3');
    h3.textContent = `Code blocks (${srcCount} total)`;
    sec.appendChild(h3);
    const tags = document.createElement('div');
    tags.className = 'org-lang-tags';
    for (const [lang, count] of [...langCounts.entries()].sort((a, b) => b[1] - a[1])) {
      const tag = document.createElement('span');
      tag.className = 'org-lang-tag';
      tag.textContent = `${lang} ×${count}`;
      tags.appendChild(tag);
    }
    sec.appendChild(tags);
    host.appendChild(sec);
  }

  // Heading outline (top 3 levels, truncate at 30)
  const outlineHeadings = headings.filter((h) => h.level <= 3).slice(0, 30);
  if (outlineHeadings.length) {
    const sec = document.createElement('div');
    sec.className = 'org-sec';
    const h3 = document.createElement('h3');
    h3.textContent = 'Outline';
    sec.appendChild(h3);
    const ul = document.createElement('ul');
    ul.className = 'org-outline';
    for (const { level, keyword, text: hText } of outlineHeadings) {
      const li = document.createElement('li');
      li.className = `org-h${Math.min(level, 4)}`;
      if (keyword) {
        const kwSpan = document.createElement('span');
        const isTodo = /^(TODO|FIXME|WAITING|NEXT|STARTED|IN-PROGRESS)$/.test(keyword);
        kwSpan.className = isTodo ? 'org-todo' : 'org-done';
        kwSpan.textContent = keyword;
        li.appendChild(kwSpan);
      }
      const textNode = document.createTextNode(hText);
      li.appendChild(textNode);
      ul.appendChild(li);
    }
    if (headings.filter((h) => h.level <= 3).length > 30) {
      const li = document.createElement('li');
      li.style.cssText = 'color:var(--fg-2,#888);font-size:11px;font-style:italic';
      li.textContent = `… and ${headings.filter((h) => h.level <= 3).length - 30} more headings`;
      ul.appendChild(li);
    }
    sec.appendChild(ul);
    host.appendChild(sec);
  }

  // Source preview
  const codeSec = document.createElement('div');
  codeSec.className = 'org-sec';
  const codeH3 = document.createElement('h3');
  codeH3.textContent = truncated ? `Source (first ${MAX_LINES} lines)` : 'Source';
  codeSec.appendChild(codeH3);
  const pre = document.createElement('pre');
  pre.className = 'org-pre';
  pre.innerHTML = highlightOrg(displayLines);
  codeSec.appendChild(pre);
  if (truncated) {
    const trunc = document.createElement('div');
    trunc.className = 'org-trunc';
    trunc.textContent = `… truncated — ${allLines.length - MAX_LINES} more lines not shown`;
    codeSec.appendChild(trunc);
  }
  host.appendChild(codeSec);

  return { parentNode: host };
}
