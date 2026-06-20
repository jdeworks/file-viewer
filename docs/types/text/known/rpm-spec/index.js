export const plugin = {
  id: 'rpm-spec',
  label: 'RPM Spec',
  tags: ['rpm', 'packaging', 'linux', 'spec'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name.endsWith('.spec')) return true;
    const text = intake.text || '';
    const hasSections = /%description|%build|%install|%files/.test(text);
    const hasHeaders = /^Name:\s/m.test(text) && /^Version:\s/m.test(text) && /^Release:\s/m.test(text);
    return hasSections || hasHeaders;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'RPM package specification file — defines how to build and package software for RPM-based Linux distributions.',
    usedFor: [
      { label: 'RPM Packaging Guide', description: 'Official Fedora RPM packaging guide', href: 'https://rpm-packaging-guide.github.io/' },
      { label: 'RPM Reference Manual', description: 'RPM reference documentation', href: 'https://rpm.org/documentation.html' },
    ],
  },
};
export default plugin;
