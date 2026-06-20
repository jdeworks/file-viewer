export default {
  id: 'linkerd-config',
  label: 'Linkerd Config',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const t = intake.text || intake.textSample || '';
    return t.includes('linkerd.io') || t.includes('linkerd2');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Linkerd service mesh configuration — Server, ServerAuthorization, MeshTLSAuthentication and other policy resources.',
    usedFor: [{ label: 'Linkerd service mesh', description: 'Define zero-trust authorization policies and mTLS configuration for Linkerd-meshed services.', href: 'https://linkerd.io/2.x/reference/authorization-policy/' }],
  },
};
