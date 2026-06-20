export default {
  id: 'semaphore-config',
  label: 'Semaphore Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'semaphore-config.json') return true;
    const cfg = intake.parsed || {};
    return !!cfg.web_host && !!(cfg.mysql || cfg.postgres || cfg.bolt) && !!cfg.cookie_hash;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Ansible Semaphore CI/CD task runner configuration — web, database, security, email, OIDC, Git, and LDAP settings.',
    tags: ['semaphore', 'ansible', 'ci-cd', 'task-runner', 'self-hosted', 'config'],
  },
};
