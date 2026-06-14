// Gemfile enhancement (Ruby/Bundler): list each `gem` with its version constraint, group, and a
// link to its RubyGems page. The source and ruby version are surfaced too.
export default {
  id: 'gemfile',
  label: 'Gemfile',
  match: (intake) => /(^|\/)Gemfile$/i.test(intake.filename || ''),
  loadRenderer: () => import('./render.js'),
};
