export default {
  id: 'netdata-conf',
  label: 'Netdata Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'netdata.conf') return true;
    if (text.includes('[global]') && text.includes('memory mode') && (text.includes('history') || text.includes('update every'))) return true;
    if (text.includes('[health]') && text.includes('[backend]') && text.includes('[plugins]')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Netdata monitoring configuration — controls data collection intervals, retention, health checks, and streaming/export settings.',
    usedFor: [{ label: 'Netdata', description: 'Real-time infrastructure monitoring with thousands of built-in metrics', href: 'https://www.netdata.cloud/' }],
  },
};
