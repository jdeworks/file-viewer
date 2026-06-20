export default {
  id: 'postfix-conf',
  label: 'Postfix Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'main.cf' && text.includes('myhostname')) return true;
    if (n === 'master.cf' && text.includes('smtp') && text.includes('pickup')) return true;
    if (n === 'postfix.conf' || n === 'postfix-main.cf') return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Postfix mail server configuration — defines hostname, network settings, TLS, and SASL authentication.',
    usedFor: [{ label: 'Postfix', description: 'Free open-source mail transfer agent', href: 'https://www.postfix.org/postconf.5.html' }],
  },
};
