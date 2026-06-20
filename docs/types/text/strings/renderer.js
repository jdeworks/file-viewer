function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseStrings(text) {
  const entries = [];
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  let i = 0;
  while (i < normalized.length) {
    // Skip whitespace
    while (i < normalized.length && /\s/.test(normalized[i])) i++;
    if (i >= normalized.length) break;

    // Block comment /* ... */
    if (normalized.startsWith('/*', i)) {
      const end = normalized.indexOf('*/', i + 2);
      const comment = end < 0 ? normalized.slice(i + 2) : normalized.slice(i + 2, end);
      entries.push({ type: 'comment', text: comment.trim() });
      i = end < 0 ? normalized.length : end + 2;
      continue;
    }

    // Line comment //
    if (normalized.startsWith('//', i)) {
      const end = normalized.indexOf('\n', i);
      entries.push({ type: 'comment', text: normalized.slice(i + 2, end < 0 ? undefined : end).trim() });
      i = end < 0 ? normalized.length : end + 1;
      continue;
    }

    // Key = Value;
    if (normalized[i] === '"') {
      const readQuoted = (pos) => {
        let s = '', j = pos + 1;
        while (j < normalized.length && normalized[j] !== '"') {
          if (normalized[j] === '\\') { s += normalized[j + 1] || ''; j += 2; }
          else { s += normalized[j]; j++; }
        }
        return { value: s, end: j + 1 };
      };
      const key = readQuoted(i);
      i = key.end;
      // Skip whitespace and =
      while (i < normalized.length && /[\s=]/.test(normalized[i])) i++;
      if (normalized[i] === '"') {
        const val = readQuoted(i);
        i = val.end;
        while (i < normalized.length && normalized[i] !== ';') i++;
        i++; // skip ;
        entries.push({ type: 'pair', key: key.value, value: val.value });
      }
      continue;
    }
    i++; // skip unexpected chars
  }
  return entries;
}

// Format specifiers common in iOS/macOS localization strings
const FMT_SPEC_RE = /%(?:\d+\$)?[@dDiuUlqQfFeEgGxXoOsSpcCaA]|%(?:\.\d+)?[dDiuUlqQfFeEgGxXoOsSpcCaA]|%ld|%lu|%lld|%llu/g;

function highlightValue(value) {
  const escaped = esc(value);
  return escaped.replace(
    /(%(?:\d+\$)?[@dDiuUlqQfFeEgGxXoOsSpcCaA]|%(?:\.\d+)?[dDiuUlqQfFeEgGxXoOsSpcCaA]|%ld|%lu|%lld|%llu)/g,
    '<span class="str-fmt">$1</span>'
  );
}

function extractSpecifiers(value) {
  return (value.match(FMT_SPEC_RE) || []).sort().join(',');
}

function extractLang(filename) {
  if (!filename) return null;
  // Match e.g. "en.lproj/Localizable.strings" or "fr-FR.lproj/..."
  const m = filename.match(/([a-z]{2,3}(?:-[A-Z]{2}|_[A-Z]{2})?(?:-[A-Za-z]+)?)\.lproj/);
  return m ? m[1] : null;
}

function renderStringsdict(text) {
  // Parse XML plist and render as collapsible tree (reuse plist approach)
  function plistToValue(el) {
    switch (el.tagName) {
      case 'dict': {
        const children = [...el.children];
        const obj = {};
        for (let i = 0; i < children.length; i += 2) {
          if (children[i]) obj[children[i].textContent] = children[i + 1] ? plistToValue(children[i + 1]) : null;
        }
        return obj;
      }
      case 'array': return [...el.children].map(plistToValue);
      case 'string': return el.textContent;
      case 'integer': return parseInt(el.textContent, 10);
      case 'real': return parseFloat(el.textContent);
      case 'true': return true;
      case 'false': return false;
      default: return el.textContent;
    }
  }

  function renderValue(val, depth) {
    if (val === null || val === undefined) return '<span class="pl-null">null</span>';
    if (typeof val === 'boolean') return val ? '<span class="pl-true">true</span>' : '<span class="pl-false">false</span>';
    if (typeof val === 'number') return `<span class="pl-num">${esc(val)}</span>`;
    if (typeof val === 'string') return `<span class="pl-str">&quot;${esc(val)}&quot;</span>`;
    if (Array.isArray(val)) {
      if (!val.length) return '<span class="pl-bracket">[]</span>';
      const items = val.map((item, i) => {
        const isComplex = typeof item === 'object' && item !== null;
        if (isComplex) {
          return `<div class="pl-row"><span class="pl-idx pl-key">[${i}]</span><div class="pl-children">${renderValue(item, depth + 1)}</div></div>`;
        }
        return `<div class="pl-row"><span class="pl-idx">[${i}]</span> ${renderValue(item, depth + 1)}</div>`;
      }).join('');
      return `<div class="pl-array">${items}</div>`;
    }
    if (typeof val === 'object') {
      const keys = Object.keys(val);
      if (!keys.length) return '<span class="pl-bracket">{}</span>';
      const items = keys.map((k) => {
        const child = val[k];
        const isComplex = typeof child === 'object' && child !== null;
        if (isComplex) {
          return `<div class="pl-row"><span class="pl-key" title="${esc(k)}">${esc(k)}</span><div class="pl-children">${renderValue(child, depth + 1)}</div></div>`;
        }
        return `<div class="pl-row"><span class="pl-key-plain">${esc(k)}</span>: ${renderValue(child, depth + 1)}</div>`;
      }).join('');
      return `<div class="pl-dict">${items}</div>`;
    }
    return esc(String(val));
  }

  let treeHtml = '';
  let parseError = '';
  try {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    const parseErr = doc.querySelector('parsererror');
    if (parseErr) {
      parseError = parseErr.textContent || 'XML parse error';
    } else {
      const plistEl = doc.querySelector('plist');
      const rootEl = plistEl ? plistEl.firstElementChild : doc.documentElement?.firstElementChild;
      if (rootEl) {
        treeHtml = renderValue(plistToValue(rootEl), 0);
      }
    }
  } catch (e) {
    parseError = String(e);
  }

  if (parseError) {
    return `<div class="str-error">XML parse error: ${esc(parseError)}</div><pre class="str-raw">${esc(text.slice(0, 2000))}</pre>`;
  }

  return `
<div class="str-stringsdict-badge">Plural rules file (.stringsdict) &mdash; XML plist format</div>
<div class="pl-tree">${treeHtml}</div>
<script>
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('pl-key')) {
      e.target.classList.toggle('collapsed');
      var sib = e.target.nextElementSibling;
      if (sib && sib.classList.contains('pl-children')) {
        sib.classList.toggle('hidden');
      }
    }
  });
<\/script>`;
}

