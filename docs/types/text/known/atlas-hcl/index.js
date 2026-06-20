export default {
  id: 'atlas-hcl',
  label: 'Atlas Config',
  match(intake) {
    const name = (intake.filename || intake.name || '').split('/').pop().toLowerCase();
    return name === 'atlas.hcl' || name === 'atlas.sum';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Atlas schema migration tool configuration — defines environment blocks with database URLs, schema sources, migration directories, and variable declarations. Also handles atlas.sum integrity files.',
    usedFor: [{ label: 'Atlas', description: 'Database schema-as-code migration tool', href: 'https://atlasgo.io/atlas-schema/projects' }],
  },
};
