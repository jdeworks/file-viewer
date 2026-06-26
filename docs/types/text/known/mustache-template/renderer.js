import { chip, ensureKnownUiStyle, esc, issueList, sourceButton, sourcePreview, wireSourceLinks } from '../../../../core/known-ui.js';

const CSS = `
.mst-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.mst-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1d6fa8;color:#fff;vertical-align:middle;margin-right:8px;}
.mst-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.mst-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.mst-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.mst-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.mst-card strong{display:block;font-size:1.2rem;font-weight:700;}
.mst-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.mst-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.mst-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.mst-list{margin:0;padding:0;list-style:none;}
.mst-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.mst-list li:last-child{border-bottom:none;}
.mst-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;}
.mst-tag-section{background:#dbeafe;color:#1d4ed8;}
.mst-tag-inverted{background:#fef3c7;color:#92400e;}
.mst-tag-partial{background:#f3e8ff;color:#6d28d9;}
.mst-tag-unescaped{background:#ccfbf1;color:#0f766e;}
.mst-note{color:var(--fg-2,#5a6678);font-family:system-ui,sans-serif;font-size:12px;flex-basis:100%;margin-left:0;}
.mst-var{color:#1d6fa8;font-weight:600;}
.mst-section-tag{color:#1d4ed8;font-weight:600;}
.mst-partial{color:#6d28d9;font-weight:600;}
.mst-comment{color:#6e7781;font-style:italic;}
.mst-unescaped{color:#0f766e;font-weight:600;}
.mst-delimiter{color:#b45309;font-weight:600;}
`;

function analyzeMustache(text) {
  const lineStarts = lineStartOffsets(text);
  const sections = new Map();
  const invertedSections = new Map();
  const partials = new Map();
  const variables = new Map();
  const issues = [];
  const stack = [];
  let delimiterChange = null;

  // Match all {{ ... }} with various sigils
  const re = /\{\{(#|\^|\/|!|>|=|&|\{)?\s*([^}]*?)\s*(?:=|\}|)?\s*\}\}?/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const sigil = m[1] || '';
    const inner = m[2].trim();
    const line = offsetToLine(lineStarts, m.index);

    if (sigil === '#') {
      const name = firstToken(inner);
      if (name) {
        addOccurrence(sections, name, { line, kind: 'section' });
        stack.push({ name, line, kind: 'section' });
      }
    } else if (sigil === '^') {
      const name = firstToken(inner);
      if (name) {
        addOccurrence(invertedSections, name, { line, kind: 'inverted' });
        stack.push({ name, line, kind: 'inverted section' });
      }
    } else if (sigil === '/') {
      const closeName = firstToken(inner);
      const open = stack.pop();
      if (!open) {
        issues.push({ severity: 'warning', label: 'unmatched close', line, message: `Closing section "${closeName}" has no opener.` });
      } else if (open.name !== closeName) {
        issues.push({ severity: 'warning', label: 'mismatch', line, message: `Closing section "${closeName}" does not match "${open.name}" opened on line ${open.line}.` });
      }
    } else if (sigil === '>') {
      const name = firstToken(inner);
      if (name) addOccurrence(partials, name, { line, kind: 'partial dependency' });
    } else if (sigil === '!' || sigil === '=') {
      if (sigil === '=') delimiterChange = { value: inner, line };
      // comment / delimiter — skip variable count
    } else if (sigil === '{' || sigil === '&') {
      // unescaped triple-stache
      const name = firstToken(inner);
      if (name && isVariableName(name)) addOccurrence(variables, name, { line, kind: 'unescaped output' });
    } else {
      const name = firstToken(inner);
      if (name && isVariableName(name)) addOccurrence(variables, name, { line, kind: 'escaped output' });
    }
  }
  for (const open of stack.reverse()) {
    issues.push({ severity: 'warning', label: 'unclosed section', line: open.line, message: `Section "${open.name}" is opened but never closed.` });
  }

  return {
    sections: sortedOccurrences(sections),
    invertedSections: sortedOccurrences(invertedSections),
    partials: sortedOccurrences(partials),
    variables: sortedOccurrences(variables),
    delimiterChange,
    issues,
  };
}

function lineStartOffsets(text) {
  const out = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') out.push(i + 1);
  return out;
}

function offsetToLine(starts, offset) {
  let lo = 0, hi = starts.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (starts[mid] <= offset) lo = mid + 1;
    else hi = mid - 1;
  }
  return hi + 1;
}

function firstToken(inner) {
  return String(inner || '').trim().split(/\s+/)[0]?.replace(/[{}]/g, '') || '';
}

function isVariableName(name) {
  return /^[\w.@/-]+$/.test(name) && !/^(else|\.)$/.test(name);
}

function addOccurrence(map, name, item) {
  if (!map.has(name)) map.set(name, { name, count: 0, firstLine: item.line, kinds: new Set(), lines: [] });
  const rec = map.get(name);
  rec.count++;
  rec.firstLine = Math.min(rec.firstLine, item.line);
  rec.kinds.add(item.kind);
  rec.lines.push(item.line);
}

function sortedOccurrences(map) {
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name)).map((rec) => ({
    ...rec,
    root: rec.name.split(/[./]/)[0],
    kinds: [...rec.kinds],
  }));
}

