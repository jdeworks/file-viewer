export default {
  id: 'tlp-conf',
  label: 'TLP Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'tlp.conf') return true;
    const text = intake.textSample || intake.text || '';
    if (text.includes('CPU_SCALING_GOVERNOR_ON_AC') || text.includes('CPU_SCALING_GOVERNOR_ON_BAT')) return true;
    if (text.includes('TLP_ENABLE') && text.includes('CPU_ENERGY_PERF_POLICY')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'TLP Linux Advanced Power Management configuration — CPU, battery, disk, and PCI settings.',
    tags: ['tlp', 'power', 'laptop', 'linux', 'config'],
  },
};
