export default {
  id: 'uv',
  label: 'uv config',
  match: (intake, baseType) => {
    if (baseType.id !== 'toml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'uv.toml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'uv Python package manager configuration — Python version, dependencies, and tool settings.',
    usedFor: [{ label: 'Python package management', description: 'Extremely fast Python package and project manager written in Rust.', href: 'https://docs.astral.sh/uv/reference/settings/' }],
  },
};
