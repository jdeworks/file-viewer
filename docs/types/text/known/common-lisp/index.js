export const plugin = {
  id: 'common-lisp',
  label: 'Common Lisp',
  tags: ['lisp', 'common-lisp', 'functional', 'interpreted'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name.endsWith('.lisp') || name.endsWith('.cl') || name.endsWith('.lsp')) return true;
    // .el files are Emacs Lisp (handled by emacs-lisp plugin) — don't poach them
    if (name.endsWith('.el')) return false;
    const text = intake.text || '';
    return (
      text.includes('(defun ') ||
      text.includes('(defvar ') ||
      text.includes('(defclass ') ||
      text.includes('(defpackage ') ||
      text.includes('(in-package ')
    );
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Common Lisp source file — a multi-paradigm, general-purpose programming language with powerful macro system and dynamic typing.',
    usedFor: [
      { label: 'Common Lisp HyperSpec', description: 'Official Common Lisp language specification', href: 'http://www.lispworks.com/documentation/HyperSpec/Front/' },
      { label: 'Quicklisp', description: 'Common Lisp package manager', href: 'https://www.quicklisp.org/' },
    ],
  },
};
export default plugin;
