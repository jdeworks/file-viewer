export default {
  id: 'build-zig-zon',
  label: 'Zig Package Manifest',
  match(intake) {
    const n = (intake.filename || '').split('/').pop();
    return n === 'build.zig.zon';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Zig package manager manifest (ZON format) — defines the package name, version, and dependencies with URLs and hashes.',
    usedFor: [
      { label: 'Zig packages', description: 'Libraries and executables using the Zig package manager', href: 'https://ziglang.org/learn/build-system/' },
    ],
  },
};
