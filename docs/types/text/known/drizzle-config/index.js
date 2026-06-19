export default {
  id: 'drizzle-config',
  label: 'Drizzle ORM Config',
  match(intake) {
    const n = (intake.name || '').toLowerCase();
    return n === 'drizzle.config.ts' || n === 'drizzle.config.js';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Drizzle ORM configuration — defines the dialect, schema path, output directory, and database credentials for Drizzle Kit.',
    usedFor: [{ label: 'Drizzle ORM', description: 'Type-safe SQL ORM with schema migrations', href: 'https://orm.drizzle.team/docs/drizzle-config-file' }],
  },
};
