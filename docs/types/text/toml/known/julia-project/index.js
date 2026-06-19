export default {
  id: 'julia-project',
  label: 'Julia Project',
  match(intake, baseType) {
    if (baseType?.id !== 'toml') return false;
    const n = (intake.filename || '').split('/').pop();
    if (n !== 'Project.toml') return false;
    const t = intake.text || '';
    return /uuid\s*=|authors\s*=|\[compat\]|\[deps\]/.test(t);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Julia package manifest — defines the package name, UUID, version, dependencies, and compatibility bounds.',
    usedFor: [
      { label: 'Julia packages', description: 'Libraries and applications managed by Pkg.jl', href: 'https://pkgdocs.julialang.org/v1/toml-files/' },
    ],
  },
};
