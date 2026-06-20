export default {
  id: 'rust-toolchain',
  label: 'rust-toolchain',
  match: (intake, baseType) => {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    // Matches rust-toolchain.toml (TOML) or rust-toolchain (plain text)
    if (n === 'rust-toolchain.toml') return true;
    if (n === 'rust-toolchain') return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Rust toolchain pinning file — specifies the Rust channel, components, and target triples for rustup.',
    usedFor: [{ label: 'Rust toolchain', description: 'Pin the exact Rust toolchain version, components, and targets used in a project.', href: 'https://rust-lang.github.io/rustup/overrides.html' }],
  },
};
