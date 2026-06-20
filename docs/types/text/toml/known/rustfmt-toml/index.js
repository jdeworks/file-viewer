export default {
  id: 'rustfmt-toml',
  label: 'rustfmt config',
  match: (intake, baseType) => {
    if (baseType.id !== 'toml') return false;
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return name === 'rustfmt.toml' || name === '.rustfmt.toml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'rustfmt Rust code formatter configuration — line width, indentation, import ordering, and style options.',
    usedFor: [{ label: 'Rust formatting', description: 'Official Rust code formatter for consistent style enforcement.', href: 'https://rust-lang.github.io/rustfmt/' }],
  },
};
