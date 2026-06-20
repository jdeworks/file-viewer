export default {
  id: 'archivebox-config',
  label: 'ArchiveBox Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'archivebox.conf') return true;
    if (n === 'archivebox.conf') return true;
    // Match filename case-insensitively
    const nRaw = (intake.name || intake.filename || '').split('/').pop();
    if (nRaw === 'ArchiveBox.conf') return true;
    // Generic .env or .conf — require ArchiveBox-specific snapshot flags
    if (n === '.env' || n.endsWith('.conf') || n.endsWith('.env')) {
      const text = intake.text || '';
      return text.includes('SAVE_WGET') && text.includes('SAVE_PDF');
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'ArchiveBox web archiving tool configuration — server, security, admin, archiving formats, limits, and binaries.',
    usedFor: [{ label: 'ArchiveBox', description: 'ArchiveBox is an open-source self-hosted web archiving tool.', href: 'https://archivebox.io/' }],
  },
};
