export default {
  id: 'flux-helm-release',
  label: 'Flux CD resource',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const t = intake.text || intake.textSample || '';
    return t.includes('fluxcd.io') || t.includes('flux-system');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Flux CD resource — shows HelmRelease, HelmRepository, or Kustomization manifest details.',
    usedFor: [{ label: 'GitOps with Flux', description: 'Define Flux HelmRelease, HelmRepository, or Kustomization resources for automated Kubernetes delivery.', href: 'https://fluxcd.io/flux/concepts/' }],
  },
};
