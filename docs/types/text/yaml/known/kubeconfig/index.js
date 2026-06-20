export default {
  id: 'kubeconfig',
  label: 'Kubeconfig',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const rawName = (intake.filename || intake.name || '').split('/').pop().toLowerCase();
    const name = rawName.replace(/\.ya?ml$/, '');
    const text = intake.textSample || intake.text || '';
    const nameMatch = name === 'config' || name === 'kubeconfig' || name === 'kubeconfig.yaml' || name === 'kubeconfig.yml';
    return nameMatch
      && text.includes('apiVersion: v1')
      && text.includes('kind: Config')
      && text.includes('clusters:');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Kubernetes kubeconfig — cluster endpoints, user credentials, and named contexts.',
    usedFor: [{ label: 'kubectl', description: 'Connect to Kubernetes clusters and manage contexts', href: 'https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/' }],
  },
};
