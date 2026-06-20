export default {
  id: 'harbor-config',
  label: 'Harbor Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const nameMatch = n === 'harbor.yml' || n === 'harbor.yaml';
    const cfg = intake.parsed || {};
    const contentMatch = !!cfg.hostname && cfg.harbor_admin_password !== undefined;
    return nameMatch || contentMatch;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Harbor container registry YAML configuration — server, TLS, admin, database, storage, Redis, Trivy, logging, and proxy settings.',
    tags: ['harbor', 'container', 'registry', 'docker', 'self-hosted', 'devops'],
  },
};
