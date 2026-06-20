export const plugin = {
  id: 'm4-macro',
  label: 'M4 Macro',
  tags: ['m4', 'autoconf', 'macro', 'build', 'text-processing'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name.endsWith('.m4') || name === 'configure.ac' || name === 'configure.in') return true;
    const text = intake.text || '';
    const hits = [
      /\bAC_INIT\s*\(/.test(text),
      /\bAC_PREREQ\s*\(/.test(text),
      /\bdefine\s*\(/.test(text),
      /\bdnl\b/.test(text),
      /\bm4_define\s*\(/.test(text),
      /\bAM_INIT_AUTOMAKE\s*\(/.test(text),
    ].filter(Boolean).length;
    return hits >= 2;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'M4 is a general-purpose macro processor. It is the foundation of GNU Autoconf and is used to generate configure scripts and other build files from .m4 templates.',
    usedFor: [
      { label: 'GNU M4', description: 'GNU M4 macro processor documentation', href: 'https://www.gnu.org/software/m4/manual/m4.html' },
      { label: 'GNU Autoconf', description: 'Autoconf — uses M4 macros for configure scripts', href: 'https://www.gnu.org/software/autoconf/manual/autoconf.html' },
    ],
  },
};
export default plugin;
