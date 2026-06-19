export default {
  id: 'bunfig-toml',
  label: 'Bun Config',
  match(intake, baseType) {
    if (baseType?.id !== 'toml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'bunfig.toml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Bun runtime configuration — install registry, test preloads, serve port, run settings, and telemetry preferences.' },
};
