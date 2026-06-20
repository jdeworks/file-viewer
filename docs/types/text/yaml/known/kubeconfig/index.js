export default {
  id: 'kubeconfig',
  label: 'Kubeconfig',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const rawName = (intake.filename || intake.name || '').split('/').pop().toLowerCase();
    const name = rawName.replace(/\.ya?ml$/, '');
    const text = intake.textSample || intake.text || '';
    // Filename-only matches (high confidence)
    if (name === 'kubeconfig' || rawName === 'kubeconfig' || rawName.endsWith('.kubeconfig')) return true;
    if (rawName === 'kube.yaml' || rawName === 'kube.yml') return true;
    // `config` filename + content signal
    if ((name === 'config' || rawName === 'config') &&
        text.includes('apiVersion: v1') && text.includes('kind: Config') && text.includes('clusters:')) return true;
    // Parsed-object match
    if (intake.parsed?.clusters !== undefined && intake.parsed?.contexts !== undefined) return true;
    // Content-only match
    if (text.includes('apiVersion: v1') && text.includes('kind: Config') && text.includes('clusters:')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Kubernetes kubeconfig — cluster endpoints, user credentials, and named contexts.',
    usedFor: [{ label: 'kubectl', description: 'Connect to Kubernetes clusters and manage contexts', href: 'https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/' }],
  },
};
