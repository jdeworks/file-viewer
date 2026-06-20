export default {
  id: 'audiobookshelf-config',
  label: 'Audiobookshelf Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'audiobookshelf.env' || n === 'abs.env') return true;
    const text = intake.text || '';
    if (text.includes('AUDIOBOOKSHELF_UID')) return true;
    if (text.includes('CONFIG_PATH') && text.includes('METADATA_PATH') && /PORT\s*=\s*13378/.test(text)) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Audiobookshelf self-hosted audiobook and podcast server environment configuration — server, paths, auth, and system settings.',
    usedFor: [{ label: 'Audiobookshelf', description: 'Self-hosted audiobook and podcast server.', href: 'https://www.audiobookshelf.org' }],
  },
};
