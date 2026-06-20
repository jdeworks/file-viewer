export default {
  id: 'lldap-config',
  label: 'LLDAP Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'lldap_config.toml';
  },
  loadRenderer: () => import('./renderer.js'),
};
