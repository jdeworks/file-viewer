export const plugin = {
  id: 'pug-template',
  label: 'Pug / Jade',
  tags: ['pug', 'jade', 'template', 'html', 'view'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const ext = name.includes('.') ? name.split('.').pop() : '';
    return ext === 'pug' || ext === 'jade';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Pug (formerly Jade) template file — an indentation-based HTML templating engine commonly used with Node.js and Express.',
    usedFor: [
      { label: 'Pug documentation', description: 'Official Pug template engine documentation', href: 'https://pugjs.org/api/getting-started.html' },
    ],
  },
};
export default plugin;
