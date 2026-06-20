export default {
  id: 'crontab',
  label: 'Crontab',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'crontab' || n === 'cron' || n === 'crontabs') return true;
    if (n.startsWith('cron.') || n.endsWith('.cron')) return true;
    // Skip non-crontab file extensions that could have date-like content
    if (/\.(log|md|txt|yaml|yml|json|xml|html|css|js|ts|py|rb|sh|conf|cfg|ini)$/.test(n)) return false;
    // Content: lines with valid cron 5-field schedule (all 5 time fields must look like cron, not date components)
    // A cron time field is: * | */<step> | digit(s) | range | list — but NOT a date like 2026-06-13 or time like 09:14:02
    const cronTimeField = /^(\*(?:\/\d{1,2})?|\d{1,2}(?:[-,]\d{1,2})*(?:\/\d{1,2})?)$/;
    const cronLines = text.split('\n').filter(l => {
      const t = l.trim();
      if (!t || t.startsWith('#')) return false;
      const parts = t.split(/\s+/);
      if (parts.length < 6) return false;
      // All 5 time fields must match the cron time field pattern (max 2-digit numbers)
      return parts.slice(0, 5).every(p => cronTimeField.test(p));
    });
    return cronLines.length >= 2;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Crontab schedule file — defines recurring jobs for the cron daemon to run at scheduled times.',
    usedFor: [{ label: 'cron', description: 'Time-based job scheduler', href: 'https://man7.org/linux/man-pages/man5/crontab.5.html' }],
  },
};
