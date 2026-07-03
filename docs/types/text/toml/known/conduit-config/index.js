export default {
  id: 'conduit-config',
  label: 'Conduit Config',
  match(intake, baseType) {
    if (baseType?.id !== 'toml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'conduit.toml') return true;
    // Content sniff for renamed files: Conduit's [global] table always has these two keys.
    const text = intake.textSample || intake.text || '';
    return /^\s*server_name\s*=/m.test(text) && /^\s*database_backend\s*=/m.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
};
