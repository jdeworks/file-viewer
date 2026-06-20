export default {
  id: 'trufflehog-config',
  label: 'TruffleHog config',
  tags: ['trufflehog', 'security', 'secrets', 'scanning', 'yaml'],
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === '.trufflehog.yaml' || n === '.trufflehog.yml' || n === 'trufflehog.yaml' || n === 'trufflehog.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'TruffleHog secrets scanning configuration — detectors, include/exclude paths, and scan settings.',
    usedFor: [{ label: 'TruffleHog', description: 'Find and verify credentials across git history and filesystems', href: 'https://github.com/trufflesecurity/trufflehog#configuration' }],
  },
};
