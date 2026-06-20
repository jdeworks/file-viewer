export const plugin = {
  id: 'apt-sources',
  label: 'APT Sources',
  tags: ['apt', 'debian', 'ubuntu', 'package-manager', 'linux'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop();
    const path = intake.name || intake.filename || '';
    if (name === 'sources.list') return true;
    if (path.includes('apt/sources')) return true;
    if (name.endsWith('.list')) {
      const sample = intake.textSample || intake.text || '';
      return /^deb(-src)?\s/m.test(sample);
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'APT sources.list file — defines Debian/Ubuntu package repository locations, including enabled and disabled repository entries.',
    usedFor: [
      { label: 'APT documentation', description: 'Official Debian APT documentation', href: 'https://wiki.debian.org/SourcesList' },
      { label: 'Ubuntu repositories', description: 'Ubuntu software repository information', href: 'https://help.ubuntu.com/community/Repositories' },
    ],
  },
};
export default plugin;
