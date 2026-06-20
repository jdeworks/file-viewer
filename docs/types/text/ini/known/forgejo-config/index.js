export default {
  id: 'forgejo-config',
  label: 'Forgejo Config',
  match(intake, baseType) {
    if (baseType?.id !== 'ini') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'forgejo.ini') return true;
    // app.ini is already handled by gitea-conf; only match forgejo.ini filename here
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Forgejo self-hosted Git service configuration — server, database, repository, security, and service settings.',
    usedFor: [
      { label: 'Forgejo', description: 'Community-driven self-hosted Git service', href: 'https://forgejo.org/' },
    ],
  },
};
