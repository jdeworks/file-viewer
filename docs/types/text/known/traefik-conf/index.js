export const plugin = {
  id: 'traefik-conf',
  label: 'Traefik Config',
  tags: ['traefik', 'proxy', 'reverse-proxy', 'config'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'traefik.yml' && n !== 'traefik.yaml' && n !== 'traefik.toml') return false;
    // Content guard: must contain entryPoints
    const text = intake.text || intake.textSample || '';
    return /entrypoints?\s*:/i.test(text) || /\[entrypoints?\]/i.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Traefik v2/v3 static configuration — entryPoints, providers, TLS resolvers, dashboard, and logging.',
    usedFor: [{ label: 'Traefik proxy', description: 'Configure Traefik HTTP/HTTPS entrypoints, Docker/Kubernetes providers, and ACME TLS.', href: 'https://doc.traefik.io/traefik/reference/static-configuration/file/' }],
  },
};
export default plugin;
