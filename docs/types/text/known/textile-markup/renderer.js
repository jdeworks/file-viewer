import { chip, ensureKnownUiStyle, esc, issueList, sourceButton, sourcePreview, wireSourceLinks } from '../../../../core/known-ui.js';

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
.textile-outline li{padding:3px 0 3px 0;border-bottom:1px solid var(--border,#eaecf0);display:flex;gap:6px;align-items:baseline;flex-wrap:wrap}
.textile-outline li:last-child{border-bottom:none}
.textile-list{margin:0;padding:0;list-style:none}
.textile-list li{padding:6px 14px;border-bottom:1px solid var(--border,#eaecf0);font-size:12px;display:flex;gap:7px;align-items:baseline;flex-wrap:wrap}
.textile-list li:last-child{border-bottom:none}
.textile-note{color:var(--fg-2,#5a6678);font-family:system-ui,sans-serif;font-size:12px;flex-basis:100%}
.textile-h1{font-weight:700}
.textile-h2{padding-left:14px;color:var(--fg,#444)}
.textile-h3{padding-left:28px;color:var(--fg-2,#666);font-size:12px}
.textile-h4{padding-left:42px;color:var(--fg-2,#777);font-size:12px}
.textile-heading-line{color:#c0392b;font-weight:600}
.textile-link-line{color:#0550ae}
.textile-code-line{color:#6f42c1;font-family:ui-monospace,monospace}
.textile-comment{color:#6e7781;font-style:italic}
`;

function parseTextile(text) {
  const lines = text.split(/\r?\n/);
  const headings = [];
  const links = [];
  const images = [];
  const issues = [];
  let linkCount = 0;
  let imageCount = 0;
  let codeBlockCount = 0;
  let tableCount = 0;
  let wordCount = 0;
  let inCode = false;
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;
    const trimmed = line.trim();

    // Headings: h1. h2. h3. h4. h5. h6.
    const headM = trimmed.match(/^h([1-6])\.\s+(.+)$/);
    if (headM) {
      headings.push({ level: parseInt(headM[1], 10), text: headM[2].trim(), line: lineNo });
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
    for (const m of trimmed.matchAll(/"([^"]+)":(\S+)/g)) {
      const label = m[1].trim();
      const url = m[2].trim();
      if (isTextileUrl(url)) {
        links.push({ label, url, line: lineNo });
        linkCount++;
      } else {
        issues.push({ severity: 'warning', label: 'malformed link', line: lineNo, message: `Textile link "${label}" points to "${url}", which does not look like a supported URL.` });
      }
    }

    // Images: !url! or !url(alt)!
    const imgMatches = [...trimmed.matchAll(/!([^!\s][^!]*?)!/g)];
    for (const m of imgMatches) {
      images.push(parseImage(m[1].trim(), lineNo));
      imageCount++;
    }
    const bangCount = (trimmed.match(/!/g) || []).length;
    if (bangCount % 2 === 1 || (trimmed.includes('!') && !imgMatches.length)) {
      issues.push({ severity: 'warning', label: 'malformed image', line: lineNo, message: 'Image markup contains unmatched ! delimiters.' });
    }

    // Word count
    if (trimmed && !/^(h[1-6]\.|bc\.|pre\.|p\.|bq\.|fn\d+\.)/.test(trimmed)) {
      wordCount += trimmed.split(/\s+/).filter(Boolean).length;
    }
  }

  return { headings, links, images, issues, linkCount, imageCount, codeBlockCount, tableCount, wordCount };
}

function isTextileUrl(url) {
  return /^(?:https?:\/\/|mailto:|\/|#)/i.test(url);
}

function parseImage(raw, line) {
  let body = raw;
  let linkTarget = '';
  const linkedM = body.match(/^"([^"]+)":(.+)$/);
  if (linkedM) {
    linkTarget = linkedM[1].trim();
    body = linkedM[2].trim();
  }
  const altM = body.match(/^(.*)\(([^()]*)\)$/);
  const url = (altM ? altM[1] : body).trim();
  const alt = (altM?.[2] || '').trim();
  return { url, alt, linkTarget, line };
}

function highlightTextileLine(line) {
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

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'textile-list';
  sec.appendChild(ul);
  return ul;
}

export function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').split('/').pop();
  const { headings, links, images, issues, linkCount, imageCount, codeBlockCount, tableCount, wordCount } = parseTextile(text);

  const host = document.createElement('div');
  host.className = 'textile-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);
  ensureKnownUiStyle(host);

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
    for (const { level, text: hText, line } of headings.slice(0, 40)) {
      const li = document.createElement('li');
      li.className = `textile-h${Math.min(level, 4)}`;
      li.appendChild(chip(`h${level}`, 'info'));
      li.appendChild(sourceButton(hText, line, 'Open heading in source'));
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

  if (links.length) {
    const sec = makeSection(host, `Links (${links.length})`);
    const ul = makeList(sec);
    for (const link of links.slice(0, 12)) {
      const li = document.createElement('li');
      li.appendChild(chip('link', 'ok', 'Textile external link.'));
      li.appendChild(sourceButton(link.label, link.line, 'Open link in source'));
      const note = document.createElement('span');
      note.className = 'textile-note';
      note.textContent = link.url;
      li.appendChild(note);
      ul.appendChild(li);
    }
  }

  if (images.length) {
    const sec = makeSection(host, `Images (${images.length})`);
    const ul = makeList(sec);
    for (const image of images.slice(0, 12)) {
      const li = document.createElement('li');
      li.appendChild(chip('image', image.alt ? 'ok' : 'warn', image.alt ? 'Image has alternate text.' : 'Image has no alternate text.'));
      li.appendChild(sourceButton(image.url, image.line, 'Open image markup in source'));
      if (image.alt) li.appendChild(chip('alt', 'info', image.alt));
      if (image.linkTarget) li.appendChild(chip('linked', 'muted', `Image links to ${image.linkTarget}.`));
      ul.appendChild(li);
    }
  }

  const issueEl = issueList(issues, { title: 'Markup Review' });
  if (issueEl) host.appendChild(issueEl);

  host.appendChild(sourcePreview(text, { title: 'Source', collapsed: true, idPrefix: 'textile-line', highlighter: highlightTextileLine }));
  wireSourceLinks(host, { idPrefix: 'textile-line' });

  return { parentNode: host };
}
