export default {
  id: 'pacman-conf',
  label: 'pacman Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'pacman.conf') return true;
    const text = intake.textSample || intake.text || '';
    if (text.includes('[options]') && text.includes('HoldPkg') && text.includes('SyncFirst')) return true;
    if (text.includes('[core]') && text.includes('[extra]') && text.includes('Include = ')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Arch Linux pacman package manager configuration — repositories, options, and security settings.',
    tags: ['pacman', 'arch', 'linux', 'package', 'config'],
  },
};
