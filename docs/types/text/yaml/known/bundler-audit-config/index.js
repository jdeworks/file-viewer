export default {
  id: 'bundler-audit-config',
  label: 'Bundler Audit config',
  match: (intake, baseType) => {
    if (baseType?.id !== 'yaml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === '.bundler-audit.yml' || name === '.bundler-audit.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: '.bundler-audit.yml — bundler-audit configuration: ignored CVEs and update sources.',
    usedFor: [
      { label: 'Security', description: 'Scan Gemfile.lock for known vulnerabilities', href: 'https://github.com/rubysec/bundler-audit' },
    ],
  },
};
