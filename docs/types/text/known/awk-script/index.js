export const plugin = {
  id: 'awk-script',
  label: 'AWK Script',
  tags: ['awk', 'gawk', 'nawk', 'mawk', 'text-processing', 'script'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name.endsWith('.awk') || name === 'awkscript') return true;
    const text = intake.text || '';
    const hits = [
      /^\s*BEGIN\s*\{/m.test(text),
      /^\s*END\s*\{/m.test(text),
      /\{[\s\S]*?print[\s\S]*?\}/m.test(text),
      /\bFS\s*=/.test(text),
      /\/[^/]+\/\s*\{/.test(text),
    ].filter(Boolean).length;
    return hits >= 2;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'AWK is a text-processing language that operates on records and fields. Scripts define pattern-action rules applied line by line to input.',
    usedFor: [
      { label: 'GNU AWK', description: 'Feature-rich AWK implementation', href: 'https://www.gnu.org/software/gawk/manual/gawk.html' },
      { label: 'AWK one-liners', description: 'Common AWK patterns', href: 'https://www.pement.org/awk/awk1line.txt' },
    ],
  },
};
export default plugin;
