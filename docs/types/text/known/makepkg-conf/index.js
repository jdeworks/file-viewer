export default {
  id: 'makepkg-conf',
  label: 'makepkg Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'makepkg.conf') return true;
    const text = intake.textSample || intake.text || '';
    if (text.includes('CFLAGS=') && text.includes('MAKEFLAGS=') && text.includes('BUILDENV=')) return true;
    if (text.includes('PKGEXT=') && text.includes('SRCEXT=') && text.includes('CARCH=')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Arch Linux makepkg build system configuration — compiler flags, build environment, and package options.',
    tags: ['makepkg', 'arch', 'linux', 'build', 'config'],
  },
};
