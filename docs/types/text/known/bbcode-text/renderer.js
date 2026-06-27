import { chip, ensureKnownUiStyle, esc, issueList, sourceButton, sourcePreview, wireSourceLinks } from '../../../../core/known-ui.js';

const CSS = `
.bbc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.bbc-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e67e22;color:#fff;vertical-align:middle;margin-right:8px}
.bbc-title{font-size:18px;font-weight:700;margin:0 0 4px}
.bbc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.bbc-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}
.bbc-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px}
.bbc-card strong{display:block;font-size:1.2rem;font-weight:700}
.bbc-card span{font-size:.8rem;color:var(--fg-2,#5a6678)}
.bbc-section{margin:0 0 14px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden}
.bbc-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0)}
.bbc-list{margin:0;padding:0;list-style:none}
.bbc-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-size:12px;display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}
.bbc-list li:last-child{border-bottom:none}
.bbc-note{color:var(--fg-2,#5a6678);font-family:system-ui,sans-serif;font-size:12px;flex-basis:100%}
.bbc-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#fef3e6;color:#e67e22;font-weight:700;flex-shrink:0;font-family:ui-monospace,monospace}
.bbc-tag-url{background:#eaf1fb;color:#3366cc}
.bbc-tag-img{background:#fef3c7;color:#92400e}
.bbc-tag-code{background:#f3e8ff;color:#7c3aed}
.bbc-tag-quote{background:#e6f4ea;color:#137333}
.bbc-tag-line{color:#e67e22;font-weight:600}
.bbc-url-line{color:#0550ae}
.bbc-code-line{color:#7c3aed}
.bbc-quote-line{color:#137333}
`;

function parseBBCode(text) {
  // All unique tag names found (lowercase)
  const tagCounts = {};
  const urls = [];
  const images = [];
  const quotes = [];
  const codeBlocks = [];
  const issues = [];
  let codeBlockCount = 0;
  let boldCount = 0;
  let italicCount = 0;
  const stack = [];
  const pairTags = new Set(['b', 'i', 'u', 's', 'url', 'img', 'quote', 'code', 'color', 'size', 'list', 'spoiler']);
  const selfTags = new Set(['*', 'br', 'hr']);

  // Extract all [tag] and [tag=...] occurrences
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;
    const tagRe = /\[(\/?[\w*]+)(?:=[^\]]+)?\]/gi;
    let m;
    while ((m = tagRe.exec(line)) !== null) {
      const raw = m[1].toLowerCase();
      const closing = raw.startsWith('/');
      const tag = closing ? raw.slice(1) : raw;
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      if (selfTags.has(tag)) continue;
      if (!pairTags.has(tag)) continue;
      if (!closing) {
        stack.push({ tag, line: lineNo });
        continue;
      }
      const last = stack.pop();
      if (!last) {
        issues.push({ severity: 'warning', label: 'unmatched close', line: lineNo, message: `Closing tag [/${tag}] has no matching opener.` });
      } else if (last.tag !== tag) {
        issues.push({ severity: 'warning', label: 'tag mismatch', line: lineNo, message: `Closing tag [/${tag}] does not match open [${last.tag}] from line ${last.line}.` });
      }
    }
  }
  for (const open of stack.reverse()) {
    issues.push({ severity: 'warning', label: 'unclosed tag', line: open.line, message: `Opening tag [${open.tag}] is not closed.` });
  }

  // URLs: [url=http://...]...[/url]
  const urlRe = /\[url=([^\]]+)\]/gi;
  let m;
  while ((m = urlRe.exec(text)) !== null) {
    urls.push({ url: m[1], line: lineForIndex(text, m.index) });
  }

  // Images: [img]url[/img]
  const imgRe = /\[img\]([^\[]+)\[\/img\]/gi;
  while ((m = imgRe.exec(text)) !== null) {
    images.push({ url: m[1].trim(), line: lineForIndex(text, m.index) });
  }

  // Quotes: [quote]...[/quote] or [quote=author]
  const quoteRe = /\[quote(?:=([^\]]+))?\]/gi;
  while ((m = quoteRe.exec(text)) !== null) {
    quotes.push({ author: m[1] ? m[1].trim() : '(anonymous)', line: lineForIndex(text, m.index) });
  }

  // Code blocks
  codeBlockCount = (text.match(/\[code\]/gi) || []).length;
  const codeRe = /\[code\]/gi;
  while ((m = codeRe.exec(text)) !== null) codeBlocks.push({ line: lineForIndex(text, m.index) });

  // Bold/italic counts (opening tags only)
  boldCount = (text.match(/\[b\]/gi) || []).length;
  italicCount = (text.match(/\[i\]/gi) || []).length;

  // Collect unique tags sorted by frequency
  const tagList = Object.entries(tagCounts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }));

  for (const item of duplicateItems(urls, 'url')) {
    issues.push({ severity: 'info', label: 'repeated link', line: item.line, message: `Link "${item.value}" appears ${item.count} times.` });
  }
  for (const item of duplicateItems(images, 'url')) {
    issues.push({ severity: 'info', label: 'repeated image', line: item.line, message: `Image "${item.value}" appears ${item.count} times.` });
  }

  return { tagList, urls, images, quotes, codeBlocks, issues, codeBlockCount, boldCount, italicCount };
}

