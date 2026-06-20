export default {
  id: 'gitea-conf',
  label: 'Gitea/Forgejo Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    // Gitea config is always named app.ini
    if (n === 'app.ini') {
      if (text.includes('[server]') && (text.includes('APP_NAME') || text.includes('ROOT_URL') || text.includes('HTTP_PORT'))) return true;
      if (text.includes('[repository]') && text.includes('[database]') && text.includes('[server]')) return true;
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Gitea/Forgejo self-hosted Git service configuration — controls server settings, database, repositories, authentication, and mail.',
    usedFor: [
      { label: 'Gitea', description: 'Lightweight self-hosted Git service', href: 'https://docs.gitea.io/en-us/config-cheat-sheet/' },
      { label: 'Forgejo', description: 'Community-driven Gitea fork', href: 'https://forgejo.org/' },
    ],
  },
};
