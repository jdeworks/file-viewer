export const plugin = {
  id: 'squirrel-lang',
  label: 'Squirrel',
  tags: ['squirrel', 'scripting', 'game', 'source-engine'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name.endsWith('.nut')) return true;
    const text = intake.text || '';
    return (
      text.includes('function ') &&
      (text.includes('local ') || text.includes('::') || text.includes('this.') || text.includes('foreach') || text.includes('class '))
    );
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Squirrel script file — a high-level, imperative, object-oriented scripting language designed for embedding in games and applications.',
    usedFor: [
      { label: 'Squirrel language reference', description: 'Official Squirrel language documentation', href: 'http://squirrel-lang.org/doc/squirrel3.html' },
      { label: 'Squirrel on GitHub', description: 'Squirrel language source and examples', href: 'https://github.com/albertodemichelis/squirrel' },
    ],
  },
};
export default plugin;
