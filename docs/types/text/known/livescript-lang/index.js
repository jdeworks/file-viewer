function hasLiveScriptContent(text) {
  if (!text) return false;
  const sample = text.slice(0, 2000);
  return /->/.test(sample) || /<-/.test(sample) || /\bfunction\s+\w+/.test(sample) || /\bclass\s+\w+/.test(sample);
}

export const plugin = {
  id: 'livescript-lang',
  label: 'LiveScript',
  tags: ['livescript', 'ls', 'javascript', 'functional'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    if (name.endsWith('.ls')) {
      return hasLiveScriptContent(intake.text);
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'LiveScript is a language which compiles to JavaScript. It has a straightforward mapping to JavaScript and allows you to write expressive code with less typing. It is inspired by Haskell and CoffeeScript.',
    usedFor: [
      { label: 'LiveScript', description: 'Official LiveScript language site', href: 'https://livescript.net/' },
      { label: 'prelude.ls', description: 'Functional utility library for LiveScript', href: 'https://www.preludels.com/' },
    ],
  },
};
export default plugin;
