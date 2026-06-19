export default {
  id: 'dependabot',
  label: 'Dependabot config',
  match: (intake, baseType) => {
    if (!['yaml', 'docker-compose', 'github-actions'].includes(baseType.id)) return false;
    const path = (intake.filename || '').toLowerCase();
    const name = path.split('/').pop();
    return path.endsWith('.github/dependabot.yml') || path.endsWith('.github/dependabot.yaml') ||
      name === 'dependabot.yml' || name === 'dependabot.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'GitHub Dependabot configuration — automates dependency updates by opening PRs for new package versions.',
    usedFor: [{ label: 'Dependency automation', description: 'GitHub native dependency update bot', href: 'https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file' }],
  },
};
