export default {
  id: 'conduit-config',
  label: 'Conduit Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'conduit.toml') return true;
    const g = (intake.parsed || {}).global || {};
    return !!g.server_name && !!g.database_backend;
  },
  loadRenderer: () => import('./renderer.js'),
};
