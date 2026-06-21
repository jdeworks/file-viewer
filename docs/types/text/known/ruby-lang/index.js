export const plugin = {
  id: 'ruby-lang',
  label: 'Ruby',
  tags: ['ruby', 'scripting', 'oop', 'rb'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const RESERVED = ['gemfile', 'rakefile', 'guardfile', 'berksfile', 'podfile', 'fastfile', 'snapfile', 'matchfile', 'appfile', 'puma.rb'];
    if (RESERVED.includes(name)) return null;
    if (!name.endsWith('.rb')) return false;
    return true;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Ruby is a dynamic, object-oriented scripting language known for its elegant syntax and the Ruby on Rails web framework. .rb files are Ruby source files.',
    usedFor: [
      { label: 'ruby-lang.org', description: 'Official Ruby language home', href: 'https://www.ruby-lang.org/' },
      { label: 'RubyGems', description: 'Ruby gem hosting and package manager', href: 'https://rubygems.org/' },
    ],
  },
};
export default plugin;
