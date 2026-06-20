export const plugin = {
  id: 'msmtp-conf',
  label: 'msmtp Config',
  tags: ['msmtp', 'smtp', 'email', 'mail-sender', 'config'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name === '.msmtprc' || name === 'msmtprc') return true;
    const text = intake.text || '';
    return (
      /^account /m.test(text) &&
      /^host /m.test(text) &&
      /^port /m.test(text) &&
      /^from /m.test(text)
    );
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'msmtp SMTP client configuration — defines accounts for sending mail, including server, authentication, and TLS settings.',
    usedFor: [
      { label: 'msmtp documentation', description: 'msmtp user guide and configuration reference', href: 'https://marlam.de/msmtp/msmtp.html' },
    ],
  },
};
export default plugin;
