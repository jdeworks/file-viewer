export default {
  id: 'grub-conf',
  label: 'GRUB Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'grub' || n === 'grub.cfg' || n === 'grub2.cfg' || n === '40_custom' || n === '10_linux') return true;
    if (text.includes('GRUB_DEFAULT=') || text.includes('GRUB_TIMEOUT=') || text.includes('GRUB_CMDLINE_LINUX')) return true;
    if (text.includes('menuentry ') && (text.includes('linux ') || text.includes('linuxefi '))) return true;
    if (text.includes('set default=') && text.includes('set timeout=') && text.includes('menuentry')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'GRUB bootloader configuration — controls boot menu entries, kernel parameters, timeout, and EFI/BIOS boot settings.',
    usedFor: [{ label: 'GRUB2', description: 'GNU GRand Unified Bootloader v2 — standard bootloader for most Linux systems', href: 'https://www.gnu.org/software/grub/manual/grub/grub.html' }],
  },
};
