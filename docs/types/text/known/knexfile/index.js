export default {
  id: 'knexfile',
  label: 'Knex.js Config',
  match(intake) {
    const n = (intake.name || '').toLowerCase();
    return n === 'knexfile.js' || n === 'knexfile.ts' || n === 'knexfile.mjs';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Knex.js database configuration — defines client adapters, connection details, migration directories, and seed paths per environment.',
    usedFor: [{ label: 'Knex.js', description: 'SQL query builder and migration tool for Node.js', href: 'https://knexjs.org/guide/' }],
  },
};
