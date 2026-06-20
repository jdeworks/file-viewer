export const plugin = {
  id: 'conky-conf',
  label: 'Conky config',
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name === 'conky.conf' || name === '.conkyrc' || name === 'conkyrc') return true;
    const sample = intake.textSample || intake.text || '';
    if (/^conky\.config\s*=/m.test(sample) || /^conky\.text\s*=/m.test(sample)) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Conky system monitor configuration — controls the desktop overlay display of CPU, memory, network, and other system statistics.',
    usedFor: [{ label: 'Conky', description: 'Lightweight system monitor for X and Wayland that renders stats on the desktop', href: 'https://github.com/brndnmtthws/conky' }],
  },
};
export default plugin;
