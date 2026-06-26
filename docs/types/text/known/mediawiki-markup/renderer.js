import { chip, ensureKnownUiStyle, esc, issueList, sourceButton, sourcePreview, wireSourceLinks } from '../../../../core/known-ui.js';

const CSS = `
.mw-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.mw-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#3366cc;color:#fff;vertical-align:middle;margin-right:8px}
.mw-title{font-size:18px;font-weight:700;margin:0 0 4px}
.mw-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.mw-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}
.mw-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px}
.mw-card strong{display:block;font-size:1.2rem;font-weight:700}
.mw-card span{font-size:.8rem;color:var(--fg-2,#5a6678)}
.mw-section{margin:0 0 14px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden}
.mw-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0)}
.mw-list{margin:0;padding:0;list-style:none}
.mw-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-size:12px;display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}
.mw-list li:last-child{border-bottom:none}
.mw-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#eaf1fb;color:#3366cc;font-weight:700;flex-shrink:0;font-family:ui-monospace,monospace}
.mw-tag-cat{background:#e6f4ea;color:#137333}
.mw-tag-file{background:#fef3c7;color:#92400e}
.mw-tag-tpl{background:#fce8f6;color:#8b1fa1}
.mw-note{color:var(--fg-2,#5a6678);font-family:system-ui,sans-serif;font-size:12px;flex-basis:100%}
.mw-outline{list-style:none;padding:0;margin:0;font-size:13px}
.mw-outline li{padding:3px 0;border-bottom:1px solid var(--border,#eaecf0);display:flex;gap:6px;align-items:baseline;flex-wrap:wrap}
.mw-outline li:last-child{border-bottom:none}
.mw-h2{font-weight:700}
.mw-h3{padding-left:16px;color:var(--fg,#444)}
.mw-h4{padding-left:32px;color:var(--fg-2,#666);font-size:12px}
.mw-h5{padding-left:48px;color:var(--fg-2,#777);font-size:12px}
.mw-head-line{color:#3366cc;font-weight:600}
.mw-template-line{color:#8b1fa1}
.mw-link-line{color:#0550ae}
.mw-comment-line{color:#6e7781;font-style:italic}
`;

