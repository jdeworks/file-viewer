// Gemfile enhancement (Ruby/Bundler): renders source, ruby version, core gems, per-group cards,
// and platform-specific blocks. require: false gems get a gray chip.
export default {
  id: 'gemfile',
  label: 'Gemfile',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'gemfile') return true;
    const t = intake.text || '';
    return /source\s+['"]https:\/\/rubygems\.org['"]/.test(t) || /^gem\s+['"]/m.test(t);
  },
  loadRenderer: () => import('./render.js'),
  loadMetadata: () => import('./metadata.js'),
};
