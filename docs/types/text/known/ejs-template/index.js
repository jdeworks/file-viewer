export const plugin = {
  id: 'ejs-template',
  label: 'EJS',
  tags: ['ejs', 'template', 'html', 'javascript', 'view'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const ext = name.includes('.') ? name.split('.').pop() : '';
    return ext === 'ejs';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'EJS (Embedded JavaScript) template file — generates HTML markup with plain JavaScript, widely used with Node.js and Express.',
    usedFor: [
      { label: 'EJS documentation', description: 'Official EJS template language documentation', href: 'https://ejs.co/' },
    ],
  },
};
export default plugin;
