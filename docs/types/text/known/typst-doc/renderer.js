const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.typ-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.typ-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#239dad;color:#fff;vertical-align:middle;margin-right:8px}
.typ-title{font-size:18px;font-weight:700;margin:0 0 4px}
.typ-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.typ-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}
.typ-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px}
.typ-card strong{display:block;font-size:1.2rem;font-weight:700}
.typ-card span{font-size:.8rem;color:var(--fg-2,#5a6678)}
.typ-section{margin:0 0 14px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden}
.typ-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0)}
.typ-list{margin:0;padding:0;list-style:none}
.typ-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-size:12px;font-family:ui-monospace,monospace;display:flex;gap:8px;align-items:baseline}
.typ-list li:last-child{border-bottom:none}
.typ-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#e0f7f7;color:#239dad;font-weight:700;flex-shrink:0}
.typ-tag-set{background:#fef3c7;color:#92400e}
.typ-tag-show{background:#ede9fe;color:#7c3aed}
.typ-outline{list-style:none;padding:0;margin:0;font-size:13px}
.typ-outline li{padding:3px 0;border-bottom:1px solid var(--border,#eaecf0)}
.typ-outline li:last-child{border-bottom:none}
.typ-h1{font-weight:700}
.typ-h2{padding-left:16px;color:var(--fg,#444)}
.typ-h3{padding-left:32px;color:var(--fg-2,#666);font-size:12px}
.typ-h4{padding-left:48px;color:var(--fg-2,#777);font-size:12px}
.typ-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre}
.typ-kw{color:#239dad;font-weight:600}
.typ-str{color:#0a6640}
.typ-comment{color:#6e7781;font-style:italic}
.typ-fn{color:#7c3aed}
`;

function parseTypst(text) {
  const lines = text.split(/\r?\n/);
  const imports = [];
  const lets = [];
  const setRules = [];
  const showRules = [];
  const headings = [];
  let hasBib = false;
  const figCaptions = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Comments
    if (trimmed.startsWith('//')) continue;

    // #import
    const impM = trimmed.match(/^#import\s+"([^"]+)"(?:\s*:\s*(.*))?/);
    if (impM) {
      imports.push({ path: impM[1], items: impM[2] ? impM[2].trim() : null });
      continue;
    }

    // #let
    const letM = trimmed.match(/^#let\s+(\w+)\s*(?:=|\()/);
    if (letM) {
      const isFunc = /^#let\s+\w+\s*\(/.test(trimmed);
      lets.push({ name: letM[1], isFunc });
      continue;
    }

    // #set
    const setM = trimmed.match(/^#set\s+(\w+[\w.]*)\s*\(/);
    if (setM) {
      setRules.push(setM[1]);
      continue;
    }

    // #show
    const showM = trimmed.match(/^#show\s+([\w.]+(?:\s*\.\s*\w+)*)?/);
    if (showM) {
      showRules.push(showM[1] ? showM[1].trim() : '(rule)');
      continue;
    }

    // #bibliography
    if (/^#bibliography/.test(trimmed)) {
      hasBib = true;
      continue;
    }

    // figure captions — look for #figure( or caption:
    const figM = trimmed.match(/caption\s*:\s*\[([^\]]{1,60})\]/);
    if (figM) {
      figCaptions.push(figM[1]);
      continue;
    }

    // Headings by = prefix
    const headM = trimmed.match(/^(=+)\s+(.+)$/);
    if (headM) {
      headings.push({ level: headM[1].length, text: headM[2].trim() });
    }
  }

  return { imports, lets, setRules, showRules, headings, hasBib, figCaptions };
}

function highlightTypst(text) {
  const lines = text.split(/\r?\n/);
  return lines.map((line) => {
    if (/^\/\//.test(line.trim())) {
      return `<span class="typ-comment">${esc(line)}</span>`;
    }

    let out = '';
    let i = 0;
    while (i < line.length) {
      // Comment
      if (line[i] === '/' && line[i + 1] === '/') {
        out += `<span class="typ-comment">${esc(line.slice(i))}</span>`;
        break;
      }
      // # keyword
      if (line[i] === '#' && /[a-z]/.test(line[i + 1] || '')) {
        let j = i + 1;
        while (j < line.length && /\w/.test(line[j])) j++;
        const kw = line.slice(i, j);
        if (['import', 'let', 'set', 'show', 'if', 'else', 'for', 'while', 'return', 'bibliography', 'figure', 'table', 'include', 'box', 'block', 'place', 'stack', 'grid', 'columns'].includes(kw.slice(1))) {
          out += `<span class="typ-kw">${esc(kw)}</span>`;
        } else {
          out += `<span class="typ-fn">${esc(kw)}</span>`;
        }
        i = j;
        continue;
      }
      // String
      if (line[i] === '"') {
        let j = i + 1;
        while (j < line.length && line[j] !== '"') {
          if (line[j] === '\\') j++;
          j++;
        }
        j++;
        out += `<span class="typ-str">${esc(line.slice(i, j))}</span>`;
        i = j;
        continue;
      }
      out += esc(line[i]);
      i++;
    }
    return out;
  }).join('\n');
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'typ-section';
  const hd = document.createElement('div');
  hd.className = 'typ-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'typ-list';
  sec.appendChild(ul);
  return ul;
}

export function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').split('/').pop();
  const { imports, lets, setRules, showRules, headings, hasBib, figCaptions } = parseTypst(text);
  const lines = text.split(/\r?\n/);

  const host = document.createElement('div');
  host.className = 'typ-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px';
  const badge = document.createElement('span');
  badge.className = 'typ-badge';
  badge.textContent = 'Typst Document';
  const title = document.createElement('span');
  title.className = 'typ-title';
  title.textContent = name || 'Typst Document';
  header.appendChild(badge);
  header.appendChild(title);
  host.appendChild(header);

  const sub = document.createElement('div');
  sub.className = 'typ-sub';
  const subParts = [];
  if (imports.length) subParts.push(`${imports.length} import${imports.length !== 1 ? 's' : ''}`);
  if (lets.length) subParts.push(`${lets.length} definition${lets.length !== 1 ? 's' : ''}`);
  if (headings.length) subParts.push(`${headings.length} heading${headings.length !== 1 ? 's' : ''}`);
  if (hasBib) subParts.push('bibliography');
  sub.textContent = subParts.join(' · ') || 'Typst document';
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'typ-cards';
  for (const { value, label } of [
    { value: imports.length, label: 'Imports' },
    { value: lets.length, label: 'Definitions' },
    { value: setRules.length, label: '#set rules' },
    { value: showRules.length, label: '#show rules' },
    { value: headings.length, label: 'Headings' },
    { value: lines.length, label: 'Lines' },
  ]) {
    const card = document.createElement('div');
    card.className = 'typ-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Imports
  if (imports.length) {
    const sec = makeSection(host, `Imports (${imports.length})`);
    const ul = makeList(sec);
    for (const { path, items } of imports.slice(0, 10)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'typ-tag';
      tag.textContent = 'import';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(path + (items ? ': ' + items : '')));
      ul.appendChild(li);
    }
    if (imports.length > 10) {
      const li = document.createElement('li');
      li.style.color = 'var(--fg-2,#888)';
      li.textContent = `… and ${imports.length - 10} more`;
      ul.appendChild(li);
    }
  }

  // Let definitions
  if (lets.length) {
    const sec = makeSection(host, `Definitions (${lets.length})`);
    const ul = makeList(sec);
    for (const { name: lname, isFunc } of lets.slice(0, 15)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'typ-tag';
      tag.textContent = isFunc ? 'fn' : 'val';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(lname));
      ul.appendChild(li);
    }
    if (lets.length > 15) {
      const li = document.createElement('li');
      li.style.color = 'var(--fg-2,#888)';
      li.textContent = `… and ${lets.length - 15} more`;
      ul.appendChild(li);
    }
  }

  // Set rules
  if (setRules.length) {
    const sec = makeSection(host, `#set rules (${setRules.length})`);
    const ul = makeList(sec);
    for (const target of setRules.slice(0, 10)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'typ-tag typ-tag-set';
      tag.textContent = 'set';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(target));
      ul.appendChild(li);
    }
  }

  // Show rules
  if (showRules.length) {
    const sec = makeSection(host, `#show rules (${showRules.length})`);
    const ul = makeList(sec);
    for (const target of showRules.slice(0, 10)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'typ-tag typ-tag-show';
      tag.textContent = 'show';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(target));
      ul.appendChild(li);
    }
  }

  // Heading outline
  if (headings.length) {
    const sec = makeSection(host, `Heading Outline (${headings.length})`);
    const ul = document.createElement('ul');
    ul.className = 'typ-outline';
    for (const { level, text: hText } of headings.slice(0, 40)) {
      const li = document.createElement('li');
      li.className = `typ-h${Math.min(level, 4)}`;
      li.textContent = '='.repeat(level) + ' ' + hText;
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

  // Figure captions
  if (figCaptions.length) {
    const sec = makeSection(host, `Figure Captions (${figCaptions.length})`);
    const ul = makeList(sec);
    for (const caption of figCaptions.slice(0, 8)) {
      const li = document.createElement('li');
      li.textContent = caption;
      ul.appendChild(li);
    }
  }

  // Bibliography
  if (hasBib) {
    const note = document.createElement('div');
    note.style.cssText = 'margin-bottom:14px;font-size:12px;color:var(--fg-2,#555);padding:8px 12px;background:var(--bg-2,#f6f8fa);border-radius:6px;border:1px solid var(--border,#e0e0e0)';
    note.textContent = 'This document includes a #bibliography reference section.';
    host.appendChild(note);
  }

  // Source
  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'typ-pre';
  const MAX = 120;
  const truncated = lines.length > MAX;
  pre.innerHTML = highlightTypst(truncated ? lines.slice(0, MAX).join('\n') : text);
  srcSec.appendChild(pre);
  if (truncated) {
    const note = document.createElement('div');
    note.style.cssText = 'padding:6px 14px;font-size:11px;color:var(--fg-2,#888);font-style:italic;border-top:1px solid var(--border,#e0e0e0)';
    note.textContent = `… truncated — ${lines.length - MAX} more lines not shown`;
    srcSec.appendChild(note);
  }

  return { parentNode: host };
}
