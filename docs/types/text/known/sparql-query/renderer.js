const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sparql-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.sparql-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#8b5cf6;color:#fff;vertical-align:middle;margin-right:8px;}
.sparql-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.sparql-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.sparql-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.sparql-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.sparql-card strong{display:block;font-size:1.2rem;font-weight:700;}
.sparql-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.sparql-section{margin:16px 0;}
.sparql-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.sparql-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.sparql-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.sparql-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.sparql-table tr:last-child td{border-bottom:none;}
.sparql-vars{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 8px;}
.sparql-var{background:var(--bg-2,#ede9fe);color:#6d28d9;padding:2px 8px;border-radius:10px;font-family:ui-monospace,monospace;font-size:12px;font-weight:600;}
.sparql-pre{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:14px;overflow:auto;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;margin-top:16px;white-space:pre-wrap;word-break:break-word;}
.sparql-kw{color:#7c3aed;font-weight:700;}
.sparql-prefix-name{color:#0f6fba;font-weight:600;}
.sparql-uri{color:#059669;}
.sparql-var-hl{color:#b45309;}
.sparql-str{color:#b91c1c;}
.sparql-comment{color:#888;font-style:italic;}
`;

const KEYWORDS = [
  'PREFIX','SELECT','WHERE','FILTER','OPTIONAL','UNION','BIND','GROUP BY',
  'ORDER BY','HAVING','LIMIT','OFFSET','DISTINCT','REDUCED','ASK','CONSTRUCT',
  'DESCRIBE','FROM','NAMED','AS','VALUES','SERVICE','MINUS','GRAPH',
  'INSERT','DELETE','WITH','CLEAR','DROP','CREATE','LOAD','COPY','MOVE','ADD',
];

function parseSparql(text) {
  const lines = (text || '').split(/\r?\n/);

  // Detect query type
  let queryType = 'UNKNOWN';
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('#')) continue;
    const upper = t.toUpperCase();
    if (upper.startsWith('SELECT')) { queryType = 'SELECT'; break; }
    if (upper.startsWith('CONSTRUCT')) { queryType = 'CONSTRUCT'; break; }
    if (upper.startsWith('ASK')) { queryType = 'ASK'; break; }
    if (upper.startsWith('DESCRIBE')) { queryType = 'DESCRIBE'; break; }
    if (upper.startsWith('INSERT') || upper.startsWith('DELETE')) { queryType = 'UPDATE'; break; }
  }

  // Collect prefixes
  const prefixes = [];
  for (const line of lines) {
    const m = line.match(/^\s*PREFIX\s+(\S+):\s*<([^>]*)>/i);
    if (m) prefixes.push({ name: m[1] + ':', uri: m[2] });
  }

  // Projected variables (after SELECT, before WHERE)
  const projectedVars = [];
  const selectMatch = text.match(/SELECT\s+(DISTINCT\s+|REDUCED\s+)?(.*?)(?=WHERE\s*\{)/is);
  if (selectMatch) {
    const varsPart = selectMatch[2];
    const allVarsMatch = varsPart.match(/\*/) ? ['*'] : [...varsPart.matchAll(/[?$](\w+)/g)].map((m) => '?' + m[1]);
    projectedVars.push(...allVarsMatch);
  }

  // Triple pattern count — lines containing ?var or <uri> or prefix:name as subject/predicate/object
  let tripleCount = 0;
  let filterCount = 0;
  let optionalCount = 0;
  let hasGroupBy = false;
  let hasOrderBy = false;

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('#')) continue;
    if (/\bFILTER\s*\(/i.test(t)) filterCount++;
    if (/\bOPTIONAL\s*\{/i.test(t)) optionalCount++;
    if (/\bGROUP\s+BY\b/i.test(t)) hasGroupBy = true;
    if (/\bORDER\s+BY\b/i.test(t)) hasOrderBy = true;
    // Rough triple heuristic: lines with 3 "terms" (vars, URIs, literals) inside WHERE block
    if (/[?$]\w+\s+[?$<\w]/.test(t) && !/^\s*(SELECT|FILTER|OPTIONAL|BIND|GROUP|ORDER|HAVING|LIMIT|OFFSET|UNION|PREFIX|BASE)/i.test(t)) {
      tripleCount++;
    }
  }

  return { queryType, prefixes, projectedVars, tripleCount, filterCount, optionalCount, hasGroupBy, hasOrderBy };
}

function highlightSparql(text) {
  const lines = text.split(/\r?\n/);
  const result = [];

  for (const line of lines) {
    if (line.trim().startsWith('#')) {
      result.push(`<span class="sparql-comment">${esc(line)}</span>`);
      continue;
    }

    let out = esc(line);

    // Highlight strings
    out = out.replace(/(&quot;[^&]*&quot;|'[^']*')/g, '<span class="sparql-str">$1</span>');
    // Highlight URIs <...>
    out = out.replace(/(&lt;[^&]*&gt;)/g, '<span class="sparql-uri">$1</span>');
    // Highlight variables ?var and $var
    out = out.replace(/([?$]\w+)/g, '<span class="sparql-var-hl">$1</span>');
    // Highlight keywords (longest first to avoid partial matches)
    const sortedKws = [...KEYWORDS].sort((a, b) => b.length - a.length);
    for (const kw of sortedKws) {
      const re = new RegExp(`(?<![\\w-])(${kw})(?![\\w-])`, 'gi');
      out = out.replace(re, '<span class="sparql-kw">$1</span>');
    }
    result.push(out);
  }

  return result.join('\n');
}

export function render(intake) {
  const parsed = parseSparql(intake.text || '');
  const { queryType, prefixes, projectedVars, tripleCount, filterCount, optionalCount, hasGroupBy, hasOrderBy } = parsed;

  const host = document.createElement('div');
  host.className = 'sparql-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'sparql-title';
  title.innerHTML = `<span class="sparql-badge">SPARQL</span>${esc(queryType)} Query`;
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'sparql-sub';
  const parts = [`${prefixes.length} prefix${prefixes.length !== 1 ? 'es' : ''}`, `~${tripleCount} triple pattern${tripleCount !== 1 ? 's' : ''}`];
  if (filterCount) parts.push(`${filterCount} FILTER`);
  if (optionalCount) parts.push(`${optionalCount} OPTIONAL`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'sparql-summary';
  const cards = [
    { value: queryType, label: 'Query type' },
    { value: prefixes.length, label: 'Prefixes' },
    { value: tripleCount, label: 'Triple patterns' },
    { value: filterCount, label: 'FILTERs' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'sparql-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Projected variables
  if (projectedVars.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'sparql-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Projected Variables';
    sec.appendChild(h3);
    const varList = document.createElement('div');
    varList.className = 'sparql-vars';
    for (const v of projectedVars) {
      const span = document.createElement('span');
      span.className = 'sparql-var';
      span.textContent = v;
      varList.appendChild(span);
    }
    sec.appendChild(varList);
    host.appendChild(sec);
  }

  // Query modifiers
  const modifiers = [];
  if (hasGroupBy) modifiers.push('GROUP BY');
  if (hasOrderBy) modifiers.push('ORDER BY');
  if (optionalCount) modifiers.push('OPTIONAL');
  if (modifiers.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'sparql-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Query Modifiers';
    sec.appendChild(h3);
    const varList = document.createElement('div');
    varList.className = 'sparql-vars';
    for (const m of modifiers) {
      const span = document.createElement('span');
      span.className = 'sparql-var';
      span.textContent = m;
      varList.appendChild(span);
    }
    sec.appendChild(varList);
    host.appendChild(sec);
  }

  // Prefix table
  if (prefixes.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'sparql-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Namespace Prefixes';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'sparql-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Prefix</th><th>Namespace URI</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const { name, uri } of prefixes) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><span class="sparql-prefix-name">${esc(name)}</span></td><td>${esc(uri)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Syntax-highlighted source
  const pre = document.createElement('pre');
  pre.className = 'sparql-pre';
  pre.innerHTML = highlightSparql(intake.text || '');
  host.appendChild(pre);

  return { parentNode: host };
}
