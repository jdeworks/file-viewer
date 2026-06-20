export default {
  id: 'keycloak-config',
  label: 'Keycloak Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'keycloak.conf' || n === 'keycloak.properties') return true;
    const text = intake.text || '';
    return text.includes('KC_DB') && (text.includes('KC_HOSTNAME') || text.includes('KC_HTTP_PORT'));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Keycloak identity and access management server configuration — database, hostname, admin credentials, features, cache, proxy, and TLS settings.',
    usedFor: [{ label: 'Identity & Access Management', description: 'Keycloak open-source IAM solution', href: 'https://www.keycloak.org/' }],
  },
};
