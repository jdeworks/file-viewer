import { chip, ensureKnownUiStyle, esc, issueList, sourceButton, sourcePreview, wireSourceLinks } from '../../../../core/known-ui.js';

const CSS = `
.hbs-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.hbs-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f0772a;color:#fff;vertical-align:middle;margin-right:8px;}
.hbs-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.hbs-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.hbs-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.hbs-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.hbs-card strong{display:block;font-size:1.2rem;font-weight:700;}
.hbs-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.hbs-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.hbs-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.hbs-list{margin:0;padding:0;list-style:none;}
.hbs-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.hbs-list li:last-child{border-bottom:none;}
.hbs-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#fde8d7;color:#c04000;font-weight:700;}
.hbs-note{color:var(--fg-2,#5a6678);font-family:system-ui,sans-serif;font-size:12px;flex-basis:100%;margin-left:0;}
.hbs-expr{color:#f0772a;font-weight:600;}
.hbs-block-open{color:#b91c1c;font-weight:600;}
.hbs-block-close{color:#b91c1c;}
.hbs-partial{color:#7c3aed;font-weight:600;}
.hbs-comment{color:#6e7781;font-style:italic;}
.hbs-unescaped{color:#0f6fba;font-weight:600;}
`;

const BUILTIN_HELPERS = new Set(['if', 'each', 'with', 'unless', 'log', 'lookup', 'blockHelperMissing', 'helperMissing']);
const BUILTIN_LITERALS = new Set(['else', 'this', 'true', 'false', 'null', 'undefined']);

