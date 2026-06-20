export default {
  id: 'archivebox-config',
  label: 'ArchiveBox Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'archivebox.conf';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'ArchiveBox web archiving tool configuration — server, security, admin, archiving formats, limits, and binaries.',
    usedFor: [{ label: 'ArchiveBox', description: 'ArchiveBox is an open-source self-hosted web archiving tool.', href: 'https://archivebox.io/' }],
  },
};
