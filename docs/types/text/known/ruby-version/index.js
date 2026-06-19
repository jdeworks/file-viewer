export default {
  id: 'ruby-version',
  label: '.ruby-version',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === '.ruby-version';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: '.ruby-version — pins the Ruby version for the project, used by rbenv, rvm, asdf, and chruby.',
    usedFor: [
      { label: 'Ruby version pin', description: 'Automatically switch to the correct Ruby version with rbenv/rvm/asdf', href: 'https://github.com/rbenv/rbenv#readme' },
    ],
  },
};
