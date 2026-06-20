export const plugin = {
  id: 'meltano-config',
  label: 'Meltano Config',
  tags: ['elt', 'data'],
  match(intake, baseType) {
    if (!baseType || baseType.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'meltano.yml' || n === 'meltano.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Meltano ELT platform configuration — defines the project name, environments, plugin definitions (extractors, loaders, transforms, orchestrators), schedules, and jobs.',
    usedFor: [{ label: 'Meltano', description: 'Open-source ELT platform for data integration and transformation', href: 'https://docs.meltano.com/concepts/project' }],
  },
};
export default plugin;
