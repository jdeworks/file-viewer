export default {
  id: 'pyproject-toml',
  label: 'pyproject.toml',
  match: (intake, baseType) => baseType.id === 'toml' && /(^|\/)pyproject\.toml$/i.test(intake.filename || ''),
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Python project configuration (PEP 517/518/621) — build system, dependencies, and tool settings in a single TOML file.',
    usedFor: [{ label: 'Python projects', description: 'Used by pip, poetry, hatch, PDM, and other Python packaging tools', href: 'https://peps.python.org/pep-0621/' }],
  },
};
