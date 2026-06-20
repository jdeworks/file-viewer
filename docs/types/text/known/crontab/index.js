export default {
  id: 'crontab',
  label: 'Crontab',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'crontab' || n === 'cron' || n === 'crontabs') return true;
    if (n.startsWith('cron.') || n.endsWith('.cron')) return true;
    // Content: lines with 5-field cron schedule
    const cronLines = text.split('\n').filter(l => {
      const t = l.trim();
      if (!t || t.startsWith('#')) return false;
      const parts = t.split(/\s+/);
      return parts.length >= 6 && /^[\d\*\/,\-]+$/.test(parts[0]);
    });
    return cronLines.length >= 1;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Crontab schedule file — defines recurring jobs for the cron daemon to run at scheduled times.',
    usedFor: [{ label: 'cron', description: 'Time-based job scheduler', href: 'https://man7.org/linux/man-pages/man5/crontab.5.html' }],
  },
};
