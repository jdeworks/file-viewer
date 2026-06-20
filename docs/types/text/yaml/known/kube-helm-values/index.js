export default {
  id: 'kube-helm-values',
  label: 'Helm Values',
  tags: ['helm', 'kubernetes', 'yaml'],
  match: (intake, baseType) => {
    if (baseType && baseType.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'values.yaml' && n !== 'values.yml') return false;
    // Heuristic: likely Helm values if it has typical Helm structure markers
    const text = intake.text || '';
    return text.includes('replicaCount') || text.includes('image:') || text.includes('service:') || text.includes('ingress:');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Helm chart values file — configurable defaults for chart templates.',
    usedFor: [{ label: 'Helm chart configuration', description: 'Default values that can be overridden at deploy time for Helm chart templates.', href: 'https://helm.sh/docs/chart_template_guide/values_files/' }],
  },
};
