export const plugin = {
  id: 'org-mode',
  label: 'Org-mode',
  tags: ['org', 'emacs', 'orgmode', 'documentation', 'literate'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase().split('/').pop();
    if (name.endsWith('.org')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Emacs Org-mode is a plain-text system for notes, task management, and literate programming. Files contain hierarchical headings, TODO items, code blocks, tables, and links.',
    usedFor: [{ label: 'Org-mode manual', description: 'The Org-mode manual for Emacs', href: 'https://orgmode.org/manual/' }],
  },
};
export default plugin;
