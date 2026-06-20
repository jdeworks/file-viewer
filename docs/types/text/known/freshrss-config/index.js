export default {
  id: 'freshrss-config',
  label: 'FreshRSS Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    // Explicit freshrss filename
    if (n === 'freshrss.env') {
      return true;
    }
    // Generic .env — require FreshRSS-specific markers
    if (n === '.env') {
      const text = intake.text || '';
      return (
        text.includes('FRESHRSS_ENV') ||
        (text.includes('DATA_PATH') && text.includes('CRON_MIN') && text.includes('FRESHRSS'))
      );
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'FreshRSS self-hosted RSS feed aggregator environment configuration — app, auth, data, and database settings.',
    usedFor: [
      { label: 'RSS aggregation', description: 'Self-hosted RSS and Atom feed reader/aggregator.', href: 'https://freshrss.org' },
    ],
  },
};
