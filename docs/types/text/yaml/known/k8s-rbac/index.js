export default {
  id: 'k8s-rbac',
  label: 'Kubernetes RBAC',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const t = intake.text || intake.textSample || '';
    return /kind:\s+(Cluster)?(Role|RoleBinding)/.test(t) && t.includes('rbac.authorization.k8s.io');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Kubernetes RBAC — visualises Roles, ClusterRoles, RoleBindings, and ClusterRoleBindings with color-coded verb chips.',
    usedFor: [{ label: 'Access control', description: 'Define Kubernetes RBAC policies: Roles, ClusterRoles, and their bindings.', href: 'https://kubernetes.io/docs/reference/access-authn-authz/rbac/' }],
  },
};
