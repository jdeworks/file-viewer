export default {
  id: 'postfix-conf',
  label: 'Postfix Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    // main.cf / master.cf / postfix-*.cf are all handled (more completely — it also parses
    // master.cf's tabular service format and redacts password keys) by the postfix-main
    // plugin, which is registered first and always wins those filenames; only claim the
    // `postfix.conf` name here, which postfix-main's `.cf`-only rules don't cover.
    if (n === 'postfix.conf') return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Postfix mail server configuration — defines hostname, network settings, TLS, and SASL authentication.',
    usedFor: [{ label: 'Postfix', description: 'Free open-source mail transfer agent', href: 'https://www.postfix.org/postconf.5.html' }],
  },
};
