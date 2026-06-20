export const plugin = {
  id: 'htpasswd',
  label: '.htpasswd',
  tags: ['apache', 'auth', 'security', 'credentials'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === '.htpasswd' || n === 'htpasswd';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Apache HTTP authentication file — stores username and hashed password pairs for HTTP Basic and Digest authentication.',
    usedFor: [{ label: 'Apache auth', description: 'HTTP Basic/Digest authentication credential store for Apache', href: 'https://httpd.apache.org/docs/current/programs/htpasswd.html' }],
  },
};
export default plugin;
