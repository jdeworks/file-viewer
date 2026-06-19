export default {
  id: 'gitleaks-config',
  label: 'Gitleaks config',
  match(intake, baseType) {
    if (baseType?.id !== 'toml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === '.gitleaks.toml' || n === 'gitleaks.toml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Gitleaks secrets detection configuration — rules for detecting hardcoded secrets, passwords, and API keys in git history.',
    usedFor: [{ label: 'Gitleaks', description: 'Fast, lightweight, configurable secret scanner for git repositories', href: 'https://github.com/gitleaks/gitleaks#configuration' }],
  },
};
