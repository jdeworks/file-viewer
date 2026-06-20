const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
.mst-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;}
.mst-list li:last-child{border-bottom:none;}
.mst-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;}
.mst-tag-section{background:#dbeafe;color:#1d4ed8;}
.mst-tag-inverted{background:#fef3c7;color:#92400e;}
.mst-tag-partial{background:#f3e8ff;color:#6d28d9;}
.mst-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.mst-var{color:#1d6fa8;font-weight:600;}
.mst-section-tag{color:#1d4ed8;font-weight:600;}
.mst-partial{color:#6d28d9;font-weight:600;}
.mst-comment{color:#6e7781;font-style:italic;}
.mst-unescaped{color:#0f766e;font-weight:600;}
.mst-delimiter{color:#b45309;font-weight:600;}
`;

function analyzeMustache(text) {
  const sections = [];
  const invertedSections = [];
  const partials = [];
  const variables = new Set();
  let delimiterChange = null;

  // Match all {{ ... }} with various sigils
  const re = /\{\{(#|\^|\/|!|>|=|&|\{)?\s*([^}]*?)\s*(?:=|\}|)?\s*\}\}?/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const sigil = m[1] || '';
    const inner = m[2].trim();

    if (sigil === '#') {
      if (!sections.includes(inner)) sections.push(inner);
    } else if (sigil === '^') {
      if (!invertedSections.includes(inner)) invertedSections.push(inner);
    } else if (sigil === '/') {
      // closing tag — skip
    } else if (sigil === '>') {
      if (!partials.includes(inner)) partials.push(inner);
    } else if (sigil === '!' || sigil === '=') {
      if (sigil === '=') delimiterChange = inner;
      // comment / delimiter — skip variable count
    } else if (sigil === '{' || sigil === '&') {
      // unescaped triple-stache
      if (inner && /^\w/.test(inner)) variables.add(inner);
    } else {
      if (inner && /^\w/.test(inner)) variables.add(inner);
    }
  }

  return {
    sections,
    invertedSections,
    partials,
    variables: [...variables].sort(),
    delimiterChange,
  };
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

function makeSection(title, items, tagClass, tagLabel) {
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
      li.appendChild(tag);
    }
    const nameSpan = document.createElement('span');
    nameSpan.textContent = item;
    li.appendChild(nameSpan);
    ul.appendChild(li);
  }
  sec.appendChild(ul);
  return sec;
}

export function render(intake) {
  const text = intake.text || '';
  const { sections, invertedSections, partials, variables, delimiterChange } = analyzeMustache(text);

  const host = document.createElement('div');
  host.className = 'mst-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

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
    p.textContent = delimiterChange;
    delimSec.appendChild(p);
    host.appendChild(delimSec);
  }

  const sectionsEl = makeSection('Sections', sections, 'mst-tag-section', 'section');
  if (sectionsEl) host.appendChild(sectionsEl);

  const invertedEl = makeSection('Inverted Sections', invertedSections, 'mst-tag-inverted', 'inverted');
  if (invertedEl) host.appendChild(invertedEl);

  const partialsEl = makeSection('Partials', partials, 'mst-tag-partial', 'partial');
  if (partialsEl) host.appendChild(partialsEl);

  const variablesEl = makeSection('Variables', variables);
  if (variablesEl) host.appendChild(variablesEl);

  // Source
  const srcSec = document.createElement('div');
  srcSec.className = 'mst-section';
  const srcHd = document.createElement('div');
  srcHd.className = 'mst-section-hd';
  srcHd.textContent = 'Source';
  srcSec.appendChild(srcHd);
  const pre = document.createElement('pre');
  pre.className = 'mst-pre';
  pre.innerHTML = highlightMustache(text);
  srcSec.appendChild(pre);
  host.appendChild(srcSec);

  return { parentNode: host };
}
