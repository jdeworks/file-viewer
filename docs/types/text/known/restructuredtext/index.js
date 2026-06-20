const RST_EXTS = new Set(['.rst', '.rest']);

export const plugin = {
  id: 'restructuredtext',
  label: 'reStructuredText',
  tags: ['rst', 'restructuredtext', 'sphinx', 'documentation'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    const dot = name.lastIndexOf('.');
    if (dot !== -1 && RST_EXTS.has(name.slice(dot))) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'reStructuredText (RST) is a lightweight markup language used extensively in Python documentation and Sphinx projects. It supports sections, directives, roles, code blocks, and cross-references.',
    usedFor: [{ label: 'RST specification', description: 'Docutils reStructuredText specification', href: 'https://docutils.sourceforge.io/rst.html' }],
  },
};
export default plugin;
