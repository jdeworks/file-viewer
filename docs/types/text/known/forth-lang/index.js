export const plugin = {
  id: 'forth-lang',
  label: 'Forth',
  tags: ['forth', 'fth', '4th', 'stack', 'concatenative'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    if (name.endsWith('.forth') || name.endsWith('.fth') || name.endsWith('.4th')) return true;
    // Factor language uses .factor extension and also has : words and CONSTANT — don't poach it
    if (name.endsWith('.factor')) return false;
    const text = intake.text || '';
    const hits = [/^: [A-Z_a-z]/m.test(text), /\bVARIABLE\b/.test(text), /\bCONSTANT\b/.test(text), /\bDO\b.*\bLOOP\b/s.test(text), /\bIF\b/.test(text) && /\bTHEN\b/.test(text), /\bBEGIN\b.*\bUNTIL\b/s.test(text)].filter(Boolean).length;
    return hits >= 2;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Forth is a stack-based, concatenative programming language with a minimal syntax. Words (functions) are defined with `: NAME ... ;` and the language uses Reverse Polish Notation.',
    usedFor: [
      { label: 'Forth Standard', description: 'Official Forth programming language standard', href: 'https://forth-standard.org/' },
      { label: 'Gforth Manual', description: 'GNU Forth implementation documentation', href: 'https://gforth.org/manual/' },
    ],
  },
};
export default plugin;
