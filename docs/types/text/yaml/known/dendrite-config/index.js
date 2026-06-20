export default {
  id: 'dendrite-config',
  label: 'Dendrite Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'dendrite.yaml' || n === 'dendrite.yml') return true;
    const cfg = intake.parsed || {};
    return !!(cfg.global && cfg.global.server_name) && !!cfg.client_api;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Matrix Dendrite server configuration — controls server identity, database backends, client API, media API, federation, metrics, and logging.',
    usedFor: [{ label: 'Matrix Dendrite', description: 'Second-generation Matrix homeserver written in Go', href: 'https://github.com/matrix-org/dendrite' }],
  },
};
