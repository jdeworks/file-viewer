export default {
  id: 'fail2ban-conf',
  label: 'Fail2ban Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'jail.conf' || n === 'jail.local' || n === 'fail2ban.conf') return true;
    if (text.includes('[DEFAULT]') && text.includes('bantime') && text.includes('maxretry')) return true;
    if (text.includes('[sshd]') && text.includes('bantime')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Fail2ban jail configuration — defines ban rules, detection filters, and action backends for intrusion prevention.',
    usedFor: [{ label: 'Fail2ban', description: 'Intrusion prevention software for Linux', href: 'https://www.fail2ban.org/wiki/index.php/MANUAL_0_8' }],
  },
};
