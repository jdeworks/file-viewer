export default {
  id: 'nx',
  label: 'Nx config',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return name === 'nx.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Nx monorepo workspace configuration — defines targets, task runners, affected computation, and plugin settings.',
    usedFor: [{ label: 'Monorepo tooling', description: 'Smart, extensible build framework for monorepos', href: 'https://nx.dev/reference/nx-json' }],
  },
};
