const JOURNAL_KEYS = ['Storage', 'Compress', 'Seal', 'SplitMode', 'RateLimitIntervalSec', 'RateLimitBurst',
  'SystemMaxUse', 'SystemKeepFree', 'SystemMaxFileSize', 'SystemMaxFiles',
  'RuntimeMaxUse', 'RuntimeKeepFree', 'RuntimeMaxFileSize', 'RuntimeMaxFiles',
  'MaxRetentionSec', 'MaxFileSec', 'ForwardToSyslog', 'ForwardToKMsg', 'ForwardToConsole',
  'ForwardToWall', 'TTYPath', 'MaxLevelStore', 'MaxLevelSyslog', 'MaxLevelKMsg',
  'MaxLevelConsole', 'MaxLevelWall', 'LineMax', 'ReadKMsg', 'Audit'];

export default {
  id: 'journald-conf',
  label: 'journald.conf',
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name === 'journald.conf') return true;
    const text = intake.text || '';
    if (!text.includes('[Journal]')) return false;
    const hits = JOURNAL_KEYS.filter((k) => text.includes(k + '=')).length;
    return hits >= 2;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'systemd-journald configuration — controls how the system journal collects, stores, and forwards log entries.',
    usedFor: [
      { label: 'journald.conf(5)', description: 'Manual page for journald configuration', href: 'https://www.freedesktop.org/software/systemd/man/journald.conf.html' },
    ],
  },
};
