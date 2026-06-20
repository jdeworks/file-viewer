export default {
  id: 'starship-config',
  label: 'Starship Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'starship.toml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Starship cross-shell prompt configuration — modules, palette, format string, and character symbols.',
    tags: ['starship', 'prompt', 'shell', 'terminal', 'toml'],
  },
};
