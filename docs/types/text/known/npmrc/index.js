export default {
  id: 'npmrc',
  label: '.npmrc',
  match: (intake) => /(^|\/)\.npmrc$/i.test(intake.filename || ''),
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'npm configuration file — controls registry, authentication, proxy settings, and package installation behaviour.',
    usedFor: [{ label: 'npm / Node.js projects', description: 'Per-project or per-user npm settings', href: 'https://docs.npmjs.com/cli/v9/configuring-npm/npmrc' }],
  },
};
