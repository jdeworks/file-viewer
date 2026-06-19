export default {
  id: 'forge-config',
  label: 'Electron Forge Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'forge.config.js' || n === 'forge.config.ts' || n === 'electron-forge.config.js';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'forge.config.js — Electron Forge configuration for building, packaging, and publishing Electron apps.',
    usedFor: [{ label: 'Electron Forge', description: 'Complete toolchain for Electron app development and packaging', href: 'https://www.electronforge.io/configuration' }],
  },
};
