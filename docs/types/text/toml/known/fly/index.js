export const plugin = {
  id: 'fly-toml',
  label: 'Fly.io',
  tags: ['fly', 'deploy', 'paas'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'fly.toml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Fly.io application configuration — defines your app name, region, build, services, and scaling.',
    usedFor: [{ label: 'Fly.io deployment', description: 'Deploy apps globally with Fly.io', href: 'https://fly.io/docs/reference/configuration/' }],
  },
};

export default plugin;
