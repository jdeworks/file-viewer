export const plugin = {
  id: 'textile-markup',
  label: 'Textile',
  tags: ['textile', 'markup', 'wiki', 'redmine', 'documentation'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return name.endsWith('.textile');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Textile is a lightweight markup language used in Redmine, older blogging platforms, and wiki systems. .textile files contain structured text with headings, links, images, and tables.',
    usedFor: [
      { label: 'Textile Reference', description: 'Original Textile specification by Dean Allen', href: 'https://textile-lang.com/' },
      { label: 'Redmine', description: 'Project management tool that uses Textile for formatting', href: 'https://www.redmine.org/projects/redmine/wiki/RedmineTextFormattingTextile' },
    ],
  },
};
export default plugin;
