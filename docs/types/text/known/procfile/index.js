export default {
  id: 'procfile',
  label: 'Procfile',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'procfile';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Heroku/foreman Procfile — defines process types and their startup commands.' },
};
