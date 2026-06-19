export default {
  id: 'fly-toml',
  label: 'Fly.io config',
  match: (intake, baseType) => {
    if (baseType.id !== 'toml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'fly.toml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Fly.io application configuration — defines your app name, region, build, services, and scaling.',
    usedFor: [{ label: 'Fly.io deployment', description: 'Deploy apps globally with Fly.io', href: 'https://fly.io/docs/reference/configuration/' }],
  },
};
