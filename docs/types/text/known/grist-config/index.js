export default {
  id: 'grist-config',
  label: 'Grist Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'grist.env') return true;
    return (intake.text || '').includes('GRIST_SESSION_SECRET');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Grist self-hosted spreadsheet/database environment configuration — app, auth, database, storage, sandbox, and OAuth settings.',
    usedFor: [{ label: 'Grist', description: 'Grist is an open-source, self-hosted modern relational spreadsheet and collaborative database.', href: 'https://www.getgrist.com/' }],
  },
};
