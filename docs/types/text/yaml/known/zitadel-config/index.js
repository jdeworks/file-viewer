export default {
  id: 'zitadel-config',
  label: 'ZITADEL Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'zitadel.yaml' || n === 'zitadel.yml') return true;
    const cfg = intake.parsed || {};
    return !!cfg.Database && !!cfg.ExternalDomain;
  },
  loadRenderer: () => import('./renderer.js'),
};
