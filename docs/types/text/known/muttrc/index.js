export default {
  id: 'muttrc',
  label: 'Mutt/NeoMutt Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === '.muttrc' || n === 'muttrc' || n === '.neomuttrc' || n === 'neomuttrc') return true;
    if (n === 'muttrc' || n.endsWith('.muttrc')) return true;
    const text = intake.textSample || intake.text || '';
    if (text.includes('set folder') && text.includes('set from') && text.includes('@')) return true;
    if (text.includes('set imap_user') || text.includes('set smtp_url')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'NeoMutt/Mutt email client configuration — defines mail accounts, keybindings, color schemes, and hooks.',
    tags: ['email', 'mutt', 'neomutt', 'config', 'cli'],
  },
};
