export default {
  id: 'keycloak-realm',
  label: 'Keycloak Realm',
  match(intake, baseType) {
    if (baseType?.id !== 'json') return false;
    try {
      const cfg = JSON.parse(intake.text || '{}');
      return (
        typeof cfg.realm === 'string' &&
        Array.isArray(cfg.clients) &&
        cfg.roles != null && typeof cfg.roles === 'object' && !Array.isArray(cfg.roles)
      );
    } catch { return false; }
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Keycloak realm export — realm settings, clients, roles, and identity providers.',
    usedFor: [{ label: 'Keycloak', description: 'Keycloak realm configuration export with clients, roles, and identity provider settings.', href: 'https://www.keycloak.org/docs/latest/server_admin/#exporting-and-importing-a-realm' }],
  },
};
