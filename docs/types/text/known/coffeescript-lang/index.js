export const plugin = {
  id: 'coffeescript-lang',
  label: 'CoffeeScript',
  tags: ['coffeescript', 'coffee', 'javascript', 'literate'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    if (name.endsWith('.coffee') || name.endsWith('.litcoffee') || name.endsWith('.coffee.md')) return true;
    const text = intake.text || '';
    const hits = [
      /->/.test(text),
      /=>/.test(text),
      /\bclass\s+\w+/.test(text),
      /\brequire\s+['"]/.test(text),
    ].filter(Boolean).length;
    return hits >= 2;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'CoffeeScript is a little language that compiles into JavaScript, offering a clean syntax with significant whitespace. .litcoffee and .coffee.md are Literate CoffeeScript files where code is embedded in Markdown.',
    usedFor: [
      { label: 'CoffeeScript', description: 'Official CoffeeScript language site', href: 'https://coffeescript.org/' },
    ],
  },
};
export default plugin;
