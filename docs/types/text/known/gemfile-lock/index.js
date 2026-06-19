export default {
  id: 'gemfile-lock',
  label: 'Gemfile.lock (Bundler)',
  match: (intake) => (intake.filename || '').split('/').pop() === 'Gemfile.lock',
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Bundler lockfile — pinned gem versions, platforms, and top-level dependencies.' },
};
