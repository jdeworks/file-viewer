export default {
  id: 'air-config',
  label: 'Air (Go)',
  match(intake, baseType) {
    if (baseType?.id !== 'toml') return false;
    const n = (intake.filename || '').split('/').pop().toLowerCase();
    return n === '.air.toml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Air live-reload config for Go — defines build command, binary path, watch extensions, and log options.' },
};
