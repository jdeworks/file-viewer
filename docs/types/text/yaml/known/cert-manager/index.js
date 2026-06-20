export default {
  id: 'cert-manager',
  label: 'cert-manager',
  match(intake, baseType) {
    if (!baseType || baseType.id !== 'yaml') return false;
    const text = intake.textSample || intake.text || '';
    if (text.includes('cert-manager.io/') ||
        (text.includes('kind: Certificate') && text.includes('secretName')) ||
        (text.includes('kind: ClusterIssuer') && text.includes('letsencrypt')) ||
        text.includes('kind: Issuer')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'cert-manager Certificate resource — defines TLS certificates to be issued and renewed automatically.',
    usedFor: [{ label: 'cert-manager', description: 'Kubernetes native certificate management', href: 'https://cert-manager.io/docs/concepts/' }],
  },
};
