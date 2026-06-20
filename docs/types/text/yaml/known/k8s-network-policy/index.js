export default {
  id: 'k8s-network-policy',
  label: 'Kubernetes NetworkPolicy',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const t = intake.text || intake.textSample || '';
    return /kind:\s+NetworkPolicy/.test(t) && t.includes('networking.k8s.io');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Kubernetes NetworkPolicy — shows pod selector, ingress rules, egress rules, and blocked-all indicators.',
    usedFor: [{ label: 'Network segmentation', description: 'Control pod-to-pod and pod-to-external traffic with Kubernetes NetworkPolicies.', href: 'https://kubernetes.io/docs/concepts/services-networking/network-policies/' }],
  },
};
