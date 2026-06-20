export default {
  id: 'dovecot-conf',
  label: 'Dovecot Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'dovecot.conf' || n === '10-auth.conf' || n === '10-mail.conf' || n === '10-ssl.conf' || n === '10-master.conf') return true;
    if (text.includes('mail_location') && (text.includes('imap') || text.includes('pop3') || text.includes('auth_mechanisms'))) return true;
    if (text.includes('protocols') && (text.includes('imap') || text.includes('pop3')) && text.includes('ssl')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Dovecot IMAP/POP3 server configuration — controls email retrieval protocols, authentication, TLS, and mailbox storage.',
    usedFor: [{ label: 'Dovecot', description: 'Secure and highly configurable IMAP and POP3 server', href: 'https://www.dovecot.org/' }],
  },
};
