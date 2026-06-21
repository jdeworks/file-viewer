export const plugin = {
  id: 'coffeescript-lang',
  label: 'CoffeeScript',
  tags: ['coffeescript', 'coffee', 'javascript', 'literate'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    if (name.endsWith('.coffee') || name.endsWith('.litcoffee') || name.endsWith('.coffee.md')) return true;
    // The content heuristic below keys off `->`/`=>`/`class`/`require`, which appear in many other
    // languages (e.g. PHP's `$obj->method()` — would false-match rector.php). Only apply it to
    // files WITHOUT a recognized non-CoffeeScript source extension.
    if (/\.(php|rb|py|rs|go|ts|tsx|jsx|mjs|cjs|java|cs|cpp|cc|hpp|swift|kt|scala|pl|lua|r|sql|sh|ps1)$/i.test(name)) return false;
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
