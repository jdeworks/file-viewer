export default {
  id: 'memos-config',
  label: 'Memos Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'memos.env') return true;
    // Generic .env — require Memos-specific markers
    if (n === '.env' || n.endsWith('.env')) {
      const text = intake.text || '';
      if (text.includes('MEMOS_PORT')) return true;
      if (text.includes('MEMOS_MODE') && text.includes('MEMOS_DSN')) return true;
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Memos self-hosted lightweight note-taking server configuration — server, database, auth, and metrics settings.',
    usedFor: [{ label: 'Memos', description: 'Memos is an open-source self-hosted lightweight note-taking server.', href: 'https://usememos.com/' }],
  },
};
