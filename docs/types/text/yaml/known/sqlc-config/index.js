export default {
  id: 'sqlc-config',
  label: 'sqlc',
  match: (intake, baseType) => {
    if (baseType?.id !== 'yaml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'sqlc.yaml' || name === 'sqlc.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'sqlc configuration — generates type-safe Go code from SQL queries and schema definitions.',
    usedFor: [{ label: 'SQL code generation', description: 'Generate type-safe database query code from SQL', href: 'https://sqlc.dev' }],
  },
};
