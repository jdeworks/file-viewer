export default {
  id: 'openssl-conf',
  label: 'OpenSSL Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'openssl.cnf' || n === 'openssl.conf' || n === 'openssl-ca.cnf' || n === 'openssl-server.cnf') return true;
    if (text.includes('[ req ]') && text.includes('distinguished_name') && text.includes('[ CA_default ]')) return true;
    if (text.includes('[req]') && text.includes('distinguished_name') && (text.includes('x509_extensions') || text.includes('[v3_ca]'))) return true;
    if (text.includes('[ v3_ca ]') && text.includes('basicConstraints') && text.includes('CA:true')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'OpenSSL configuration — defines certificate request settings, CA policies, and x509v3 extensions for PKI management.',
    usedFor: [{ label: 'OpenSSL', description: 'Cryptography library and toolkit for TLS/SSL', href: 'https://www.openssl.org/docs/manmaster/man5/config.html' }],
  },
};
