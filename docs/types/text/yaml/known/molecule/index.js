export const plugin = {
  id: 'molecule',
  label: 'Molecule',
  tags: ['molecule', 'ansible', 'testing'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'molecule.yml' && n !== 'molecule.yaml') return false;
    const text = intake.text || '';
    return text.includes('driver:') || text.includes('platforms:') || text.includes('provisioner:');
  },
  loadRenderer: () => import('./renderer.js'),
};
export default plugin;
