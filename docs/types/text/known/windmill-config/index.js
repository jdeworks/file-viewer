export default {
  id: 'windmill-config',
  label: 'Windmill Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'windmill.env';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Windmill workflow automation platform environment configuration — server, security, database, workers, and runtime paths.',
    tags: ['windmill', 'workflow', 'automation', 'self-hosted', 'config'],
  },
};
