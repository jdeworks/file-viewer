export default {
  id: 'tauri-conf',
  label: 'Tauri Config',
  match(intake, baseType) {
    if (baseType?.id !== 'json') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'tauri.conf.json' || n === 'tauri.conf.json5';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'tauri.conf.json — Tauri desktop app configuration for building cross-platform desktop apps from web frontends.',
    usedFor: [{ label: 'Tauri desktop apps', description: 'Cross-platform desktop app config (windows, bundle, permissions)', href: 'https://tauri.app/v1/api/config/' }],
  },
};
