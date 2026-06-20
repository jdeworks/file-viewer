export const plugin = {
  id: 'julia-lang',
  label: 'Julia',
  tags: ['julia', 'jl', 'scientific', 'numerical'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (!name.endsWith('.jl')) return false;
    const text = intake.text || '';
    // Guard: if content looks like Julia Project.toml or Manifest.toml, skip
    const firstLine = text.trimStart().slice(0, 200);
    if (/^name\s*=/.test(firstLine) || /^\[deps\]/.test(firstLine) || /^\[compat\]/.test(firstLine)) return false;
    // Content boost
    const hits = [
      /^function\s+/m.test(text),
      /^module\s+/m.test(text),
      /^import\s+/m.test(text),
      /^using\s+/m.test(text),
      /^struct\s+/m.test(text),
    ].filter(Boolean).length;
    return hits >= 1;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Julia is a high-performance dynamic language for scientific computing, with first-class support for numerical analysis, machine learning, and parallel execution. .jl files are Julia source files.',
    usedFor: [
      { label: 'julialang.org', description: 'Official Julia language home', href: 'https://julialang.org/' },
      { label: 'Julia Packages', description: 'Julia package registry', href: 'https://juliapackages.com/' },
    ],
  },
};
export default plugin;
