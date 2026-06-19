export default {
  id: 'traefik-config',
  label: 'Traefik proxy config',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'traefik.yml' || n === 'traefik.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Traefik reverse proxy configuration — entrypoints, providers, certificate resolvers, and access logs.',
    usedFor: [{ label: 'Traefik proxy', description: 'Configure Traefik HTTP/HTTPS entrypoints, Docker/Kubernetes providers, and ACME TLS.', href: 'https://doc.traefik.io/traefik/reference/static-configuration/file/' }],
  },
};
