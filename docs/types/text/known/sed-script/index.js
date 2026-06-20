export const plugin = {
  id: 'sed-script',
  label: 'sed Script',
  tags: ['sed', 'text-processing', 'script', 'stream-editor'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name.endsWith('.sed')) return true;
    const text = intake.text || '';
    const hits = [
      /\bs\/[^/]/.test(text),
      /^[0-9$,]+d$/m.test(text),
      /^[0-9$,]+p$/m.test(text),
      /\by\/[^/]/.test(text),
      /\b[0-9]+,[0-9]+[dpq]/.test(text),
    ].filter(Boolean).length;
    return hits >= 2;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'sed (stream editor) is a Unix utility for filtering and transforming text. Scripts contain commands like substitution (s///) and deletion (d) applied to each input line.',
    usedFor: [
      { label: 'GNU sed manual', description: 'Official GNU sed documentation', href: 'https://www.gnu.org/software/sed/manual/sed.html' },
      { label: 'sed one-liners', description: 'Common sed idioms and patterns', href: 'https://www.pement.org/sed/sed1line.txt' },
    ],
  },
};
export default plugin;
