export default {
  id: 'electron-builder',
  label: 'Electron Builder',
  match(intake, baseType) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (baseType?.id === 'yaml' || baseType?.id === 'json') {
      return n === 'electron-builder.yml' || n === 'electron-builder.yaml' || n === 'electron-builder.json';
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'electron-builder.yml — Electron Builder configuration for packaging and distributing Electron apps.',
    usedFor: [{ label: 'Electron app packaging', description: 'Build installers for Windows, macOS, and Linux', href: 'https://www.electron.build/configuration/configuration' }],
  },
};
