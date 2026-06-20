export default {
  id: 'hoarder-config',
  label: 'Hoarder / Karakeep Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'hoarder.env' || n === 'karakeep.env') return true;
    const text = intake.text || '';
    if (text.includes('HOARDER_SERVER_SECRET_KEY')) return true;
    if (text.includes('NEXTAUTH_SECRET') && text.includes('MEILI_ADDR')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Hoarder (Karakeep) self-hosted bookmark manager with AI tagging configuration.',
    tags: ['hoarder', 'karakeep', 'bookmarks', 'self-hosted', 'config'],
  },
};
