export default {
  id: 'rsyslog-conf',
  label: 'rsyslog Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'rsyslog.conf' || n === 'rsyslog.d' || n.startsWith('rsyslog') && n.endsWith('.conf')) return true;
    if ((text.includes('$ModLoad') || text.includes('module(load=')) && (text.includes('*.info') || text.includes('local') || text.includes('auth'))) return true;
    if (text.includes('$FileOwner') && text.includes('$FileGroup')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'rsyslog logging configuration — defines log sources, filters, transformations, and output destinations.',
    usedFor: [{ label: 'rsyslog', description: 'Rocket-fast System for LOG processing', href: 'https://www.rsyslog.com/' }],
  },
};
