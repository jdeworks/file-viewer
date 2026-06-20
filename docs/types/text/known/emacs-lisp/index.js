export const plugin = {
  id: 'emacs-lisp',
  label: 'Emacs Lisp',
  tags: ['emacs', 'lisp', 'elisp', 'editor'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    // Let emacs-config handle the primary Emacs config files — those get a richer viewer
    if (name === '.emacs' || name === 'init.el' || name === 'early-init.el') return false;
    if (name.endsWith('.el')) return true;
    const text = intake.text || '';
    return (
      text.includes('(defun ') ||
      text.includes('(defvar ') ||
      text.includes('(defcustom ') ||
      text.includes("(require '") ||
      text.includes('(use-package ')
    );
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Emacs Lisp source file — the extension language for the GNU Emacs text editor, used to configure and extend Emacs.',
    usedFor: [
      { label: 'Emacs Lisp Reference', description: 'Official GNU Emacs Lisp reference manual', href: 'https://www.gnu.org/software/emacs/manual/html_node/elisp/' },
      { label: 'MELPA', description: 'Community Emacs Lisp package archive', href: 'https://melpa.org/' },
    ],
  },
};
export default plugin;
