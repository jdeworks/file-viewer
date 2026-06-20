export default {
  id: 'authelia-config',
  label: 'Authelia config',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const text = intake.text || '';
    return (
      text.includes('authentication_backend:') &&
      (text.includes('access_control:') || text.includes('identity_providers:'))
    );
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Authelia configuration — authentication backend, access control rules, and OIDC providers.',
    usedFor: [{ label: 'Authelia', description: 'Authelia SSO and 2FA authentication gateway configuration with LDAP/file backend and access control policies.', href: 'https://www.authelia.com/configuration/prologue/introduction/' }],
  },
};
