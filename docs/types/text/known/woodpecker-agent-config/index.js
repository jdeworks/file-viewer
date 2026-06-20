export default {
  id: 'woodpecker-agent-config',
  label: 'Woodpecker CI Agent Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'woodpecker-agent.env';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Woodpecker CI agent environment configuration — server connection, authentication, capacity, backend, and pipeline settings.',
    tags: ['woodpecker', 'ci', 'agent', 'pipeline', 'self-hosted', 'config'],
  },
};