function highlightMustache(text) {
  const result = [];
  let i = 0;
  while (i < text.length) {
    // Triple-stache {{{
    if (text[i] === '{' && text[i + 1] === '{' && text[i + 2] === '{') {
      const end = text.indexOf('}}}', i + 3);
      if (end !== -1) {
        result.push('<span class="mst-unescaped">' + esc(text.slice(i, end + 3)) + '</span>');
        i = end + 3;
        continue;
      }
    }
    // Comment {{!
    if (text[i] === '{' && text[i + 1] === '{' && text[i + 2] === '!') {
      const end = text.indexOf('}}', i + 2);
      if (end !== -1) {
        result.push('<span class="mst-comment">' + esc(text.slice(i, end + 2)) + '</span>');
        i = end + 2;
        continue;
      }
    }
    // Section / inverted / close {{# {{^ {{/
    if (text[i] === '{' && text[i + 1] === '{' && (text[i + 2] === '#' || text[i + 2] === '^' || text[i + 2] === '/')) {
      const end = text.indexOf('}}', i + 2);
      if (end !== -1) {
        result.push('<span class="mst-section-tag">' + esc(text.slice(i, end + 2)) + '</span>');
        i = end + 2;
        continue;
      }
    }
    // Partial {{>
    if (text[i] === '{' && text[i + 1] === '{' && text[i + 2] === '>') {
      const end = text.indexOf('}}', i + 2);
      if (end !== -1) {
        result.push('<span class="mst-partial">' + esc(text.slice(i, end + 2)) + '</span>');
        i = end + 2;
        continue;
      }
    }
    // Delimiter change {{=
    if (text[i] === '{' && text[i + 1] === '{' && text[i + 2] === '=') {
      const end = text.indexOf('=}}', i + 2);
      if (end !== -1) {
        result.push('<span class="mst-delimiter">' + esc(text.slice(i, end + 3)) + '</span>');
        i = end + 3;
        continue;
      }
    }
    // Regular variable {{
    if (text[i] === '{' && text[i + 1] === '{') {
      const end = text.indexOf('}}', i + 2);
      if (end !== -1) {
        result.push('<span class="mst-var">' + esc(text.slice(i, end + 2)) + '</span>');
        i = end + 2;
        continue;
      }
    }
    result.push(esc(text[i]));
    i++;
  }
  return result.join('');
}

function makeSection(title, items, tagClass, tagLabel, detailFn = null) {
  if (!items || items.length === 0) return null;
  const sec = document.createElement('div');
  sec.className = 'mst-section';
  const hd = document.createElement('div');
  hd.className = 'mst-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  const ul = document.createElement('ul');
  ul.className = 'mst-list';
  for (const item of items) {
    const li = document.createElement('li');
    if (tagClass) {
      const tag = document.createElement('span');
      tag.className = 'mst-tag ' + tagClass;
      tag.textContent = tagLabel;
      tag.title = tagHint(tagLabel);
      li.appendChild(tag);
    }
    li.appendChild(sourceButton(item.name, item.firstLine, `Open ${item.name} on line ${item.firstLine}`));
    li.appendChild(chip(`line ${item.firstLine}`, 'muted'));
    if (item.count > 1) li.appendChild(chip(`${item.count} uses`, 'info'));
    if (detailFn) detailFn(li, item);
    ul.appendChild(li);
  }
  sec.appendChild(ul);
  return sec;
}

