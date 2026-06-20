export const plugin = {
  id: 'wolfram-lang',
  label: 'Wolfram Language',
  tags: ['wolfram', 'mathematica', 'symbolic', 'computation'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.text || '';
    if (name.endsWith('.wl')) return true;
    if (name.endsWith('.m')) {
      // .m conflicts with Objective-C — require Wolfram-specific content
      return (text.includes('(*') && (
        text.includes('Module[') ||
        text.includes('Function[') ||
        text.includes('Plot[') ||
        text.includes('Table[') ||
        text.includes(':=') ||
        text.includes('->')
      ));
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Wolfram Language script — a symbolic computation language used in Mathematica and the Wolfram Engine.',
    usedFor: [
      { label: 'Wolfram Language documentation', description: 'Official Wolfram Language reference and tutorials', href: 'https://reference.wolfram.com/language/' },
      { label: 'Wolfram Engine', description: 'Free Wolfram Engine for developers', href: 'https://www.wolfram.com/engine/' },
    ],
  },
};
export default plugin;
