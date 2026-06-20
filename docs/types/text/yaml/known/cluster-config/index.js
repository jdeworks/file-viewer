export default {
  id: 'cluster-config',
  label: 'K8s Cluster Config',
  match(intake, baseType) {
    if (!baseType || baseType.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    // ClusterRole, ClusterRoleBinding, StorageClass, PriorityClass, etc.
    if (n === 'cluster.yaml' || n === 'cluster-config.yaml') return true;
    if (text.includes('kind: StorageClass') && text.includes('apiVersion')) return true;
    if (text.includes('kind: PriorityClass') && text.includes('apiVersion')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Kubernetes cluster-level configuration — StorageClass, PriorityClass, and cluster-wide resource policies.',
    usedFor: [{ label: 'Kubernetes', description: 'Container orchestration cluster config', href: 'https://kubernetes.io/docs/concepts/cluster-administration/' }],
  },
};
