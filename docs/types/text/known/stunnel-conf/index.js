export default {
  id: 'stunnel-conf',
  label: 'stunnel Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'stunnel.conf' || n === 'stunnel.cfg' || n.endsWith('.stunnel')) return true;
    if (text.includes('[') && text.includes('accept') && text.includes('connect') && (text.includes('cert') || text.includes('key') || text.includes('client'))) {
      if (text.includes('sslVersion') || text.includes('sslversion') || text.includes('ciphers') || text.includes('CAfile') || text.includes('verify')) return true;
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'stunnel SSL/TLS tunnel configuration — wraps plain text connections with SSL/TLS encryption for legacy protocols.',
    usedFor: [{ label: 'stunnel', description: 'Universal TLS/SSL tunneling proxy', href: 'https://www.stunnel.org/static/stunnel.html' }],
  },
};
