const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.textile-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.textile-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#c0392b;color:#fff;vertical-align:middle;margin-right:8px}
.textile-title{font-size:18px;font-weight:700;margin:0 0 4px}
.textile-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.textile-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}
.textile-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px}
.textile-card strong{display:block;font-size:1.2rem;font-weight:700}
.textile-card span{font-size:.8rem;color:var(--fg-2,#5a6678)}
.textile-section{margin:0 0 14px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden}
.textile-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0)}
.textile-outline{list-style:none;padding:0;margin:0;font-size:13px}
.textile-outline li{padding:3px 0 3px 0;border-bottom:1px solid var(--border,#eaecf0)}
.textile-outline li:last-child{border-bottom:none}
.textile-h1{font-weight:700}
.textile-h2{padding-left:14px;color:var(--fg,#444)}
.textile-h3{padding-left:28px;color:var(--fg-2,#666);font-size:12px}
.textile-h4{padding-left:42px;color:var(--fg-2,#777);font-size:12px}
.textile-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre}
.textile-heading-line{color:#c0392b;font-weight:600}
.textile-link-line{color:#0550ae}
.textile-code-line{color:#6f42c1;font-family:ui-monospace,monospace}
.textile-comment{color:#6e7781;font-style:italic}
`;

function parseTextile(text) {
  const lines = text.split(/\r?\n/);
  const headings = [];
  let linkCount = 0;
  let imageCount = 0;
  let codeBlockCount = 0;
  let tableCount = 0;
  let wordCount = 0;
  let inCode = false;
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Headings: h1. h2. h3. h4. h5. h6.
    const headM = trimmed.match(/^h([1-6])\.\s+(.+)$/);
    if (headM) {
      headings.push({ level: parseInt(headM[1], 10), text: headM[2].trim() });
      continue;
    }

    // Code blocks: bc. or <code> or pre.
    if (/^bc\.\s/.test(trimmed) || /^pre\.\s/.test(trimmed)) {
      codeBlockCount++;
      continue;
    }
    if (trimmed === 'bc.' || trimmed === 'pre.') {
      codeBlockCount++;
      inCode = true;
      continue;
    }
    if (inCode && trimmed === '') {
      inCode = false;
      continue;
    }
    if (inCode) continue;

    // Tables: lines starting with |
    if (trimmed.startsWith('|')) {
      if (!inTable) {
        tableCount++;
        inTable = true;
      }
    } else {
      inTable = false;
    }

    // Links: "text":url
    const linkMatches = trimmed.match(/"[^"]+":https?:\/\/\S+/g);
    if (linkMatches) linkCount += linkMatches.length;

    // Images: !url! or !url(alt)!
    const imgMatches = trimmed.match(/!\S+!/g);
    if (imgMatches) imageCount += imgMatches.length;

    // Word count
    if (trimmed && !/^(h[1-6]\.|bc\.|pre\.|p\.|bq\.|fn\d+\.)/.test(trimmed)) {
      wordCount += trimmed.split(/\s+/).filter(Boolean).length;
    }
  }

  return { headings, linkCount, imageCount, codeBlockCount, tableCount, wordCount };
}

function highlightTextile(text) {
  const lines = text.split(/\r?\n/);
  return lines.map((line) => {
    const trimmed = line.trim();
    if (/^h[1-6]\.\s/.test(trimmed)) {
      return `<span class="textile-heading-line">${esc(line)}</span>`;
    }
    if (/^(bc|pre)\.\s/.test(trimmed) || /^<code/.test(trimmed)) {
      return `<span class="textile-code-line">${esc(line)}</span>`;
    }
    if (/"[^"]+":https?:/.test(trimmed)) {
      return `<span class="textile-link-line">${esc(line)}</span>`;
    }
    return esc(line);
  }).join('\n');
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'textile-section';
  const hd = document.createElement('div');
  hd.className = 'textile-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

export function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').split('/').pop();
  const { headings, linkCount, imageCount, codeBlockCount, tableCount, wordCount } = parseTextile(text);
  const lines = text.split(/\r?\n/);

  const host = document.createElement('div');
  host.className = 'textile-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px';
  const badge = document.createElement('span');
  badge.className = 'textile-badge';
  badge.textContent = 'Textile';
  const title = document.createElement('span');
  title.className = 'textile-title';
  // Try to get title from first h1
  const firstH1 = headings.find((h) => h.level === 1);
  title.textContent = firstH1 ? firstH1.text : (name || 'Textile Document');
  header.appendChild(badge);
  header.appendChild(title);
  host.appendChild(header);

  const sub = document.createElement('div');
  sub.className = 'textile-sub';
  const subParts = [];
  if (headings.length) subParts.push(`${headings.length} heading${headings.length !== 1 ? 's' : ''}`);
  subParts.push(`~${wordCount} words`);
  sub.textContent = subParts.join(' · ') || 'Textile markup document';
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'textile-cards';
  for (const { value, label } of [
    { value: headings.length, label: 'Headings' },
    { value: linkCount, label: 'Links' },
    { value: imageCount, label: 'Images' },
    { value: codeBlockCount, label: 'Code blocks' },
    { value: tableCount, label: 'Tables' },
    { value: `~${wordCount}`, label: 'Words' },
  ]) {
    const card = document.createElement('div');
    card.className = 'textile-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Heading outline
  if (headings.length) {
    const sec = makeSection(host, `Heading Outline (${headings.length})`);
    const ul = document.createElement('ul');
    ul.className = 'textile-outline';
    for (const { level, text: hText } of headings.slice(0, 40)) {
      const li = document.createElement('li');
      li.className = `textile-h${Math.min(level, 4)}`;
      li.textContent = `h${level}. ${hText}`;
      ul.appendChild(li);
    }
    if (headings.length > 40) {
      const li = document.createElement('li');
      li.style.cssText = 'color:var(--fg-2,#888);font-size:11px;font-style:italic';
      li.textContent = `… and ${headings.length - 40} more`;
      ul.appendChild(li);
    }
    sec.appendChild(ul);
  }

  // Source preview
  const MAX = 120;
  const truncated = lines.length > MAX;
  const srcSec = makeSection(host, truncated ? `Source (first ${MAX} lines)` : 'Source');
  const pre = document.createElement('pre');
  pre.className = 'textile-pre';
  pre.innerHTML = highlightTextile((truncated ? lines.slice(0, MAX) : lines).join('\n'));
  srcSec.appendChild(pre);
  if (truncated) {
    const note = document.createElement('div');
    note.style.cssText = 'padding:6px 14px;font-size:11px;color:var(--fg-2,#888);font-style:italic;border-top:1px solid var(--border,#e0e0e0)';
    note.textContent = `… truncated — ${lines.length - MAX} more lines not shown`;
    srcSec.appendChild(note);
  }

  return { parentNode: host };
}
