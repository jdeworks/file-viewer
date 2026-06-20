export const plugin = {
  id: 'tool-versions',
  label: '.tool-versions',
  tags: ['asdf', 'version-manager', 'runtime'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === '.tool-versions';
  },
  renderer: () => import('./renderer.js'),
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'asdf .tool-versions file — pins tool versions for the project directory.' },
};
export default plugin;
