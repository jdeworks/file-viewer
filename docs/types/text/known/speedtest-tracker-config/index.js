export default {
  id: 'speedtest-tracker-config',
  label: 'Speedtest Tracker',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'speedtest-tracker.env') return true;
    const text = intake.text || '';
    if (n === '.env' && text.includes('SPEEDTEST_SCHEDULE')) return true;
    if (n === '.env' && text.includes('APP_KEY') && text.includes('SPEEDTEST_SERVER_IDS')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Speedtest Tracker automated internet speed monitoring environment configuration — app, speedtest, database, auth, and notification settings.',
    tags: ['speedtest-tracker', 'speedtest', 'monitoring', 'network', 'self-hosted', 'config'],
  },
};
