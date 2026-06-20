export const plugin = {
  id: 'ncurc',
  label: 'npm-check-updates config',
  tags: ['npm', 'dependencies', 'updates'],
  match(intake, baseType) {
    if (baseType?.id !== 'json') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === '.ncurc' || n === '.ncurc.json' || n === '.ncurc.yml' || n === '.ncurc.yaml' || n === '.ncurc.js';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'npm-check-updates (ncu) configuration — controls which packages to upgrade, version targets, and filters.',
    usedFor: [{ label: 'Dependency upgrades', description: 'Configure ncu to target specific version ranges, filter packages, and automate dependency updates.', href: 'https://github.com/raineorshine/npm-check-updates' }],
  },
};
export default plugin;
