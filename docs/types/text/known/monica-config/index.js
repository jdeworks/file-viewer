export default {
  id: 'monica-config',
  label: 'Monica CRM Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'monica.env';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Monica Personal CRM environment-variable configuration — application, database, email, limits, and features.',
    tags: ['monica', 'crm', 'personal', 'self-hosted', 'config'],
  },
};
