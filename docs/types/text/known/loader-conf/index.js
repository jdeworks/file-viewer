export default {
  id: 'loader-conf',
  label: 'systemd-boot Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'loader.conf') return true;
    // Boot entries: NAME.conf files with linux/efi/initrd/options lines
    if (n.endsWith('.conf')) {
      const text = intake.textSample || intake.text || '';
      if ((text.includes('linux ') || text.includes('efi ')) && (text.includes('initrd ') || text.includes('options '))) return true;
    }
    const text = intake.textSample || intake.text || '';
    if (text.includes('default ') && text.includes('timeout ') && text.includes('console-mode')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'systemd-boot bootloader configuration — default entry, timeout, and boot options.',
    tags: ['systemd-boot', 'bootloader', 'linux', 'config'],
  },
};