export function render(intake) {
  const text = intake.text || '';
  const { sections, invertedSections, partials, variables, delimiterChange, issues } = analyzeMustache(text);

  const host = document.createElement('div');
  host.className = 'mst-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);
  ensureKnownUiStyle(host);

  const title = document.createElement('div');
  title.className = 'mst-title';
  title.innerHTML = '<span class="mst-badge">Mustache</span>';
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'mst-sub';
  sub.textContent = `${sections.length} section${sections.length !== 1 ? 's' : ''} · ${partials.length} partial${partials.length !== 1 ? 's' : ''} · ${variables.length} variable${variables.length !== 1 ? 's' : ''}` + (delimiterChange ? ' · custom delimiters' : '');
  host.appendChild(sub);

  // Summary cards
  const cards = document.createElement('div');
  cards.className = 'mst-cards';
  for (const { value, label } of [
    { value: sections.length, label: 'Sections' },
    { value: invertedSections.length, label: 'Inverted' },
    { value: partials.length, label: 'Partials' },
    { value: variables.length, label: 'Variables' },
  ]) {
    const card = document.createElement('div');
    card.className = 'mst-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  if (delimiterChange) {
    const delimSec = document.createElement('div');
    delimSec.className = 'mst-section';
    const delimHd = document.createElement('div');
    delimHd.className = 'mst-section-hd';
    delimHd.textContent = 'Custom Delimiters';
    delimSec.appendChild(delimHd);
    const p = document.createElement('p');
    p.style.cssText = 'padding:8px 14px;margin:0;font-family:ui-monospace,monospace;font-size:12px;';
    p.appendChild(sourceButton(delimiterChange.value, delimiterChange.line, 'Open delimiter change in source'));
    p.appendChild(document.createTextNode(' '));
    p.appendChild(chip('changes tag syntax', 'warn', 'Mustache delimiter changes can make later tags harder to scan and parse.'));
    delimSec.appendChild(p);
    host.appendChild(delimSec);
  }

  const sectionsEl = makeSection('Sections', sections, 'mst-tag-section', 'section', (li, item) => {
    li.appendChild(chip(item.kinds.join(', '), 'muted'));
  });
  if (sectionsEl) host.appendChild(sectionsEl);

  const invertedEl = makeSection('Inverted Sections', invertedSections, 'mst-tag-inverted', 'inverted', (li) => {
    li.appendChild(chip('fallback branch', 'info', 'Rendered when the section value is falsey or an empty list.'));
  });
  if (invertedEl) host.appendChild(invertedEl);

  const partialsEl = makeSection('Partials', partials, 'mst-tag-partial', 'partial', (li) => {
    li.appendChild(chip('external dependency', 'warn', 'Mustache partials must be provided by the render host; standalone preview cannot verify the target file.'));
  });
  if (partialsEl) host.appendChild(partialsEl);

  const variablesEl = makeSection('Variables', variables, null, '', (li, item) => {
    li.appendChild(chip(`root ${item.root}`, 'muted', 'Top-level context object or key needed by this template.'));
    if (item.kinds.includes('unescaped output')) li.appendChild(chip('unescaped', 'warn', 'Triple-stache or ampersand output is not HTML-escaped by Mustache.'));
    const note = document.createElement('div');
    note.className = 'mst-note';
    note.textContent = item.kinds.join(', ');
    li.appendChild(note);
  });
  if (variablesEl) host.appendChild(variablesEl);

  const issueEl = issueList(issues, { title: 'Template Diagnostics' });
  if (issueEl) host.appendChild(issueEl);

  host.appendChild(sourcePreview(text, { title: 'Source', collapsed: true, idPrefix: 'mst-line', highlighter: highlightMustache }));
  wireSourceLinks(host, { idPrefix: 'mst-line' });

  return { parentNode: host };
}

function tagHint(label) {
  const hints = {
    section: 'Renders the block when the named value is truthy or iterates when it is a list.',
    inverted: 'Renders the block when the named value is falsey or an empty list.',
    partial: 'Includes another template supplied by the render host.',
  };
  return hints[label] || '';
}
