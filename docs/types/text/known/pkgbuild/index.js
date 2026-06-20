export const plugin = {
  id: 'pkgbuild',
  label: 'PKGBUILD',
  tags: ['arch', 'linux', 'package', 'pkgbuild', 'makepkg'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop();
    return name === 'PKGBUILD' || name === '.SRCINFO';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Arch Linux PKGBUILD — a shell script read by makepkg to build a package for the Arch Linux package manager (pacman).',
    usedFor: [
      { label: 'PKGBUILD reference', description: 'Official Arch Linux PKGBUILD documentation', href: 'https://wiki.archlinux.org/title/PKGBUILD' },
      { label: 'AUR submission guidelines', description: 'Arch User Repository submission guidelines', href: 'https://wiki.archlinux.org/title/AUR_submission_guidelines' },
    ],
  },
};
export default plugin;
