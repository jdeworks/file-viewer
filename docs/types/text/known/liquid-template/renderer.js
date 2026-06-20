const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.liq-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.liq-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#95bf46;color:#fff;vertical-align:middle;margin-right:8px;}
.liq-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.liq-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.liq-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.liq-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.liq-card strong{display:block;font-size:1.2rem;font-weight:700;}
.liq-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.liq-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.liq-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.liq-list{margin:0;padding:0;list-style:none;}
.liq-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;}
.liq-list li:last-child{border-bottom:none;}
.liq-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.liq-output{color:#95bf46;font-weight:600;}
.liq-block{color:#e86339;font-weight:600;}
.liq-filter{color:#0369a1;}
.liq-str{color:#0a6640;}
.liq-comment{color:#6e7781;font-style:italic;}
.liq-num{color:#b45309;}
`;

function analyzeLiquid(text) {
  const outputTags = [];
  const blockTags = [];
  const variables = new Set();
  const filters = new Set();
  const includes = [];

  // Output tags: {{ ... }}
  const outputRe = /\{\{([\s\S]*?)\}\}/g;
  let m;
  while ((m = outputRe.exec(text)) !== null) {
    outputTags.push(m[1].trim());
    const parts = m[1].split('|');
    // First part is the variable name
    const varName = parts[0].trim().split(/[\s.[]/)[0];
    if (varName && /^\w+/.test(varName)) variables.add(varName);
    // Remaining parts are filters
    for (let i = 1; i < parts.length; i++) {
      const filterName = parts[i].trim().split(/[\s:(]/)[0];
      if (filterName) filters.add(filterName);
    }
  }

  // Block tags: {% ... %}
  const blockRe = /\{%([\s\S]*?)%\}/g;
  while ((m = blockRe.exec(text)) !== null) {
    const inner = m[1].trim();
    blockTags.push(inner);
    // Assign: {% assign varname = ... %}
    const assignM = inner.match(/^assign\s+(\w+)/);
    if (assignM) variables.add(assignM[1]);
    // Include / render / section / layout
    const includeM = inner.match(/^(?:include|render|section|layout)\s+['"]([^'"]+)['"]/);
    if (includeM) includes.push({ tag: inner.split(/\s/)[0], name: includeM[1] });
  }

  return {
    outputCount: outputTags.length,
    blockCount: blockTags.length,
    variables: [...variables].sort(),
    filters: [...filters].sort(),
    includes,
  };
}

function highlightLiquid(text) {
  // We process the text to highlight Liquid tags, leaving plain HTML escaped
  const result = [];
  let i = 0;
  while (i < text.length) {
    // Comment tag: {%- comment -%} or {% comment %}
    if (text[i] === '{' && text[i + 1] === '%') {
      const end = text.indexOf('%}', i + 2);
      if (end !== -1) {
        const inner = text.slice(i + 2, end).trim();
        if (inner.startsWith('comment') || inner.startsWith('-')) {
          result.push('<span class="liq-block">' + esc(text.slice(i, end + 2)) + '</span>');
        } else {
          result.push('<span class="liq-block">' + esc(text.slice(i, end + 2)) + '</span>');
        }
        i = end + 2;
        continue;
      }
    }
    // Output tag: {{ ... }}
    if (text[i] === '{' && text[i + 1] === '{') {
      const end = text.indexOf('}}', i + 2);
      if (end !== -1) {
        const inner = text.slice(i + 2, end);
        // Highlight filters within output tag
        const parts = inner.split('|');
        let highlighted = esc(parts[0]);
        for (let p = 1; p < parts.length; p++) {
          highlighted += '<span class="liq-filter">|' + esc(parts[p]) + '</span>';
        }
        result.push('<span class="liq-output">{{</span>' + highlighted + '<span class="liq-output">}}</span>');
        i = end + 2;
        continue;
      }
    }
    // Liquid comment: {% comment %}...{% endcomment %}
    if (text[i] === '{' && text[i + 1] === '#') {
      const end = text.indexOf('#}', i + 2);
      if (end !== -1) {
        result.push('<span class="liq-comment">' + esc(text.slice(i, end + 2)) + '</span>');
        i = end + 2;
        continue;
      }
    }
    result.push(esc(text[i]));
    i++;
  }
  return result.join('');
}

function makeSection(cls, title, items) {
  if (!items || items.length === 0) return null;
  const sec = document.createElement('div');
  sec.className = cls + '-section';
  const hd = document.createElement('div');
  hd.className = cls + '-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  const ul = document.createElement('ul');
  ul.className = cls + '-list';
  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = typeof item === 'string' ? item : `${item.tag}: '${item.name}'`;
    ul.appendChild(li);
  }
  sec.appendChild(ul);
  return sec;
}

export function render(intake) {
  const text = intake.text || '';
  const { outputCount, blockCount, variables, filters, includes } = analyzeLiquid(text);

  const host = document.createElement('div');
  host.className = 'liq-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'liq-title';
  title.innerHTML = '<span class="liq-badge">Liquid</span>';
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'liq-sub';
  sub.textContent = `${outputCount} output tag${outputCount !== 1 ? 's' : ''} · ${blockCount} block tag${blockCount !== 1 ? 's' : ''} · ${variables.length} variable${variables.length !== 1 ? 's' : ''} · ${filters.length} filter${filters.length !== 1 ? 's' : ''}`;
  host.appendChild(sub);

  // Summary cards
  const cards = document.createElement('div');
  cards.className = 'liq-cards';
  for (const { value, label } of [
    { value: outputCount, label: 'Output tags' },
    { value: blockCount, label: 'Block tags' },
    { value: variables.length, label: 'Variables' },
    { value: filters.length, label: 'Filters' },
    { value: includes.length, label: 'Includes' },
  ]) {
    const card = document.createElement('div');
    card.className = 'liq-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  const variablesEl = makeSection('liq', 'Variables', variables);
  if (variablesEl) host.appendChild(variablesEl);

  const filtersEl = makeSection('liq', 'Filters', filters);
  if (filtersEl) host.appendChild(filtersEl);

  const includesEl = makeSection('liq', 'Includes / Renders', includes);
  if (includesEl) host.appendChild(includesEl);

  // Source
  const srcSec = document.createElement('div');
  srcSec.className = 'liq-section';
  const srcHd = document.createElement('div');
  srcHd.className = 'liq-section-hd';
  srcHd.textContent = 'Source';
  srcSec.appendChild(srcHd);
  const pre = document.createElement('pre');
  pre.className = 'liq-pre';
  pre.innerHTML = highlightLiquid(text);
  srcSec.appendChild(pre);
  host.appendChild(srcSec);

  return { parentNode: host };
}
