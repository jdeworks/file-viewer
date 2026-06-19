export default {
  id: 'justfile',
  label: 'Justfile',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'justfile';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Just command runner file — defines recipes for common project tasks.' },
};
