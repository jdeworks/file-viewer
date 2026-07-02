const SQL_START = /^(with|select|insert|update|delete|create|alter|drop|truncate|merge|grant|revoke)\b/i;
const SQL_STRUCTURE = /\b(from|join|where|group\s+by|order\s+by|create\s+table|insert\s+into|update\s+[\w".[\]]+|delete\s+from)\b/i;

function firstCodeLine(text) {
  const withoutBlockComments = String(text || '').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const line of withoutBlockComments.split(/\r?\n/)) {
    const trimmed = line.replace(/--.*$/, '').trim();
    if (trimmed) return trimmed;
  }
  return '';
}

function looksLikeSql(text) {
  const first = firstCodeLine(text);
  if (!SQL_START.test(first)) return false;
  return SQL_STRUCTURE.test(text || '');
}

export const plugin = {
  id: 'sql-query',
  label: 'SQL Query',
  tags: ['sql', 'database', 'query'],
  match(intake, baseType) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const ext = name.includes('.') ? name.split('.').pop() : '';
    if (ext === 'sparql' || ext === 'rq') return false;
    if (ext === 'sql') return true;
    if (baseType?.id !== 'code') return false;
    return looksLikeSql(intake.textSample || intake.text || '');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'SQL query file — schema definitions and database queries, summarized by statements, referenced tables, joins, aliases, CTEs, and query modifiers.',
    usedFor: [
      { label: 'SQL', description: 'Structured Query Language for relational databases', href: 'https://en.wikipedia.org/wiki/SQL' },
    ],
  },
};
export default plugin;
