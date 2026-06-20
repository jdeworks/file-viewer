export default {
  id: 'nagios-conf',
  label: 'Nagios Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'nagios.cfg' || n === 'nagios-server.cfg';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Nagios monitoring server configuration — defines log paths, check timeouts, notification settings, and external command handling.',
    usedFor: [{ label: 'Nagios', description: 'Open-source IT infrastructure monitoring system.', href: 'https://assets.nagios.com/downloads/nagioscore/docs/nagioscore/4/en/configmain.html' }],
  },
};
