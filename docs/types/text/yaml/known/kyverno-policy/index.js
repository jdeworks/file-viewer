export default {
  id: 'kyverno-policy',
  label: 'Kyverno Policy',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const text = intake.text || '';
    return text.includes('kyverno.io') && (text.includes('kind: Policy') || text.includes('kind: ClusterPolicy'));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Kyverno policy resources define Kubernetes admission control rules for validating, mutating, and generating resources without writing code.',
    usedFor: [{ label: 'Kyverno Policy', description: 'Define ClusterPolicy or Policy resources to enforce, audit, or mutate Kubernetes resources using pattern-based rules.', href: 'https://kyverno.io/docs/' }],
  },
};
