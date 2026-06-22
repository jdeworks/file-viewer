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
    // A debian control file is TEXT that BEGINS with its fields. A binary .deb is an `ar` archive
    // ("!<arch>\n") whose embedded control member decodes to text further in — without this guard
    // the whole package false-matches here and renders as a control doc instead of the proper .deb
    // package view. Exclude ar archives (and anything flagged binary).
    if (intake.isBinary || text.startsWith('!<arch>')) return false;
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
