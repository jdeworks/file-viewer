export default {
  id: 'oauth2-proxy-config',
  label: 'OAuth2 Proxy config',
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name === 'oauth2-proxy.cfg') return true;
    const text = intake.text || '';
    return (text.includes('client_id =') || text.includes('client_id=')) &&
           (text.includes('provider =') || text.includes('provider='));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'OAuth2 Proxy configuration — provider, upstream URLs, cookie settings, and allowed domains.',
    usedFor: [{ label: 'OAuth2 Proxy', description: 'OAuth2 Proxy reverse proxy configuration supporting GitHub, Google, OIDC, and other providers.', href: 'https://oauth2-proxy.github.io/oauth2-proxy/configuration/overview' }],
  },
};
