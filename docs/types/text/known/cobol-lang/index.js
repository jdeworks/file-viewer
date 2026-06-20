export const plugin = {
  id: 'cobol-lang',
  label: 'COBOL',
  tags: ['cobol', 'mainframe', 'business', 'legacy', 'enterprise'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (!name.endsWith('.cob') && !name.endsWith('.cbl') && !name.endsWith('.cpy') && !name.endsWith('.cobol')) return false;
    const text = (intake.text || '').slice(0, 3000);
    if (!/DIVISION/i.test(text)) return null;
    return true;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'COBOL (Common Business-Oriented Language) is a legacy compiled programming language designed for business, finance, and administrative systems. Still widely used in mainframe environments.',
    usedFor: [
      { label: 'GnuCOBOL', description: 'Free COBOL compiler and runtime', href: 'https://gnucobol.sourceforge.io/' },
      { label: 'IBM COBOL', description: 'Enterprise COBOL for IBM Z mainframes', href: 'https://www.ibm.com/products/cobol-compiler-zos' },
    ],
  },
};
export default plugin;
