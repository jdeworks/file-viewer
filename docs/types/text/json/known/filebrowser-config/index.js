export default {
  id: 'filebrowser-config',
  label: 'File Browser Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'filebrowser.json' || n === '.filebrowser.json') return true;
    const cfg = intake.parsed || {};
    return cfg.address !== undefined && cfg.root !== undefined && cfg.database !== undefined;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'File Browser self-hosted web file manager configuration — server, auth, TLS, and access settings.',
    tags: ['filebrowser', 'file-manager', 'self-hosted', 'config'],
  },
};
