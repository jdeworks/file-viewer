export const plugin = {
  id: 'zig-lang',
  label: 'Zig',
  tags: ['zig', 'systems', 'compiled', 'low-level'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    // Explicitly exclude .zig.zon files (handled by zig-zon plugin)
    if (name.endsWith('.zig.zon')) return false;
    return name.endsWith('.zig');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Zig source file — a general-purpose systems programming language focusing on robustness, optimality, and maintainability.',
    usedFor: [
      { label: 'Zig language reference', description: 'Official Zig language documentation and reference', href: 'https://ziglang.org/documentation/master/' },
      { label: 'Zig standard library', description: 'Zig standard library documentation', href: 'https://ziglang.org/documentation/master/std/' },
    ],
  },
};
export default plugin;
