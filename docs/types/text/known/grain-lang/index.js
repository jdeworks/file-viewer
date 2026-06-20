export const plugin = {
  id: 'grain-lang',
  label: 'Grain',
  tags: ['grain', 'functional', 'webassembly', 'compiled'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name.endsWith('.gr')) return true;
    const txt = intake.textSnippet || '';
    return /\bmodule\b/.test(txt) && /\blet\b/.test(txt) && (/\bimport\b/.test(txt) || /\bexport\b/.test(txt) || /\brecord\b/.test(txt));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Grain source file — a functional language that compiles to WebAssembly.',
    usedFor: [
      { label: 'Grain language', description: 'Official Grain programming language site', href: 'https://grain-lang.org/' },
    ],
  },
};
export default plugin;
