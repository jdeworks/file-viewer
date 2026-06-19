export default {
  id: 'browserslistrc',
  label: '.browserslistrc',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return ['.browserslistrc', 'browserslistrc', 'browserslist'].includes(name);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: '.browserslistrc — defines target browsers for Autoprefixer, Babel, ESLint, and other frontend tools.',
    usedFor: [{ label: 'Browser targets', description: 'Shared config for compatible browser targets across frontend tools', href: 'https://browsersl.ist/' }],
  },
};
