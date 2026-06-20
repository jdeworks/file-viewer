export default {
  id: 'r-description',
  label: 'R DESCRIPTION',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop();
    return n === 'DESCRIPTION';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'R package DESCRIPTION file — package name, version, authors, dependencies, and license metadata.' },
};
