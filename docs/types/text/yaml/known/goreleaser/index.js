export default {
  id: 'goreleaser',
  label: 'GoReleaser',
  match: (intake, baseType) => {
    if (!['yaml', 'docker-compose', 'github-actions'].includes(baseType?.id)) return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return ['.goreleaser.yaml', '.goreleaser.yml', 'goreleaser.yaml', 'goreleaser.yml'].includes(name);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'GoReleaser configuration — automates building, packaging, and publishing Go releases to GitHub, GitLab, and more.',
    usedFor: [{ label: 'Release automation', description: 'Build and publish Go binaries with a single command', href: 'https://goreleaser.com' }],
  },
};
