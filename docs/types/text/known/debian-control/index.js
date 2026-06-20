export const plugin = {
  id: 'debian-control',
  label: 'Debian Control',
  tags: ['debian', 'packaging', 'linux', 'dpkg'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const path = intake.name || intake.filename || '';
    if (name === 'control') {
      // Path-based check for debian/ or DEBIAN/ directories
      if (/\/debian\/|\/DEBIAN\//.test(path) || name === 'control') return true;
    }
    const text = intake.text || '';
    // Must have Package: + Version: + Architecture: + Description: in proximity
    return /^Package:\s/m.test(text) && /^Version:\s/m.test(text) && /^Architecture:\s/m.test(text) && /^Description:\s/m.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Debian package control file — defines package metadata for .deb packages used in Debian-based Linux distributions.',
    usedFor: [
      { label: 'Debian Policy Manual', description: 'Debian Policy Manual covering control file format', href: 'https://www.debian.org/doc/debian-policy/ch-controlfields.html' },
      { label: 'Debian Developer Reference', description: 'Debian Developer Reference', href: 'https://www.debian.org/doc/manuals/developers-reference/' },
    ],
  },
};
export default plugin;
