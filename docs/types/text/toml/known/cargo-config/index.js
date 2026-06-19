export default {
  id: 'cargo-config',
  label: 'Cargo config',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    const p = intake.path || '';
    return (name === 'config.toml' && p.includes('/.cargo/')) || name === 'cargo.config.toml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Cargo workspace configuration — build targets, linker settings, registry sources, and network options.',
    usedFor: [{ label: 'Cargo build config', description: 'Per-project or global Cargo configuration for build settings and registry sources.', href: 'https://doc.rust-lang.org/cargo/reference/config.html' }],
  },
};
