export default {
  id: 'envrc',
  label: '.envrc',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === '.envrc';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'direnv environment file — exports variables and sets up project environment.' },
};
