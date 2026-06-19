export default {
  id: 'kube-helm-values',
  label: 'Helm values',
  match: (intake, baseType) => {
    if (baseType.id !== 'yaml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'values.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Helm chart values file — configurable defaults for chart templates.',
    usedFor: [{ label: 'Helm chart configuration', description: 'Default values that can be overridden at deploy time for Helm chart templates.', href: 'https://helm.sh/docs/chart_template_guide/values_files/' }],
  },
};
