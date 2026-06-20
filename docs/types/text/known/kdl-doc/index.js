export const plugin = {
  id: 'kdl-doc',
  label: 'KDL document',
  tags: ['kdl', 'document', 'config', 'data'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return /\.kdl$/.test(name);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'KDL (Cuddly Document Language) file — a node-based document language with typed arguments and key-value properties, suitable for config files and data serialization.',
    usedFor: [{ label: 'KDL spec', description: 'The KDL document language specification', href: 'https://kdl.dev' }],
  },
};
export default plugin;
