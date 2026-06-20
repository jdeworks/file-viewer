export default {
  id: 'skaffold',
  label: 'Skaffold config',
  match: (intake, baseType) => {
    if (!['yaml', 'docker-compose', 'github-actions'].includes(baseType.id)) return false;
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return name === 'skaffold.yaml' || name === 'skaffold.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Google Skaffold config — shows build artifacts, deploy targets, and profiles.',
    usedBy: [{ label: 'Kubernetes dev', description: 'Continuous development for Kubernetes apps', href: 'https://skaffold.dev/docs/' }],
  },
};
