import { chip, ensureKnownUiStyle, esc, issueList, sourceButton, sourcePreview, wireSourceLinks } from '../../../../core/known-ui.js';

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
.j2-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.j2-list li:last-child{border-bottom:none;}
.j2-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#fce7e7;color:#b41717;font-weight:700;}
.j2-note{color:var(--fg-2,#5a6678);font-family:system-ui,sans-serif;font-size:12px;flex-basis:100%;margin-left:0;}
.j2-output{color:#16a34a;font-weight:600;}
.j2-block{color:#b41717;font-weight:600;}
.j2-comment{color:#6e7781;font-style:italic;}
.j2-filter{color:#0369a1;}
.j2-str{color:#0a6640;}
.j2-kw{color:#7c3aed;font-weight:600;}
`;

const JINJA_KEYWORDS = new Set(['if', 'elif', 'else', 'endif', 'for', 'in', 'endfor', 'block', 'endblock', 'extends', 'include', 'import', 'from', 'macro', 'endmacro', 'call', 'endcall', 'filter', 'endfilter', 'set', 'do', 'not', 'and', 'or', 'is', 'true', 'false', 'none', 'with', 'without', 'context', 'scoped', 'recursive', 'loop', 'super', 'namespace', 'raw', 'endraw', 'autoescape', 'endautoescape', 'trans', 'endtrans', 'pluralize']);

function analyzeJinja2(text) {
  const lineStarts = lineStartOffsets(text);
  let extendsBase = null;
  const blocks = new Map();
  const macros = new Map();
  const includes = new Map();
  const filters = new Map();
  const variables = new Map();
  const issues = [];
  const locals = new Set();

  // Block tags {% ... %}
  const blockRe = /\{%-?\s*([\s\S]*?)\s*-?%\}/g;
  let m;
  while ((m = blockRe.exec(text)) !== null) {
    const inner = m[1].trim();
    const kw = inner.split(/\s/)[0];
    const line = offsetToLine(lineStarts, m.index);

    if (kw === 'extends') {
      const nameM = inner.match(/extends\s+["']([^"']+)['"]/);
      if (nameM) extendsBase = { name: nameM[1], line, type: 'extends' };
    } else if (kw === 'block') {
      const nameM = inner.match(/block\s+(\w+)/);
      if (nameM) addOccurrence(blocks, nameM[1], { line, kind: 'block override' });
    } else if (kw === 'macro') {
      const nameM = inner.match(/macro\s+(\w+)\s*\(([^)]*)\)/);
      if (nameM) addOccurrence(macros, nameM[1], { line, kind: 'macro', signature: `${nameM[1]}(${nameM[2] || ''})` });
    } else if (kw === 'include') {
      const nameM = inner.match(/include\s+["']([^"']+)['"]/);
      if (nameM) addOccurrence(includes, nameM[1], { line, kind: inner.includes('ignore missing') ? 'optional include' : 'include' });
    } else if (kw === 'import' || kw === 'from') {
      const nameM = inner.match(/(?:import|from)\s+["']([^"']+)['"]/);
      if (nameM) addOccurrence(includes, nameM[1], { line, kind: kw === 'from' ? 'from import' : 'import' });
    } else if (kw === 'for') {
      const forM = inner.match(/^for\s+(.+?)\s+in\s+(.+)/);
      if (forM) {
        for (const name of forM[1].match(/\b[A-Za-z_]\w*\b/g) || []) locals.add(name);
        for (const name of variableRoots(forM[2])) addOccurrence(variables, name, { line, kind: 'for context' });
      }
    } else if (kw === 'if') {
      for (const name of variableRoots(inner)) addOccurrence(variables, name, { line, kind: `${kw} context` });
    }
  }

  // Output tags {{ ... }} — extract variable names and filters
  const outputRe = /\{\{-?\s*([\s\S]*?)\s*-?\}\}/g;
  while ((m = outputRe.exec(text)) !== null) {
    const line = offsetToLine(lineStarts, m.index);
    const parts = m[1].split('|');
    for (const name of variableRoots(parts[0])) addOccurrence(variables, name, { line, kind: 'output context' });
    for (let i = 1; i < parts.length; i++) {
      const filterName = parts[i].trim().split(/[\s(]/)[0];
      if (filterName) addOccurrence(filters, filterName, { line, kind: 'filter' });
    }
  }

  for (const item of sortedOccurrences(blocks)) {
    if (item.count > 1) issues.push({ severity: 'warning', label: 'duplicate block', line: item.firstLine, message: `Block "${item.name}" is declared ${item.count} times.` });
  }
  for (const item of sortedOccurrences(macros)) {
    if (item.count > 1) issues.push({ severity: 'warning', label: 'duplicate macro', line: item.firstLine, message: `Macro "${item.name}" is declared ${item.count} times.` });
  }

  return {
    extendsBase,
    blocks: sortedOccurrences(blocks),
    macros: sortedOccurrences(macros),
    includes: sortedOccurrences(includes),
    filters: sortedOccurrences(filters),
    variables: sortedOccurrences(variables).filter((item) => !locals.has(item.name) && !localTemplateNames().has(item.name)),
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

function variableRoots(expr) {
  const roots = new Set();
  const cleaned = String(expr || '').replace(/(["']).*?\1/g, ' ');
  for (const match of cleaned.matchAll(/(^|[^.\w])([A-Za-z_]\w*)\b/g)) {
    const name = match[2];
    if (!JINJA_KEYWORDS.has(name) && !/^\d/.test(name)) roots.add(name);
  }
  return [...roots];
}

function addOccurrence(map, name, item) {
  if (!map.has(name)) map.set(name, { name, count: 0, firstLine: item.line, kinds: new Set(), lines: [], signatures: new Set() });
  const rec = map.get(name);
  rec.count++;
  rec.firstLine = Math.min(rec.firstLine, item.line);
  rec.kinds.add(item.kind);
  rec.lines.push(item.line);
  if (item.signature) rec.signatures.add(item.signature);
}

function sortedOccurrences(map) {
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name)).map((rec) => ({
    ...rec,
    kinds: [...rec.kinds],
    signatures: [...rec.signatures],
  }));
}

function localTemplateNames() {
  return new Set(['key', 'value', 'loop', 'defined', 'items', 'keys', 'values', 'range']);
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

function makeSection(title, items, tagFn, detailFn = null) {
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
      tag.title = tagHint(tag.textContent);
      li.appendChild(tag);
    }
    const label = typeof item === 'string' ? item : item.name;
    const line = typeof item === 'string' ? 1 : item.firstLine;
    li.appendChild(sourceButton(label, line, `Open ${label} on line ${line}`));
    if (line) li.appendChild(chip(`line ${line}`, 'muted'));
    if (item.count > 1) li.appendChild(chip(`${item.count} uses`, 'info'));
    if (detailFn) detailFn(li, item);
    ul.appendChild(li);
  }
  sec.appendChild(ul);
  return sec;
}

export function render(intake) {
  const text = intake.text || '';
  const { extendsBase, blocks, macros, includes, filters, variables, issues } = analyzeJinja2(text);

  const host = document.createElement('div');
  host.className = 'j2-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);
  ensureKnownUiStyle(host);

  const title = document.createElement('div');
  title.className = 'j2-title';
  title.innerHTML = '<span class="j2-badge">Jinja2</span>';
  host.appendChild(title);
  if (extendsBase) {
    const ext = document.createElement('div');
    ext.className = 'j2-sub';
    ext.appendChild(chip('extends', 'info', 'This template inherits layout blocks from a parent template.'));
    ext.appendChild(document.createTextNode(' '));
    ext.appendChild(sourceButton(extendsBase.name, extendsBase.line, 'Open extends declaration in source'));
    host.appendChild(ext);
  }

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

  const blocksEl = makeSection('Template Blocks', blocks, () => 'block', (li, item) => {
    li.appendChild(chip('override point', 'info', 'Named region filled into the parent template.'));
    if (item.count > 1) li.appendChild(chip('duplicate', 'warn'));
  });
  if (blocksEl) host.appendChild(blocksEl);

  const macrosEl = makeSection('Macros', macros, () => 'macro', (li, item) => {
    for (const sig of item.signatures) li.appendChild(chip(sig, 'muted', 'Macro signature.'));
  });
  if (macrosEl) host.appendChild(macrosEl);

  const includesEl = makeSection('Extends / Includes / Imports', includes, (i) => i.kinds[0], (li, item) => {
    li.appendChild(chip('template dependency', item.kinds.includes('optional include') ? 'warn' : 'info', 'Referenced template must be available from the render environment.'));
    const note = document.createElement('div');
    note.className = 'j2-note';
    note.textContent = item.kinds.join(', ');
    li.appendChild(note);
  });
  if (includesEl) host.appendChild(includesEl);

  const variablesEl = makeSection('External Context Variables', variables, () => 'context', (li, item) => {
    li.appendChild(chip(item.kinds.join(', '), 'muted', 'Usage context found in template expressions or control flow.'));
  });
  if (variablesEl) host.appendChild(variablesEl);

  const filtersEl = makeSection('Filters', filters, () => 'filter');
  if (filtersEl) host.appendChild(filtersEl);

  const issueEl = issueList(issues, { title: 'Template Diagnostics' });
  if (issueEl) host.appendChild(issueEl);

  host.appendChild(sourcePreview(text, { title: 'Source', collapsed: true, idPrefix: 'j2-line', highlighter: highlightJinja2 }));
  wireSourceLinks(host, { idPrefix: 'j2-line' });

  return { parentNode: host };
}

function tagHint(label) {
  const hints = {
    block: 'Block supplied to a parent template through inheritance.',
    macro: 'Reusable template function with named parameters.',
    include: 'Includes another template at render time.',
    import: 'Imports macros or variables from another template.',
    'from import': 'Imports selected macros or variables from another template.',
    'optional include': 'Optional include; rendering continues if the template is missing.',
    context: 'Variable expected from the render context.',
    filter: 'Transformation applied to a value before output.',
  };
  return hints[label] || '';
}
