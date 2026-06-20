export default {
  id: 'zig-zon',
  label: 'Zig Package Manifest',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'build.zig.zon') return true;
    const text = intake.textSample || intake.text || '';
    // ZON format: .{ .name = "...", .version = "...", .dependencies = .{ ... } }
    if (text.includes('.name =') && text.includes('.version =') && text.includes('.dependencies')) return true;
    if (text.includes('.url =') && text.includes('.hash =') && n.endsWith('.zon')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Zig build.zig.zon package manifest — name, version, and dependencies in ZON format.',
    tags: ['zig', 'zon', 'package', 'manifest', 'build'],
  },
};
