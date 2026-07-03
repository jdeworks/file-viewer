export const plugin = {
  id: 'factor-lang',
  label: 'Factor',
  tags: ['factor', 'concatenative', 'stack-based', 'functional'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name.endsWith('.factor')) return true;
    const txt = intake.textSample || intake.text || '';
    return /\bUSING:/.test(txt) && /\bIN:/.test(txt);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Factor source file — a concatenative stack-based programming language.',
    usedFor: [
      { label: 'Factor language', description: 'Official Factor programming language site', href: 'https://factorcode.org/' },
    ],
  },
};
export default plugin;
