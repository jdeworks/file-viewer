export default {
  id: 'htaccess',
  label: '.htaccess',
  match: (intake) => (intake.filename || '').split('/').pop() === '.htaccess',
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Apache per-directory configuration file — controls URL rewriting, authentication, redirects, and server options for a directory tree.',
    usedFor: [{ label: 'Apache config', description: 'Per-directory Apache HTTP Server configuration', href: 'https://httpd.apache.org/docs/current/howto/htaccess.html' }],
  },
};
