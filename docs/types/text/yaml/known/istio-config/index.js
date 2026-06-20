export default {
  id: 'istio-config',
  label: 'Istio Config',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const t = intake.text || intake.textSample || '';
    return t.includes('networking.istio.io') || t.includes('security.istio.io') || (t.includes('VirtualService') && t.includes('istio'));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Istio service mesh configuration — VirtualService, DestinationRule, Gateway, PeerAuthentication and other Istio networking/security resources.',
    usedFor: [{ label: 'Istio service mesh', description: 'Define traffic management, security policies, and observability for microservices.', href: 'https://istio.io/latest/docs/reference/config/' }],
  },
};
