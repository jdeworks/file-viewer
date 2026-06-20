export default {
  id: 'supervisord-conf',
  label: 'Supervisord Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'supervisord.conf' || n === 'supervisor.conf') return true;
    if (n.endsWith('.conf') && text.includes('[supervisord]')) return true;
    if (n.endsWith('.conf') && text.includes('[program:')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Supervisor process manager configuration — defines programs, groups, and the supervisord daemon settings.',
    usedFor: [{ label: 'Supervisor', description: 'A process control system for Unix', href: 'http://supervisord.org/configuration.html' }],
  },
};
