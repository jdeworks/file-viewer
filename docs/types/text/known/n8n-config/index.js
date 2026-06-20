export default {
  id: 'n8n-config',
  label: 'n8n Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'n8n.env';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'n8n workflow automation server environment-variable configuration — server, auth, database, execution, and logging settings.',
    tags: ['n8n', 'workflow', 'automation', 'self-hosted', 'config'],
  },
};