function lineForIndex(text, idx) {
  return text.slice(0, idx).split(/\r?\n/).length;
}

function duplicateItems(items, key) {
  const seen = new Map();
  for (const item of items) {
    const value = item[key];
    if (!seen.has(value)) seen.set(value, { value, count: 0, line: item.line });
    seen.get(value).count++;
  }
  return [...seen.values()].filter((item) => item.count > 1);
}

function highlightBBCodeLine(line) {
  if (/\[url/i.test(line)) return `<span class="bbc-url-line">${esc(line)}</span>`;
  if (/\[code\]/i.test(line) || /\[\/code\]/i.test(line)) return `<span class="bbc-code-line">${esc(line)}</span>`;
  if (/\[quote/i.test(line) || /\[\/quote\]/i.test(line)) return `<span class="bbc-quote-line">${esc(line)}</span>`;
  if (/\[[a-z*]/.test(line.toLowerCase())) return `<span class="bbc-tag-line">${esc(line)}</span>`;
  return esc(line);
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'bbc-section';
  const hd = document.createElement('div');
  hd.className = 'bbc-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'bbc-list';
  sec.appendChild(ul);
  return ul;
}

export function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').split('/').pop();
  const { tagList, urls, images, quotes, codeBlocks, issues, codeBlockCount, boldCount, italicCount } = parseBBCode(text);
  const wordCount = text.replace(/\[[^\]]*\]/g, '').split(/\s+/).filter(Boolean).length;

  const host = document.createElement('div');
  host.className = 'bbc-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);
  ensureKnownUiStyle(host);

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px';
  const badge = document.createElement('span');
  badge.className = 'bbc-badge';
  badge.textContent = 'BBCode';
  const title = document.createElement('span');
  title.className = 'bbc-title';
  title.textContent = name || 'BBCode Document';
  header.appendChild(badge);
  header.appendChild(title);
  host.appendChild(header);

  const sub = document.createElement('div');
  sub.className = 'bbc-sub';
  const subParts = [];
  if (tagList.length) subParts.push(`${tagList.length} tag type${tagList.length !== 1 ? 's' : ''}`);
  if (urls.length) subParts.push(`${urls.length} link${urls.length !== 1 ? 's' : ''}`);
  if (quotes.length) subParts.push(`${quotes.length} quote${quotes.length !== 1 ? 's' : ''}`);
  subParts.push(`~${wordCount} words`);
  sub.textContent = subParts.join(' · ') || 'BBCode forum markup';
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'bbc-cards';
  for (const { value, label } of [
    { value: tagList.length, label: 'Tag types' },
    { value: urls.length, label: 'Links' },
    { value: images.length, label: 'Images' },
    { value: quotes.length, label: 'Quotes' },
    { value: codeBlockCount, label: 'Code blocks' },
    { value: boldCount, label: '[b] bold' },
    { value: italicCount, label: '[i] italic' },
    { value: `~${wordCount}`, label: 'Words' },
  ]) {
    const card = document.createElement('div');
    card.className = 'bbc-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Tag inventory
  if (tagList.length) {
    const sec = makeSection(host, `BBCode Tags Used (${tagList.length} types)`);
    const ul = makeList(sec);
    for (const { tag, count } of tagList.slice(0, 20)) {
      const li = document.createElement('li');
      const tagEl = document.createElement('span');
      tagEl.className = 'bbc-tag';
      tagEl.textContent = `[${tag}]`;
      li.appendChild(tagEl);
      li.appendChild(document.createTextNode(`${tag} — ${count} occurrence${count !== 1 ? 's' : ''}`));
      ul.appendChild(li);
    }
    if (tagList.length > 20) {
      const li = document.createElement('li');
      li.style.color = 'var(--fg-2,#888)';
      li.textContent = `… and ${tagList.length - 20} more tag types`;
      ul.appendChild(li);
    }
  }

  // URLs
  if (urls.length) {
    const sec = makeSection(host, `Links (${urls.length})`);
    const ul = makeList(sec);
    for (const item of urls.slice(0, 8)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'bbc-tag bbc-tag-url';
      tag.textContent = 'url';
      li.appendChild(tag);
      li.appendChild(sourceButton(item.url.length > 80 ? item.url.slice(0, 77) + '...' : item.url, item.line, 'Open link in source'));
      ul.appendChild(li);
    }
    if (urls.length > 8) {
      const li = document.createElement('li');
      li.style.color = 'var(--fg-2,#888)';
      li.textContent = `… and ${urls.length - 8} more`;
      ul.appendChild(li);
    }
  }

  // Quotes
  if (quotes.length) {
    const sec = makeSection(host, `Quotes (${quotes.length})`);
    const ul = makeList(sec);
    for (const quote of quotes.slice(0, 6)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'bbc-tag bbc-tag-quote';
      tag.textContent = 'quote';
      li.appendChild(tag);
      li.appendChild(sourceButton(quote.author, quote.line, 'Open quote in source'));
      ul.appendChild(li);
    }
    if (quotes.length > 6) {
      const li = document.createElement('li');
      li.style.color = 'var(--fg-2,#888)';
      li.textContent = `… and ${quotes.length - 6} more`;
      ul.appendChild(li);
    }
  }

  // Images
  if (images.length) {
    const sec = makeSection(host, `Images (${images.length})`);
    const ul = makeList(sec);
    for (const img of images.slice(0, 6)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'bbc-tag bbc-tag-img';
      tag.textContent = 'img';
      li.appendChild(tag);
      li.appendChild(sourceButton(img.url.length > 70 ? img.url.slice(0, 67) + '...' : img.url, img.line, 'Open image in source'));
      ul.appendChild(li);
    }
  }

  if (codeBlocks.length) {
    const sec = makeSection(host, `Code Blocks (${codeBlocks.length})`);
    const ul = makeList(sec);
    for (const block of codeBlocks.slice(0, 8)) {
      const li = document.createElement('li');
      li.appendChild(chip('code', 'info', 'BBCode code block.'));
      li.appendChild(sourceButton(`line ${block.line}`, block.line, 'Open code block in source'));
      ul.appendChild(li);
    }
  }

  const issueEl = issueList(issues, { title: 'Markup Review' });
  if (issueEl) host.appendChild(issueEl);

  host.appendChild(sourcePreview(text, { title: 'Source', collapsed: true, idPrefix: 'bbc-line', highlighter: highlightBBCodeLine }));
  wireSourceLinks(host, { idPrefix: 'bbc-line' });

  return { parentNode: host };
}