export async function render(intake, _ctx) {
  const filename = intake.filename || '';
  const text = intake.text || '';
  const isStringsdict = filename.toLowerCase().endsWith('.stringsdict');

  if (isStringsdict) {
    const bodyHtml = `
<style>
  body { font-family: system-ui, sans-serif; font-size: 14px; margin: 0; padding: 12px 16px; background: var(--bg, #fff); color: var(--fg, #222); }
  body.fv-dark { --bg: #1e1e1e; --fg: #d4d4d4; }
  .str-stringsdict-badge { display: inline-block; margin-bottom: 14px; padding: 5px 12px; background: #e8f4fd; border: 1px solid #b3d4ef; border-radius: 4px; font-size: 13px; color: #1565c0; }
  body.fv-dark .str-stringsdict-badge { background: #1a2e42; border-color: #2a5080; color: #7ec8e3; }
  .pl-tree { line-height: 1.7; }
  .pl-row { margin: 1px 0; padding-left: 1.2em; border-left: 2px solid transparent; }
  .pl-row:hover { border-left-color: #aaa4; background: #8882; border-radius: 2px; }
  .pl-key { cursor: pointer; user-select: none; font-weight: 600; color: #0070c1; }
  body.fv-dark .pl-key { color: #9cdcfe; }
  .pl-key::before { content: '▾ '; font-size: 0.85em; }
  .pl-key.collapsed::before { content: '▸ '; }
  .pl-key-plain { font-weight: 600; color: #0070c1; }
  body.fv-dark .pl-key-plain { color: #9cdcfe; }
  .pl-idx { color: #666; font-style: italic; }
  .pl-children { padding-left: 1.4em; border-left: 2px solid #ddd8; margin-left: 0.2em; }
  body.fv-dark .pl-children { border-left-color: #4444; }
  .pl-children.hidden { display: none; }
  .pl-str { color: #a31515; font-family: monospace; }
  body.fv-dark .pl-str { color: #ce9178; }
  .pl-num { color: #098658; font-family: monospace; }
  body.fv-dark .pl-num { color: #b5cea8; }
  .pl-true { color: #067d17; font-weight: bold; font-family: monospace; }
  body.fv-dark .pl-true { color: #4ec94e; }
  .pl-false { color: #c7254e; font-weight: bold; font-family: monospace; }
  body.fv-dark .pl-false { color: #f47070; }
  .pl-null { color: #aaa; font-family: monospace; }
  .pl-bracket { color: #888; font-family: monospace; }
  .str-error { color: #c00; background: #fff0f0; padding: 10px 14px; border-radius: 4px; margin-bottom: 12px; }
  .str-raw { padding: 12px; background: #f5f5f5; border-radius: 4px; overflow: auto; font-size: 12px; white-space: pre-wrap; word-break: break-all; }
  body.fv-dark .str-raw { background: #2d2d2d; }
</style>
${renderStringsdict(text)}`;
    return { bodyHtml, hadUnsafe: false };
  }

  // --- .strings parser ---
  const entries = parseStrings(text);
  const pairs = entries.filter(e => e.type === 'pair');
  const lang = extractLang(filename);
  const langBadge = lang ? `&nbsp;&bull;&nbsp;<span class="str-lang">${esc(lang)}.lproj</span>` : '';

  // Build table rows HTML
  let rowsHtml = '';
  for (const entry of entries) {
    if (entry.type === 'comment') {
      rowsHtml += `<tr class="comment-row"><td colspan="3" class="str-comment">// ${esc(entry.text)}</td></tr>\n`;
    } else {
      const keySpecs = extractSpecifiers(entry.key);
      const valSpecs = extractSpecifiers(entry.value);
      const mismatch = keySpecs !== valSpecs && (keySpecs || valSpecs);
      const warning = mismatch
        ? `<span class="str-warn" title="Format specifier mismatch between key and value">&#9888;</span>`
        : '';
      const highlightedVal = highlightValue(entry.value);
      rowsHtml += `<tr class="kv-row" data-key="${esc(entry.key.toLowerCase())}" data-val="${esc(entry.value.toLowerCase())}">`
        + `<td class="str-key"><code>${esc(entry.key)}</code></td>`
        + `<td class="str-val">${highlightedVal}${warning}</td>`
        + `</tr>\n`;
    }
  }

  if (!pairs.length) {
    const bodyHtml = `<p class="str-empty">No localization key-value pairs found.</p>`;
    return { bodyHtml, hadUnsafe: false };
  }

  const bodyHtml = `
<style>
  body { font-family: system-ui, sans-serif; font-size: 14px; margin: 0; padding: 0; background: var(--bg, #fff); color: var(--fg, #222); }
  body.fv-dark { --bg: #1e1e1e; --fg: #d4d4d4; }
  .str-header { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-bottom: 1px solid #e0e0e0; background: #fafafa; flex-wrap: wrap; }
  body.fv-dark .str-header { background: #252526; border-color: #3c3c3c; }
  .str-stats { font-size: 13px; color: #666; white-space: nowrap; }
  body.fv-dark .str-stats { color: #999; }
  .str-lang { font-family: monospace; font-weight: 600; color: #0070c1; }
  body.fv-dark .str-lang { color: #9cdcfe; }
  #str-search { flex: 1; min-width: 180px; max-width: 340px; padding: 5px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; background: #fff; color: #222; outline-offset: 2px; }
  body.fv-dark #str-search { background: #1e1e1e; color: #d4d4d4; border-color: #555; }
  #str-search:focus { border-color: #0070c1; }
  .str-table-wrap { overflow: auto; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; padding: 7px 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #888; border-bottom: 2px solid #e0e0e0; background: #fafafa; position: sticky; top: 0; z-index: 1; }
  body.fv-dark th { background: #252526; border-color: #3c3c3c; color: #666; }
  td { padding: 6px 12px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  body.fv-dark td { border-color: #2a2a2a; }
  tr.kv-row:hover td { background: #f5f5f5; }
  body.fv-dark tr.kv-row:hover td { background: #2a2a2a; }
  .str-key code { font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace; font-size: 12.5px; color: #3a6bbf; background: #eef3ff; padding: 1px 5px; border-radius: 3px; }
  body.fv-dark .str-key code { color: #7ec0f0; background: #1a2a3a; }
  .str-val { line-height: 1.5; }
  .str-fmt { color: #d67e00; font-family: monospace; font-weight: 600; background: #fff4e0; padding: 1px 3px; border-radius: 2px; }
  body.fv-dark .str-fmt { color: #d4a017; background: #2d2000; }
  .str-warn { color: #e65100; margin-left: 6px; cursor: help; font-size: 14px; }
  .comment-row td { font-style: italic; color: #999; font-size: 12.5px; padding: 3px 12px; background: transparent; border: none; }
  body.fv-dark .comment-row td { color: #666; }
  .str-empty { padding: 20px 16px; color: #999; }
  .str-no-results { display: none; padding: 16px; color: #999; text-align: center; }
  .str-no-results.visible { display: block; }
</style>
<div class="str-header">
  <span class="str-stats"><strong>${pairs.length}</strong> localization key${pairs.length !== 1 ? 's' : ''}${langBadge}</span>
  <input id="str-search" type="search" placeholder="Filter keys or values…" oninput="filterRows(this.value)" autocomplete="off" spellcheck="false">
</div>
<div class="str-table-wrap">
<table>
  <thead><tr><th style="width:38%">Key</th><th>Value</th></tr></thead>
  <tbody id="str-tbody">
${rowsHtml}  </tbody>
</table>
<div class="str-no-results" id="str-no-results">No matches found.</div>
</div>
<script>
function filterRows(q) {
  var lq = q.toLowerCase();
  var anyVisible = false;
  document.querySelectorAll('tr.kv-row').forEach(function(tr) {
    var key = tr.dataset.key || '';
    var val = tr.dataset.val || '';
    var show = !q || key.includes(lq) || val.includes(lq);
    tr.style.display = show ? '' : 'none';
    if (show) anyVisible = true;
  });
  document.querySelectorAll('tr.comment-row').forEach(function(tr) {
    tr.style.display = q ? 'none' : '';
  });
  var noRes = document.getElementById('str-no-results');
  if (noRes) noRes.classList.toggle('visible', !!q && !anyVisible);
}
<\/script>`;

  return { bodyHtml, hadUnsafe: false };
}
