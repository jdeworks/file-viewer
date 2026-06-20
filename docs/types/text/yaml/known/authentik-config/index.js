export default {
  id: 'authentik-config',
  label: 'Authentik blueprint',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const text = intake.text || '';
    if (!text.includes('version:') || !text.includes('entries:')) return false;
    return text.includes('authentik_') || text.includes('model:');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Authentik blueprint — versioned entries defining applications, providers, flows, and stages.',
    usedFor: [{ label: 'Authentik', description: 'Authentik identity provider blueprint for declarative configuration of applications, OAuth2 providers, flows, and policy bindings.', href: 'https://docs.goauthentik.io/docs/advanced/blueprints' }],
  },
};
