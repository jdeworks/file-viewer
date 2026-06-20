export default {
  id: 'lerna',
  label: 'Lerna config',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return name === 'lerna.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Lerna monorepo configuration — manages versioning and publishing of multiple npm packages in a single repository.',
    usedFor: [{ label: 'Monorepo management', description: 'JavaScript/TypeScript monorepo tool for versioning and publishing', href: 'https://lerna.js.org/' }],
  },
};
