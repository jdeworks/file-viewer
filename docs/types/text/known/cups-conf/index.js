export const plugin = {
  id: 'cups-conf',
  label: 'CUPS',
  tags: ['cups', 'printing', 'linux', 'config'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name === 'cupsd.conf') return true;
    const text = intake.text || '';
    return /^ServerName\s/m.test(text) && /^Listen\s/m.test(text) && /<Location\s/m.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'CUPS printing service configuration file — controls the Common Unix Printing System daemon.',
    usedFor: [
      { label: 'CUPS Documentation', description: 'Official CUPS documentation and configuration reference', href: 'https://www.cups.org/doc/man-cupsd.conf.html' },
      { label: 'OpenPrinting', description: 'OpenPrinting CUPS project', href: 'https://openprinting.github.io/cups/' },
    ],
  },
};
export default plugin;
