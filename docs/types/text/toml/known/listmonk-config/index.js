export default {
  id: 'listmonk-config',
  label: 'Listmonk Config',
  match(intake, baseType) {
    if (baseType?.id !== 'toml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'config.toml' && n !== 'listmonk-config.toml') return false;
    const parsed = intake.parsed || {};
    return 'app' in parsed && 'db' in parsed && ('smtp' in parsed || 'admin_username' in (parsed.app || {}));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Listmonk self-hosted newsletter and mailing list manager configuration — app server, database, and SMTP settings.',
    tags: ['listmonk', 'newsletter', 'mailing-list', 'self-hosted', 'config'],
  },
};
