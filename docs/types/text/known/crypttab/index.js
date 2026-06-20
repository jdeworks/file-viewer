export default {
  id: 'crypttab',
  label: 'crypttab',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'crypttab') return true;
    // Has LUKS/crypto references
    if (text.includes('luks') && text.includes('UUID=')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Linux encrypted device table — maps encrypted block devices (LUKS) to their unlock targets.',
    usedFor: [{ label: 'crypttab', description: 'Linux disk encryption configuration', href: 'https://www.freedesktop.org/software/systemd/man/crypttab.html' }],
  },
};
