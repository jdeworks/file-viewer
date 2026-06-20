export default {
  id: 'wsl-conf',
  label: 'WSL Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'wsl.conf') return true;
    const text = intake.textSample || intake.text || '';
    if (text.includes('[automount]') && text.includes('enabled') && text.includes('[network]')) return true;
    if (text.includes('[boot]') && (text.includes('systemd') || text.includes('command')) && text.includes('[wsl2]')) return true;
    if (text.includes('[automount]') && text.includes('root = /mnt')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'WSL2 (Windows Subsystem for Linux) per-distribution configuration — automount, network, boot, and interop settings.',
    tags: ['wsl', 'wsl2', 'windows', 'linux', 'config'],
  },
};
