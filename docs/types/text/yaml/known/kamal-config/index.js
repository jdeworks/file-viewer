export const plugin = {
  id: 'kamal-config',
  label: 'Kamal 2 Deploy Config',
  tags: ['kamal', 'deploy', 'docker', 'devops', 'yaml'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'kamal.yml' || n === 'kamal.yaml') return true;
    if (n === 'deploy.yml') {
      const text = intake.textSample || intake.text || '';
      // Avoid false matches with GitHub Actions deploy workflows (which have "jobs:")
      return /service\s*:/m.test(text) && /image\s*:/m.test(text) && !/jobs\s*:/m.test(text);
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Kamal 2 deployment configuration — service, image, servers, env vars (secrets masked), volumes, proxy, and accessories.',
    usedFor: [{ label: 'Kamal 2', description: 'Deploy containerized apps anywhere with zero downtime using Docker and SSH', href: 'https://kamal-deploy.org/' }],
  },
};
export default plugin;
