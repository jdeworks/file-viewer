export default {
  id: 'mkinitcpio-conf',
  label: 'mkinitcpio.conf',
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name === 'mkinitcpio.conf') return true;
    const text = intake.text || '';
    // Must have at least 2 of the characteristic bash-array assignments
    const keys = ['MODULES=', 'BINARIES=', 'FILES=', 'HOOKS='];
    const hits = keys.filter((k) => text.includes(k)).length;
    return hits >= 2;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'mkinitcpio configuration — Arch Linux initramfs generation tool settings controlling kernel modules, hooks, and compression.',
    usedFor: [
      { label: 'mkinitcpio(8)', description: 'Arch Wiki: mkinitcpio', href: 'https://wiki.archlinux.org/title/Mkinitcpio' },
    ],
  },
};