function parseMediaWiki(text) {
  const lines = text.split(/\r?\n/);
  const headings = [];
  const templates = [];
  const parserFunctions = [];
  const categories = [];
  const duplicateCategories = [];
  const internalLinks = [];
  const externalLinks = [];
  const fileRefs = [];
  const refDefs = new Map();
  const refUses = [];
  const issues = [];
  let tableCount = 0;
  let refCount = 0;
  let hasReferencesList = false;

  const templatesSeen = new Set();
  const categoriesSeen = new Set();
  const parserSeen = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;
    const trimmed = line.trim();

    // Comments
    if (/^<!--/.test(trimmed)) continue;

    // Headings: == Heading == or === Sub ===
    const headM = trimmed.match(/^(={2,6})\s*(.+?)\s*={2,6}\s*$/);
    if (headM) {
      headings.push({ level: headM[1].length, text: headM[2].trim(), line: lineNo });
      continue;
    }

    // Tables
    if (/^\{\|/.test(trimmed)) {
      tableCount++;
    }

    // <ref> citations
    if (/<references\b/i.test(trimmed)) hasReferencesList = true;
    for (const ref of parseRefs(line, lineNo)) {
      refCount++;
      if (ref.name && ref.kind === 'definition') {
        if (!refDefs.has(ref.name)) refDefs.set(ref.name, []);
        refDefs.get(ref.name).push(ref);
      } else if (ref.name && ref.kind === 'use') {
        refUses.push(ref);
      }
      if (ref.unclosed) issues.push({ severity: 'warning', label: 'unclosed ref', line: lineNo, message: 'Citation opens a <ref> tag without closing it on the same line.' });
    }

    // Template calls {{Template}} or {{Template|arg}}
    const tplMatches = [...trimmed.matchAll(/\{\{([^|}\n]+)/g)];
    for (const m of tplMatches) {
      const name = m[1].trim();
      if (/^#/.test(name)) {
        const fn = { name, line: lineNo };
        const key = `${name}:${lineNo}`;
        if (!parserSeen.has(key)) {
          parserSeen.add(key);
          parserFunctions.push(fn);
        }
        continue;
      }
      if (!templatesSeen.has(name)) {
        templatesSeen.add(name);
        templates.push({ name, line: lineNo });
      }
    }

    // [[Category:X]]
    const catMatches = [...trimmed.matchAll(/\[\[Category:([^\]|]+)/gi)];
    for (const m of catMatches) {
      const cat = m[1].trim();
      if (!categoriesSeen.has(cat)) {
        categoriesSeen.add(cat);
        categories.push({ name: cat, line: lineNo });
      } else {
        duplicateCategories.push({ name: cat, line: lineNo });
      }
    }

    // [[File:X]] or [[Image:X]]
    const fileMatches = [...trimmed.matchAll(/\[\[(File|Image):([^\]]+)\]\]/gi)];
    for (const m of fileMatches) {
      fileRefs.push(parseFileRef(m[1], m[2], lineNo));
    }

    // [[Internal link]] or [[Internal|alias]]
    const intMatches = [...trimmed.matchAll(/\[\[([^\]|#:]+)(?:\|[^\]]*)?\]\]/g)];
    for (const m of intMatches) {
      const target = m[1].trim();
      if (!/^(?:Category|File|Image|Special|Talk|Template|Help|Wikipedia):/i.test(target)) {
        internalLinks.push({ target, line: lineNo });
      }
    }

    // External links [http://... text] or bare http://
    const extMatches = [...trimmed.matchAll(/\[https?:\/\/[^\s\]]+/g)];
    if (extMatches.length) externalLinks.push(...extMatches.map((m) => ({ url: m[0].slice(1), line: lineNo })));
  }

  for (const duplicate of duplicateCategories) {
    issues.push({ severity: 'info', label: 'duplicate category', line: duplicate.line, message: `Category "${duplicate.name}" is already assigned earlier in the article.` });
  }
  for (const [name, refs] of refDefs.entries()) {
    if (refs.length > 1) {
      issues.push({ severity: 'warning', label: 'duplicate ref', line: refs[1].line, message: `Named reference "${name}" is defined ${refs.length} times.` });
    }
  }
  for (const use of refUses) {
    if (!refDefs.has(use.name)) {
      issues.push({ severity: 'warning', label: 'missing ref', line: use.line, message: `Named reference "${use.name}" is reused before any definition in this standalone preview.` });
    }
  }
  if (refCount && !hasReferencesList) {
    issues.push({ severity: 'info', label: 'references list', message: 'Article has citations but no <references /> block was found.' });
  }

  return { headings, templates, parserFunctions, categories, duplicateCategories, internalLinks, externalLinks, fileRefs, tableCount, refCount, hasReferencesList, issues };
}

function parseRefs(line, lineNo) {
  const refs = [];
  for (const m of line.matchAll(/<ref\b([^>]*?)(\/?)>([\s\S]*?)(?:<\/ref>|$)/gi)) {
    const name = refName(m[1]);
    if (m[2] === '/') {
      refs.push({ name, line: lineNo, kind: name ? 'use' : 'definition' });
      continue;
    }
    const closed = /<\/ref>/i.test(m[0]);
    refs.push({ name, line: lineNo, kind: 'definition', unclosed: !closed });
  }
  return refs;
}

function refName(attrs) {
  const m = String(attrs || '').match(/\bname\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s/>]+))/i);
  return (m?.[1] || m?.[2] || m?.[3] || '').trim();
}

function parseFileRef(kind, body, line) {
  const parts = body.split('|').map((part) => part.trim()).filter(Boolean);
  const name = parts.shift() || '';
  const options = parts;
  const alt = (options.find((part) => /^alt\s*=/i.test(part)) || '').replace(/^alt\s*=/i, '').trim();
  const caption = [...options].reverse().find((part) => !isFileOption(part) && !/^alt\s*=/i.test(part)) || '';
  return { kind, name, options, alt, caption, line };
}

function isFileOption(part) {
  return /^(thumb|thumbnail|frame|framed|frameless|border|right|left|center|none|baseline|sub|super|top|text-top|middle|bottom|text-bottom|upright(?:=.*)?|link=.*|lang=.*|page=.*|class=.*|\d+x?\d*px)$/i.test(part);
}

function highlightMediaWikiLine(line) {
  const trimmed = line.trim();
  if (/^<!--/.test(trimmed)) return `<span class="mw-comment-line">${esc(line)}</span>`;
  if (/^(={2,6})\s*.+\s*={2,6}\s*$/.test(trimmed)) return `<span class="mw-head-line">${esc(line)}</span>`;
  if (/\{\{/.test(trimmed)) return `<span class="mw-template-line">${esc(line)}</span>`;
  if (/\[\[/.test(trimmed)) return `<span class="mw-link-line">${esc(line)}</span>`;
  return esc(line);
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'mw-section';
  const hd = document.createElement('div');
  hd.className = 'mw-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'mw-list';
  sec.appendChild(ul);
  return ul;
}

export function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').split('/').pop();
  const { headings, templates, parserFunctions, categories, internalLinks, externalLinks, fileRefs, tableCount, refCount, hasReferencesList, issues } = parseMediaWiki(text);

  const host = document.createElement('div');
  host.className = 'mw-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);
  ensureKnownUiStyle(host);

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px';
  const badge = document.createElement('span');
  badge.className = 'mw-badge';
  badge.textContent = 'MediaWiki';
  const title = document.createElement('span');
  title.className = 'mw-title';
  // Try first h2 heading as article title
  const firstH2 = headings.find((h) => h.level === 2);
  title.textContent = firstH2 ? firstH2.text : (name || 'MediaWiki Article');
  header.appendChild(badge);
  header.appendChild(title);
  host.appendChild(header);

  const sub = document.createElement('div');
  sub.className = 'mw-sub';
  const subParts = [];
  if (headings.length) subParts.push(`${headings.length} section${headings.length !== 1 ? 's' : ''}`);
  if (templates.length) subParts.push(`${templates.length} template${templates.length !== 1 ? 's' : ''}`);
  if (categories.length) subParts.push(`${categories.length} categor${categories.length !== 1 ? 'ies' : 'y'}`);
  if (refCount) subParts.push(`${refCount} citation${refCount !== 1 ? 's' : ''}`);
  sub.textContent = subParts.join(' · ') || 'MediaWiki markup article';
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'mw-cards';
  for (const { value, label } of [
    { value: headings.length, label: 'Sections' },
    { value: templates.length, label: 'Templates' },
    { value: parserFunctions.length, label: 'Parser funcs' },
    { value: categories.length, label: 'Categories' },
    { value: internalLinks.length, label: 'Int. links' },
    { value: externalLinks.length, label: 'Ext. links' },
    { value: fileRefs.length, label: 'Files/Images' },
    { value: tableCount, label: 'Tables' },
    { value: refCount, label: 'Citations' },
  ]) {
    const card = document.createElement('div');
    card.className = 'mw-card';
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
    const sec = makeSection(host, `Section Outline (${headings.length})`);
    const ul = document.createElement('ul');
    ul.className = 'mw-outline';
    for (const { level, text: hText, line } of headings.slice(0, 40)) {
      const li = document.createElement('li');
      li.className = `mw-h${Math.min(level, 5)}`;
      li.appendChild(chip(`h${level}`, 'info'));
      li.appendChild(sourceButton(hText, line, 'Open section heading in source'));
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

  // Templates
  if (templates.length) {
    const sec = makeSection(host, `Templates (${templates.length})`);
    const ul = makeList(sec);
    for (const tpl of templates.slice(0, 10)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'mw-tag mw-tag-tpl';
      tag.textContent = '{{}}';
      tag.title = 'Template transclusion.';
      li.appendChild(tag);
      li.appendChild(sourceButton(tpl.name, tpl.line, 'Open template call in source'));
      ul.appendChild(li);
    }
    if (templates.length > 10) {
      const li = document.createElement('li');
      li.style.color = 'var(--fg-2,#888)';
      li.textContent = `… and ${templates.length - 10} more`;
      ul.appendChild(li);
    }
  }

  // Parser functions
  if (parserFunctions.length) {
    const sec = makeSection(host, `Parser Functions (${parserFunctions.length})`);
    const ul = makeList(sec);
    for (const fn of parserFunctions.slice(0, 10)) {
      const li = document.createElement('li');
      li.appendChild(chip('{{#}}', 'warn', 'Parser function. Output depends on wiki parser state, variables, or expressions.'));
      li.appendChild(sourceButton(fn.name, fn.line, 'Open parser function in source'));
      ul.appendChild(li);
    }
  }

  // Categories
  if (categories.length) {
    const sec = makeSection(host, `Categories (${categories.length})`);
    const ul = makeList(sec);
    for (const cat of categories) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'mw-tag mw-tag-cat';
      tag.textContent = 'cat';
      li.appendChild(tag);
      li.appendChild(sourceButton(cat.name, cat.line, 'Open category in source'));
      ul.appendChild(li);
    }
  }

  // Files/Images
  if (fileRefs.length) {
    const sec = makeSection(host, `Files & Images (${fileRefs.length})`);
    const ul = makeList(sec);
    for (const f of fileRefs.slice(0, 8)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'mw-tag mw-tag-file';
      tag.textContent = 'file';
      tag.title = 'File or image embed.';
      li.appendChild(tag);
      li.appendChild(sourceButton(f.name, f.line, 'Open file reference in source'));
      if (f.caption) li.appendChild(chip('caption', 'ok', f.caption));
      if (f.alt) li.appendChild(chip('alt', 'info', f.alt));
      if (f.options.length) {
        const note = document.createElement('span');
        note.className = 'mw-note';
        note.textContent = f.options.join(' · ');
        li.appendChild(note);
      }
      ul.appendChild(li);
    }
    if (fileRefs.length > 8) {
      const li = document.createElement('li');
      li.style.color = 'var(--fg-2,#888)';
      li.textContent = `… and ${fileRefs.length - 8} more`;
      ul.appendChild(li);
    }
  }

  // Internal links
  if (internalLinks.length) {
    const sec = makeSection(host, `Internal Links (${internalLinks.length})`);
    const ul = makeList(sec);
    for (const link of internalLinks.slice(0, 8)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'mw-tag';
      tag.textContent = '[[]]';
      li.appendChild(tag);
      li.appendChild(sourceButton(link.target, link.line, 'Open internal link in source'));
      ul.appendChild(li);
    }
    if (internalLinks.length > 8) {
      const li = document.createElement('li');
      li.style.color = 'var(--fg-2,#888)';
      li.textContent = `… and ${internalLinks.length - 8} more`;
      ul.appendChild(li);
    }
  }

  const refEl = issueList([
    ...(hasReferencesList ? [{ severity: 'ok', label: 'references list', message: '<references /> block found.' }] : []),
    ...issues,
  ], { title: 'Markup Review' });
  if (refEl) host.appendChild(refEl);

  host.appendChild(sourcePreview(text, { title: 'Source', collapsed: true, idPrefix: 'mw-line', highlighter: highlightMediaWikiLine }));
  wireSourceLinks(host, { idPrefix: 'mw-line' });

  return { parentNode: host };
}
