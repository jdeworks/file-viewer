export default {
  id: 'rspec-config',
  label: 'RSpec config',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop();
    return name === '.rspec';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: '.rspec — RSpec options file: CLI flags applied to every test run.',
    usedFor: [
      { label: 'Testing', description: 'RSpec behaviour-driven testing for Ruby', href: 'https://rspec.info/documentation/' },
    ],
  },
};
