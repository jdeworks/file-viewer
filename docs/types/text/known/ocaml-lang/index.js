export const plugin = {
  id: 'ocaml-lang',
  label: 'OCaml',
  tags: ['ocaml', 'ml', 'mli', 'functional', 'ml-family'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    if (name.endsWith('.ml') || name.endsWith('.mli')) return true;
    const text = intake.text || '';
    const hits = [
      /\blet\s+/.test(text),
      /\bmodule\s+[A-Z]/.test(text),
      /\btype\s+\w/.test(text),
      /\bopen\s+[A-Z]/.test(text),
      /\bstruct\b/.test(text),
      /\bsig\b/.test(text),
      /\bmatch\s+\w/.test(text),
    ].filter(Boolean).length;
    return hits >= 3;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'OCaml is a general-purpose functional programming language with static typing, type inference, and a powerful module system. .ml files are implementations; .mli files are module interfaces/signatures.',
    usedFor: [
      { label: 'OCaml.org', description: 'Official OCaml language home', href: 'https://ocaml.org/' },
      { label: 'OCaml Manual', description: 'The OCaml language reference', href: 'https://v2.ocaml.org/api/' },
    ],
  },
};
export default plugin;
