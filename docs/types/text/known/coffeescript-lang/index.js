const COFFEE_EXTS = new Set(['coffee', 'litcoffee']);

export const plugin = {
  id: 'coffeescript-lang',
  label: 'CoffeeScript',
  tags: ['coffeescript', 'coffee', 'javascript', 'literate'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name.endsWith('.coffee') || name.endsWith('.litcoffee') || name.endsWith('.coffee.md')) return true;
    // The content heuristic below keys off `->`/`=>`/`class`/`require`, which appear in many other
    // languages. Only apply it to files WITHOUT a recognized FOREIGN source/markup extension —
    // i.e. only content-match files with no/unknown extension (a bare extension guard).
    const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : '';
    if (ext && !COFFEE_EXTS.has(ext)) return false;
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
