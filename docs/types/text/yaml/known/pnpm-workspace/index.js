export default {
  id: 'pnpm-workspace',
  label: 'pnpm workspace',
  match: (intake, baseType) => {
    if (baseType.id !== 'yaml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'pnpm-workspace.yaml' || name === 'pnpm-workspace.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'pnpm monorepo workspace configuration' },
};
