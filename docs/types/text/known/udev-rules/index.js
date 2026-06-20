export default {
  id: 'udev-rules',
  label: 'udev Rules',
  tags: ['udev', 'linux', 'device', 'rules', 'kernel'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (!n.endsWith('.rules')) return false;
    const t = intake.text || '';
    return /^SUBSYSTEM\b/m.test(t) || /^KERNEL\b/m.test(t) || /^ACTION\b/m.test(t);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Linux udev rules file — device matching rules for permissions, naming, and automation.',
    usedFor: [{ label: 'udev', description: 'Linux dynamic device management system', href: 'https://man7.org/linux/man-pages/man7/udev.7.html' }],
  },
};
