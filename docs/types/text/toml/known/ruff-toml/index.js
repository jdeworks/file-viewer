export default {
  id: 'ruff-toml',
  label: 'Ruff config',
  match: (intake, baseType) => {
    if (baseType.id !== 'toml') return false;
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return name === 'ruff.toml' || name === '.ruff.toml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Ruff Python linter and formatter configuration — rules, ignores, per-file settings, and format options.',
    usedFor: [{ label: 'Python linting', description: 'Extremely fast Python linter and code formatter written in Rust.', href: 'https://docs.astral.sh/ruff/configuration/' }],
  },
};
