const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
.hbs-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;}
.hbs-list li:last-child{border-bottom:none;}
.hbs-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#fde8d7;color:#c04000;font-weight:700;}
.hbs-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.hbs-expr{color:#f0772a;font-weight:600;}
.hbs-block-open{color:#b91c1c;font-weight:600;}
.hbs-block-close{color:#b91c1c;}
.hbs-partial{color:#7c3aed;font-weight:600;}
.hbs-comment{color:#6e7781;font-style:italic;}
.hbs-unescaped{color:#0f6fba;font-weight:600;}
`;

const BUILTIN_HELPERS = new Set(['if', 'each', 'with', 'unless', 'log', 'lookup', 'blockHelperMissing', 'helperMissing']);

function analyzeHandlebars(text) {
  let expressionCount = 0;
  const blockHelpers = new Set();
  const partials = new Set();
  const customHelpers = new Set();

  // Match all {{ ... }} expressions
  const re = /\{\{(!-{0,2}|#|\/|>|&|~?)?([\s\S]*?)(-?~?)\}\}/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const sigil = (m[1] || '').trim();
    const inner = (m[2] || '').trim();

    if (sigil === '!' || sigil === '!--') {
      // comment — skip
    } else if (sigil === '#') {
      expressionCount++;
      const helperName = inner.split(/[\s(]/)[0];
      if (helperName) blockHelpers.add(helperName);
      if (helperName && !BUILTIN_HELPERS.has(helperName)) customHelpers.add(helperName);
    } else if (sigil === '/') {
      // closing block — don't count
    } else if (sigil === '>') {
      expressionCount++;
      const partialName = inner.split(/\s/)[0];
      if (partialName) partials.add(partialName);
    } else {
      expressionCount++;
    }
  }

  return {
    expressionCount,
    blockHelpers: [...blockHelpers].sort(),
    partials: [...partials].sort(),
    customHelpers: [...customHelpers].sort(),
  };
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
  const { expressionCount, blockHelpers, partials, customHelpers } = analyzeHandlebars(text);

  const host = document.createElement('div');
  host.className = 'hbs-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

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

  const blockHelpersEl = makeSection('Block Helpers', blockHelpers, (h) => BUILTIN_HELPERS.has(h) ? 'built-in' : 'helper');
  if (blockHelpersEl) host.appendChild(blockHelpersEl);

  const partialsEl = makeSection('Partials', partials, () => 'partial');
  if (partialsEl) host.appendChild(partialsEl);

  const customEl = makeSection('Custom Helpers', customHelpers, () => 'custom');
  if (customEl) host.appendChild(customEl);

  // Source
  const srcSec = document.createElement('div');
  srcSec.className = 'hbs-section';
  const srcHd = document.createElement('div');
  srcHd.className = 'hbs-section-hd';
  srcHd.textContent = 'Source';
  srcSec.appendChild(srcHd);
  const pre = document.createElement('pre');
  pre.className = 'hbs-pre';
  pre.innerHTML = highlightHandlebars(text);
  srcSec.appendChild(pre);
  host.appendChild(srcSec);

  return { parentNode: host };
}
