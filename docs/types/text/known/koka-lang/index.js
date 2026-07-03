export const plugin = {
  id: 'koka-lang',
  label: 'Koka',
  tags: ['koka', 'functional', 'effects', 'compiled'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name.endsWith('.koka')) return true;
    const txt = intake.textSample || '';
    return /\beffect\b/.test(txt) && /\bfun\b/.test(txt) && /\bhandle\b/.test(txt);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Koka source file — a strongly typed functional language with effect types and handlers.',
    usedFor: [
      { label: 'Koka language', description: 'Official Koka programming language site', href: 'https://koka-lang.github.io/' },
    ],
  },
};
export default plugin;
