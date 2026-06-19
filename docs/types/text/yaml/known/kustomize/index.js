export default {
  id: 'kustomize',
  label: 'Kustomize overlay',
  match: (intake, baseType) => {
    if (baseType.id !== 'yaml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'kustomization.yaml' || name === 'kustomization.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Kustomize overlay configuration — resources, patches, and generators.',
    usedFor: [{ label: 'Kubernetes configuration management', description: 'Customize Kubernetes manifests without templates using overlays and patches.', href: 'https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/' }],
  },
};
