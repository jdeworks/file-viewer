export const plugin = {
  id: 'pubspec-lock',
  label: 'pubspec.lock',
  tags: ['dart', 'flutter', 'pubspec', 'lock'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'pubspec.lock';
  },
  loadRenderer: () => import('./renderer.js'),
};

export default plugin;
