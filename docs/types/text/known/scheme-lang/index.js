export const plugin = {
  id: 'scheme-lang',
  label: 'Scheme',
  tags: ['scheme', 'lisp', 'functional', 'r7rs'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (!name.endsWith('.scm') && !name.endsWith('.ss')) return false;
    const text = (intake.text || '').slice(0, 2000);
    if (!text.includes('(define') && !text.includes('(lambda')) return null;
    return true;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Scheme is a minimalist dialect of Lisp, known for its clean semantics, tail-call optimization, and first-class continuations. R7RS is the current standard.',
    usedFor: [
      { label: 'r7rs.org', description: 'R7RS Scheme standard', href: 'http://r7rs.org/' },
      { label: 'schemers.org', description: 'Scheme community resources', href: 'https://schemers.org/' },
    ],
  },
};
export default plugin;
