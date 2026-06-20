export const plugin = {
  id: 'carbon-lang',
  label: 'Carbon',
  tags: ['carbon', 'systems', 'compiled', 'cpp-successor'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name.endsWith('.carbon')) return true;
    const txt = intake.textSnippet || '';
    return /\bpackage\b/.test(txt) && /\bfn\b/.test(txt) && (/\bclass\b/.test(txt) || /\binterface\b/.test(txt) || /\bimpl\b/.test(txt));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Carbon source file — Google\'s experimental successor to C++ with modern language design.',
    usedFor: [
      { label: 'Carbon language', description: 'Official Carbon programming language repository', href: 'https://github.com/carbon-language/carbon-lang' },
    ],
  },
};
export default plugin;
