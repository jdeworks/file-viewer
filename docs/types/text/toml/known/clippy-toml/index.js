export default {
  id: 'clippy-toml',
  label: 'Clippy config',
  match: (intake, baseType) => {
    if (baseType.id !== 'toml') return false;
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return name === 'clippy.toml' || name === '.clippy.toml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Clippy Rust linter configuration — complexity thresholds, size limits, test allowances, and custom identifiers.',
    usedFor: [{ label: 'Rust linting', description: 'The official Rust linter for catching common mistakes and enforcing best practices.', href: 'https://doc.rust-lang.org/clippy/configuration.html' }],
  },
};
