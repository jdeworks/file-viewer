export default {
  id: 'r-profile',
  label: 'R Profile',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === '.rprofile' || n === 'rprofile.site';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'R startup configuration file — options, environment variables, and packages loaded on R startup.' },
};
