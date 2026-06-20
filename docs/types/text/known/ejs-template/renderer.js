const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ejs-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.ejs-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#b91c1c;color:#fff;vertical-align:middle;margin-right:8px;}
.ejs-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ejs-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ejs-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.ejs-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.ejs-card strong{display:block;font-size:1.2rem;font-weight:700;}
.ejs-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.ejs-section{margin:16px 0;}
.ejs-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.ejs-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.ejs-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.ejs-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.ejs-table tr:last-child td{border-bottom:none;}
.ejs-pre{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:14px;overflow:auto;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;margin-top:16px;white-space:pre-wrap;word-break:break-word;}
.ejs-tag-output{color:#059669;font-weight:700;}
.ejs-tag-raw{color:#b91c1c;font-weight:700;}
.ejs-tag-code{color:#1d4ed8;font-weight:700;}
.ejs-tag-comment{color:#888;font-style:italic;}
`;

function parseEjs(text) {
  const content = text || '';
  let outputCount = 0;   // <%= %>
  let unescapedCount = 0; // <%- %>
  let scriptletCount = 0; // <% %> (plain, not =/-/#)
  let commentCount = 0;  // <%# %>
  const includes = [];
  const variables = new Set();

  // Match all EJS tags
  const tagRe = /<%(-|=|#|_)?([^%]|%(?!>))*?(?:-)?%>/gs;
  let m;
  const tagReg = /<%(-|=|#|_)?([\s\S]*?)(?:-)?%>/g;
  while ((m = tagReg.exec(content)) !== null) {
    const modifier = m[1] || '';
    const inner = m[2] || '';
    if (modifier === '=') {
      outputCount++;
      // Extract variable names (simple identifiers)
      const varMatches = inner.match(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g);
      if (varMatches) {
        for (const v of varMatches) {
          if (!['true', 'false', 'null', 'undefined', 'new', 'typeof', 'instanceof'].includes(v)) {
            variables.add(v);
          }
        }
      }
    } else if (modifier === '-') {
      unescapedCount++;
      // Check for include calls
      const incMatch = inner.match(/include\s*\(\s*['"]([^'"]+)['"]/);
      if (incMatch && !includes.includes(incMatch[1])) includes.push(incMatch[1]);
    } else if (modifier === '#') {
      commentCount++;
    } else {
      scriptletCount++;
      // Check for include in scriptlets too
      const incMatch = inner.match(/include\s*\(\s*['"]([^'"]+)['"]/);
      if (incMatch && !includes.includes(incMatch[1])) includes.push(incMatch[1]);
    }
  }

  // Count HTML elements
  const htmlTagRe = /<[a-z][\w-]*/gi;
  const htmlMatches = content.replace(/<%[\s\S]*?%>/g, '').match(htmlTagRe) || [];
  const elementCount = htmlMatches.length;

  return {
    outputCount,
    unescapedCount,
    scriptletCount,
    commentCount,
    includes,
    variables: [...variables].slice(0, 30),
    elementCount,
  };
}

function highlightEjs(text) {
  // We process the text, replacing EJS tags with colored spans.
  // We must be careful to escape HTML in non-tag portions.
  const parts = [];
  let lastIndex = 0;
  const tagRe = /<%(-|=|#|_)?([\s\S]*?)(?:-)?%>/g;
  let m;

  while ((m = tagRe.exec(text)) !== null) {
    // Escape and push the HTML before this tag
    if (m.index > lastIndex) {
      parts.push(esc(text.slice(lastIndex, m.index)));
    }

    const modifier = m[1] || '';
    const inner = esc(m[2] || '');
    const full = esc(m[0]);

    if (modifier === '=') {
      // <%= %> — escaped output
      parts.push(`<span class="ejs-tag-output">&lt;%=</span><span class="ejs-tag-code">${inner}</span><span class="ejs-tag-output">%&gt;</span>`);
    } else if (modifier === '-') {
      // <%- %> — unescaped output
      parts.push(`<span class="ejs-tag-raw">&lt;%-</span><span class="ejs-tag-code">${inner}</span><span class="ejs-tag-raw">-%&gt;</span>`);
    } else if (modifier === '#') {
      // <%# %> — comment
      parts.push(`<span class="ejs-tag-comment">&lt;%#${inner}%&gt;</span>`);
    } else {
      // <% %> — scriptlet
      parts.push(`<span class="ejs-tag-code">&lt;%</span><span class="ejs-tag-code">${inner}</span><span class="ejs-tag-code">%&gt;</span>`);
    }

    lastIndex = m.index + m[0].length;
  }

  // Remaining text after last tag
  if (lastIndex < text.length) {
    parts.push(esc(text.slice(lastIndex)));
  }

  return parts.join('');
}

export function render(intake) {
  const parsed = parseEjs(intake.text || '');
  const { outputCount, unescapedCount, scriptletCount, commentCount, includes, variables, elementCount } = parsed;

  const host = document.createElement('div');
  host.className = 'ejs-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'ejs-title';
  title.innerHTML = '<span class="ejs-badge">EJS</span>Template';
  host.appendChild(title);

  const totalTags = outputCount + unescapedCount + scriptletCount;
  const parts = [`${totalTags} EJS tag${totalTags !== 1 ? 's' : ''}`, `${elementCount} HTML element${elementCount !== 1 ? 's' : ''}`];
  if (includes.length) parts.push(`${includes.length} include${includes.length !== 1 ? 's' : ''}`);

  const sub = document.createElement('div');
  sub.className = 'ejs-sub';
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'ejs-summary';
  const cards = [
    { value: outputCount, label: '<%= %> output' },
    { value: unescapedCount, label: '<%- %> raw' },
    { value: scriptletCount, label: '<% %> code' },
    { value: commentCount, label: '<%# %> comments' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'ejs-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Includes
  if (includes.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'ejs-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Includes';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'ejs-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Path</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const inc of includes.slice(0, 20)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(inc)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Variables used in output tags
  if (variables.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'ejs-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Variables (output tags)';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'ejs-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const v of variables) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(v)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Syntax-highlighted source
  const pre = document.createElement('pre');
  pre.className = 'ejs-pre';
  pre.innerHTML = highlightEjs(intake.text || '');
  host.appendChild(pre);

  return { parentNode: host };
}
