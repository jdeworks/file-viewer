export default {
  id: 'postfix-main',
  label: 'Postfix Main',
  tags: ['postfix', 'mail', 'smtp', 'config'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = (intake.textSample || intake.text || '').slice(0, 1000);
    if (n === 'main.cf' || n === 'master.cf') return true;
    if (n.startsWith('postfix-') && n.endsWith('.cf')) return true;
    // Generic .cf: content guard
    if (n.endsWith('.cf') && /smtpd_|smtp_|postfix/i.test(text)) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Postfix mail server configuration — main.cf defines hostname, TLS settings, relay configuration, and restriction lists; master.cf defines service processes.',
    usedFor: [{ label: 'Postfix', description: 'Free open-source mail transfer agent (MTA)', href: 'https://www.postfix.org/postconf.5.html' }],
  },
};
