export const plugin = {
  id: 'helmfile',
  label: 'Helmfile',
  tags: ['kubernetes', 'helm', 'deployment'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'helmfile.yaml' || n === 'helmfile.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Helmfile — declarative spec for deploying Helm charts to Kubernetes clusters.',
    usedFor: [{ label: 'Helm deployment management', description: 'Helmfile manages multiple Helm releases across environments', href: 'https://helmfile.readthedocs.io/' }],
  },
};
export default plugin;
