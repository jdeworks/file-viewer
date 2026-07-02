import { ensureKnownUiStyle, sourcePreview, wireSourceLinks } from '../../../../core/known-ui.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sql-doc{padding:16px 18px;max-width:960px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.sql-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.sql-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0f766e;color:#fff;vertical-align:middle;margin-right:8px;}
.sql-sub{font-size:12px;color:var(--fg-2,#6b7280);margin:0 0 14px;}
.sql-summary{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 16px;}
.sql-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#d0d7de);border-radius:8px;padding:9px 14px;min-width:110px;}
.sql-card strong{display:block;font-size:1.25rem;font-weight:700;}
.sql-card span{font-size:.78rem;color:var(--fg-2,#6b7280);}
.sql-sec{margin:16px 0;}
.sql-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#6b7280);margin:0 0 7px;}
.sql-pills{display:flex;gap:6px;flex-wrap:wrap;}
.sql-pill{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#d0d7de);font:12px ui-monospace,SFMono-Regular,Menlo,monospace;}
.sql-table{width:100%;border-collapse:collapse;font-size:13px;}
.sql-table th{text-align:left;color:var(--fg-2,#6b7280);font-size:11px;text-transform:uppercase;padding:6px 10px;border-bottom:2px solid var(--border,#d0d7de);background:var(--bg,#fff);}
.sql-table td{padding:6px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font:12px ui-monospace,SFMono-Regular,Menlo,monospace;}
.sql-empty{color:var(--fg-2,#6b7280);font-size:12px;}
.sql-src-kw{color:#0f766e;font-weight:700;}
.sql-src-comment{color:#6b7280;font-style:italic;}
.sql-src-string{color:#b91c1c;}
`;

const CLAUSE_STOP = new Set([
  'on', 'where', 'join', 'inner', 'left', 'right', 'full', 'outer', 'cross', 'group', 'order',
  'having', 'limit', 'offset', 'union', 'intersect', 'except', 'returning', 'set', 'values',
]);
const SQL_KEYWORDS = ['WITH', 'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'TABLE', 'FROM', 'JOIN', 'LEFT', 'RIGHT', 'FULL', 'INNER', 'OUTER', 'CROSS', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'AS', 'ON', 'VALUES'];

function splitStatements(text) {
  const out = [];
  let cur = '', quote = '', lineComment = false, blockComment = false;
  for (let i = 0; i < String(text || '').length; i++) {
    const ch = text[i], next = text[i + 1];
    if (lineComment) {
      cur += ch;
      if (ch === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      cur += ch;
      if (ch === '*' && next === '/') { cur += next; i++; blockComment = false; }
      continue;
    }
    if (!quote && ch === '-' && next === '-') { cur += ch + next; i++; lineComment = true; continue; }
    if (!quote && ch === '/' && next === '*') { cur += ch + next; i++; blockComment = true; continue; }
    if (quote) {
      cur += ch;
      if (ch === quote && text[i - 1] !== '\\') quote = '';
      continue;
    }
    if (ch === '\'' || ch === '"' || ch === '`') { quote = ch; cur += ch; continue; }
    if (ch === ';') {
      if (cur.trim()) out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function stripNoise(sql) {
  return String(sql || '')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--.*$/gm, ' ')
    .replace(/'([^']|'')*'/g, "''")
    .replace(/"([^"]|"")*"/g, (m) => m)
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanIdentifier(raw) {
  return String(raw || '')
    .replace(/^[([{]+|[)\]},;]+$/g, '')
    .replace(/^["`[]|["`\]]$/g, '')
    .trim();
}

function normalizeTable(raw) {
  return String(raw || '').split('.').map(cleanIdentifier).filter(Boolean).join('.');
}

function schemaOf(name) {
  const parts = String(name || '').split('.');
  return parts.length > 1 ? parts.slice(0, -1).join('.') : '';
}

function aliasAfter(rest) {
  const m = /^\s+(?:as\s+)?(["`[]?[\w$.-]+["`\]]?)/i.exec(rest || '');
  if (!m) return '';
  const alias = cleanIdentifier(m[1]);
  return CLAUSE_STOP.has(alias.toLowerCase()) ? '' : alias;
}

function addRef(map, table, role, alias = '', joinType = '') {
  const name = normalizeTable(table);
  if (!name || /^\d/.test(name) || /^select$/i.test(name)) return;
  const item = map.get(name) || { name, schema: schemaOf(name), roles: new Set(), aliases: new Set(), joinTypes: new Set() };
  item.roles.add(role);
  if (alias) item.aliases.add(alias);
  if (joinType) item.joinTypes.add(joinType);
  map.set(name, item);
}

function statementType(stmt) {
  const clean = stripNoise(stmt);
  const first = clean.match(/^\w+/)?.[0]?.toUpperCase() || 'SQL';
  if (first === 'WITH') {
    const after = clean.match(/\)\s*(select|insert|update|delete|merge)\b/i)?.[1];
    return after ? 'WITH ' + after.toUpperCase() : 'WITH';
  }
  if (first === 'CREATE' && /\bcreate\s+(temporary\s+|temp\s+)?table\b/i.test(clean)) return 'CREATE TABLE';
  return first;
}

function collectCtes(clean) {
  if (!/^with\b/i.test(clean)) return [];
  const head = clean.split(/\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bmerge\b/i)[0] || '';
  return [...head.matchAll(/(?:with|,)\s+([A-Za-z_][\w$]*)\s+as\s*\(/gi)].map((m) => m[1]);
}

function collectTableRefs(statements) {
  const refs = new Map();
  const joins = [];
  const ctes = new Set();
  for (const stmt of statements) {
    const clean = stripNoise(stmt);
    for (const cte of collectCtes(clean)) ctes.add(cte);
    for (const m of clean.matchAll(/\bcreate\s+(?:temporary\s+|temp\s+)?table\s+(?:if\s+not\s+exists\s+)?(["`[]?[\w$]+["`\]]?(?:\s*\.\s*["`[]?[\w$]+["`\]]?)*)/gi)) {
      addRef(refs, m[1].replace(/\s+/g, ''), 'created');
    }
    for (const m of clean.matchAll(/\binsert\s+into\s+(["`[]?[\w$]+["`\]]?(?:\s*\.\s*["`[]?[\w$]+["`\]]?)*)/gi)) {
      addRef(refs, m[1].replace(/\s+/g, ''), 'insert target');
    }
    for (const m of clean.matchAll(/\bupdate\s+(["`[]?[\w$]+["`\]]?(?:\s*\.\s*["`[]?[\w$]+["`\]]?)*)([\s\S]{0,40})/gi)) {
      addRef(refs, m[1].replace(/\s+/g, ''), 'update target', aliasAfter(m[2]));
    }
    for (const m of clean.matchAll(/\bdelete\s+from\s+(["`[]?[\w$]+["`\]]?(?:\s*\.\s*["`[]?[\w$]+["`\]]?)*)([\s\S]{0,40})/gi)) {
      addRef(refs, m[1].replace(/\s+/g, ''), 'delete target', aliasAfter(m[2]));
    }
    for (const m of clean.matchAll(/\bfrom\s+(["`[]?[\w$]+["`\]]?(?:\s*\.\s*["`[]?[\w$]+["`\]]?)*)([\s\S]{0,40})/gi)) {
      addRef(refs, m[1].replace(/\s+/g, ''), 'read', aliasAfter(m[2]));
    }
    for (const m of clean.matchAll(/\b((?:inner|left|right|full|cross)(?:\s+outer)?\s+)?join\s+(["`[]?[\w$]+["`\]]?(?:\s*\.\s*["`[]?[\w$]+["`\]]?)*)([\s\S]{0,40})/gi)) {
      const type = (m[1] || 'join').trim().replace(/\s+/g, ' ').toUpperCase() || 'JOIN';
      const table = normalizeTable(m[2].replace(/\s+/g, ''));
      const alias = aliasAfter(m[3]);
      addRef(refs, table, 'join', alias, type);
      joins.push({ type, table, alias });
    }
  }
  for (const cte of ctes) refs.delete(cte);
  return {
    refs: [...refs.values()].map((item) => ({
      name: item.name,
      schema: item.schema,
      roles: [...item.roles],
      aliases: [...item.aliases],
      joinTypes: [...item.joinTypes],
    })),
    joins,
    ctes: [...ctes],
  };
}

function collectModifiers(text) {
  const found = [];
  const probes = [
    ['WHERE', /\bwhere\b/i],
    ['GROUP BY', /\bgroup\s+by\b/i],
    ['HAVING', /\bhaving\b/i],
    ['ORDER BY', /\border\s+by\b/i],
    ['LIMIT', /\blimit\b/i],
    ['RETURNING', /\breturning\b/i],
  ];
  for (const [label, re] of probes) if (re.test(text)) found.push(label);
  return found;
}

function parseSql(text) {
  const statements = splitStatements(text);
  const cleanText = stripNoise(text);
  const tableData = collectTableRefs(statements);
  return {
    statements,
    statementTypes: statements.map(statementType),
    modifiers: collectModifiers(cleanText),
    ...tableData,
  };
}

function highlightSqlLine(line) {
  const escaped = esc(line);
  if (/^\s*--/.test(line)) return `<span class="sql-src-comment">${escaped}</span>`;
  let out = escaped.replace(/('[^']*')/g, '<span class="sql-src-string">$1</span>');
  for (const kw of SQL_KEYWORDS) {
    const re = new RegExp('\\b(' + kw.replace(/\s+/g, '\\s+') + ')\\b', 'gi');
    out = out.replace(re, '<span class="sql-src-kw">$1</span>');
  }
  return out;
}

function section(title, body) {
  const wrap = document.createElement('section');
  wrap.className = 'sql-sec';
  const h = document.createElement('h3');
  h.textContent = title;
  wrap.append(h, body);
  return wrap;
}

function pills(items, empty = 'None found') {
  const wrap = document.createElement('div');
  wrap.className = 'sql-pills';
  if (!items.length) {
    const el = document.createElement('span');
    el.className = 'sql-empty';
    el.textContent = empty;
    wrap.appendChild(el);
    return wrap;
  }
  for (const item of items) {
    const el = document.createElement('span');
    el.className = 'sql-pill';
    el.textContent = item;
    wrap.appendChild(el);
  }
  return wrap;
}

function tableRefs(refs) {
  const table = document.createElement('table');
  table.className = 'sql-table';
  table.innerHTML = '<thead><tr><th>Table</th><th>Schema</th><th>Role</th><th>Alias</th></tr></thead>';
  const tbody = document.createElement('tbody');
  for (const ref of refs) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${esc(ref.name)}</td><td>${esc(ref.schema || '-')}</td><td>${esc(ref.roles.join(', '))}</td><td>${esc(ref.aliases.join(', ') || '-')}</td>`;
    tbody.appendChild(tr);
  }
  if (!refs.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="4"><span class="sql-empty">No table references found.</span></td>';
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  return table;
}

function joinRows(joins) {
  const table = document.createElement('table');
  table.className = 'sql-table';
  table.innerHTML = '<thead><tr><th>Join type</th><th>Table</th><th>Alias</th></tr></thead>';
  const tbody = document.createElement('tbody');
  for (const join of joins) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${esc(join.type)}</td><td>${esc(join.table)}</td><td>${esc(join.alias || '-')}</td>`;
    tbody.appendChild(tr);
  }
  if (!joins.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="3"><span class="sql-empty">No JOIN clauses found.</span></td>';
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  return table;
}

export function render(intake) {
  const text = intake.text || '';
  const parsed = parseSql(text);
  const host = document.createElement('div');
  host.className = 'sql-doc';
  host.innerHTML = `<style>${CSS}</style>`;

  const title = document.createElement('div');
  title.className = 'sql-title';
  title.innerHTML = '<span class="sql-badge">SQL</span>Query overview';
  const sub = document.createElement('div');
  sub.className = 'sql-sub';
  sub.textContent = `${parsed.statements.length} statement${parsed.statements.length !== 1 ? 's' : ''} · ${parsed.refs.length} table reference${parsed.refs.length !== 1 ? 's' : ''}`;
  host.append(title, sub);

  const summary = document.createElement('div');
  summary.className = 'sql-summary';
  for (const card of [
    { value: parsed.statements.length, label: 'Statements' },
    { value: parsed.refs.length, label: 'Tables' },
    { value: parsed.joins.length, label: 'JOINs' },
    { value: parsed.ctes.length, label: 'CTEs' },
  ]) {
    const el = document.createElement('div');
    el.className = 'sql-card';
    el.innerHTML = `<strong>${esc(card.value)}</strong><span>${esc(card.label)}</span>`;
    summary.appendChild(el);
  }
  host.appendChild(summary);

  host.appendChild(section('Statement types', pills([...new Set(parsed.statementTypes)])));
  host.appendChild(section('Tables and aliases', tableRefs(parsed.refs)));
  host.appendChild(section('Joins', joinRows(parsed.joins)));
  host.appendChild(section('CTEs', pills(parsed.ctes)));
  host.appendChild(section('Query modifiers', pills(parsed.modifiers)));

  ensureKnownUiStyle(document);
  host.appendChild(sourcePreview(text, {
    title: 'Source',
    collapsed: true,
    idPrefix: 'sql-line',
    highlighter: highlightSqlLine,
  }));
  wireSourceLinks(host, { idPrefix: 'sql-line' });
  return { parentNode: host };
}
