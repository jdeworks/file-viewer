const K8S_API_VERSIONS = /^(v1|apps\/v1|batch\/v1|networking\.k8s\.io\/v1|rbac\.authorization\.k8s\.io\/v1|autoscaling\/v[12]|storage\.k8s\.io\/v1|policy\/v1|apiextensions\.k8s\.io\/v1|cert-manager\.io\/v1)/;
const K8S_KINDS = new Set(['Pod','Deployment','ReplicaSet','StatefulSet','DaemonSet','Job','CronJob','Service','Ingress','ConfigMap','Secret','PersistentVolume','PersistentVolumeClaim','ServiceAccount','Role','ClusterRole','RoleBinding','ClusterRoleBinding','Namespace','NetworkPolicy','HorizontalPodAutoscaler','CustomResourceDefinition']);

export default {
  id: 'k8s-manifest',
  label: 'Kubernetes manifest',
  match: (intake, baseType) => {
    if (baseType.id !== 'yaml' && baseType.id !== 'docker-compose') return false;
    const text = intake.textSample || intake.text || '';
    // Defer to the specialized cert-manager viewer for its resources (it renders issuer/ACME
    // details this generic manifest view can't). matchKnown() is first-match-wins in registry
    // order, and k8s-manifest precedes cert-manager — so bow out explicitly here.
    if (text.includes('cert-manager.io/')) return false;
    // Must have apiVersion: + kind: + metadata: at root level
    if (!/^apiVersion\s*:/m.test(text)) return false;
    if (!/^kind\s*:/m.test(text)) return false;
    if (!/^metadata\s*:/m.test(text)) return false;
    // Verify apiVersion is a known k8s one OR kind is known
    const apiMatch = text.match(/^apiVersion\s*:\s*(.+)/m);
    const kindMatch = text.match(/^kind\s*:\s*(\w+)/m);
    if (!apiMatch && !kindMatch) return false;
    const api = (apiMatch?.[1] || '').trim();
    const kind = (kindMatch?.[1] || '').trim();
    return K8S_API_VERSIONS.test(api) || K8S_KINDS.has(kind);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Kubernetes manifest — shows resource kind, metadata, and spec summary.',
    usedFor: [{ label: 'Container orchestration', description: 'Define Kubernetes resources: Deployments, Services, ConfigMaps, Ingress, etc.', href: 'https://kubernetes.io/docs/concepts/overview/working-with-objects/' }],
  },
};
