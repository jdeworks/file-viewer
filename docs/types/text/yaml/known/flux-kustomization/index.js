export default {
  id: 'flux-kustomization',
  label: 'Flux Kustomization',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const t = intake.text || intake.textSample || '';
    if (!t.includes('kustomize.toolkit.fluxcd.io')) return false;
    // Also check kind to distinguish from other Flux resources
    return t.includes('kind: Kustomization') || t.includes("kind: 'Kustomization'");
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Flux CD Kustomization CRD — shows source ref, path, sync settings, health checks, and dependencies.',
    usedFor: [{ label: 'GitOps with Flux Kustomization', description: 'Define Flux Kustomization resources for automated Kubernetes delivery from a Git repository path.', href: 'https://fluxcd.io/flux/components/kustomize/kustomizations/' }],
  },
};
