export default {
  id: 'joplin-server-config',
  label: 'Joplin Server',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'joplin.env') return true;
    const text = intake.text || '';
    if (n === '.env' && text.includes('JOPLIN_BASE_URL')) return true;
    if (n === '.env' && text.includes('APP_PORT') && text.includes('APP_BASE_URL') && text.includes('DB_CLIENT')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Joplin Server self-hosted note-taking server environment configuration — app, database, mailer, storage, and security settings.',
    tags: ['joplin', 'notes', 'note-taking', 'self-hosted', 'config'],
  },
};
