export default {
  id: 'helm-chart',
  label: 'Helm Chart',
  match: (intake, baseType) => {
    if (baseType.id !== 'yaml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'chart.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Helm chart metadata and dependency manifest.',
    usedFor: [{ label: 'Kubernetes package manager', description: 'Define Helm chart metadata, version, and chart dependencies.', href: 'https://helm.sh/docs/topics/charts/' }],
  },
};
