export default {
  id: 'gemspec',
  label: 'Gemspec',
  match: (intake) => (intake.filename || '').endsWith('.gemspec'),
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Ruby gem specification — defines name, version, authors, dependencies, and metadata for a RubyGems package.',
    usedFor: [{ label: 'RubyGems', description: 'Package specification for distributing Ruby libraries', href: 'https://guides.rubygems.org/specification-reference/' }],
  },
};
