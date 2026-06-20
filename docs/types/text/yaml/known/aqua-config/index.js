export default {
  id: 'aqua-config',
  label: 'aqua config',
  match(intake, baseType) {
    if (!baseType || baseType.id !== 'yaml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'aqua.yaml' || name === '.aqua.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'aqua declarative CLI version manager configuration — registries and pinned tool versions.' },
};
