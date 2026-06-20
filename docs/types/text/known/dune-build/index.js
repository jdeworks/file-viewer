export default {
  id: 'dune-build',
  label: 'Dune Build',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'dune-project' || n === 'dune') return true;
    if (text.includes('(lang dune') || (text.includes('(library') && text.includes('(name'))) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Dune build system configuration — defines libraries, executables, and project settings for OCaml projects.',
    usedFor: [{ label: 'Dune', description: 'Fast, portable build system for OCaml', href: 'https://dune.build/' }],
  },
};
