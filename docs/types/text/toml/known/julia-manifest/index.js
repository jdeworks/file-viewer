export default {
  id: 'julia-manifest',
  label: 'Julia Manifest',
  match(intake, baseType) {
    if (baseType?.id !== 'toml') return false;
    const n = (intake.filename || '').split('/').pop();
    if (n !== 'Manifest.toml') return false;
    const t = intake.text || '';
    return /\[\[deps\./.test(t) || /julia_version\s*=/.test(t) || (/uuid\s*=/.test(t) && /git-tree-sha1\s*=/.test(t));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Julia package manifest — exact snapshot of the dependency tree with resolved versions and content hashes.',
    usedFor: [
      { label: 'Julia packages', description: 'Libraries and applications managed by Pkg.jl', href: 'https://pkgdocs.julialang.org/v1/toml-files/' },
    ],
  },
};
