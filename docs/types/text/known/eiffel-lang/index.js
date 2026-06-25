export const plugin = {
  id: 'eiffel-lang',
  label: 'Eiffel',
  tags: ['eiffel', 'oop', 'design-by-contract', 'compiled', 'language'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name.endsWith('.e')) return true;
    // Eiffel keywords like "feature", "create", "class", "ensure", and "do" are common in
    // documentation prose. Only content-match unlabeled/bare files, not Markdown or other known
    // foreign extensions.
    const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : '';
    if (ext && ext !== 'e') return false;
    const text = intake.text || '';
    const hits = [
      /^\s*(deferred\s+)?class\s+[A-Z][A-Z0-9_]*\b/im.test(text),
      /^\s*feature(?:\s|$)/im.test(text),
      /^\s*create\s+[A-Za-z_][\w, ]*$/im.test(text),
      /^\s*inherit\s+[A-Z][A-Z0-9_]*\b/im.test(text),
      /^\s*(require|ensure)\b/im.test(text),
      /^\s*do\s*$/im.test(text),
      /^\s*end\s*(?:--.*)?$/im.test(text),
    ].filter(Boolean).length;
    return hits >= 4;
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
