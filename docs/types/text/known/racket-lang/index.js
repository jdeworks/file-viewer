export const plugin = {
  id: 'racket-lang',
  label: 'Racket',
  tags: ['racket', 'lisp', 'scheme', 'functional'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (!name.endsWith('.rkt') && !name.endsWith('.rktl') && !name.endsWith('.rktd')) return false;
    const text = (intake.text || '').slice(0, 2000);
    if (!text.includes('#lang') && !text.includes('(require') && !text.includes('(define')) return null;
    return true;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Racket is a general-purpose programming language and platform in the Lisp/Scheme family, known for its macro system, language-oriented programming, and the DrRacket IDE.',
    usedFor: [
      { label: 'racket-lang.org', description: 'Official Racket language home', href: 'https://racket-lang.org/' },
      { label: 'docs.racket-lang.org', description: 'Racket documentation', href: 'https://docs.racket-lang.org/' },
    ],
  },
};
export default plugin;
