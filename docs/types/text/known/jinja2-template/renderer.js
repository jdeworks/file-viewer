const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.j2-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.j2-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#b41717;color:#fff;vertical-align:middle;margin-right:8px;}
.j2-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.j2-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.j2-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.j2-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.j2-card strong{display:block;font-size:1.2rem;font-weight:700;}
.j2-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.j2-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.j2-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.j2-list{margin:0;padding:0;list-style:none;}
.j2-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;}
.j2-list li:last-child{border-bottom:none;}
.j2-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#fce7e7;color:#b41717;font-weight:700;}
.j2-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.j2-output{color:#16a34a;font-weight:600;}
.j2-block{color:#b41717;font-weight:600;}
.j2-comment{color:#6e7781;font-style:italic;}
.j2-filter{color:#0369a1;}
.j2-str{color:#0a6640;}
.j2-kw{color:#7c3aed;font-weight:600;}
`;

const JINJA_KEYWORDS = new Set(['if', 'elif', 'else', 'endif', 'for', 'in', 'endfor', 'block', 'endblock', 'extends', 'include', 'import', 'from', 'macro', 'endmacro', 'call', 'endcall', 'filter', 'endfilter', 'set', 'do', 'not', 'and', 'or', 'is', 'true', 'false', 'none', 'with', 'without', 'context', 'scoped', 'recursive', 'loop', 'super', 'namespace', 'raw', 'endraw', 'autoescape', 'endautoescape', 'trans', 'endtrans', 'pluralize']);

function analyzeJinja2(text) {
  let extendsBase = null;
  const blocks = [];
  const macros = [];
  const includes = [];
  const filters = new Set();
  const variables = new Set();

  // Block tags {% ... %}
  const blockRe = /\{%-?\s*([\s\S]*?)\s*-?%\}/g;
  let m;
  while ((m = blockRe.exec(text)) !== null) {
    const inner = m[1].trim();
    const kw = inner.split(/\s/)[0];

    if (kw === 'extends') {
      const nameM = inner.match(/extends\s+["']([^"']+)['"]/);
      if (nameM) extendsBase = nameM[1];
    } else if (kw === 'block') {
      const nameM = inner.match(/block\s+(\w+)/);
      if (nameM && !blocks.includes(nameM[1])) blocks.push(nameM[1]);
    } else if (kw === 'macro') {
      const nameM = inner.match(/macro\s+(\w+)/);
      if (nameM && !macros.includes(nameM[1])) macros.push(nameM[1]);
    } else if (kw === 'include') {
      const nameM = inner.match(/include\s+["']([^"']+)['"]/);
      if (nameM) includes.push({ type: 'include', name: nameM[1] });
    } else if (kw === 'import' || kw === 'from') {
      const nameM = inner.match(/(?:import|from)\s+["']([^"']+)['"]/);
      if (nameM) includes.push({ type: kw, name: nameM[1] });
    }
  }

  // Output tags {{ ... }} — extract variable names and filters
  const outputRe = /\{\{-?\s*([\s\S]*?)\s*-?\}\}/g;
  while ((m = outputRe.exec(text)) !== null) {
    const parts = m[1].split('|');
    const varPart = parts[0].trim().split(/[\s.[]/)[0];
    if (varPart && /^\w+/.test(varPart) && !JINJA_KEYWORDS.has(varPart)) {
      variables.add(varPart);
    }
    for (let i = 1; i < parts.length; i++) {
      const filterName = parts[i].trim().split(/[\s(]/)[0];
      if (filterName) filters.add(filterName);
    }
  }

  return {
    extendsBase,
    blocks,
    macros,
    includes,
    filters: [...filters].sort(),
    variables: [...variables].sort(),
  };
}

function highlightJinja2(text) {
  const result = [];
  let i = 0;
  while (i < text.length) {
    // Comment {# ... #}
    if (text[i] === '{' && text[i + 1] === '#') {
      const end = text.indexOf('#}', i + 2);
      if (end !== -1) {
        result.push('<span class="j2-comment">' + esc(text.slice(i, end + 2)) + '</span>');
        i = end + 2;
        continue;
      }
    }
    // Block tag {% ... %}
    if (text[i] === '{' && text[i + 1] === '%') {
      const end = text.indexOf('%}', i + 2);
      if (end !== -1) {
        const inner = text.slice(i + 2, end);
        // Highlight keywords inside block
        const highlighted = inner.replace(/\b(if|elif|else|endif|for|in|endfor|block|endblock|extends|include|import|from|macro|endmacro|set|not|and|or|is|true|false|none|with|without|context|scoped|recursive|raw|endraw)\b/g,
          (kw) => '<span class="j2-kw">' + esc(kw) + '</span>');
        result.push('<span class="j2-block">{%</span>' + highlighted + '<span class="j2-block">%}</span>');
        i = end + 2;
        continue;
      }
    }
    // Output tag {{ ... }}
    if (text[i] === '{' && text[i + 1] === '{') {
      const end = text.indexOf('}}', i + 2);
      if (end !== -1) {
        const inner = text.slice(i + 2, end);
        const parts = inner.split('|');
        let highlighted = esc(parts[0]);
        for (let p = 1; p < parts.length; p++) {
          highlighted += '<span class="j2-filter">|' + esc(parts[p]) + '</span>';
        }
        result.push('<span class="j2-output">{{</span>' + highlighted + '<span class="j2-output">}}</span>');
        i = end + 2;
        continue;
      }
    }
    result.push(esc(text[i]));
    i++;
  }
  return result.join('');
}

function makeSection(title, items, tagFn) {
  if (!items || items.length === 0) return null;
  const sec = document.createElement('div');
  sec.className = 'j2-section';
  const hd = document.createElement('div');
  hd.className = 'j2-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  const ul = document.createElement('ul');
  ul.className = 'j2-list';
  for (const item of items) {
    const li = document.createElement('li');
    if (tagFn) {
      const tag = document.createElement('span');
      tag.className = 'j2-tag';
      tag.textContent = tagFn(item);
      li.appendChild(tag);
    }
    const nameSpan = document.createElement('span');
    nameSpan.textContent = typeof item === 'string' ? item : item.name;
    li.appendChild(nameSpan);
    ul.appendChild(li);
  }
  sec.appendChild(ul);
  return sec;
}

export function render(intake) {
  const text = intake.text || '';
  const { extendsBase, blocks, macros, includes, filters, variables } = analyzeJinja2(text);

  const host = document.createElement('div');
  host.className = 'j2-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'j2-title';
  title.innerHTML = '<span class="j2-badge">Jinja2</span>' + (extendsBase ? `<span style="font-size:13px;font-weight:400;margin-left:8px;">extends <code style="background:var(--bg-2,#f6f8fa);padding:1px 6px;border-radius:4px;">${esc(extendsBase)}</code></span>` : '');
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'j2-sub';
  sub.textContent = `${blocks.length} block${blocks.length !== 1 ? 's' : ''} · ${macros.length} macro${macros.length !== 1 ? 's' : ''} · ${includes.length} include${includes.length !== 1 ? 's' : ''} · ${filters.length} filter${filters.length !== 1 ? 's' : ''} · ${variables.length} variable${variables.length !== 1 ? 's' : ''}`;
  host.appendChild(sub);

  // Summary cards
  const cards = document.createElement('div');
  cards.className = 'j2-cards';
  for (const { value, label } of [
    { value: blocks.length, label: 'Blocks' },
    { value: macros.length, label: 'Macros' },
    { value: includes.length, label: 'Includes' },
    { value: filters.length, label: 'Filters' },
    { value: variables.length, label: 'Variables' },
  ]) {
    const card = document.createElement('div');
    card.className = 'j2-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  const blocksEl = makeSection('Template Blocks', blocks);
  if (blocksEl) host.appendChild(blocksEl);

  const macrosEl = makeSection('Macros', macros);
  if (macrosEl) host.appendChild(macrosEl);

  const includesEl = makeSection('Includes / Imports', includes, (i) => i.type);
  if (includesEl) host.appendChild(includesEl);

  const filtersEl = makeSection('Filters', filters);
  if (filtersEl) host.appendChild(filtersEl);

  // Source
  const srcSec = document.createElement('div');
  srcSec.className = 'j2-section';
  const srcHd = document.createElement('div');
  srcHd.className = 'j2-section-hd';
  srcHd.textContent = 'Source';
  srcSec.appendChild(srcHd);
  const pre = document.createElement('pre');
  pre.className = 'j2-pre';
  pre.innerHTML = highlightJinja2(text);
  srcSec.appendChild(pre);
  host.appendChild(srcSec);

  return { parentNode: host };
}
