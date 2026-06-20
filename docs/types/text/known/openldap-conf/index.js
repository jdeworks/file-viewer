export const plugin = {
  id: 'openldap-conf',
  label: 'OpenLDAP Config',
  tags: ['openldap', 'ldap', 'slapd', 'directory', 'config'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name === 'slapd.conf' || name === 'ldap.conf') return true;
    const text = intake.text || '';
    // slapd.conf: server config
    if (/^database /m.test(text) && /^suffix /m.test(text) && /^rootdn /m.test(text)) return true;
    // ldap.conf: client config
    if (/^BASE /m.test(text) && /^URI ldap/m.test(text)) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'OpenLDAP configuration — either a slapd.conf server config (database, schema, overlays) or an ldap.conf client config (URI, BASE, TLS).',
    usedFor: [
      { label: 'OpenLDAP documentation', description: 'OpenLDAP Administrator\'s Guide', href: 'https://www.openldap.org/doc/admin26/' },
    ],
  },
};
export default plugin;
