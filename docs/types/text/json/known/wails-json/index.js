export default {
  id: 'wails-json',
  label: 'Wails Config',
  match(intake, baseType) {
    if (baseType?.id !== 'json') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'wails.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'wails.json — Wails project configuration for building cross-platform desktop apps with Go and web technologies.',
    usedFor: [{ label: 'Wails desktop apps', description: 'Go + web frontend desktop app configuration', href: 'https://wails.io/docs/reference/project-config' }],
  },
};
