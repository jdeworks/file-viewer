export const plugin = {
  id: 'actrc',
  label: 'act config',
  tags: ['github-actions', 'ci', 'local', 'act'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === '.actrc';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'act local GitHub Actions runner config — platform image mappings, secrets/env files, bind options, and CLI flags.',
    usedFor: [{ label: 'Dev Tools', description: 'Run GitHub Actions locally with act', href: 'https://github.com/nektos/act#configuration' }],
  },
};
export default plugin;
