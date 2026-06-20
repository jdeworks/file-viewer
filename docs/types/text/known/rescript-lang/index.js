export const plugin = {
  id: 'rescript-lang',
  label: 'ReScript',
  tags: ['rescript', 'res', 'resi', 'ocaml', 'react'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    if (name.endsWith('.resi')) return true;
    if (name.endsWith('.res')) {
      const sample = (intake.text || '').slice(0, 1000);
      return /\blet\s+/.test(sample) || /\btype\s+/.test(sample) || /\bopen\s+/.test(sample);
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'ReScript is a robustly typed language that compiles to efficient and human-readable JavaScript. It has first-class JSX support and is popular for React applications.',
    usedFor: [
      { label: 'ReScript', description: 'Official ReScript language site', href: 'https://rescript-lang.org/' },
      { label: 'ReScript React', description: 'React bindings for ReScript', href: 'https://rescript-lang.org/docs/react/latest/introduction' },
    ],
  },
};
export default plugin;
