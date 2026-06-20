export default {
  id: 'nocodb-config',
  label: 'NocoDB Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'nocodb.env';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'NocoDB open-source Airtable alternative environment-variable configuration — server, security, database, Redis, and email settings.',
    tags: ['nocodb', 'airtable', 'database', 'self-hosted', 'config'],
  },
};
