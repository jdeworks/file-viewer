export default {
  id: 'listmonk-config',
  label: 'Listmonk Config',
  match(intake, baseType) {
    if (baseType?.id !== 'toml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'config.toml' && n !== 'listmonk-config.toml') return false;
    // intake.parsed is not populated at detection time and TOML cannot be parsed
    // synchronously here, so use a lightweight text heuristic for the [app]/[db] tables.
    const text = intake.text || '';
    const hasApp = /^\s*\[app\]/m.test(text);
    const hasDb = /^\s*\[db\]/m.test(text);
    const hasSmtp = /^\s*\[\[?smtp/m.test(text);
    const hasAdminUser = /^\s*admin_username\s*=/m.test(text);
    return hasApp && hasDb && (hasSmtp || hasAdminUser);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Listmonk self-hosted newsletter and mailing list manager configuration — app server, database, and SMTP settings.',
    tags: ['listmonk', 'newsletter', 'mailing-list', 'self-hosted', 'config'],
  },
};
