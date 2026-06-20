export default {
  id: 'hoppscotch-config',
  label: 'Hoppscotch Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'hoppscotch.env';
  },
  loadRenderer: () => import('./renderer.js'),
};
