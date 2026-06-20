export const plugin = {
  id: 'eiffel-lang',
  label: 'Eiffel',
  tags: ['eiffel', 'oop', 'design-by-contract', 'compiled', 'language'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name.endsWith('.e')) return true;
    const text = intake.text || '';
    const kws = ['class ', 'feature', 'create', 'inherit', 'deferred', 'do', 'ensure', 'require'];
    const matched = kws.filter((k) => text.toLowerCase().includes(k.toLowerCase()));
    return matched.length >= 4;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Eiffel source file — an object-oriented language designed around Design by Contract principles.',
    usedFor: [
      { label: 'Eiffel language reference', description: 'Official Eiffel language documentation', href: 'https://www.eiffel.org/doc/eiffel/Eiffel' },
      { label: 'EiffelStudio', description: 'The main Eiffel development environment', href: 'https://www.eiffel.org/eiffelstudio' },
    ],
  },
};
export default plugin;
