export default {
  id: 'mockery-config',
  label: 'mockery',
  match: (intake, baseType) => {
    if (baseType?.id !== 'yaml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === '.mockery.yaml' || name === 'mockery.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'mockery configuration — generates Go mock implementations of interfaces for use in tests.',
    usedFor: [{ label: 'Go mock generation', description: 'Auto-generate mock structs from Go interfaces', href: 'https://vektra.github.io/mockery/latest/' }],
  },
};
