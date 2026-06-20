export default {
  id: 'scorecard',
  label: 'OpenSSF Scorecard',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.filename || intake.name || '').split('/').pop().toLowerCase();
    return ['scorecard.yml', 'scorecard.yaml', '.scorecard.yml', '.scorecard.yaml'].includes(n);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'OpenSSF Scorecard configuration — automated security health metrics for open source projects.',
    usedFor: [{ label: 'Supply chain security', description: 'OpenSSF Scorecard checks for security best practices', href: 'https://github.com/ossf/scorecard' }],
  },
};
