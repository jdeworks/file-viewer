export const plugin = {
  id: 'lighthouserc',
  label: 'Lighthouse CI',
  tags: ['lighthouse', 'performance', 'ci', 'lhci'],
  match(intake, baseType) {
    if (baseType?.id !== 'json') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === '.lighthouserc.json' || n === 'lighthouserc.json' || n === '.lighthouserc.js' || n === 'lighthouserc.js';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Google Lighthouse CI configuration — defines how to collect, assert, and upload Lighthouse audit results in a CI pipeline.',
    usedFor: [
      { label: 'Lighthouse CI', description: 'Automate Lighthouse performance audits in your CI workflow', href: 'https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md' },
    ],
  },
};

export default plugin;
