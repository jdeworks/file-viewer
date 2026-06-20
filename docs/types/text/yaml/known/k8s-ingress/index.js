export default {
  id: 'k8s-ingress',
  label: 'Kubernetes Ingress',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const t = intake.text || intake.textSample || '';
    return /kind:\s+Ingress\b/.test(t) && (t.includes('networking.k8s.io') || t.includes('extensions/v1beta1'));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Kubernetes Ingress — shows ingress class, TLS hosts, host→path→service routing table, and annotations.',
    usedFor: [{ label: 'HTTP routing', description: 'Expose HTTP/HTTPS routes from outside the cluster to services within the cluster.', href: 'https://kubernetes.io/docs/concepts/services-networking/ingress/' }],
  },
};
