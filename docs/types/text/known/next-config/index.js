export default {
  id: 'next-config',
  label: 'Next.js Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return /^next\.config\.(js|ts|mjs)$/.test(n);
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Next.js framework configuration — defines routing, image handling, redirects, internationalization, and build options.' },
};
