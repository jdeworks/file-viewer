export default {
  id: 'cargo-deny',
  label: 'cargo-deny config',
  match: (intake) => {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return name === 'deny.toml' || name === 'cargo-deny.toml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'cargo-deny security and license auditing configuration — license allow/deny lists, banned crates, and advisory settings.',
    usedFor: [{ label: 'Cargo security auditing', description: 'Lint Rust dependencies for licenses, security advisories, and duplicate crates.', href: 'https://embarkstudios.github.io/cargo-deny/checks/index.html' }],
  },
};
