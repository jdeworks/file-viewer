export default {
  id: 'tool-versions',
  label: '.tool-versions',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === '.tool-versions';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'asdf .tool-versions file — pins tool versions for the project directory.' },
};