function analyzeHandlebars(text) {
  const lineStarts = lineStartOffsets(text);
  let expressionCount = 0;
  const blockHelpers = new Map();
  const partials = new Map();
  const customHelpers = new Map();
  const variables = new Map();
  const issues = [];
  const stack = [];

  // Match all {{ ... }} expressions
  const re = /\{\{(!-{0,2}|#|\/|>|&|~?)?([\s\S]*?)(-?~?)\}\}/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const sigil = (m[1] || '').trim();
    const inner = (m[2] || '').trim();
    const line = offsetToLine(lineStarts, m.index);

    if (sigil === '!' || sigil === '!--') {
      // comment — skip
    } else if (sigil === '#') {
      expressionCount++;
      const block = blockName(inner);
      if (block.name) {
        addOccurrence(blockHelpers, block.name, { line, kind: block.kind });
        if (block.kind === 'block partial') addOccurrence(partials, block.name, { line, kind: 'block partial' });
        if (block.name && !BUILTIN_HELPERS.has(block.name) && block.kind !== 'block partial') addOccurrence(variables, block.name, { line, kind: 'section context' });
        stack.push({ name: block.name, line, kind: block.kind });
      }
    } else if (sigil === '/') {
      const closeName = inner.split(/\s/)[0];
      const open = stack.pop();
      if (!open) {
        issues.push({ severity: 'warning', label: 'unmatched close', line, message: `Closing block "${closeName}" has no opener.` });
      } else if (open.name !== closeName) {
        issues.push({ severity: 'warning', label: 'mismatch', line, message: `Closing block "${closeName}" does not match "${open.name}" opened on line ${open.line}.` });
      }
    } else if (sigil === '>') {
      expressionCount++;
      const partialName = inner.split(/\s/)[0];
      if (partialName) addOccurrence(partials, partialName, { line, kind: 'partial' });
    } else {
      expressionCount++;
      const expr = inner.replace(/^[{&~\s]+|[}~\s]+$/g, '');
      const name = expr.split(/\s/)[0];
      if (isInlineHelper(expr)) {
        addOccurrence(customHelpers, name, { line, kind: 'inline helper' });
        for (const ref of helperArguments(expr)) addOccurrence(variables, ref, { line, kind: 'helper argument' });
      } else if (name && isVariableName(name)) {
        addOccurrence(variables, name, { line, kind: sigil === '&' || m[0].startsWith('{{{') ? 'unescaped' : 'output' });
      }
    }
  }
  for (const open of stack.reverse()) {
    issues.push({ severity: 'warning', label: 'unclosed block', line: open.line, message: `Block "${open.name}" is opened but never closed.` });
  }

  return {
    expressionCount,
    blockHelpers: sortedOccurrences(blockHelpers),
    partials: sortedOccurrences(partials),
    customHelpers: sortedOccurrences(customHelpers),
    variables: sortedOccurrences(variables).slice(0, 18),
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

function blockName(inner) {
  const trimmed = inner.trim();
  if (trimmed.startsWith('>')) return { name: trimmed.slice(1).trim().split(/\s/)[0], kind: 'block partial' };
  return { name: trimmed.split(/[\s(]/)[0], kind: 'block helper' };
}

function isInlineHelper(expr) {
  const parts = String(expr || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return false;
  const name = parts[0];
  if (!isVariableName(name) || name.includes('.') || name.includes('/')) return false;
  if (BUILTIN_HELPERS.has(name) || BUILTIN_LITERALS.has(name) || name.startsWith('@')) return false;
  return true;
}

function helperArguments(expr) {
  const withoutStrings = String(expr || '').replace(/(["']).*?\1/g, ' ');
  const parts = withoutStrings.trim().split(/\s+/).slice(1);
  return parts
    .map((part) => part.replace(/^['"]|['"],?$/g, '').replace(/,$/, ''))
    .filter((part) => isVariableName(part) && !BUILTIN_LITERALS.has(part));
}

function isVariableName(name) {
  return /^[A-Za-z_@][\w@./-]*$/.test(name) && !BUILTIN_LITERALS.has(name) && !name.startsWith('@');
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
    kinds: [...rec.kinds],
  }));
}

function highlightHandlebars(text) {
  const result = [];
  let i = 0;
  while (i < text.length) {
    // Three-brace {{{ }}}
    if (text[i] === '{' && text[i + 1] === '{' && text[i + 2] === '{') {
      const end = text.indexOf('}}}', i + 3);
      if (end !== -1) {
        result.push('<span class="hbs-unescaped">' + esc(text.slice(i, end + 3)) + '</span>');
        i = end + 3;
        continue;
      }
    }
    // Comment {{! or {{!--
    if (text[i] === '{' && text[i + 1] === '{' && text[i + 2] === '!') {
      const endStr = text[i + 3] === '-' && text[i + 4] === '-' ? '--}}' : '}}';
      const end = text.indexOf(endStr, i + 2);
      if (end !== -1) {
        result.push('<span class="hbs-comment">' + esc(text.slice(i, end + endStr.length)) + '</span>');
        i = end + endStr.length;
        continue;
      }
    }
    // Block open {{# or close {{/
    if (text[i] === '{' && text[i + 1] === '{' && (text[i + 2] === '#' || text[i + 2] === '/')) {
      const end = text.indexOf('}}', i + 2);
      if (end !== -1) {
        const cls = text[i + 2] === '#' ? 'hbs-block-open' : 'hbs-block-close';
        result.push('<span class="' + cls + '">' + esc(text.slice(i, end + 2)) + '</span>');
        i = end + 2;
        continue;
      }
    }
    // Partial {{>
    if (text[i] === '{' && text[i + 1] === '{' && text[i + 2] === '>') {
      const end = text.indexOf('}}', i + 2);
      if (end !== -1) {
        result.push('<span class="hbs-partial">' + esc(text.slice(i, end + 2)) + '</span>');
        i = end + 2;
        continue;
      }
    }
    // Regular expression {{
    if (text[i] === '{' && text[i + 1] === '{') {
      const end = text.indexOf('}}', i + 2);
      if (end !== -1) {
        result.push('<span class="hbs-expr">' + esc(text.slice(i, end + 2)) + '</span>');
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
  sec.className = 'hbs-section';
  const hd = document.createElement('div');
  hd.className = 'hbs-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  const ul = document.createElement('ul');
  ul.className = 'hbs-list';
  for (const item of items) {
    const li = document.createElement('li');
    if (tagFn) {
      const tag = document.createElement('span');
      tag.className = 'hbs-tag';
      tag.textContent = tagFn(item);
      tag.title = tagHint(tag.textContent);
      li.appendChild(tag);
    }
    li.appendChild(sourceButton(item.name, item.firstLine, `Open ${item.name} on line ${item.firstLine}`));
    li.appendChild(chip(`line ${item.firstLine}`, 'muted'));
    if (item.count > 1) li.appendChild(chip(`${item.count} uses`, 'info'));
    if (item.kinds?.includes('partial') || item.kinds?.includes('block partial')) li.appendChild(chip('template dependency', 'warn', 'Partial must be supplied by the render host.'));
    if (item.kinds?.includes('inline helper')) li.appendChild(chip('render helper', 'warn', 'Custom helper must be registered by the render host.'));
    if (item.kinds?.includes('section context')) li.appendChild(chip('section context', 'info', 'Non-built-in block may be a context section or a registered block helper.'));
    if (item.kinds?.includes('unescaped')) li.appendChild(chip('unescaped', 'warn', 'Triple-stache or ampersand output is not HTML-escaped by Handlebars.'));
    if (item.kinds?.length) {
      const note = document.createElement('div');
      note.className = 'hbs-note';
      note.textContent = item.kinds.join(', ');
      li.appendChild(note);
    }
    ul.appendChild(li);
  }
  sec.appendChild(ul);
  return sec;
}

export function render(intake) {
  const text = intake.text || '';
  const { expressionCount, blockHelpers, partials, customHelpers, variables, issues } = analyzeHandlebars(text);

  const host = document.createElement('div');
  host.className = 'hbs-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);
  ensureKnownUiStyle(host);

  const title = document.createElement('div');
  title.className = 'hbs-title';
  title.innerHTML = '<span class="hbs-badge">Handlebars</span>';
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'hbs-sub';
  sub.textContent = `${expressionCount} expression${expressionCount !== 1 ? 's' : ''} · ${blockHelpers.length} block helper${blockHelpers.length !== 1 ? 's' : ''} · ${partials.length} partial${partials.length !== 1 ? 's' : ''} · ${customHelpers.length} custom helper${customHelpers.length !== 1 ? 's' : ''}`;
  host.appendChild(sub);

  // Summary cards
  const cards = document.createElement('div');
  cards.className = 'hbs-cards';
  for (const { value, label } of [
    { value: expressionCount, label: 'Expressions' },
    { value: blockHelpers.length, label: 'Block helpers' },
    { value: partials.length, label: 'Partials' },
    { value: customHelpers.length, label: 'Custom helpers' },
  ]) {
    const card = document.createElement('div');
    card.className = 'hbs-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  const blockHelpersEl = makeSection('Block Helpers', blockHelpers, (h) => BUILTIN_HELPERS.has(h.name) ? 'built-in' : 'helper');
  if (blockHelpersEl) host.appendChild(blockHelpersEl);

  const partialsEl = makeSection('Partials', partials, (item) => item.kinds.includes('block partial') ? 'block partial' : 'partial');
  if (partialsEl) host.appendChild(partialsEl);

  const customEl = makeSection('Custom Helpers', customHelpers, () => 'custom');
  if (customEl) host.appendChild(customEl);

  const variablesEl = makeSection('External-looking Variables', variables, (item) => item.kinds.includes('unescaped') ? 'unescaped' : 'output');
  if (variablesEl) host.appendChild(variablesEl);

  const issueEl = issueList(issues, { title: 'Template Diagnostics' });
  if (issueEl) host.appendChild(issueEl);

  host.appendChild(sourcePreview(text, { title: 'Source', collapsed: true, idPrefix: 'hbs-line', highlighter: highlightHandlebars }));
  wireSourceLinks(host, { idPrefix: 'hbs-line' });

  return { parentNode: host };
}

function tagHint(label) {
  const hints = {
    'built-in': 'Built-in Handlebars control helper.',
    helper: 'Non-built-in block; may be a context section or registered block helper.',
    custom: 'Custom inline helper that must be registered by the render host.',
    partial: 'Includes another template supplied by the render host.',
    'block partial': 'Block partial layout/template dependency supplied by the render host.',
    output: 'Escaped output expression.',
    unescaped: 'Unescaped output; review for trusted HTML only.',
  };
  return hints[label] || '';
}
