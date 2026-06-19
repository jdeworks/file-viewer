// pnpm-lock.yaml enhancement: show lockfileVersion, total importers, total packages count.
export default {
  id: 'pnpm-lock',
  label: 'pnpm-lock.yaml',
  match: (intake, baseType) => {
    if (baseType.id !== 'yaml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'pnpm-lock.yaml' || name === 'pnpm-lock.yml';
  },
  loadRenderer: () => import('./renderer.js'),
};
