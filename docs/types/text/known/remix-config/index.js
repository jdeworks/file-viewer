export default {
  id: 'remix-config',
  label: 'Remix Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return /^remix\.config\.(js|ts)$/.test(n);
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Remix framework configuration — defines app directory, routes, server build path, and dev server options.' },
};
