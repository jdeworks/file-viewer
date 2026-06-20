export default {
  id: 'chrony-conf',
  label: 'Chrony Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'chrony.conf' || n === 'chronyc.conf') return true;
    if (text.includes('server ') && text.includes('iburst') && text.includes('makestep')) return true;
    if (text.includes('pool ') && text.includes('iburst') && (text.includes('driftfile') || text.includes('rtcsync'))) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Chrony NTP configuration — configures time servers, drift correction, and hardware clock synchronization.',
    usedFor: [{ label: 'chrony', description: 'Versatile NTP client and server', href: 'https://chrony-project.org/doc/4.3/chrony.conf.html' }],
  },
};
