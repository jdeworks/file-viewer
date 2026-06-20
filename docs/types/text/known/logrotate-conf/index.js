export default {
  id: 'logrotate-conf',
  label: 'Logrotate Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'logrotate.conf') return true;
    // Files in /etc/logrotate.d/ or containing logrotate directives
    if ((n.endsWith('.conf') || !n.includes('.')) &&
        (text.includes('rotate ') || text.includes('compress') || text.includes('postrotate')) &&
        text.includes('{')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Logrotate configuration — controls automatic rotation, compression, and archival of log files.',
    usedFor: [{ label: 'logrotate', description: 'System utility for automatic log file management', href: 'https://linux.die.net/man/8/logrotate' }],
  },
};
