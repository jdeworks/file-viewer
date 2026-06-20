export const plugin = {
  id: 'ansible-lint',
  label: '.ansible-lint',
  tags: ['ansible', 'ansible-lint', 'yaml'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === '.ansible-lint' || n === '.ansible-lint.yml' || n === '.ansible-lint.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
};
export default plugin;
