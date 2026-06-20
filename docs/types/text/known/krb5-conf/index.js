export default {
  id: 'krb5-conf',
  label: 'Kerberos Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'krb5.conf' || n === 'krb5.ini') return true;
    if (text.includes('[libdefaults]') && (text.includes('default_realm') || text.includes('kdc'))) return true;
    if (text.includes('[realms]') && text.includes('kdc') && text.includes('[domain_realm]')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Kerberos client configuration — defines realms, KDC servers, encryption types, and domain-to-realm mappings for Kerberos authentication.',
    usedFor: [{ label: 'MIT Kerberos', description: 'Kerberos V5 network authentication protocol implementation', href: 'https://web.mit.edu/kerberos/krb5-latest/doc/admin/conf_files/krb5_conf.html' }],
  },
};
